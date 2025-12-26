import React, { Component, Fragment, type JSX } from "react";
import { KlineView } from "./KlineView";
import { VolumeView } from "./VolumeView";
import { ChartXControl } from "./ChartXControl";
import { ChartView, type CallbacksToContainer, type Indicator, type UpdateDrawing, type UpdateEvent } from "./ChartView";
import AxisX from "../pane/AxisX";
import type { TSer } from "../../timeseris/TSer";
import type { TVar } from "../../timeseris/TVar";
import { Kline } from "../../domain/Kline";
import { Path } from "../../svg/Path";
import Title from "../pane/Title";
import { Help } from "../pane/Help";
import { IndicatorView } from "./IndicatorView";
import { Context, PineTS } from "pinets";
import { DefaultTSer } from "../../timeseris/DefaultTSer";
import { TFrame } from "../../timeseris/TFrame";
import * as Binance from "../../domain/BinanaceData";
import {
    ActionButton,
    ActionButtonGroup,
    DialogTrigger,
    Divider,
    Popover,
    type Selection,
    ToggleButtonGroup,
    ToggleButton,
    Tooltip,
    TooltipTrigger,
    TagGroup,
    Tag
} from "@react-spectrum/s2";

import Line from '@react-spectrum/s2/icons/Line';
import Edit from '@react-spectrum/s2/icons/Edit';
import Copy from '@react-spectrum/s2/icons/Copy';
import Delete from '@react-spectrum/s2/icons/Delete';
import Properties from '@react-spectrum/s2/icons/Properties';
import AudioWave from '@react-spectrum/s2/icons/AudioWave';
import GridTypeLines from '@react-spectrum/s2/icons/GridTypeLines';
import LineHeight from '@react-spectrum/s2/icons/LineHeight';
import ChartTrend from '@react-spectrum/s2/icons/ChartTrend';
import Collection from '@react-spectrum/s2/icons/Collection';
import DistributeSpaceHorizontally from '@react-spectrum/s2/icons/DistributeSpaceHorizontally';
import EditNo from '@react-spectrum/s2/icons/EditNo';
import Erase from '@react-spectrum/s2/icons/Erase';
import SelectNo from '@react-spectrum/s2/icons/SelectNo';
import SelectNone from '@react-spectrum/s2/icons/SelectNone';
import New from '@react-spectrum/s2/icons/New';
import Maximize from '@react-spectrum/s2/icons/Maximize';
import BrightnessContrast from '@react-spectrum/s2/icons/BrightnessContrast';
import Background from '@react-spectrum/s2/icons/Background';
import HelpCircle from '@react-spectrum/s2/icons/HelpCircle';
import AlignTop from '@react-spectrum/s2/icons/AlignTop';
import DistributeHorizontalCenter from '@react-spectrum/s2/icons/DistributeHorizontalCenter';
import MenuHamburger from '@react-spectrum/s2/icons/MenuHamburger';
import Prototyping from '@react-spectrum/s2/icons/Prototyping';
import Add from '@react-spectrum/s2/icons/Add';
import DirectSelect from '@react-spectrum/s2/icons/DirectSelect';
import DistributeSpaceVertically from '@react-spectrum/s2/icons/DistributeSpaceVertically';
import Resize from '@react-spectrum/s2/icons/Resize';

import { style } from '@react-spectrum/s2/style' with {type: 'macro'};
import type { KlineKind } from "../chart/KlineChart";

type Props = {
    width: number,

    toggleColorTheme?: () => void
    colorTheme?: 'light' | 'dark'
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

    updateEvent?: UpdateEvent;
    updateDrawing?: UpdateDrawing;

    mouseCursor?: JSX.Element;
    referCursor?: JSX.Element;

    overlayIndicators?: Indicator[];
    stackedIndicators?: Indicator[];

    overlayIndicatorLabels?: string[][];
    stackedIndicatorLabels?: string[][];

    referOverlayIndicatorLabels?: string[][];
    referStackedIndicatorLabels?: string[][];

    selectedIndicatorTags?: Selection;
    drawingIdsToCreate?: Selection;

    yKlineView?: number;
    yVolumeView?: number;
    yIndicatorViews?: number;
    yAxisx?: number;
    svgHeight?: number;
    containerHeight?: number;
    yCursorRange?: number[];

    isLoaded?: boolean;

    cursor?: string;
}


const KVAR_NAME = "kline";

const allInds = ['ema', 'sma', 'rsi', 'macd']

const TOOPTIP_DELAY = 500; // ms


class KlineViewContainer extends Component<Props, State> {
    width: number;

    reloadDataTimeoutId = undefined;
    latestTime: number;

    loadedIndFns: Map<string, ((pinets: PineTS) => unknown)>;

    focusRef: React.RefObject<HTMLDivElement>;
    globalKeyboardListener = undefined
    isDragging: boolean;
    xDragStart: number;
    yDragStart: number;

    // geometry variables
    hTitle = 130;
    hIndtags = 28;

    hKlineView = 400;
    hVolumeView = 100;
    hIndicatorView = 160;
    hAxisx = 40;
    hSpacing = 25;

    callbacks: CallbacksToContainer

    systemScheme: string;

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
            updateEvent: { type: 'chart', changed: 0 },
            updateDrawing: { isHidingDrawing: false },
            stackedIndicators: [],
            selectedIndicatorTags: new Set(['ema', 'rsi', 'macd']),
            drawingIdsToCreate: new Set(),
            ...geometry,
        }

        this.setOverlayIndicatorLabels = this.setOverlayIndicatorLabels.bind(this)
        this.setStackedIndicatorLabels = this.setStackedIndicatorLabels.bind(this)
        this.setSelectedIndicatorTags = this.setSelectedIndicatorTags.bind(this)
        this.setDrawingIdsToCreate = this.setDrawingIdsToCreate.bind(this)

        this.backToOriginalChartScale = this.backToOriginalChartScale.bind(this)
        this.toggleCrosshairVisiable = this.toggleCrosshairVisiable.bind(this)
        this.toggleKlineKind = this.toggleKlineKind.bind(this)

        this.onGlobalKeyDown = this.onGlobalKeyDown.bind(this)
        this.onMouseUp = this.onMouseUp.bind(this)
        this.onMouseDown = this.onMouseDown.bind(this)
        this.onMouseMove = this.onMouseMove.bind(this)
        this.onMouseLeave = this.onMouseLeave.bind(this)
        this.onDoubleClick = this.onDoubleClick.bind(this)
        this.onWheel = this.onWheel.bind(this)

        this.callbacks = {
            updateOverlayIndicatorLabels: this.setOverlayIndicatorLabels,
            updateStackedIndicatorLabels: this.setStackedIndicatorLabels,
            updateDrawingIdsToCreate: this.setDrawingIdsToCreate,
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

                const pinets = new PineTS(this.state.kvar.toArray(), 'ETH', '1d');

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
                                updateEvent: { type: 'chart', changed: this.state.updateEvent.changed + 1 },
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
                        this.reloadDataTimeoutId = setTimeout(() => this.fetchData_calcInds(latestTime), 5000)
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

                this.update({ type: 'chart' })
                break;

            case "ArrowRight":
                if (e.ctrlKey) {
                    xc.moveCursorInDirection(fastSteps, 1)

                } else {
                    xc.moveChartsInDirection(fastSteps, 1)
                }

                this.update({ type: 'chart' })
                break;

            case "ArrowUp":
                if (!e.ctrlKey) {
                    xc.growWBar(1)
                    this.update({ type: 'chart' })
                }
                break;

            case "ArrowDown":
                if (!e.ctrlKey) {
                    xc.growWBar(-1);
                    this.update({ type: 'chart' })
                }
                break;

            case " ":
                xc.isCursorAccelerated = !xc.isCursorAccelerated
                break;

            case "Escape":
                if (xc.selectedDrawingIdx !== undefined) {
                    this.setState({ updateDrawing: { ...(this.state.updateDrawing), action: 'unselect' } })

                } else {
                    xc.isReferCursorEnabled = !xc.isReferCursorEnabled;

                    this.update({ type: 'cursors' })
                }
                break;

            case 'Delete':
                this.setState({ updateDrawing: { ...(this.state.updateDrawing), action: 'delete' } })
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
        if (this.reloadDataTimeoutId) {
            clearTimeout(this.reloadDataTimeoutId);
        }

        if (this.globalKeyboardListener) {
            document.removeEventListener("keydown", this.onGlobalKeyDown)
        }
    }

    update(event: UpdateEvent) {
        const changed = this.state.updateEvent.changed + 1;
        this.updateState({ updateEvent: { ...event, changed } });
    }

    updateState(state: State) {
        const xc = state.xc || this.state.xc;

        let referCursor: JSX.Element
        let mouseCursor: JSX.Element
        if (xc.isReferCursorEnabled) {
            const time = xc.tr(xc.referCursorRow)
            if (xc.occurred(time)) {
                const cursorX = xc.xr(xc.referCursorRow)
                referCursor = this.#plotCursor(cursorX, 'annot-refer')
            }
        }

        if (xc.isMouseCursorEnabled) {
            const cursorX = xc.xr(xc.mouseCursorRow)
            mouseCursor = this.#plotCursor(cursorX, 'annot-mouse')
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
        const containerHeight = svgHeight + this.hTitle + this.hIndtags;
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

    #plotCursor(x: number, className: string) {
        if (this.state.drawingIdsToCreate === 'all' || this.state.drawingIdsToCreate.size > 0 || this.state.xc.isCrosshairEnabled) {
            return <></>
        }

        const crosshair = new Path;
        // vertical line
        crosshair.moveto(x, this.state.yCursorRange[0]);
        crosshair.lineto(x, this.state.yCursorRange[1])

        return (
            <g className={className}>
                {crosshair.render()}
            </g>
        )
    }

    isNotInAxisYArea(x: number) {
        return x < this.width - ChartView.AXISY_WIDTH
    }

    translate(e: React.MouseEvent) {
        return [e.nativeEvent.offsetX, e.nativeEvent.offsetY]
    }

    onMouseLeave() {
        const xc = this.state.xc;

        // clear mouse cursor
        xc.isMouseCursorEnabled = false;

        this.update({ type: 'cursors' });
    }

    onMouseDown(e: React.MouseEvent) {
        this.isDragging = true

        const [x, y] = this.translate(e)
        this.xDragStart = x;
        this.yDragStart = y;
    }

    onMouseMove(e: React.MouseEvent) {
        const xc = this.state.xc;
        const [x, y] = this.translate(e)

        if (this.isDragging && xc.mouseDownHitDrawingIdx === undefined) {
            // drag chart
            const dx = x - this.xDragStart
            const dy = y - this.yDragStart
            const nBarDelta = Math.ceil(dx / xc.wBar)

            xc.isMouseCursorEnabled = false
            xc.isReferCursorEnabled = false
            xc.moveChartsInDirection(nBarDelta, -1, true)

            // reset to current position 
            this.xDragStart = x;
            this.yDragStart = y;

            if (e.ctrlKey) {
                // notice chart view to zoom in / out
                this.update({ type: 'chart', deltaMouse: { dx, dy } });

            } else {
                this.update({ type: 'chart' });
            }

            // NOTE cursor shape will always be processed in ChartView's onDrawingMouseMove

            return
        }

        if (this.state.drawingIdsToCreate === 'all' || this.state.drawingIdsToCreate.size > 0 || xc.selectedDrawingIdx !== undefined || xc.mouseMoveHitDrawingIdx !== undefined) {
            xc.isMouseCursorEnabled = false;
            this.update({ type: 'cursors' });
            return
        }

        const b = xc.bx(x);

        if (this.isNotInAxisYArea(x)) {
            // draw mouse cursor only when not in the axis-y area
            const row = xc.rb(b)
            xc.setMouseCursorByRow(row)
            xc.isMouseCursorEnabled = true

        } else {
            xc.isMouseCursorEnabled = false;
        }

        const xyMouse = this.#calcXYMouses(x, y);

        this.update({ type: 'cursors', xyMouse });
    }

    onMouseUp(e: React.MouseEvent) {
        if (this.isDragging) {
            this.isDragging = false
            this.xDragStart = undefined
            this.yDragStart = undefined
        }
    }

    onDoubleClick(e: React.MouseEvent) {
        const xc = this.state.xc;
        const [x, y] = this.translate(e)

        // set refer cursor
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

                this.update({ type: 'cursors' });
            }

        } else {
            xc.isReferCursorEnabled = false;

            this.update({ type: 'cursors' });
        }
    }

    onWheel(e: React.WheelEvent) {
        const xc = this.state.xc;

        const delta = Math.sign(e.deltaY)

        // treating one event as 'one unit' is good enough and safer.
        switch (e.deltaMode) {
            case 0x00:  // The delta values are specified in pixels.
                break;

            case 0x01: // The delta values are specified in lines.
                break;

            case 0x02: // The delta values are specified in pages.
                break;
        }

        if (e.shiftKey) {
            // zoom in / zoom out 
            xc.growWBar(-Math.sign(delta))

        } else if (e.ctrlKey) {
            const fastSteps = Math.floor(xc.nBars * 0.168)
            const unitsToScroll = xc.isCursorAccelerated ? delta * fastSteps : delta;
            // move refer cursor left / right 
            xc.scrollReferCursor(unitsToScroll, true)

        } else {
            const fastSteps = Math.floor(xc.nBars * 0.168)
            const unitsToScroll = xc.isCursorAccelerated ? delta * fastSteps : delta;
            // keep referCursor staying same x in screen, and move
            xc.scrollChartsHorizontallyByBar(unitsToScroll)
        }

        this.update({ type: 'chart' });
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


    setSelectedIndicatorTags(selectedIndicatorTags: Selection) {
        if (this.reloadDataTimeoutId) {
            clearTimeout(this.reloadDataTimeoutId);
        }

        this.fetchData_calcInds(this.latestTime, selectedIndicatorTags)
    }

    setDrawingIdsToCreate(ids?: Selection) {
        if (ids === undefined || ids !== 'all' && ids.size === 0) {
            this.setState({
                updateDrawing: {
                    ...(this.state.updateDrawing),
                    createDrawingId: undefined
                },
                drawingIdsToCreate: new Set()
            })

        } else {
            const [drawingId] = ids
            this.setState({
                updateDrawing: {
                    ...(this.state.updateDrawing),
                    action: 'create',
                    createDrawingId: drawingId as string
                },
                drawingIdsToCreate: ids
            })
        }
    }

    private backToOriginalChartScale() {
        this.update({ type: 'chart', deltaMouse: { dx: undefined, dy: undefined } });
    }

    private toggleCrosshairVisiable() {
        const xc = this.state.xc;

        xc.isCrosshairEnabled = !xc.isCrosshairEnabled

        this.update({ type: 'cursors' })
    }

    private toggleKlineKind() {
        let kind: KlineKind
        switch (this.state.xc.klineKind) {
            case 'candle':
                kind = 'bar'
                break;

            case 'bar':
                kind = 'line'
                break;

            case 'line':
                kind = 'candle'
                break;

            default:
                kind = 'bar'
        }

        this.state.xc.klineKind = kind;
        this.update({ type: 'chart' })
    }



    render() {
        return this.state.isLoaded && (
            <div style={{ display: "flex" }} >

                {/* Toolbar */}
                <div style={{ display: "inline-block", paddingRight: "6px", paddingTop: '3px' }}>

                    <ActionButtonGroup orientation="vertical" >

                        <ToggleButtonGroup
                            orientation="vertical"
                            selectionMode="multiple"
                            selectedKeys={this.state.drawingIdsToCreate}
                            onSelectionChange={this.setDrawingIdsToCreate}
                        >
                            <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                                <ToggleButton id="line">
                                    <Line />
                                </ToggleButton>
                                <Tooltip >
                                    Draw line
                                </Tooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                                <ToggleButton id="parallel">
                                    <Properties />
                                </ToggleButton>
                                <Tooltip >
                                    Draw parallel
                                </Tooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                                <ToggleButton id="gann_angles">
                                    <Collection />
                                </ToggleButton>
                                <Tooltip >
                                    Draw Gann angles
                                </Tooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                                <ToggleButton id="fibonacci_retrace" >
                                    <DistributeSpaceVertically />
                                </ToggleButton>
                                <Tooltip >
                                    Draw Fibonacci retrace
                                </Tooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                                <ToggleButton id="fibonacci_timezone">
                                    <DistributeSpaceHorizontally />
                                </ToggleButton>
                                <Tooltip >
                                    Draw Fibonacci time zone
                                </Tooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                                <ToggleButton id="fibonacci_retrace_v">
                                    <AudioWave />
                                </ToggleButton>
                                <Tooltip >
                                    Draw Fibonacci time retrace
                                </Tooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                                <ToggleButton id="polyline" >
                                    <DirectSelect />
                                </ToggleButton>
                                <Tooltip >
                                    Draw polyline
                                </Tooltip>
                            </TooltipTrigger>

                        </ToggleButtonGroup>

                        <Divider staticColor='auto' />

                        <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                            <ActionButton onPress={() => this.setState({
                                updateDrawing: {
                                    action: 'hide',
                                    isHidingDrawing: !this.state.updateDrawing.isHidingDrawing
                                }
                            })}
                            >
                                <SelectNo />
                            </ActionButton>
                            <Tooltip >
                                Hide drawings
                            </Tooltip>
                        </TooltipTrigger>

                        <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                            <ActionButton onPress={() => this.setState({
                                updateDrawing: {
                                    ...(this.state.updateDrawing),
                                    action: 'delete'
                                }
                            })}
                            >
                                <SelectNone />
                            </ActionButton>
                            <Tooltip>
                                Delete selected drawing
                            </Tooltip>
                        </TooltipTrigger>

                        <Divider staticColor='auto' />

                        <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                            <ActionButton onPress={this.toggleKlineKind} >
                                <DistributeHorizontalCenter />
                            </ActionButton>
                            <Tooltip >
                                Toggle candle/bar chart
                            </Tooltip>
                        </TooltipTrigger>

                        <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                            <ActionButton onPress={this.backToOriginalChartScale} >
                                <Resize />
                            </ActionButton>
                            <Tooltip >
                                Original chart scale
                            </Tooltip>
                        </TooltipTrigger>

                        <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                            <ActionButton onPress={this.toggleCrosshairVisiable} >
                                <Add />
                            </ActionButton>
                            <Tooltip >
                                Toggle crosshair visible
                            </Tooltip>
                        </TooltipTrigger>

                        <Divider staticColor='auto' />

                        <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                            <ActionButton onPress={this.props.toggleColorTheme} >
                                <BrightnessContrast />
                            </ActionButton>
                            <Tooltip>
                                Toggle color theme
                            </Tooltip>
                        </TooltipTrigger>

                        <TooltipTrigger delay={500} placement="end">
                            <DialogTrigger>
                                <ActionButton >
                                    <HelpCircle />
                                </ActionButton>
                                <Tooltip>
                                    Help
                                </Tooltip>

                                <Popover>
                                    <div className="help" >
                                        <Help />
                                    </div>
                                </Popover>
                            </DialogTrigger>
                        </TooltipTrigger>

                    </ActionButtonGroup>

                </div>

                {/* View Container */}
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
                            updateEvent={this.state.updateEvent}
                        />
                        <div className="borderLeftUp" style={{ top: this.hTitle - 8 }} />
                    </div>

                    <div className="" style={{
                        display: 'flex', justifyContent: 'flex-start',
                        width: this.width, height: this.hIndtags,
                        paddingTop: "0px"
                    }}>
                        <TagGroup
                            aria-label="Or need 'label' that will show" // An aria-label or aria-labelledby prop is required for accessibility.
                            size="S"
                            selectionMode="multiple"
                            selectedKeys={this.state.selectedIndicatorTags}
                            onSelectionChange={this.setSelectedIndicatorTags}
                        >
                            {allInds.map((tag, n) =>
                                <Tag key={"ind-tag-" + n} id={tag}>{tag.toUpperCase()}</Tag>
                            )}
                        </TagGroup>
                    </div>

                    <div style={{ position: 'relative', width: this.width + 'px', height: this.state.svgHeight + 'px' }}>
                        <svg viewBox={`0, 0, ${this.width} ${this.state.svgHeight}`}
                            width={this.width}
                            height={this.state.svgHeight}
                            vectorEffect="non-scaling-stroke"
                            onDoubleClick={this.onDoubleClick}
                            onMouseLeave={this.onMouseLeave}
                            onMouseMove={this.onMouseMove}
                            onMouseDown={this.onMouseDown}
                            onMouseUp={this.onMouseUp}
                            onWheel={this.onWheel}
                            cursor={this.state.cursor}
                            style={{ zIndex: 1 }}
                        >
                            <KlineView
                                id={"kline"}
                                x={0}
                                y={this.state.yKlineView}
                                width={this.width}
                                height={this.hKlineView}
                                name=""
                                xc={this.state.xc}
                                tvar={this.state.kvar}
                                updateEvent={this.state.updateEvent}
                                updateDrawing={this.state.updateDrawing}

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
                                tvar={this.state.kvar}
                                updateEvent={this.state.updateEvent}
                            />

                            <AxisX
                                id={"axisx"}
                                x={0}
                                y={this.state.yAxisx}
                                width={this.width}
                                height={this.hAxisx}
                                xc={this.state.xc}
                                updateEvent={this.state.updateEvent}
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
                                        tvar={tvar}
                                        mainIndicatorOutputs={outputs}
                                        updateEvent={this.state.updateEvent}
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
                                        <div style={{ paddingRight: "0px", paddingTop: '0px' }}>
                                            {
                                                outputs.map(({ title, color }, n) =>
                                                    <Fragment key={"overlay-indicator-lable-" + title} >
                                                        <span className="label-mouse">{title}&nbsp;</span>
                                                        <span style={{ color }}>{
                                                            this.state.overlayIndicatorLabels !== undefined &&
                                                            this.state.overlayIndicatorLabels[m] !== undefined &&
                                                            this.state.overlayIndicatorLabels[m][n]
                                                        }
                                                        </span>
                                                        {n === outputs.length - 1
                                                            ? <span></span>
                                                            : <span>&nbsp;&middot;&nbsp;</span>
                                                        }
                                                    </Fragment>
                                                )
                                            }
                                        </div>
                                    </div>

                                    <div style={{
                                        position: 'absolute',
                                        top: this.state.yKlineView + m * 13 - this.hSpacing + 2,
                                        right: ChartView.AXISY_WIDTH,
                                        zIndex: 2, // ensure it's above the SVG
                                        backgroundColor: 'transparent',
                                    }}>
                                        <div style={{ paddingRight: "0px", paddingTop: '0px' }}>
                                            {
                                                this.state.xc.isReferCursorEnabled && outputs.map(({ title, color }, n) =>
                                                    <Fragment key={"ovarlay-indicator-lable-" + title} >
                                                        <span className="label-refer">{title}&nbsp;</span>
                                                        <span style={{ color }}>{
                                                            this.state.referOverlayIndicatorLabels &&
                                                            this.state.referOverlayIndicatorLabels[m] &&
                                                            this.state.referOverlayIndicatorLabels[m][n]
                                                        }
                                                        </span>
                                                        {n === outputs.length - 1
                                                            ? <span></span>
                                                            : <span>&nbsp;&middot;&nbsp;</span>
                                                        }
                                                    </Fragment>
                                                )
                                            }
                                        </div>
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

                                        <div style={{ paddingRight: "0px", paddingTop: '0px' }}>
                                            {
                                                outputs.map(({ title, color }, k) =>
                                                    <Fragment key={"stacked-indicator-label-" + n + '-' + k} >
                                                        <span className="label-mouse">{title}&nbsp;</span>
                                                        <span style={{ color }}>{
                                                            this.state.stackedIndicatorLabels &&
                                                            this.state.stackedIndicatorLabels[n] &&
                                                            this.state.stackedIndicatorLabels[n][k]
                                                        }
                                                        </span>
                                                        {k === outputs.length - 1
                                                            ? <span></span>
                                                            : <span>&nbsp;&middot;&nbsp;</span>
                                                        }
                                                    </Fragment>
                                                )
                                            }
                                        </div>

                                    </div>

                                    <div style={{
                                        position: 'absolute',
                                        top: this.state.yIndicatorViews + n * (this.hIndicatorView + this.hSpacing) - this.hSpacing + 2,
                                        right: ChartView.AXISY_WIDTH,
                                        zIndex: 2, // ensure it's above the SVG
                                        backgroundColor: 'transparent',
                                    }}>
                                        <div style={{ display: "inline-block", paddingRight: "0px", paddingTop: '0px' }}>
                                            {
                                                this.state.xc.isReferCursorEnabled && outputs.map(({ title, color }, k) =>
                                                    <Fragment key={"stacked-indicator-label-" + n + '-' + k} >
                                                        <span className="label-refer">{title}&nbsp;</span>
                                                        <span style={{ color }}>{
                                                            this.state.referStackedIndicatorLabels &&
                                                            this.state.referStackedIndicatorLabels[n] &&
                                                            this.state.referStackedIndicatorLabels[n][k]}
                                                        </span>
                                                        {k === outputs.length - 1
                                                            ? <span></span>
                                                            : <span>&nbsp;&middot;&nbsp;</span>
                                                        }
                                                    </Fragment>
                                                )
                                            }
                                        </div>
                                    </div>
                                </Fragment>
                            )
                        }
                    </div>

                </div >
            </div >
        )
    }
}

export default KlineViewContainer