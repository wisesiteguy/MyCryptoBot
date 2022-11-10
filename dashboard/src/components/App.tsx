import '../App.css';
import {Component} from 'react'
import styled, {css} from 'styled-components'
import {
    ChangeMenu,
    DropdownOptions,
    MenuOption,
    Trade,
    Pipeline,
    PipelineParams,
    Position,
    StartPipeline,
    StopPipeline,
    GetCurrentPrices,
    Message,
    UpdateMessage,
    DeletePipeline,
    BalanceObj,
    Decimals,
    RawTrade,
    PipelinesMetrics
} from "../types";
import {
    getTrades,
    getPipelines,
    getPositions,
    getResources,
    getFuturesAccountBalance,
    startBot,
    stopBot,
    getPrice,
    deleteBot, getPipelinesMetrics,
} from "../apiCalls";
import {GREEN, RED, RESOURCES_MAPPING} from "../utils/constants";
import Menu from "./Menu";
import MessageComponent from "./Message";
import PipelinePanel from "./PipelinePanel";
import TradesPanel from "./TradesPanel";
import {parseTrade, organizePositions, organizePipelines, organizePipeline} from "../utils/helpers";
import PositionsPanel from "./PositionsPanel";
import {Box, Wrapper} from "../styledComponents";
import Dashboard from "./Dashboard";


const AppDiv = styled.div`
  text-align: center;
  width: 100vw;
  height: 100vh;
  position: absolute;
  justify-content: flex-start;
`

const StyledBox = styled(Box)`
  transition: bottom 1s ease;
  position: fixed;
  ${(props: any) =>
    props.bottom &&
    css`
      bottom: ${props.bottom}px;
    `}
`

interface State {
    symbolsOptions: DropdownOptions[];
    strategiesOptions: DropdownOptions[];
    candleSizeOptions: DropdownOptions[];
    exchangeOptions: DropdownOptions[];
    trades: Trade[];
    pipelines: Pipeline[];
    positions: Position[];
    balances: BalanceObj
    menuOption: MenuOption,
    strategies: any
    symbols: string[],
    currentPrices: Object
    message: Message
    pipelinesMetrics: PipelinesMetrics
}

interface Props {
    decimals: Decimals
}


class App extends Component<Props, State> {

    messageTimeout: any

    static defaultProps = {
        decimals: {
            quoteDecimal: 1,
            baseDecimal: 3
        }
    }

    state = {
        symbolsOptions: [],
        strategiesOptions: [],
        candleSizeOptions: [],
        exchangeOptions: [],
        trades: [],
        pipelines: [],
        positions: [],
        strategies: {},
        balances: {
            test: {USDT: {availableBalance: 0, totalBalance: 0}},
            live: {USDT: {availableBalance: 0, totalBalance: 0}}
        },
        menuOption: {
            icon: 'line graph',
            emoji: '📈',
            text: 'Dashboard',
            code: 'dashboard'
        },
        symbols: [],
        currentPrices: {},
        message: {show: false, bottomProp: -300, text: null, color: "#000000", success: true},
        pipelinesMetrics: {
            totalPipelines: 0,
            activePipelines: 0,
            bestWinRate: {winRate: 0},
            mostTrades: {totalTrades: 0}
        }
    }

    componentDidMount() {
        getResources(Object.keys(RESOURCES_MAPPING))
            .then(resources => {
                const options = Object.keys(resources).reduce((accum: any, resource: any) => {
                    return {
                        ...accum,
                        [RESOURCES_MAPPING[resource]]: Object.keys(resources[resource]).map((name: any, index: number) => ({
                            key: index + 1,
                            text: name,
                            value: index + 1
                        }))
                    }
                }, {})

                this.setState(state => {
                    return {
                        ...state,
                        ...resources,
                        ...options
                    }
                })
            })
            .catch()

        this.updateTrades()

        this.updatePipelines()

        this.updatePositions()

        this.getAccountBalance()

        setInterval(() => {
            this.updateTrades()
        }, 60 * 1000)
    }

    componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<State>, snapshot?: any) {

        const { message, menuOption } = this.state

        if (prevState.message.show !== message.show && message.show) {
            this.setState({message: {...message, bottomProp: 40, show: false}})

            if (this.messageTimeout) {
                clearTimeout(this.messageTimeout)
            }
            this.messageTimeout = setTimeout(() => {
                this.setState((state) =>
                    ({
                        message: {
                            ...state.message,
                            bottomProp: -300
                        }
                    }),
                    () => {
                        if (this.messageTimeout) {
                            clearTimeout(this.messageTimeout)
                        }
                    }
                )
            }, 4200)
        }

        if (prevState.menuOption.code !== menuOption.code && menuOption.code === 'trades') {
            this.updateTrades()
            this.getCurrentPrices()
        }

        if (prevState.menuOption.code !== menuOption.code && menuOption.code === 'pipelines') {
            this.updatePipelines()
            this.getCurrentPrices()
        }

        if (prevState.menuOption.code !== menuOption.code && menuOption.code === 'positions') {
            this.updatePositions()
            this.getCurrentPrices()
        }
    }

    startPipeline: StartPipeline = (pipelineParams: PipelineParams) => {
        startBot(pipelineParams)
            .then(response => {
                this.setState(state => {
                    const pipelineIds = state.pipelines.map((pipe: Pipeline) => pipe.id)
                    return {
                        message: {
                            ...state.message,
                            text: response.message,
                            show: true,
                            success: response.success,
                        },
                        pipelines: response.success ? pipelineIds.includes(response.pipeline.id) ? (
                            state.pipelines.reduce((pipelines: Pipeline[], pipeline: Pipeline) => {
                                return [
                                    ...pipelines,
                                    pipeline.id === response.pipeline.id ? organizePipeline(response.pipeline) : pipeline]
                            }, [])) : (
                                [...state.pipelines, ...organizePipelines([response.pipeline])]
                            ) : state.pipelines
                    }
                })
            })
    }

    stopPipeline: StopPipeline = (pipelineId) => {
        return stopBot({pipelineId})
            .then(response => {
                this.setState(state => ({
                    message: {
                        ...state.message,
                        text: response.message,
                        show: true,
                        success: response.success
                    },
                    pipelines: response.success ? state.pipelines.reduce(
                        (newArray: Pipeline[], pipeline: Pipeline) => {
                            if (pipelineId === pipeline.id) {
                                return [...newArray, ...organizePipelines([response.pipeline])]
                            } else return [...newArray, pipeline]
                        },
                        []
                    ) : state.pipelines
                }))
            })
    }

    deletePipeline: DeletePipeline = (pipelineId) => {
        deleteBot(pipelineId)
            .then(response => {
                this.setState(state => ({
                    message: {
                        ...state.message,
                        text: response.message,
                        show: true,
                        success: response.success
                    },
                    pipelines: response.success ? state.pipelines.reduce(
                        (newArray: Pipeline[], pipeline: Pipeline) => {
                            return pipelineId === pipeline.id ? newArray : [...newArray, pipeline]
                        },
                        []
                    ) : state.pipelines,
                    positions: response.success ? state.positions.reduce(
                        (newPositions: Position[], position: Position) => {
                            return position.pipelineId === pipelineId ? newPositions : [...newPositions, position]
                        },
                        []
                    ) : state.positions
                }))
            })
    }

    changeMenu: ChangeMenu = (menuOption) => {
        this.setState({ menuOption })
    }

    getCurrentPrices: GetCurrentPrices = () => {
        Array.isArray(this.state.symbols) && Promise.allSettled(
            this.state.symbols.map(symbol => getPrice(symbol))
        ).then(results => {
            this.setState({
                currentPrices: results.reduce((prices, result) => {
                    if (result.status === 'fulfilled') {
                        return {...prices, [result.value.symbol]: Number(result.value.price)}
                    } else return prices
                }, {})
            })
        })
    }

    balanceReducer = (balance: any, coin: { asset: string; balance: string; withdrawAvailable: string; }) => {
        return {
            ...balance,
            [coin.asset]: {
                totalBalance: Number(coin.balance),
                availableBalance: Number(coin.withdrawAvailable)
            }
        }
    }

    getAccountBalance = () => {
        getFuturesAccountBalance()
          .then(response => {
              this.setState(state => {
                  return {
                      ...state,
                      balances: {
                          live: response.live.reduce(this.balanceReducer, {}),
                          test: response.testnet.reduce(this.balanceReducer, {})
                      }
                  }
              })
          })
    }

    updateTrades = (page?: number) => {
        getTrades(page)
          .then(response => {
              this.setState(state => {
                  return {
                      ...state,
                      trades: {...state.trades, ...response.trades.reduce((trades: Object, trade: RawTrade) => {
                          return {
                              ...trades,
                              [trade.id]: parseTrade(trade)
                          }
                      }, {})},
                  }
              })
          })
    }


    updatePipelinesMetrics = () => {
        getPipelinesMetrics()
          .then(response => {
              this.setState({
                  pipelinesMetrics: response
              })
          })
    }

    updatePipelines = () => {
        getPipelines()
          .then(response => {
              this.setState(state => {
                  return {
                      ...state,
                      pipelines: organizePipelines(response.pipelines),
                      // @ts-ignore
                      symbols: [...new Set(response.pipelines.map(pipeline => pipeline.symbol))]
                  }
              })
          })
    }

    updatePositions = () => {
        getPositions()
          .then(positions => {
              this.setState(state => {
                  return {
                      ...state,
                      positions: organizePositions(positions.positions)
                  }
              })
          })
    }

    updateMessage: UpdateMessage = (text, success) => {
        this.setState(state => ({
            message: {
                ...state.message,
                show: true,
                text,
                success,
            }
        }))
    }

    render() {

        const {
            symbolsOptions,
            strategiesOptions,
            candleSizeOptions,
            exchangeOptions,
            balances,
            trades,
            pipelines,
            positions,
            menuOption,
            strategies,
            currentPrices,
            message,
            pipelinesMetrics
        } = this.state

        const { decimals } = this.props

        return (
            <AppDiv className="flex-row">
                <Menu menuOption={menuOption} changeMenu={this.changeMenu}/>
                {menuOption.code !== 'trades' ? (
                    <Wrapper>
                        {menuOption.code === 'pipelines' ? (
                          <PipelinePanel
                            menuOption={menuOption}
                            symbolsOptions={symbolsOptions}
                            strategiesOptions={strategiesOptions}
                            candleSizeOptions={candleSizeOptions}
                            exchangeOptions={exchangeOptions}
                            pipelines={pipelines}
                            strategies={strategies}
                            balances={balances}
                            startPipeline={this.startPipeline}
                            stopPipeline={this.stopPipeline}
                            deletePipeline={this.deletePipeline}
                            updateMessage={this.updateMessage}
                          />
                        ) : menuOption.code === 'positions' ? (
                          <PositionsPanel
                            menuOption={menuOption}
                            positions={positions}
                            pipelines={pipelines}
                            currentPrices={currentPrices}
                            decimals={decimals}
                          />
                        ) : menuOption.code === 'dashboard' && (
                          <Dashboard
                            menuOption={menuOption}
                            balances={balances}
                            pipelines={pipelines}
                            trades={trades}
                            positions={positions}
                            currentPrices={currentPrices}
                            pipelinesMetrics={pipelinesMetrics}
                            updatePipelinesMetrics={this.updatePipelinesMetrics}
                          />
                        )}
                    </Wrapper>
                ) : (
                  <TradesPanel
                    menuOption={menuOption}
                    trades={trades}
                    pipelines={pipelines}
                    currentPrices={currentPrices}
                    decimals={decimals}
                    updateTrades={this.updateTrades}
                  />
                )}
                {message.text && (
                    <StyledBox align="center" bottom={message.bottomProp}>
                        <MessageComponent success={message.success} message={message.text} color={message.color}/>
                    </StyledBox>
                )}
            </AppDiv>
        );
    }
}


export default App;
