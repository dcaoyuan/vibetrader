import { Component, memo, useRef, useState, type JSX, type ReactNode } from "react";
import { KlineView } from "../charting/view/KlineView";
import { VolumeView } from "../charting/view/VolumeView";
import { ChartXControl } from "../charting/view/ChartXControl";
import { ChartView, RefreshEvent, type ChartOf, type RefreshCursor } from "../charting/view/ChartView";
import AxisX from "../charting/pane/AxisX";
import type { TSer } from "../timeseris/TSer";
import type { TVar } from "../timeseris/TVar";
import type { Kline } from "./Kline";
import { Path } from "../svg/Path";
import Title from "../charting/pane/Title";
import { Help } from "../charting/pane/Help";
import { Context, PineTS, } from "pinets/src/index";
import { TSerProvider } from "./TSerProvider";
import { IndicatorView } from "../charting/view/IndicatorView";

type Props = {
    xc: ChartXControl,
    varName: string,
    width: number,
}

type State = {
    refreshChart?: number;
    refreshCursors?: RefreshCursor;

    mouseCursor?: JSX.Element;
    referCursor?: JSX.Element;

    overlappingCharts?: ChartOf[];
    indicatorCharts?: ChartOf[];


    yKlineView?: number;
    yVolumeView?: number;
    yIndicatorViews?: number;
    yAxisx?: number;
    svgHeight?: number;
    containerHeight?: number;
    yCursorRange?: number[];
}

class KlineSerView extends Component<Props, State> {

    xc: ChartXControl
    klineSer: TSer;
    kvar: TVar<Kline>;
    varName: string;
    width: number;
    isInteractive: boolean;

    hTitle = 98;
    hHelp = 80;

    hKlineView = 400;
    hVolumeView = 100;
    hIndicatorView = 100;
    hAxisx = 40;
    hSpacing = 15;

    hViews = [this.hSpacing, this.hKlineView, this.hSpacing, this.hVolumeView, this.hSpacing, this.hAxisx];
    UNDEFINED_YMouses = this.hViews.map(_ => undefined);


    constructor(props: Props) {
        super(props);
        this.xc = props.xc;
        this.varName = props.varName;
        this.width = props.width;

        this.klineSer = this.xc.baseSer;
        this.kvar = this.klineSer.varOf(this.varName) as TVar<Kline>;

        this.isInteractive = true;

        console.log("KlineSerView render");

        const geometry = this.#calcGeometry([]);
        this.state = {
            refreshChart: 0,
            refreshCursors: { changed: 0, yMouse: {} },
            referCursor: <></>,
            mouseCursor: <></>,
            overlappingCharts: [],
            indicatorCharts: [],
            ...geometry,
        }

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
    }

    componentDidMount() {
        const pinets = new PineTS(new TSerProvider(this.kvar), 'ETH', '1d');
        let startTime = performance.now();

        pinets.run((context: Context) => {
            const ta = context.ta;
            const { close } = context.data;

            const ema1 = ta.ema(close, 9);
            const ema2 = ta.ema(close, 18);
            const ema3 = ta.ema(close, 36);

            return {
                ema1,
                ema2,
                ema3,
            };

        }).then(({ result }) => {
            console.log(`ema calclated in ${performance.now() - startTime} ms`, result);
            startTime = performance.now();

            const ema = this.klineSer.varOf("ema") as TVar<unknown[]>;
            const size = this.klineSer.size();
            const values = Object.values(result);
            for (let i = 0; i < size; i++) {
                const vs = values.map(v => v[i]);
                ema.setByIndex(i, vs);
            }

            console.log(`ema added in ${performance.now() - startTime} ms`);

            this.updateState({
                overlappingCharts: [
                    { tvar: ema, atIndex: 0, name: "ema-9", kind: "line" },
                    { tvar: ema, atIndex: 1, name: "ema-18", kind: "line" },
                    { tvar: ema, atIndex: 2, name: "ema-36", kind: "line" },
                ]
            })
        });

        pinets.run((context: Context) => {
            const ta = context.ta;
            const { close } = context.data;

            const rsi = ta.rsi(close, 14);

            return {
                rsi,
            };

        }).then(({ result }) => {
            console.log(`rsi calclated in ${performance.now() - startTime} ms`, result);

            const rsi = this.klineSer.varOf("rsi") as TVar<unknown[]>;
            const size = this.klineSer.size();
            const values = Object.values(result);
            for (let i = 0; i < size; i++) {
                const vs = values.map(v => v[i]);
                rsi.setByIndex(i, vs);
            }

            console.log(`rsi added in ${performance.now() - startTime} ms`, rsi);

            this.updateState({
                indicatorCharts: [
                    { tvar: rsi, atIndex: 0, name: "rsi-14", kind: "line" },
                ]
            })
        })
    }

    notify(event: RefreshEvent, yMouse: { who?: string, y?: number } = {}) {
        switch (event) {
            case RefreshEvent.Chart:
                this.updateState({ refreshChart: this.state.refreshChart + 1 });
                break;

            case RefreshEvent.Cursors:
                this.updateState({ refreshCursors: { changed: this.state.refreshCursors.changed + 1, yMouse } })
                break;

            default:
        }
    }

    updateState(state: State) {
        let referCursor = <></>
        let mouseCursor = <></>
        const referColor = '#00F0F0'; // 'orange'
        if (this.xc.isReferCuroseVisible) {
            const time = this.xc.tr(this.xc.referCursorRow)
            if (this.xc.occurred(time)) {
                const cursorX = this.xc.xr(this.xc.referCursorRow)
                referCursor = this.#plotCursor(cursorX, referColor)
            }
        }

        if (this.xc.isMouseCuroseVisible) {
            const time = this.xc.tr(this.xc.mouseCursorRow)
            if (this.xc.occurred(time)) {
                const cursorX = this.xc.xr(this.xc.mouseCursorRow)
                mouseCursor = this.#plotCursor(cursorX, '#00F000')
            }
        }

        const geometry = state.indicatorCharts ? this.#calcGeometry(state.indicatorCharts) : {};
        console.log(this.state.yAxisx)

        this.setState({ ...state, ...geometry, referCursor, mouseCursor })
    }

    #calcGeometry(indicatorCharts: ChartOf[]) {
        const yKlineView = this.hSpacing;
        const yVolumeView = yKlineView + this.hKlineView + this.hSpacing;
        const yIndicatorViews = yVolumeView + this.hVolumeView + this.hSpacing;
        const yAxisx = yIndicatorViews + indicatorCharts.length * (this.hIndicatorView + this.hSpacing);

        const svgHeight = yAxisx + this.hAxisx;
        const containerHeight = svgHeight + this.hTitle;
        const yCursorRange = [0, yAxisx];

        return { yKlineView, yVolumeView, yIndicatorViews, yAxisx, svgHeight, containerHeight, yCursorRange }
    }

    #calcYMouses(y: number) {
        if (y >= this.state.yKlineView && y < this.state.yKlineView + this.hKlineView) {
            return { who: 'kline', y: y - this.state.yKlineView };

        } else if (y >= this.state.yVolumeView && y < this.state.yVolumeView + this.hVolumeView) {
            return { who: 'volume', y: y - this.state.yVolumeView };

        } else {
            if (this.state.indicatorCharts) {
                for (let n = 0; n < this.state.indicatorCharts.length; n++) {
                    if (y >= this.state.yIndicatorViews + n * (this.hIndicatorView + this.hSpacing) &&
                        y < this.state.yIndicatorViews + n * (this.hIndicatorView + this.hSpacing) + this.hIndicatorView
                    ) {
                        return { who: 'indicator-' + n, y: y - this.state.yIndicatorViews + n * (this.hIndicatorView + this.hSpacing) };
                    }
                }
            }
        }

        return {};

    }

    #plotCursor(x: number, color: string) {
        const crossPath = new Path(color);
        // crossPath.stroke_dasharray = '1, 1'

        // vertical line
        crossPath.moveto(x, this.state.yCursorRange[0]);
        crossPath.lineto(x, this.state.yCursorRange[1])

        return (
            <g shapeRendering="crispEdges" >
                {crossPath.render('container-cross')}
            </g>
        )
    }

    isInAxisYArea(x: number) {
        return x < this.width - ChartView.AXISY_WIDTH
    }

    handleMouseLeave() {
        // clear mouse cursor
        this.xc.isMouseCuroseVisible = false;

        this.notify(RefreshEvent.Cursors);
    }

    handleMouseMove(e: React.MouseEvent) {
        const targetRect = e.currentTarget.getBoundingClientRect();
        const x = e.pageX - targetRect.left;
        const y = e.pageY - targetRect.top;

        const b = this.xc.bx(x);

        if (this.isInAxisYArea(x)) {
            // draw mouse cursor only when not in the axis-y area
            const row = this.xc.rb(b)
            this.xc.setMouseCursorByRow(row)
            this.xc.isMouseCuroseVisible = true

        } else {
            this.xc.isMouseCuroseVisible = false;
        }

        this.notify(RefreshEvent.Cursors, this.#calcYMouses(y));
    }

    handleMouseDown(e: React.MouseEvent) {
        if (e.ctrlKey) {
            // will select chart on pane

        } else {
            // set refer cursor
            const targetRect = e.currentTarget.getBoundingClientRect();
            const x = e.pageX - targetRect.left;
            const y = e.pageY - targetRect.top;

            const time = this.xc.tx(x);
            if (!this.xc.occurred(time)) {
                return;
            }

            // align x to bar center
            const b = this.xc.bx(x);

            if (this.isInAxisYArea(x)) {
                // draw refer cursor only when not in the axis-y area
                if (
                    y >= this.state.yCursorRange[0] && y <= this.state.svgHeight &&
                    b >= 1 && b <= this.xc.nBars
                ) {
                    const row = this.xc.rb(b)
                    this.xc.setReferCursorByRow(row, true)
                    this.xc.isReferCuroseVisible = true;

                    this.notify(RefreshEvent.Cursors);
                }
            }
        }
    }

    handleWheel(e: React.WheelEvent) {
        const fastSteps = Math.floor(this.xc.nBars * 0.168)
        const delta = Math.round(e.deltaY / this.xc.nBars);
        console.log(e, delta)

        if (e.shiftKey) {
            // zoom in / zoom out 
            this.xc.growWBar(delta)

        } else if (e.ctrlKey) {
            if (!this.isInteractive) {
                return
            }

            const unitsToScroll = this.xc.isCursorAccelerated ? delta * fastSteps : delta;
            // move refer cursor left / right 
            this.xc.scrollReferCursor(unitsToScroll, true)

        } else {
            if (!this.isInteractive) {
                return
            }

            const unitsToScroll = this.xc.isCursorAccelerated ? delta * fastSteps : delta;
            // keep referCursor staying same x in screen, and move
            this.xc.scrollChartsHorizontallyByBar(unitsToScroll)
        }

        this.notify(RefreshEvent.Chart);
    }

    handleKeyDown(e: React.KeyboardEvent) {
        const fastSteps = Math.floor(this.xc.nBars * 0.168)

        switch (e.key) {
            case "ArrowLeft":
                if (e.ctrlKey) {
                    this.xc.moveCursorInDirection(fastSteps, -1)

                } else {
                    this.xc.moveChartsInDirection(fastSteps, -1)
                }
                break;

            case "ArrowRight":
                if (e.ctrlKey) {
                    this.xc.moveCursorInDirection(fastSteps, 1)
                } else {
                    this.xc.moveChartsInDirection(fastSteps, 1)
                }
                break;

            case "ArrowUp":
                if (!e.ctrlKey) {
                    this.xc.growWBar(1)
                }
                break;

            case "ArrowDown":
                if (!e.ctrlKey) {
                    this.xc.growWBar(-1);
                }
                break;

            default:
        }

        this.notify(RefreshEvent.Chart)
    }

    handleKeyUp(e: React.KeyboardEvent) {
        switch (e.key) {
            case " ":
                this.xc.isCursorAccelerated = !this.xc.isCursorAccelerated
                break;

            case "Escape":
                this.xc.isReferCuroseVisible = false;
                this.notify(RefreshEvent.Cursors)
                break;

            default:
        }
    }

    render() {
        return (
            // onKeyDown/onKeyUp etc upon <div/> should combine tabIndex={0} to work correctly.
            <div className="container" style={{ width: this.width + 'px', height: this.state.containerHeight + 'px' }}
                onKeyDown={this.handleKeyDown}
                onKeyUp={this.handleKeyUp}
                tabIndex={0}
            >
                <div className="title" style={{ width: this.width, height: this.hTitle }}>
                    <Title
                        width={this.width}
                        height={this.hTitle}
                        xc={this.xc}
                        tvar={this.kvar}
                        refreshChart={this.state.refreshChart}
                        refreshCursors={this.state.refreshCursors}
                    />
                    <div className="borderLeftUp" style={{ top: this.hTitle - 8 }} />
                </div>
                <div style={{ width: this.width + 'px', height: this.state.svgHeight + 'px' }}>
                    <svg viewBox={`0, 0, ${this.width} ${this.state.svgHeight}`} width={this.width} height={this.state.svgHeight} vectorEffect="non-scaling-stroke"
                        onMouseMove={this.handleMouseMove}
                        onMouseLeave={this.handleMouseLeave}
                        onMouseDown={this.handleMouseDown}
                        onWheel={this.handleWheel}
                    >
                        <KlineView
                            id={"kline"}
                            y={this.state.yKlineView}
                            height={this.hKlineView}
                            x={0}
                            width={this.width}
                            name="ETH"
                            xc={this.xc}
                            baseSer={this.klineSer}
                            tvar={this.kvar}
                            isKline={true}
                            isMasterView={true}
                            refreshChart={this.state.refreshChart}
                            refreshCursors={this.state.refreshCursors}
                            overlappingCharts={this.state.overlappingCharts}
                        />
                        <VolumeView
                            id={"volume"}
                            y={this.state.yVolumeView}
                            height={this.hVolumeView}
                            x={0}
                            width={this.width}
                            name="Vol"
                            xc={this.xc}
                            baseSer={this.klineSer}
                            tvar={this.kvar}
                            refreshChart={this.state.refreshChart}
                            refreshCursors={this.state.refreshCursors}
                        />
                        <AxisX
                            id={"axisx"}
                            y={this.state.yAxisx}
                            height={this.hAxisx}
                            x={0}
                            width={this.width}
                            xc={this.xc}
                            refreshChart={this.state.refreshChart}
                            refreshCursors={this.state.refreshCursors}
                        />
                        {
                            this.state.indicatorCharts.map(({ tvar, atIndex, name, kind }, n) =>
                                <IndicatorView
                                    key={"indicator-view-" + n}
                                    id={"indicator-" + n}
                                    y={this.state.yIndicatorViews + n * (this.hIndicatorView + this.hSpacing)}
                                    height={this.hVolumeView}
                                    x={0}
                                    width={this.width}
                                    name={name}
                                    xc={this.xc}
                                    baseSer={this.klineSer}
                                    tvar={tvar}
                                    refreshChart={this.state.refreshChart}
                                    refreshCursors={this.state.refreshCursors}
                                />
                            )
                        }
                        {this.state.referCursor}
                        {this.state.mouseCursor}
                    </svg>
                </div>
                <div className="title" style={{ width: this.width, height: this.hHelp }}>
                    <Help
                        width={this.width}
                        height={this.hHelp}
                    />
                    <div className="borderLeftUp" style={{ top: this.hHelp - 8 }} />
                </div>

            </div >
        )
    }
}

export default KlineSerView 