import logging
import os
from datetime import datetime

import pandas as pd
import django
from binance.websockets import BinanceSocketManager

import shared.exchanges.binance.constants as const
from data.sources import trigger_signal
from data.sources.binance.extract import fetch_missing_data
from data.sources.binance.load import save_rows_db
from data.sources.binance.transform import resample_data, transform_data
from data.service.helpers import STRATEGIES
from shared.exchanges.binance import BinanceHandler
from shared.utils.exceptions import InvalidInput

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "database.settings")
django.setup()

from database.model.models import ExchangeData, StructuredData, Symbol


class BinanceDataHandler(BinanceHandler, BinanceSocketManager):

    """
    Class that handles realtime / incoming data from the Binance API, and
    triggers signal generation whenever a new step has been surpassed (currently
    only time based steps).
    """

    def __init__(self, strategy, params, symbol='BTCUSDT', candle_size='1h'):

        BinanceHandler.__init__(self)
        BinanceSocketManager.__init__(self, self)

        self._check_symbol(symbol)
        self._check_strategy(strategy, params)
        self.exchange = 'binance'
        self.candle_size = candle_size

        self.conn_key = ''

        self.raw_data = pd.DataFrame()
        self.data = pd.DataFrame()
        self.raw_data_length = 1
        self.data_length = 1

        self.started = False

    def __str__(self):
        return self.__name__

    def _check_symbol(self, symbol):
        """
        Checks if requested symbol exists.

        Parameters
        ----------
        symbol : str
                 initialized symbol to check validity of.

        Returns
        -------
        sets instance parameters: symbol, quote, base

        """
        try:
            symbol_obj = Symbol.objects.get(name=symbol)
        except Symbol.DoesNotExist:
            logging.info(f"{symbol} is not valid.")
            raise InvalidInput(f"{symbol} is not a valid symbol.")

        self.symbol = symbol
        self.base = symbol_obj.base.symbol,
        self.quote = symbol_obj.quote.symbol,

    def _check_strategy(self, strategy, params):
        if strategy in STRATEGIES:
            self.strategy = strategy

            for key in params:
                if key not in STRATEGIES[strategy]["params"]:
                    raise InvalidInput(f"Provided {key} in params is not valid.")

            self.params = params
        else:
            raise InvalidInput(f"{strategy} is not a valid strategy.")

    def start_data_ingestion(self):
        """
        Public method which sets in motion the data pipeline for a given symbol.

        Returns
        -------
        None

        """

        # Get missing raw data
        self._etl_pipeline(ExchangeData, self.base_candle_size, count_updates=False)

        # Get missing structured data
        self._etl_pipeline(
            StructuredData,
            self.candle_size,
            remove_zeros=True,
            remove_rows=True,
            count_updates=False
        )

        self._start_kline_websockets(self.symbol, self._websocket_callback)

    def stop_data_ingestion(self):
        """
        Public method which stops the data pipeline for the symbol.

        Returns
        -------
        None

        """
        logging.info(f"{self.symbol}: Stopping {', '.join(self.streams)} data stream(s).")

        self._stop_websocket()

    def _start_kline_websockets(self, symbol, callback):

        streams = [
            f"{symbol.lower()}@kline_{self.base_candle_size}",
            f"{symbol.lower()}@kline_{self.candle_size}"
        ]

        logging.info(f"{self.symbol}: Starting {', '.join(streams)} data stream(s).")

        self.streams = streams

        self.conn_key = self.start_multiplex_socket(streams, callback)

        if not self.started:
            self.start()
            self.started = True

    # TODO: Wrap this in AttributeError exception handling
    def _stop_websocket(self):
        ExchangeData.objects.last().delete()

        self.stop_socket(self.conn_key)

        self.close()

    def _etl_pipeline(
        self,
        model_class,
        candle_size,
        data=None,
        remove_zeros=False,
        remove_rows=False,
        columns_aggregation=const.COLUMNS_AGGREGATION,
        count_updates=True
    ):

        # Extract
        if data is None:
            data = fetch_missing_data(model_class, self.get_historical_klines_generator, self.symbol,
                                      self.base_candle_size, candle_size)

        # Transform
        data = transform_data(
            data,
            candle_size,
            self.exchange,
            self.symbol,
            columns_aggregation=columns_aggregation,
            is_removing_zeros=remove_zeros,
            is_removing_rows=remove_rows
        )

        # Load
        new_entries = save_rows_db(model_class, data, count_updates=count_updates)

        logging.info(f"{self.symbol}: Added {new_entries} new rows into {model_class}.")

        return new_entries

    # TODO: Add timer to check if it's below 24h
    def _websocket_callback(self, row):

        logging.debug(row)

        kline_size = row["stream"].split('_')[-1]

        if kline_size == self.base_candle_size:

            self.raw_data, self.raw_data_length, _ = self._process_stream(
                ExchangeData,
                row["data"]["k"],
                self.raw_data,
                self.raw_data_length,
                self.base_candle_size
            )

        if kline_size == self.candle_size:
            self.data, self.data_length, new_entry = self._process_stream(
                StructuredData,
                row["data"]["k"],
                self.data,
                self.data_length,
                self.candle_size,
                remove_zeros=True,
                remove_rows=True,
            )

            if new_entry:
                success = trigger_signal(
                    self.symbol,
                    self.strategy,
                    self.params,
                    self.candle_size,
                    self.exchange
                )

                if not success:
                    logging.warning(
                        f"{self.symbol}: There was an error processing the "
                        f"signal generation request. Stopping data pipeline"
                    )
                    self.stop_data_ingestion()

    def _process_stream(
        self,
        model_class,
        row,
        data,
        data_length,
        candle_size,
        remove_zeros=False,
        remove_rows=False,
    ):

        new_data = pd.DataFrame(
            {
                const.NAME_MAPPER[key]: [const.FUNCTION_MAPPER[key](value)]
                for key, value in row.items()
                if key in const.NAME_MAPPER
            }
        ).set_index('open_time')

        data = data.append(new_data)

        data = resample_data(
            data,
            candle_size,
            const.COLUMNS_AGGREGATION_WEBSOCKET
        )

        return self._process_new_data(
            model_class,
            data,
            data_length,
            candle_size,
            remove_zeros=remove_zeros,
            remove_rows=remove_rows
        )

    def _process_new_data(
        self,
        model_class,
        data,
        data_length,
        candle_size,
        remove_zeros=False,
        remove_rows=False
    ):
        new_entries = 0
        if len(data) != data_length:

            rows = data.iloc[data_length-1:-1].reset_index()

            data_length = len(data)

            new_entries = self._etl_pipeline(
                model_class,
                candle_size,
                data=rows,
                remove_zeros=remove_zeros,
                remove_rows=remove_rows,
                columns_aggregation=const.COLUMNS_AGGREGATION
            )

        return data, data_length, new_entries > 0


if __name__ == "__main__":

    symbol = 'BTCUSDT'

    base_candle_size = '5m'
    interval = '5m'

    start_date = int(datetime(2020, 12, 21, 8, 0).timestamp() * 1000)

    binance_data_handler = BinanceHandler()

    fetch_missing_data(
        ExchangeData,
        binance_data_handler.get_historical_klines_generator,
        symbol,
        base_candle_size,
        interval
    )