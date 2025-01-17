import React, {Fragment} from 'react'
import {Button, Icon, Message} from "semantic-ui-react";
import {Link} from 'react-router-dom';
import {
    DropdownOptions,
    StartPipeline,
    StopPipeline,
    UpdateMessage,
    DeletePipeline,
    BalanceObj,
    PipelinesMetrics,
    PipelinesObject,
    Decimals,
    TradesObject,
    UpdateTrades,
    Position,
    EditPipeline
} from "../types";
import PipelineItem from './Pipeline'
import NewPipeline from "./NewPipeline";
import styled from "styled-components";
import {useEffect, useReducer, useRef} from "react";
import PipelineDetail from "./PipelineDetail";
import {Wrapper} from "../styledComponents";


interface Props {
    symbolsOptions: DropdownOptions[];
    strategiesOptions: DropdownOptions[];
    candleSizeOptions: DropdownOptions[];
    exchangeOptions: DropdownOptions[];
    pipelines: PipelinesObject;
    positions: Position[];
    balances: BalanceObj;
    startPipeline: StartPipeline;
    stopPipeline: StopPipeline;
    editPipeline: EditPipeline;
    deletePipeline: DeletePipeline;
    updateMessage: UpdateMessage;
    strategies: any
    match: any
    pipelinesMetrics: PipelinesMetrics
    decimals: Decimals
    trades: TradesObject
    currentPrices: Object
    updateTrades: UpdateTrades
    pipelinesPnl: Object
}


const ButtonWrapper = styled.div`
    margin-bottom: 40px;
    width: 100%;
    justify-content: space-around;
`

const FILTER_PIPELINES = 'FILTER_PIPELINES'
const TOGGLE_OPTIONS = 'TOGGLE_OPTIONS'


const reducer = (state: any, action: any) => {
    switch (action.type) {
        case FILTER_PIPELINES:
            const { pipelines, options: {active, stopped, live, test} } = action

            return {
                ...state,
                filteredPipelines: Object.keys(pipelines).filter((pipelineId: string) => {

                    const pipeline = pipelines[pipelineId]

                    return ((pipeline.active === active && active) || (pipeline.active === !stopped && stopped))
                    && ((pipeline.paperTrading === test && test) || (pipeline.paperTrading === !live && live))
                }).sort((pipeline1: string, pipeline2: string) => {
                    return pipelines[pipeline2].active - pipelines[pipeline1].active
                })
            }
        case TOGGLE_OPTIONS:
            return {
                ...state,
                options: {
                    live: action.live !== undefined ? action.live : state.options.live,
                    test: action.test !== undefined ? action.test : state.options.test,
                    active: action.active !== undefined ? action.active : state.options.active,
                    stopped: action.stopped !== undefined ? action.stopped : state.options.stopped,
                }
            }
        default:
            throw new Error();
    }
}


const initialOptions = {
    live: true,
    test: true,
    active: true,
    stopped: true
}

function PipelinePanel(props: Props) {

    const {
        symbolsOptions,
        strategiesOptions,
        pipelines,
        positions,
        balances,
        strategies,
        candleSizeOptions,
        exchangeOptions,
        startPipeline,
        stopPipeline,
        editPipeline,
        deletePipeline,
        pipelinesMetrics,
        trades,
        decimals,
        currentPrices,
        updateTrades,
        pipelinesPnl,
        match: {params: {pipelineId}}
    } = props

    const [
        {
            filteredPipelines,
            options
        }, dispatch
    ] = useReducer(
        reducer, {
            filteredPipelines: Object.keys(pipelines),
            options: initialOptions
        }
    );

    const previous = useRef({ pipelines, options }).current;

    useEffect(() => {
        if (pipelines !== previous.pipelines || options !== previous.options) {
            dispatch({
                type: FILTER_PIPELINES,
                pipelines,
                options
            })
        }
        return () => {
            previous.pipelines = pipelines
            previous.options = options
        };
    }, [pipelines, options]);

    const pipelineMatch = Object.keys(pipelines).find(pipeline => pipeline === pipelineId)

    return (
        <Fragment>
            {pipelineMatch ? (
              <PipelineDetail
                pipelines={pipelines}
                pipelineId={pipelineMatch}
                pipelineMetrics={pipelinesMetrics[pipelineId]}
                startPipeline={startPipeline}
                stopPipeline={stopPipeline}
                editPipeline={editPipeline}
                deletePipeline={deletePipeline}
                decimals={decimals}
                trades={trades}
                currentPrices={currentPrices}
                updateTrades={updateTrades}
                positions={positions}
                strategies={strategies}
                balances={balances}
                symbolsOptions={symbolsOptions}
                strategiesOptions={strategiesOptions}
                candleSizeOptions={candleSizeOptions}
                exchangeOptions={exchangeOptions}
                pipelinesPnl={pipelinesPnl}
              />
            ) : (
              <Wrapper>
                <ButtonWrapper className="flex-row">
                    <Button.Group size="mini" style={{alignSelf: 'center'}}>
                        {['live', 'test'].map((option, index) => (
                            <Button key={index} onClick={() => dispatch({
                                type: TOGGLE_OPTIONS,
                                [option]: !options[option]
                            })} color={options && options[option] && 'grey'}>
                                {option}
                            </Button>
                        ))}
                    </Button.Group>
                    <Button.Group size="mini" style={{alignSelf: 'center'}}>
                        {['active', 'stopped'].map((option, index) => (
                          <Button key={index} onClick={() => dispatch({
                              type: TOGGLE_OPTIONS,
                              [option]: !options[option]
                          })} color={options && options[option] && 'grey'}>
                              {option}
                          </Button>
                        ))}
                    </Button.Group>
                    <NewPipeline
                        strategies={strategies}
                        balances={balances}
                        pipelines={pipelines}
                        positions={positions}
                        symbolsOptions={symbolsOptions}
                        strategiesOptions={strategiesOptions}
                        candleSizeOptions={candleSizeOptions}
                        exchangeOptions={exchangeOptions}
                        startPipeline={startPipeline}
                        editPipeline={editPipeline}
                    >
                        <Button inverted secondary>
                          <span style={{marginRight: '10px'}}>
                              <Icon name={'plus'}/>
                          </span>
                            New Trading Bot
                        </Button>
                    </NewPipeline>
                </ButtonWrapper>
                  <div className="flex-column">
                {filteredPipelines.map((pipelineId: string, index: number) => (
                  <Link to={`/pipelines/${pipelineId}`} className="flex-row" style={{width: 'calc(80% - 50px)'}}>
                    <PipelineItem
                        strategies={strategies}
                        balances={balances}
                        pipelines={pipelines}
                        positions={positions}
                        symbolsOptions={symbolsOptions}
                        strategiesOptions={strategiesOptions}
                        candleSizeOptions={candleSizeOptions}
                        exchangeOptions={exchangeOptions}
                        key={index}
                        startPipeline={startPipeline}
                        editPipeline={editPipeline}
                        stopPipeline={stopPipeline}
                        deletePipeline={deletePipeline}
                        pipeline={pipelines[pipelineId]}
                        lastRow={true}
                        position={positions.find((position) => String(position.pipelineId) === pipelineId)}
                        pipelinesPnl={pipelinesPnl}
                    />
                  </Link>
                ))}
                  </div>
                {filteredPipelines.length === 0 && (
                    <Message>
                        <Message.Header>
                            There are no trading bots matching the chosen filters.
                        </Message.Header>
                    </Message>
                )}
              </Wrapper>
            )}
        </Fragment>
    );
}

// @ts-ignore
export default PipelinePanel;
