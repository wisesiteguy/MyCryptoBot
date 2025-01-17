import logging
import os
from datetime import datetime, timedelta

import django
import pandas as pd
import pytz

import shared.exchanges.binance.constants as const
from shared.data.queries import get_data
from shared.utils.decorators.failed_connection import retry_failed_connection

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "database.settings")
django.setup()


def get_start_date(model_class, symbol, candle_size):
    try:
        start_date = model_class.objects \
                         .filter(exchange='binance', symbol=symbol, interval=candle_size) \
                         .order_by('open_time').last().open_time - timedelta(hours=6)
    except AttributeError:
        start_date = datetime(2019, 9, 1).astimezone(pytz.utc)

    logging.debug(start_date)

    return start_date


@retry_failed_connection(num_times=3)
def yield_kline(kline_generator):
    return next(kline_generator)


def extract_data(
    model_class,
    klines_generator,
    symbol,
    candle_size,
    start_date=None,
    header=''
):
    """
    Fetches missing data on specified model class and for a
    specific symbol, candle_size and exchange from the Binance API.

    Parameters
    ----------
    model_class: class - required. Database model class to save data on.
    klines_generator: method - required. Historical data fetching function.
    symbol: str - required. Symbol for which to retrieve data.
    candle_size: str - optional. Candle size at which data should be retrieved.
    start_date: datetime object - optional. Start date from which to retrieve data.
                If not specified, data will be fetched from the last entry on.
    header: Header for logging line.

    Returns
    -------
    DataFrame with fetched data.

    """

    if start_date is None:
        start_date = get_start_date(model_class, symbol, candle_size)
        start_date = int(start_date.timestamp() * 1000)

    logging.info(header + f"Extracting missing historical data.")

    klines = klines_generator(symbol, candle_size, start_date)

    data = []
    i = 1
    while True:
        try:
            kline = yield_kline(klines)
        except StopIteration:
            break

        fields = {field: get_value(kline) for field, get_value in const.BINANCE_KEY.items()}
        data.append(fields)
        logging.debug(fields)

        if i % 1E3 == 0:
            logging.debug(header + f"Processed {i} new rows.")

        i += 1

    return pd.DataFrame(data)


def extract_data_db(exchange_data, model_class, symbol, candle_size):

    start_date = get_start_date(model_class, symbol, candle_size)

    data = get_data(exchange_data, start_date, symbol, candle_size, exchange='binance')

    return data.reset_index()
