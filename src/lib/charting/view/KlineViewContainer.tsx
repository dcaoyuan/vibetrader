import { Component, memo, useRef, useState, type JSX, type ReactNode } from "react";
import { KlineView } from "./KlineView";
import { VolumeView } from "./VolumeView";
import { ChartXControl } from "./ChartXControl";
import { ChartView, UpdateEvent, type Indicator, type UpdateCursor as UpdateCursor } from "./ChartView";
import AxisX from "../pane/AxisX";
import type { TSer } from "../../timeseris/TSer";
import type { TVar } from "../../timeseris/TVar";
import { Kline } from "../../domain/Kline";
import { Path } from "../../svg/Path";
import Title from "../pane/Title";
import { Help } from "../pane/Help";
import { TSerProvider } from "../../domain/TSerProvider";
import { IndicatorView } from "./IndicatorView";
import { Button, Group, Text, ToggleButton, Toolbar } from 'react-aria-components';
import { PineTS } from "@vibetrader/pinets";
import { DefaultTSer } from "../../timeseris/DefaultTSer";
import { TFrame } from "../../timeseris/TFrame";

type Props = {
    varName: string,
    width: number,
}

type PlotData = {
    time?: number,
    value: unknown
}

type Plot = {
    data: PlotData[],
    options: PlotOptions,
    title: string,
}

type PlotOptions = {
    color?: string;
    linewidth?: number;
    style?: string;
    trackprice?: boolean;
    histbase?: boolean;
    offset?: number;
    join?: boolean;
    editable?: boolean;
    show_last?: boolean;
    display?: boolean;
    format?: string;
    precision?: number;
    force_overlay?: boolean;
};

type State = {
    baseSer?: TSer;
    kvar?: TVar<Kline>;
    xc?: ChartXControl;

    shouldUpdateChart?: number;
    shouldUpdateCursors?: UpdateCursor;

    mouseCursor?: JSX.Element;
    referCursor?: JSX.Element;

    overlayIndicator?: Indicator;
    stackedIndicators?: Indicator[];

    overlayIndicatorLabels?: string[];
    stackedIndicatorLabels?: string[][];

    referOverlayIndicatorLabels?: string[];
    referStackedIndicatorLabels?: string[][];

    yKlineView?: number;
    yVolumeView?: number;
    yIndicatorViews?: number;
    yAxisx?: number;
    svgHeight?: number;
    containerHeight?: number;
    yCursorRange?: number[];

    isLoaded?: boolean;
}

class KlineViewContainer extends Component<Props, State> {

    varName: string;
    width: number;
    isInteractive: boolean;

    hTitle = 98;
    hHelp = 80;

    hKlineView = 400;
    hVolumeView = 100;
    hIndicatorView = 160;
    hAxisx = 40;
    hSpacing = 25;

    constructor(props: Props) {
        super(props);
        this.varName = props.varName;
        this.width = props.width;


        this.isInteractive = true;

        console.log("KlinerViewContainer render");

        const geometry = this.#calcGeometry([]);
        this.state = {
            shouldUpdateChart: 0,
            shouldUpdateCursors: { changed: 0 },
            stackedIndicators: [],
            ...geometry,
        }

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.setOverlayIndicatorLabels = this.setOverlayIndicatorLabels.bind(this);
        this.setStackedIndicatorLabels = this.setStackedIndicatorLabels.bind(this);
    }

    componentDidMount() {
        const tzone = "America/Vancouver";

        const fetchData = fetch("./klines.json")
            .then(r => r.json())
            .then(json => {
                const baseSer = new DefaultTSer(TFrame.DAILY, tzone, 1000);

                for (const k of json) {
                    const kline = new Kline(Date.parse(k.Date), k.Open, k.High, k.Low, k.Close, k.Volume, true);
                    baseSer.addToVar(this.varName, kline);
                }

                const kvar = baseSer.varOf(this.varName) as TVar<Kline>;

                // xc instance will be shared across all views.
                const xc = new ChartXControl(baseSer, this.width - ChartView.AXISY_WIDTH);

                return { baseSer, kvar, xc };
            })

        fetchData.then(({ baseSer, kvar, xc }) => {
            fetch("./indicators.js")
                .then((r) => r.text())
                .then(js => {
                    const indicatorsFunction = new Function(js);

                    let startTime = performance.now();
                    const pinets = new PineTS(new TSerProvider(kvar), 'ETH', '1d');

                    const fnRuns = indicatorsFunction().map(fn => pinets.run(fn));

                    Promise.all(fnRuns).then((results) => {
                        console.log(`indicators calclated in ${performance.now() - startTime} ms`);

                        startTime = performance.now();

                        let overlay = false
                        let overlayOne = undefined
                        const stackedOnes = [];
                        const inds = results.map(({ plots }, n) => {
                            const tvar = baseSer.varOf("ind-" + n) as TVar<unknown[]>;
                            const size = baseSer.size();
                            const plotValues = Object.values(plots) as Plot[];
                            const dataValues = plotValues.map(({ data }) => data);
                            for (let i = 0; i < size; i++) {
                                const vs = dataValues.map(v => v[i].value);
                                tvar.setByIndex(i, vs);
                            }

                            overlay = false;
                            const outputs = plotValues.map(({ title, options: { style, color, force_overlay } }, atIndex) => {
                                if (force_overlay) {
                                    overlay = true;
                                }
                                return ({ atIndex, title, style, color })
                            })

                            if (overlay) {
                                overlayOne = { tvar, outputs }

                            } else {
                                stackedOnes.push({ tvar, outputs })
                            }
                        })

                        console.log(`indicators added to series in ${performance.now() - startTime} ms`);

                        this.updateState({
                            baseSer,
                            kvar,
                            xc,
                            isLoaded: true,
                            overlayIndicator: overlayOne,
                            stackedIndicators: stackedOnes
                        })
                    })

                })
        })

    }

    notify(event: UpdateEvent, xyMouse?: { who: string, x: number, y: number }) {
        switch (event) {
            case UpdateEvent.Chart:
                this.updateState({ shouldUpdateChart: this.state.shouldUpdateChart + 1 });
                break;

            case UpdateEvent.Cursors:
                this.updateState({ shouldUpdateCursors: { changed: this.state.shouldUpdateCursors.changed + 1, xyMouse } })
                break;

            default:
        }
    }

    updateState(state: State) {
        const xc = state.xc || this.state.xc;
        if (xc === undefined) {
            return;
        }

        let referCursor = undefined
        let mouseCursor = undefined
        const referColor = '#00F0F0C0'; // 'orange'
        if (xc.isReferCuroseVisible) {
            const time = xc.tr(xc.referCursorRow)
            if (xc.occurred(time)) {
                const cursorX = xc.xr(xc.referCursorRow)
                referCursor = this.#plotCursor(cursorX, referColor)
            }
        }

        if (xc.isMouseCuroseVisible) {
            const cursorX = xc.xr(xc.mouseCursorRow)
            mouseCursor = this.#plotCursor(cursorX, '#00F000')
        }

        // need to re-calculate geometry?
        const geometry = state.stackedIndicators
            ? this.#calcGeometry(state.stackedIndicators)
            : undefined

        this.setState({ ...state, ...geometry, referCursor, mouseCursor })
    }

    #calcGeometry(stackedIndicators: Indicator[]) {
        stackedIndicators = stackedIndicators || [];

        const yKlineView = this.hSpacing;
        const yVolumeView = yKlineView + this.hKlineView + this.hSpacing;
        const yIndicatorViews = yVolumeView + this.hVolumeView + this.hSpacing;
        const yAxisx = yIndicatorViews + stackedIndicators.length * (this.hIndicatorView + this.hSpacing);

        const svgHeight = yAxisx + this.hAxisx;
        const containerHeight = svgHeight + this.hTitle;
        const yCursorRange = [0, yAxisx];

        return { yKlineView, yVolumeView, yIndicatorViews, yAxisx, svgHeight, containerHeight, yCursorRange }
    }

    #indicatorViewId(n: number) {
        return 'indicator-' + n;
    }

    #calcXYMouses(x: number, y: number) {
        if (y >= this.state.yKlineView && y < this.state.yKlineView + this.hKlineView) {
            return { who: 'kline', x, y: y - this.state.yKlineView };

        } else if (y >= this.state.yVolumeView && y < this.state.yVolumeView + this.hVolumeView) {
            return { who: 'volume', x, y: y - this.state.yVolumeView };

        } else if (y > this.state.yAxisx && y < this.state.yAxisx + this.hAxisx) {
            return { who: 'axisx', x, y: y - this.state.yVolumeView };

        } else {
            if (this.state.stackedIndicators) {
                for (let n = 0; n < this.state.stackedIndicators.length; n++) {
                    const yIndicatorView = this.state.yIndicatorViews + n * (this.hIndicatorView + this.hSpacing);
                    if (y >= yIndicatorView && y < yIndicatorView + this.hIndicatorView) {
                        return { who: this.#indicatorViewId(n), x, y: y - yIndicatorView };
                    }
                }
            }
        }

        return undefined;
    }

    #plotCursor(x: number, color: string) {
        const crossPath = new Path;
        // crossPath.stroke_dasharray = '1, 1'

        // vertical line
        crossPath.moveto(x, this.state.yCursorRange[0]);
        crossPath.lineto(x, this.state.yCursorRange[1])

        return (
            <g shapeRendering="crispEdges" >
                {crossPath.render('container-cross', { stroke: color })}
            </g>
        )
    }

    isNotInAxisYArea(x: number) {
        return x < this.width - ChartView.AXISY_WIDTH
    }

    handleMouseLeave() {
        const xc = this.state.xc;
        if (xc === undefined) {
            return;
        }

        // clear mouse cursor
        xc.isMouseCuroseVisible = false;

        this.notify(UpdateEvent.Cursors);
    }

    handleMouseMove(e: React.MouseEvent) {
        const xc = this.state.xc;
        if (xc === undefined) {
            return;
        }

        const targetRect = e.currentTarget.getBoundingClientRect();
        const x = e.pageX - targetRect.left;
        const y = e.pageY - targetRect.top;

        const b = xc.bx(x);

        if (this.isNotInAxisYArea(x)) {
            // draw mouse cursor only when not in the axis-y area
            const row = xc.rb(b)
            xc.setMouseCursorByRow(row)
            xc.isMouseCuroseVisible = true

        } else {
            xc.isMouseCuroseVisible = false;
        }

        this.notify(UpdateEvent.Cursors, this.#calcXYMouses(x, y));
    }

    handleMouseDown(e: React.MouseEvent) {
        const xc = this.state.xc;
        if (xc === undefined) {
            return;
        }

        if (e.ctrlKey) {
            // will select chart on pane

        } else {
            // set refer cursor
            const targetRect = e.currentTarget.getBoundingClientRect();
            const x = e.pageX - targetRect.left;
            const y = e.pageY - targetRect.top;

            if (this.isNotInAxisYArea(x)) {
                const time = xc.tx(x);
                if (!xc.occurred(time)) {
                    return;
                }

                // align x to bar center
                const b = xc.bx(x);

                // draw refer cursor only when not in the axis-y area
                if (
                    y >= this.state.yCursorRange[0] && y <= this.state.svgHeight &&
                    b >= 1 && b <= xc.nBars
                ) {
                    const row = xc.rb(b)
                    xc.setReferCursorByRow(row, true)
                    xc.isReferCuroseVisible = true;

                    this.notify(UpdateEvent.Cursors);
                }

            } else {
                xc.isReferCuroseVisible = false;
                this.notify(UpdateEvent.Cursors)
            }
        }
    }

    handleWheel(e: React.WheelEvent) {
        const xc = this.state.xc;
        if (xc === undefined) {
            return;
        }

        const fastSteps = Math.floor(xc.nBars * 0.168)
        const delta = Math.round(e.deltaY / xc.nBars);
        console.log(e, delta)

        if (e.shiftKey) {
            // zoom in / zoom out 
            xc.growWBar(delta)

        } else if (e.ctrlKey) {
            if (!this.isInteractive) {
                return
            }

            const unitsToScroll = xc.isCursorAccelerated ? delta * fastSteps : delta;
            // move refer cursor left / right 
            xc.scrollReferCursor(unitsToScroll, true)

        } else {
            if (!this.isInteractive) {
                return
            }

            const unitsToScroll = xc.isCursorAccelerated ? delta * fastSteps : delta;
            // keep referCursor staying same x in screen, and move
            xc.scrollChartsHorizontallyByBar(unitsToScroll)
        }

        this.notify(UpdateEvent.Chart);
    }

    handleKeyDown(e: React.KeyboardEvent) {
        const xc = this.state.xc;
        if (xc === undefined) {
            return;
        }

        const fastSteps = Math.floor(xc.nBars * 0.168)

        switch (e.key) {
            case "ArrowLeft":
                if (e.ctrlKey) {
                    xc.moveCursorInDirection(fastSteps, -1)

                } else {
                    xc.moveChartsInDirection(fastSteps, -1)
                }
                break;

            case "ArrowRight":
                if (e.ctrlKey) {
                    xc.moveCursorInDirection(fastSteps, 1)

                } else {
                    xc.moveChartsInDirection(fastSteps, 1)
                }
                break;

            case "ArrowUp":
                if (!e.ctrlKey) {
                    xc.growWBar(1)
                }
                break;

            case "ArrowDown":
                if (!e.ctrlKey) {
                    xc.growWBar(-1);
                }
                break;

            default:
        }

        this.notify(UpdateEvent.Chart)
    }

    handleKeyUp(e: React.KeyboardEvent) {
        const xc = this.state.xc;
        if (xc === undefined) {
            return;
        }

        switch (e.key) {
            case " ":
                xc.isCursorAccelerated = !xc.isCursorAccelerated
                break;

            case "Escape":
                xc.isReferCuroseVisible = false;
                this.notify(UpdateEvent.Cursors)
                break;

            default:
        }
    }

    setOverlayIndicatorLabels(vs: string[], refVs?: string[]) {
        this.setState({ overlayIndicatorLabels: vs, referOverlayIndicatorLabels: refVs })
    }

    setStackedIndicatorLabels(n: number) {
        return (vs: string[], refVs?: string[]) => {
            let stackedIndicatorLabels = this.state.stackedIndicatorLabels
            stackedIndicatorLabels = stackedIndicatorLabels || new Array(this.state.stackedIndicators.length)
            stackedIndicatorLabels[n] = vs;

            let referStackedIndicatorLabels = this.state.referStackedIndicatorLabels
            referStackedIndicatorLabels = referStackedIndicatorLabels || new Array(this.state.stackedIndicators.length)
            referStackedIndicatorLabels[n] = refVs;

            this.setState({ stackedIndicatorLabels, referStackedIndicatorLabels })
        }
    }

    render() {
        return this.state.isLoaded && (
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
                        xc={this.state.xc}
                        tvar={this.state.kvar}
                        shouldUpdateChart={this.state.shouldUpdateChart}
                        shouldUpadteCursors={this.state.shouldUpdateCursors}
                    />
                    <div className="borderLeftUp" style={{ top: this.hTitle - 8 }} />
                </div>

                <div style={{ position: 'relative', width: this.width + 'px', height: this.state.svgHeight + 'px' }}>
                    <svg viewBox={`0, 0, ${this.width} ${this.state.svgHeight}`} width={this.width} height={this.state.svgHeight} vectorEffect="non-scaling-stroke"
                        onMouseMove={this.handleMouseMove}
                        onMouseLeave={this.handleMouseLeave}
                        onMouseDown={this.handleMouseDown}
                        onWheel={this.handleWheel}
                        style={{ zIndex: 1 }}
                    >
                        <KlineView
                            id={"kline"}
                            y={this.state.yKlineView}
                            height={this.hKlineView}
                            x={0}
                            width={this.width}
                            name="ETH"
                            xc={this.state.xc}
                            baseSer={this.state.baseSer}
                            tvar={this.state.kvar}
                            isKlineView={true}
                            shouldUpdateChart={this.state.shouldUpdateChart}
                            shouldUpdateCursors={this.state.shouldUpdateCursors}
                            overlayIndicator={this.state.overlayIndicator}
                            updateOverlayIndicatorLabels={this.setOverlayIndicatorLabels}
                        />

                        <VolumeView
                            id={"volume"}
                            y={this.state.yVolumeView}
                            height={this.hVolumeView}
                            x={0}
                            width={this.width}
                            name="Vol"
                            xc={this.state.xc}
                            baseSer={this.state.baseSer}
                            tvar={this.state.kvar}
                            shouldUpdateChart={this.state.shouldUpdateChart}
                            shouldUpdateCursors={this.state.shouldUpdateCursors}
                        />

                        <AxisX
                            id={"axisx"}
                            y={this.state.yAxisx}
                            height={this.hAxisx}
                            x={0}
                            width={this.width}
                            xc={this.state.xc}
                            shouldUpdateChart={this.state.shouldUpdateChart}
                            shouldUpdateCursors={this.state.shouldUpdateCursors}
                        />
                        {
                            this.state.stackedIndicators.map(({ tvar, outputs }, n) =>
                                <IndicatorView
                                    key={"stacked-indicator-view-" + n}
                                    id={this.#indicatorViewId(n)}
                                    y={this.state.yIndicatorViews + n * (this.hIndicatorView + this.hSpacing)}
                                    height={this.hIndicatorView}
                                    x={0}
                                    name={"Indicator-" + n}
                                    width={this.width}
                                    xc={this.state.xc}
                                    baseSer={this.state.baseSer}
                                    tvar={tvar}
                                    mainIndicatorOutputs={outputs}
                                    shouldUpdateChart={this.state.shouldUpdateChart}
                                    shouldUpdateCursors={this.state.shouldUpdateCursors}
                                    updateStackedIndicatorLabels={this.setStackedIndicatorLabels(n)}
                                />
                            )
                        }

                        {this.state.referCursor}
                        {this.state.mouseCursor}

                    </svg>

                    {/* labels for overlay indicator  */}
                    <div style={{
                        position: 'absolute',
                        top: this.state.yKlineView - this.hSpacing + 2,
                        zIndex: 2, // ensure it's above the SVG
                        backgroundColor: 'transparent',
                        width: this.width - ChartView.AXISY_WIDTH,
                        display: 'flex', justifyContent: 'space-between',
                        padding: '0px 0px'
                    }}>
                        <Toolbar style={{ backgroundColor: 'inherit', color: 'white' }} >
                            <Group aria-label="overlay" style={{ backgroundColor: 'inherit' }}>
                                {
                                    this.state.overlayIndicator.outputs.map(({ title, color }, n) =>
                                        <span key={"overlay-indicator-lable-" + n} >
                                            <Text style={{ color: '#00FF00' }}>{title}&nbsp;</Text>
                                            <Text style={{ color }}>{
                                                this.state.overlayIndicatorLabels &&
                                                this.state.overlayIndicatorLabels[n]}
                                                &nbsp;&nbsp;
                                            </Text>
                                        </span>
                                    )
                                }
                            </Group>
                        </Toolbar>

                        <Toolbar style={{ backgroundColor: 'inherit', color: 'white' }} >
                            <Group aria-label="overlay-refer" style={{ backgroundColor: 'inherit' }}>
                                {
                                    this.state.xc.isReferCuroseVisible && this.state.overlayIndicator.outputs.map(({ title, color }, n) =>
                                        <span key={"ovarlay-indicator-lable-" + n} >
                                            <Text style={{ color: '#00F0F0F0' }}>{title}&nbsp;</Text>
                                            <Text style={{ color }}>{
                                                this.state.referOverlayIndicatorLabels &&
                                                this.state.referOverlayIndicatorLabels[n]}
                                                &nbsp;&nbsp;
                                            </Text>
                                        </span>
                                    )
                                }
                            </Group>
                        </Toolbar>
                    </div>

                    {/* labels for stacked indicators */}
                    {
                        this.state.stackedIndicators.map(({ outputs }, n) =>
                            <div key={"indicator-title-" + n} style={{
                                position: 'absolute',
                                top: this.state.yIndicatorViews + n * (this.hIndicatorView + this.hSpacing) - this.hSpacing + 2,
                                zIndex: 2, // ensure it's above the SVG
                                backgroundColor: 'transparent',
                                width: this.width - ChartView.AXISY_WIDTH,
                                display: 'flex', justifyContent: 'space-between',
                                padding: '0px 0px'
                            }}>
                                <Toolbar style={{ backgroundColor: 'inherit', color: 'white' }}>
                                    <Group aria-label="stacked-mouse" style={{ backgroundColor: 'inherit' }}>
                                        {
                                            outputs.map(({ title, color }, k) =>
                                                <span key={"stacked-indicator-label-" + n + '-' + k} >
                                                    <Text style={{ color: '#00FF00' }}>{title}&nbsp;</Text>
                                                    <Text style={{ color }}>{
                                                        this.state.stackedIndicatorLabels &&
                                                        this.state.stackedIndicatorLabels[n] &&
                                                        this.state.stackedIndicatorLabels[n][k]}
                                                        &nbsp;&nbsp;
                                                    </Text>
                                                </span>
                                            )
                                        }
                                    </Group>
                                </Toolbar>

                                <Toolbar style={{ backgroundColor: 'inherit', color: 'white' }}>
                                    <Group aria-label="stacked-refer" style={{ backgroundColor: 'inherit' }}>
                                        {
                                            this.state.xc.isReferCuroseVisible && outputs.map(({ title, color }, k) =>
                                                <span key={"stacked-indicator-label-" + n + '-' + k} >
                                                    <Text style={{ color: '#00F0F0F0' }}>{title}&nbsp;</Text>
                                                    <Text style={{ color }}>{
                                                        this.state.referStackedIndicatorLabels &&
                                                        this.state.referStackedIndicatorLabels[n] &&
                                                        this.state.referStackedIndicatorLabels[n][k]}
                                                        &nbsp;&nbsp;
                                                    </Text>
                                                </span>
                                            )
                                        }
                                    </Group>
                                </Toolbar>
                            </div>
                        )
                    }
                </div>

                <div className="title" style={{ width: this.width, height: this.hHelp }}>
                    <Help width={this.width} height={this.hHelp} />
                    <div className="borderLeftUp" style={{ top: this.hHelp - 8 }} />
                </div>
            </div >
        )
    }
}

export default KlineViewContainer 