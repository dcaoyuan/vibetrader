import React, { Component, Fragment, type JSX } from "react";
import { KlineView } from "./KlineView";
import { VolumeView } from "./VolumeView";
import { ChartXControl } from "./ChartXControl";
import { ChartView, UpdateEvent, type CallbacksToContainer, type Indicator, type UpdateCursor, type UpdateDrawing } from "./ChartView";
import AxisX from "../pane/AxisX";
import type { TSer } from "../../timeseris/TSer";
import type { TVar } from "../../timeseris/TVar";
import { Kline } from "../../domain/Kline";
import { Path } from "../../svg/Path";
import Title from "../pane/Title";
import { Help } from "../pane/Help";
import { TSerProvider } from "../../domain/TSerProvider";
import { IndicatorView } from "./IndicatorView";
import { Button, Group, Separator, Text, Toolbar } from 'react-aria-components';
import { TagGroup, TagList, Tag, Label } from 'react-aria-components';
import { ToggleButtonGroup, ToggleButton } from 'react-aria-components';
import { OverlayArrow, Tooltip, TooltipTrigger } from 'react-aria-components';
import type { Key, TooltipProps } from 'react-aria-components';
import { Context, PineTS } from "@vibetrader/pinets";
import { DefaultTSer } from "../../timeseris/DefaultTSer";
import { TFrame } from "../../timeseris/TFrame";
import * as Binance from "../../domain/BinanaceData";
import { EqualsIcon, HashIcon, LineSegmentIcon, NotchesIcon, LadderSimpleIcon, PlusIcon, NotEqualsIcon, MinusCircleIcon } from "@phosphor-icons/react";

type Props = {
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
    tzone?: string;
    tframe?: TFrame;
    symbol?: string;

    baseSer?: TSer;
    kvar?: TVar<Kline>;
    xc?: ChartXControl;

    shouldUpdateChart?: number;
    shouldUpdateCursor?: UpdateCursor;
    shouldUpdateDrawing?: UpdateDrawing;

    mouseCursor?: JSX.Element;
    referCursor?: JSX.Element;

    overlayIndicators?: Indicator[];
    stackedIndicators?: Indicator[];

    overlayIndicatorLabels?: string[][];
    stackedIndicatorLabels?: string[][];

    referOverlayIndicatorLabels?: string[][];
    referStackedIndicatorLabels?: string[][];

    selectedIndicatorTags?: 'all' | Set<Key>;
    selectedDrawingIds?: Set<Key>;

    yKlineView?: number;
    yVolumeView?: number;
    yIndicatorViews?: number;
    yAxisx?: number;
    svgHeight?: number;
    containerHeight?: number;
    yCursorRange?: number[];

    isLoaded?: boolean;

}


interface VTTooltipProps extends Omit<TooltipProps, 'children'> {
    children: React.ReactNode;
}

const VTTooltip = ({ children, ...props }: VTTooltipProps) => {
    return (
        <Tooltip {...props}>
            <OverlayArrow>
                <svg width={8} height={8} viewBox="0 0 8 8">
                    <path d="M0 0 L4 4 L8 0" />
                </svg>
            </OverlayArrow>
            {children}
        </Tooltip>
    );
}

const KVAR_NAME = "kline";

const allInds = ['ema', 'sma', 'rsi', 'macd']

class KlineViewContainer extends Component<Props, State> {
    width: number;
    isInteractive: boolean;

    refreshTimeoutId = undefined;
    globalKeyboardListener = undefined

    loadedIndFns: Map<string, ((pinets: PineTS) => unknown)>;

    latestTime: number;

    focusRef: React.RefObject<HTMLDivElement>;

    // geometry variables
    hTitle = 130;
    hIndtags = 26;
    hHelp = 80;

    hKlineView = 400;
    hVolumeView = 100;
    hIndicatorView = 160;
    hAxisx = 40;
    hSpacing = 25;

    callbacks: CallbacksToContainer

    constructor(props: Props) {
        super(props);
        this.width = props.width;

        const tzone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        //const tzone = "America/Vancouver"
        const tframe = TFrame.DAILY
        const symbol = "BTCUSDC"

        const baseSer = new DefaultTSer(tframe, tzone, 1000);
        const kvar = baseSer.varOf(KVAR_NAME) as TVar<Kline>;

        const xc = new ChartXControl(baseSer, this.width - ChartView.AXISY_WIDTH);

        this.focusRef = React.createRef();

        console.log("KlinerViewContainer render");

        const geometry = this.#calcGeometry([]);
        this.state = {
            symbol,
            tzone,
            tframe,
            baseSer,
            kvar,
            xc,
            shouldUpdateChart: 0,
            shouldUpdateCursor: { changed: 0 },
            shouldUpdateDrawing: {},
            stackedIndicators: [],
            selectedIndicatorTags: new Set(['ema', 'rsi', 'macd']),
            selectedDrawingIds: new Set(),
            ...geometry,
        }

        this.setOverlayIndicatorLabels = this.setOverlayIndicatorLabels.bind(this)
        this.setStackedIndicatorLabels = this.setStackedIndicatorLabels.bind(this)
        this.setSelectedIndicatorTags = this.setSelectedIndicatorTags.bind(this)
        this.setSelectedDrawingIds = this.setSelectedDrawingIds.bind(this)

        this.onGlobalKeyDown = this.onGlobalKeyDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onWheel = this.onWheel.bind(this);

        this.callbacks = {
            updateOverlayIndicatorLabels: this.setOverlayIndicatorLabels,
            updateStackedIndicatorLabels: this.setStackedIndicatorLabels,
            updateSelectedDrawingIds: this.setSelectedDrawingIds,
        }
    }

    fetchIndicatorFns = (indNames: string[]) =>
        Promise.all(
            indNames.map(indName => this.fetchIndicatorFn(indName))
        )

    fetchIndicatorFn = (indName: string) =>
        fetch("./indicators/" + indName + ".js")
            .then(r => r.text())
            .then(js => {
                js = js + "\n return ind;"
                const indicatorsFunction = new Function(js);
                const fn = indicatorsFunction();

                return { indName, fn };
            })

    fetchDataLocal = (startTime?: number) => fetch("./klines.json")
        .then(r => r.json())
        .then(json => {
            for (const k of json) {
                const time = Date.parse(k.Date);
                const kline = new Kline(time, k.Open, k.High, k.Low, k.Close, k.Volume, time, true);
                this.state.baseSer.addToVar(KVAR_NAME, kline);
            }

            return undefined; // latestTime
        })

    fetchDataBinance = async (startTime?: number) => {
        const endTime = new Date().getTime();
        startTime = startTime
            ? startTime :
            endTime - 300 * 3600 * 1000 * 24; // back 300 days

        return Binance.fetchAllKlines(this.state.symbol, this.state.tframe.shortName.toLowerCase(), startTime, endTime)
            .then(binanceKline => {
                // console.log(`\nSuccessfully fetched ${binanceKline.length} klines`);

                // Sort by openTime to ensure chronological order
                binanceKline.sort((a, b) => a.openTime - b.openTime);

                // Remove duplicates (in case of any overlap)
                const uniqueKlines = binanceKline.filter((kline, index, self) =>
                    index === self.findIndex((k) => k.openTime === kline.openTime)
                );

                // console.log(`After deduplication: ${uniqueKlines.length} klines`);

                const latestKline = uniqueKlines.length > 0 ? uniqueKlines[uniqueKlines.length - 1] : undefined;
                // console.log(`latestKline: ${new Date(latestKline.openTime)}, ${latestKline.close}`)

                for (const k of uniqueKlines) {
                    const kline = new Kline(k.openTime, k.open, k.high, k.low, k.close, k.volume, k.closeTime, true);
                    this.state.baseSer.addToVar(KVAR_NAME, kline);
                }

                return latestKline ? latestKline.openTime : undefined;
            })

    }

    fetchData_calcInds = (startTime?: number, selectedIndicatorTags?: 'all' | Set<string | number>) => {
        this.fetchDataBinance(startTime)
            .catch(ex => {
                console.error(ex);
                return this.fetchDataLocal()
            })
            .then((latestTime) => {
                let start = performance.now()

                let selectedIndicatorFns = new Map<string, ((pinets: PineTS) => unknown)>();
                const selectedIndicatorTagsNow = selectedIndicatorTags || this.state.selectedIndicatorTags
                if (selectedIndicatorTagsNow === 'all') {
                    selectedIndicatorFns = this.loadedIndFns;

                } else {
                    for (const indName of selectedIndicatorTagsNow) {
                        selectedIndicatorFns.set(indName as string, this.loadedIndFns.get(indName as string))
                    }
                }

                const pinets = new PineTS(new TSerProvider(this.state.kvar), 'ETH', '1d');

                const fnRuns: Promise<{ indName: string, result: Context }>[] = []
                for (const [indName, fn] of selectedIndicatorFns) {
                    const fnRun = pinets.run(fn).then(result => ({ indName, result }));
                    fnRuns.push(fnRun)
                }

                Promise.all(fnRuns).then(results => {
                    console.log(`indicators calclated in ${performance.now() - start} ms`);

                    start = performance.now();

                    let overlay = false
                    const overlayIndicators = [];
                    const stackedIndicators = [];

                    results.map(({ indName, result }, n) => {
                        const tvar = this.state.baseSer.varOf(indName) as TVar<unknown[]>;
                        const size = this.state.baseSer.size();
                        const plotValues = Object.values(result.plots) as Plot[];
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
                            overlayIndicators.push({ indName, tvar, outputs })

                        } else {
                            stackedIndicators.push({ indName, tvar, outputs })
                        }
                    })

                    // console.log(`indicators added to series in ${performance.now() - start} ms`);

                    this.latestTime = latestTime;

                    if (this.state.isLoaded) {
                        // regular update
                        if (selectedIndicatorTags !== undefined) { // selectedIndicatorTags changed
                            this.updateState({
                                overlayIndicators,
                                stackedIndicators,
                                selectedIndicatorTags
                            })

                        } else {
                            this.updateState({
                                shouldUpdateChart: this.state.shouldUpdateChart + 1,
                                overlayIndicators,
                                stackedIndicators,
                            })
                        }

                    } else {
                        // reinit it to get correct last occured time/row 
                        this.state.xc.reinit()

                        this.updateState({
                            isLoaded: true,
                            overlayIndicators,
                            stackedIndicators,
                        })
                    }

                    if (latestTime !== undefined) {
                        this.refreshTimeoutId = setTimeout(() => this.fetchData_calcInds(latestTime), 5000)
                    }

                })

            })

    }

    onGlobalKeyDown(e: KeyboardEvent) {
        if (
            document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA'
        ) {
            return;
        }

        const xc = this.state.xc;
        xc.isMouseCursorEnabled = false;

        const fastSteps = Math.floor(xc.nBars * 0.168)

        switch (e.key) {
            case "ArrowLeft":
                if (e.ctrlKey) {
                    xc.moveCursorInDirection(fastSteps, -1)

                } else {
                    xc.moveChartsInDirection(fastSteps, -1)
                }
                this.notify(UpdateEvent.Chart)
                break;

            case "ArrowRight":
                if (e.ctrlKey) {
                    xc.moveCursorInDirection(fastSteps, 1)

                } else {
                    xc.moveChartsInDirection(fastSteps, 1)
                }

                this.notify(UpdateEvent.Chart)
                break;

            case "ArrowUp":
                if (!e.ctrlKey) {
                    xc.growWBar(1)
                    this.notify(UpdateEvent.Chart)
                }
                break;

            case "ArrowDown":
                if (!e.ctrlKey) {
                    xc.growWBar(-1);
                    this.notify(UpdateEvent.Chart)
                }
                break;

            case " ":
                xc.isCursorAccelerated = !xc.isCursorAccelerated
                break;

            case "Escape":
                if (xc.selectedDrawingIdx !== undefined) {
                    xc.isReferCursorEnabled = false;
                    this.setState({ shouldUpdateDrawing: { action: 'deselect' } })
                    break;
                }

                if (xc.isReferCursorEnabled) {
                    xc.isReferCursorEnabled = false;

                } else {
                    xc.isCrosshairEnabled = !xc.isCrosshairEnabled
                }

                this.notify(UpdateEvent.Cursors)
                break;

            case 'Delete':
                console.log('delet')
                this.setState({ shouldUpdateDrawing: { action: 'delete' } })
                break;

            default:
        }

    }

    override componentDidMount() {
        this.fetchIndicatorFns(allInds).then(fns => {
            this.loadedIndFns = new Map();
            for (const { indName, fn } of fns) {
                this.loadedIndFns.set(indName, fn);
            }

        }).then(() => {
            this.fetchData_calcInds(undefined, this.state.selectedIndicatorTags)

            this.globalKeyboardListener = this.onGlobalKeyDown;
            document.addEventListener("keydown", this.onGlobalKeyDown);

            if (this.focusRef.current) {
                this.focusRef.current.focus()
            }
        })

    }

    override componentWillUnmount() {
        if (this.refreshTimeoutId) {
            clearTimeout(this.refreshTimeoutId);
        }

        if (this.globalKeyboardListener) {
            document.removeEventListener("keydown", this.onGlobalKeyDown)
        }
    }

    notify(event: UpdateEvent, xyMouse?: { who: string, x: number, y: number }) {
        switch (event) {
            case UpdateEvent.Chart:
                this.updateState({ shouldUpdateChart: this.state.shouldUpdateChart + 1 });
                break;

            case UpdateEvent.Cursors:
                this.updateState({ shouldUpdateCursor: { changed: this.state.shouldUpdateCursor.changed + 1, xyMouse } })
                break;

            default:
        }
    }

    updateState(state: State) {
        const xc = state.xc || this.state.xc;

        let referCursor: JSX.Element
        let mouseCursor: JSX.Element
        const referColor = '#00F0F0C0'; // 'orange'
        if (xc.isReferCursorEnabled) {
            const time = xc.tr(xc.referCursorRow)
            if (xc.occurred(time)) {
                const cursorX = xc.xr(xc.referCursorRow)
                referCursor = this.#plotCursor(cursorX, referColor)
            }
        }

        if (xc.isMouseCursorEnabled) {
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
        const containerHeight = svgHeight + this.hTitle + this.hHelp + this.hIndtags;
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
        if (this.state.selectedDrawingIds.size > 0 || this.state.xc.isCrosshairEnabled) {
            return <></>
        }

        const crosshair = new Path;
        // vertical line
        crosshair.moveto(x, this.state.yCursorRange[0]);
        crosshair.lineto(x, this.state.yCursorRange[1])

        return (
            <g>
                {crosshair.render({ key: 'container-cross', style: { stroke: color, strokeWidth: '0.7px' } })}
            </g>
        )
    }

    isNotInAxisYArea(x: number) {
        return x < this.width - ChartView.AXISY_WIDTH
    }

    onMouseLeave() {
        const xc = this.state.xc;

        // clear mouse cursor
        xc.isMouseCursorEnabled = false;

        this.notify(UpdateEvent.Cursors);
    }

    onMouseMove(e: React.MouseEvent) {
        const xc = this.state.xc;

        if (
            this.state.selectedDrawingIds.size > 0 ||
            xc.selectedDrawingIdx !== undefined ||
            xc.hitDrawingIdx !== undefined
        ) {
            xc.isMouseCursorEnabled = false;
            this.notify(UpdateEvent.Cursors);
            return
        }

        const targetRect = e.currentTarget.getBoundingClientRect();
        const x = e.pageX - targetRect.left;
        const y = e.pageY - targetRect.top;

        const b = xc.bx(x);

        if (this.isNotInAxisYArea(x)) {
            // draw mouse cursor only when not in the axis-y area
            const row = xc.rb(b)
            xc.setMouseCursorByRow(row)
            xc.isMouseCursorEnabled = true

        } else {
            xc.isMouseCursorEnabled = false;
        }

        this.notify(UpdateEvent.Cursors, this.#calcXYMouses(x, y));
    }

    onMouseUp(e: React.MouseEvent) {
        const xc = this.state.xc;

        if (
            this.state.selectedDrawingIds.size > 0 ||
            xc.selectedDrawingIdx !== undefined
        ) {
            return
        }

        xc.isMouseCursorEnabled = false;

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
                    xc.isReferCursorEnabled = true;

                    this.notify(UpdateEvent.Cursors);
                }

            } else {
                xc.isReferCursorEnabled = false;
                this.notify(UpdateEvent.Cursors)
            }
        }
    }

    onWheel(e: React.WheelEvent) {
        const xc = this.state.xc;

        xc.isMouseCursorEnabled = false;

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

    setOverlayIndicatorLabels(vs: string[][], refVs?: string[][]) {
        let overlayIndicatorLabels = this.state.overlayIndicatorLabels
        let referOverlayIndicatorLabels = this.state.referOverlayIndicatorLabels

        const nOverlayInds = this.state.overlayIndicators.length

        overlayIndicatorLabels = overlayIndicatorLabels || new Array(nOverlayInds)
        referOverlayIndicatorLabels = referOverlayIndicatorLabels || new Array(nOverlayInds)

        for (let n = 0; n < nOverlayInds; n++) {
            overlayIndicatorLabels[n] = vs[n];
            referOverlayIndicatorLabels[n] = refVs[n];
        }

        this.setState({ overlayIndicatorLabels, referOverlayIndicatorLabels })
    }


    setStackedIndicatorLabels_old(n: number) {
        return (vs: string[], refVs?: string[]) => {
            let stackedIndicatorLabels = this.state.stackedIndicatorLabels
            let referStackedIndicatorLabels = this.state.referStackedIndicatorLabels

            stackedIndicatorLabels = stackedIndicatorLabels || new Array(this.state.stackedIndicators.length)
            referStackedIndicatorLabels = referStackedIndicatorLabels || new Array(this.state.stackedIndicators.length)

            stackedIndicatorLabels[n] = vs;
            referStackedIndicatorLabels[n] = refVs;

            this.setState({ stackedIndicatorLabels, referStackedIndicatorLabels })
        }
    }

    setStackedIndicatorLabels(n: number, vs: string[], refVs?: string[]) {
        let stackedIndicatorLabels = this.state.stackedIndicatorLabels
        let referStackedIndicatorLabels = this.state.referStackedIndicatorLabels

        stackedIndicatorLabels = stackedIndicatorLabels || new Array(this.state.stackedIndicators.length)
        referStackedIndicatorLabels = referStackedIndicatorLabels || new Array(this.state.stackedIndicators.length)

        stackedIndicatorLabels[n] = vs;
        referStackedIndicatorLabels[n] = refVs;

        this.setState({ stackedIndicatorLabels, referStackedIndicatorLabels })
    }


    setSelectedIndicatorTags(selectedTags: 'all' | Set<Key>) {
        if (this.refreshTimeoutId) {
            clearTimeout(this.refreshTimeoutId);
        }

        this.fetchData_calcInds(this.latestTime, selectedTags)
    }

    setSelectedDrawingIds(ids?: Set<Key>) {
        if (ids === undefined || ids.size === 0) {
            this.setState({
                shouldUpdateDrawing: { action: 'create', createDrawingId: undefined },
                selectedDrawingIds: new Set()
            })

        } else {
            const [drawingId] = ids
            this.setState({
                shouldUpdateDrawing: { action: 'create', createDrawingId: drawingId as string },
                selectedDrawingIds: ids
            })
        }
    }

    render() {
        return this.state.isLoaded && (
            <div style={{ display: "flex" }} >

                {/* Toolbar */}
                <div style={{ display: "flex", paddingRight: "6px", paddingTop: '4px' }}>
                    <Toolbar aria-label="Tools" orientation="vertical" >
                        <ToggleButtonGroup
                            aria-label="Drawing"
                            selectionMode="single"
                            orientation="vertical"
                            style={{ flexDirection: "column" }}
                            selectedKeys={this.state.selectedDrawingIds}
                            onSelectionChange={this.setSelectedDrawingIds}
                        >
                            <TooltipTrigger delay={0}>
                                <ToggleButton id="line" aria-label="Line"><LineSegmentIcon fill="white" /></ToggleButton>
                                <VTTooltip placement="end">
                                    Draw line
                                </VTTooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={0}>
                                <ToggleButton id="parallel" aria-label="ParallelLine"><NotchesIcon fill="white" /></ToggleButton>
                                <VTTooltip placement="end">
                                    Draw parallel
                                </VTTooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={0}>
                                <ToggleButton id="ladder" aria-label="Icon3"><LadderSimpleIcon fill="white" /></ToggleButton>
                                <VTTooltip placement="end">
                                    TODO
                                </VTTooltip>
                            </TooltipTrigger>

                        </ToggleButtonGroup>


                        <Separator orientation="horizontal" />

                        <Group aria-label="Tools" style={{ flexDirection: "column" }}>
                            <TooltipTrigger delay={0}>
                                <ToggleButton id="showdrawing" aria-label="showdrawing"
                                    isSelected={this.state.shouldUpdateDrawing.isHidingDrawing}
                                    onChange={() => this.setState({ shouldUpdateDrawing: { action: 'hide', isHidingDrawing: !this.state.shouldUpdateDrawing.isHidingDrawing } })}>
                                    <NotEqualsIcon fill="white" />
                                </ToggleButton>
                                <VTTooltip placement="end">
                                    Hide drawings
                                </VTTooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={0}>
                                <ToggleButton id="crosshair" aria-label="crosshair">
                                    <PlusIcon fill="white" />
                                </ToggleButton>
                                <VTTooltip placement="end">
                                    Show crosshair
                                </VTTooltip>
                            </TooltipTrigger>


                            <Button aria-label="Icon1"><EqualsIcon fill="white" /></Button>

                            <TooltipTrigger delay={0}>
                                <Button aria-label="delete"
                                    onClick={() => this.setState({ shouldUpdateDrawing: { action: 'delete' } })}
                                >
                                    <MinusCircleIcon fill="white" />
                                </Button>
                                <VTTooltip placement="end">
                                    Delete selected drawing
                                </VTTooltip>
                            </TooltipTrigger>

                        </Group>
                    </Toolbar>
                </div>

                <div className="container" style={{ width: this.width + 'px', height: this.state.containerHeight + 'px' }}
                    key="klineviewcontainer"
                    ref={this.focusRef}
                >
                    <div className="title" style={{ width: this.width, height: this.hTitle }}>
                        <Title
                            width={this.width}
                            height={this.hTitle}
                            xc={this.state.xc}
                            tvar={this.state.kvar}
                            symbol={this.state.symbol}
                            shouldUpdateChart={this.state.shouldUpdateChart}
                            shouldUpadteCursors={this.state.shouldUpdateCursor}
                        />
                        <div className="borderLeftUp" style={{ top: this.hTitle - 8 }} />
                    </div>

                    <div className="" style={{ width: this.width, height: this.hIndtags, paddingTop: "6px" }}>
                        <TagGroup
                            aria-label="ind-tags"
                            selectionMode="multiple"
                            selectedKeys={this.state.selectedIndicatorTags}
                            onSelectionChange={this.setSelectedIndicatorTags}
                        >
                            <TagList>
                                {allInds.map((tag, n) =>
                                    <Tag aria-label={tag} key={"ind-tag-" + n} id={tag}>{tag.toUpperCase()}</Tag>
                                )}
                            </TagList>
                        </TagGroup>
                    </div>

                    <div style={{ position: 'relative', width: this.width + 'px', height: this.state.svgHeight + 'px' }}>
                        <svg viewBox={`0, 0, ${this.width} ${this.state.svgHeight}`} width={this.width} height={this.state.svgHeight} vectorEffect="non-scaling-stroke"
                            onMouseLeave={this.onMouseLeave}
                            onMouseMove={this.onMouseMove}
                            onMouseUp={this.onMouseUp}
                            onWheel={this.onWheel}
                            style={{ zIndex: 1 }}
                        >
                            <KlineView
                                id={"kline"}
                                x={0}
                                y={this.state.yKlineView}
                                width={this.width}
                                height={this.hKlineView}
                                name="ETH"
                                xc={this.state.xc}
                                baseSer={this.state.baseSer}
                                tvar={this.state.kvar}
                                shouldUpdateChart={this.state.shouldUpdateChart}
                                shouldUpdateCursor={this.state.shouldUpdateCursor}
                                shouldUpdateDrawing={this.state.shouldUpdateDrawing}

                                overlayIndicators={this.state.overlayIndicators}

                                callbacksToContainer={this.callbacks}
                            />

                            <VolumeView
                                id={"volume"}
                                x={0}
                                y={this.state.yVolumeView}
                                width={this.width}
                                height={this.hVolumeView}
                                name="Vol"
                                xc={this.state.xc}
                                baseSer={this.state.baseSer}
                                tvar={this.state.kvar}
                                shouldUpdateChart={this.state.shouldUpdateChart}
                                shouldUpdateCursor={this.state.shouldUpdateCursor}
                            />

                            <AxisX
                                id={"axisx"}
                                x={0}
                                y={this.state.yAxisx}
                                width={this.width}
                                height={this.hAxisx}
                                xc={this.state.xc}
                                shouldUpdateChart={this.state.shouldUpdateChart}
                                shouldUpdateCursors={this.state.shouldUpdateCursor}
                            />
                            {
                                this.state.stackedIndicators.map(({ indName, tvar, outputs }, n) =>
                                    <IndicatorView
                                        key={"stacked-indicator-view-" + indName}
                                        id={this.#indicatorViewId(n)}
                                        name={"Indicator-" + n}
                                        x={0}
                                        y={this.state.yIndicatorViews + n * (this.hIndicatorView + this.hSpacing)}
                                        width={this.width}
                                        height={this.hIndicatorView}
                                        xc={this.state.xc}
                                        baseSer={this.state.baseSer}
                                        tvar={tvar}
                                        mainIndicatorOutputs={outputs}
                                        shouldUpdateChart={this.state.shouldUpdateChart}
                                        shouldUpdateCursor={this.state.shouldUpdateCursor}
                                        indexOfStackedIndicators={n}
                                        callbacksToContainer={this.callbacks}
                                    />
                                )
                            }

                            {this.state.referCursor}
                            {this.state.mouseCursor}

                        </svg>

                        {
                            // labels for overlay indicators
                            this.state.overlayIndicators.map(({ outputs }, m) =>
                                <Fragment key={"indicator-values-" + m}>
                                    <div style={{
                                        position: 'absolute',
                                        top: this.state.yKlineView + m * 13 - this.hSpacing + 2,
                                        zIndex: 2, // ensure it's above the SVG
                                        backgroundColor: 'transparent',
                                    }}>
                                        <Toolbar style={{ backgroundColor: 'inherit', color: 'white' }} >
                                            <Group aria-label="overlay" style={{ backgroundColor: 'inherit' }}>
                                                {
                                                    outputs.map(({ title, color }, n) =>
                                                        <span key={"overlay-indicator-lable-" + title} >
                                                            <Text style={{ color: '#00FF00' }}>{title}&nbsp;</Text>
                                                            <Text style={{ color }}>{
                                                                this.state.overlayIndicatorLabels !== undefined &&
                                                                this.state.overlayIndicatorLabels[m] !== undefined &&
                                                                this.state.overlayIndicatorLabels[m][n]
                                                            }
                                                                &nbsp;&nbsp;
                                                            </Text>
                                                        </span>
                                                    )
                                                }
                                            </Group>
                                        </Toolbar>
                                    </div>

                                    <div style={{
                                        position: 'absolute',
                                        top: this.state.yKlineView + m * 13 - this.hSpacing + 2,
                                        right: ChartView.AXISY_WIDTH,
                                        zIndex: 2, // ensure it's above the SVG
                                        backgroundColor: 'transparent',
                                    }}>
                                        <Toolbar style={{ backgroundColor: 'inherit', color: 'white' }} >
                                            <Group aria-label="overlay-refer" style={{ backgroundColor: 'inherit' }}>
                                                {
                                                    this.state.xc.isReferCursorEnabled && outputs.map(({ title, color }, n) =>
                                                        <span key={"ovarlay-indicator-lable-" + title} >
                                                            <Text style={{ color: '#00F0F0F0' }}>{title}&nbsp;</Text>
                                                            <Text style={{ color }}>{
                                                                this.state.referOverlayIndicatorLabels &&
                                                                this.state.referOverlayIndicatorLabels[m] &&
                                                                this.state.referOverlayIndicatorLabels[m][n]
                                                            }
                                                                &nbsp;&nbsp;
                                                            </Text>
                                                        </span>
                                                    )
                                                }
                                            </Group>
                                        </Toolbar>
                                    </div>
                                </Fragment>)
                        }

                        {
                            // labels for stacked indicators
                            this.state.stackedIndicators.map(({ outputs }, n) =>
                                <Fragment key={"indicator-values-" + n}>
                                    <div style={{
                                        position: 'absolute',
                                        top: this.state.yIndicatorViews + n * (this.hIndicatorView + this.hSpacing) - this.hSpacing + 2,
                                        zIndex: 2, // ensure it's above the SVG
                                        backgroundColor: 'transparent',
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
                                                                this.state.stackedIndicatorLabels[n][k]
                                                            }
                                                                &nbsp;&nbsp;
                                                            </Text>
                                                        </span>
                                                    )
                                                }
                                            </Group>
                                        </Toolbar>

                                    </div>

                                    <div style={{
                                        position: 'absolute',
                                        top: this.state.yIndicatorViews + n * (this.hIndicatorView + this.hSpacing) - this.hSpacing + 2,
                                        right: ChartView.AXISY_WIDTH,
                                        zIndex: 2, // ensure it's above the SVG
                                        backgroundColor: 'transparent',
                                    }}>
                                        <Toolbar style={{ backgroundColor: 'inherit', color: 'white' }}>
                                            <Group aria-label="stacked-refer" style={{ backgroundColor: 'inherit' }}>
                                                {
                                                    this.state.xc.isReferCursorEnabled && outputs.map(({ title, color }, k) =>
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
                                </Fragment>
                            )
                        }
                    </div>

                    <div className="title" style={{ width: this.width, height: this.hHelp }}>
                        <Help width={this.width} height={this.hHelp} />
                        <div className="borderLeftUp" style={{ top: this.hHelp - 8 }} />
                    </div>
                </div >
            </div>
        )
    }
}

export default KlineViewContainer