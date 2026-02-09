import React, { Component, Fragment, type JSX } from "react";
import html2canvas from "html2canvas";
import { KlineView } from "./KlineView";
import { VolumeView } from "./VolumeView";
import { ChartXControl } from "./ChartXControl";
import { ChartView, type CallbacksToContainer, type Indicator, type Output, type UpdateDrawing, type UpdateEvent } from "./ChartView";
import AxisX from "../pane/AxisX";
import type { TSer } from "../../timeseris/TSer";
import type { TVar } from "../../timeseris/TVar";
import { Kline, KVAR_NAME } from "../../domain/Kline";
import { Path } from "../../svg/Path";
import Title from "../pane/Title";
import { Help } from "../pane/Help";
import { IndicatorView } from "./IndicatorView";
import { DefaultTSer } from "../../timeseris/DefaultTSer";
import { TFrame } from "../../timeseris/TFrame";
import type { KlineKind } from "../plot/PlotKline";
import type { Plot } from "../plot/Plot";
import { fetchData, Source } from "../../domain/DataFecther";
import { Context, PineTS } from "pinets";
//import { PineTS, } from '../../../../../PineTS/src/PineTS.class'
//import { Context } from '../../../../../PineTS/src/Context.class'

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
import StrokeWidth from '@react-spectrum/s2/icons/StrokeWidth';
import Percentage from '@react-spectrum/s2/icons/Percentage';
import StarFilled from '@react-spectrum/s2/icons/StarFilled';
import Star from '@react-spectrum/s2/icons/Star';
import Exposure from '@react-spectrum/s2/icons/Exposure';
import FullScreenExit from '@react-spectrum/s2/icons/FullScreenExit';

import { style } from '@react-spectrum/s2/style' with {type: 'macro'};
import { Screenshot } from "../pane/Screenshot";


type Props = {
    width: number,

    toggleColorTheme?: () => void
    colorTheme?: 'light' | 'dark'
}

type State = {
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

    yKlineView: number;
    yVolumeView: number;
    yIndicatorViews: number;
    yAxisx: number;
    svgHeight: number;
    containerHeight: number;
    yCursorRange: number[];

    isLoaded: boolean;

    screenshot: HTMLCanvasElement
}

//const allIndTags = ['test', 'bb']
const allIndTags = ['sma', 'ema', 'bb', 'rsi', 'macd']

const TOOLTIP_DELAY = 500; // ms

//const source: Source = Source.yfinance
const source: Source = Source.binance

class KlineViewContainer extends Component<Props, State> {
    width: number;

    ticker: string;
    tframe: TFrame;
    tzone: string;

    baseSer: TSer;
    kvar: TVar<Kline>;
    xc: ChartXControl;

    reloadDataTimeoutId = undefined;
    latestTime: number;

    predefinedScripts: Map<string, string>;
    scripts?: { scriptName: string, script: string }[];

    containerRef: React.RefObject<HTMLDivElement>;
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

    currentLoading = Promise.resolve()

    constructor(props: Props) {
        super(props);
        this.width = props.width;

        this.containerRef = React.createRef();

        const geometry = this.#calcGeometry([]);
        this.state = {
            isLoaded: false,
            updateEvent: { type: 'chart', changed: 0 },
            updateDrawing: { isHidingDrawing: false },
            stackedIndicators: [],
            selectedIndicatorTags: new Set(['sma', 'rsi', 'macd']),
            drawingIdsToCreate: new Set(),
            screenshot: undefined,
            ...geometry,
        }

        console.log("KlinerViewContainer created");

        this.setOverlayIndicatorLabels = this.setOverlayIndicatorLabels.bind(this)
        this.setStackedIndicatorLabels = this.setStackedIndicatorLabels.bind(this)
        this.setSelectedIndicatorTags = this.setSelectedIndicatorTags.bind(this)
        this.setDrawingIdsToCreate = this.setDrawingIdsToCreate.bind(this)

        this.backToOriginalChartScale = this.backToOriginalChartScale.bind(this)
        this.toggleCrosshairVisiable = this.toggleCrosshairVisiable.bind(this)
        this.toggleOnCalendarMode = this.toggleOnCalendarMode.bind(this)
        this.toggleKlineKind = this.toggleKlineKind.bind(this)
        this.toggleScalar = this.toggleScalar.bind(this)

        this.handleTickerTimeframeChanged = this.handleTickerTimeframeChanged.bind(this)
        this.handleTakeScreenshot = this.handleTakeScreenshot.bind(this)

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

    fetchOPredefinedScripts = (scriptNames: string[]) => {
        const fetchScript = (scriptName: string) =>
            fetch("./indicators/" + scriptName + ".pine")
                .then(r => r.text())
                .then(script => ({ scriptName, script }))

        return Promise.all(scriptNames.map(scriptName => fetchScript(scriptName)))
    }

    getSelectedIncicators = () => {
        let selectedIndicatorFns = new Map<string, string>();

        const selectedIndicatorTagsNow = this.state.selectedIndicatorTags
        if (selectedIndicatorTagsNow === 'all') {
            selectedIndicatorFns = this.predefinedScripts;

        } else {
            for (const scriptName of selectedIndicatorTagsNow) {
                selectedIndicatorFns.set(scriptName as string, this.predefinedScripts.get(scriptName as string))
            }
        }

        return Array.from(selectedIndicatorFns, ([scriptName, script]) => ({ scriptName, script }))
    }

    // reload/rerun should be chained after currentLoading to avoid concurrent loading/calculating
    fetchData_runScripts = async (startTime: number, limit: number) => this.currentLoading
        .then(async () => {
            const ticker = this.ticker
            const tframe = this.tframe
            const tzone = this.tzone
            const baseSer = this.baseSer
            const kvar = this.kvar
            const xc = this.xc

            const scripts = this.scripts || this.getSelectedIncicators()

            return fetchData(source, baseSer, ticker, tframe, tzone, startTime, limit)
                .then(async latestTime => {
                    let start = performance.now()

                    if (!this.state.isLoaded) {
                        // reinit xc to get correct last occured time/row, should be called after data loaded to baseSer
                        console.log("reinit xc")
                        xc.reinit()
                    }

                    // console.log(kvar.toArray().filter(k => k === undefined), "undefined klines in series");
                    const pinets = new PineTS(kvar.toArray(), ticker, tframe.shortName);

                    return pinets.ready()
                        .then(async () => {
                            const scriptRuns: Promise<{ scriptName: string, result: Context }>[] = []
                            for (const { scriptName, script } of scripts) {
                                if (script !== undefined) {
                                    const fnRun = pinets.run(script)
                                        .then(result => ({ scriptName, result }))
                                        .catch(error => {
                                            console.error(error);

                                            return { scriptName, result: undefined }
                                        })

                                    scriptRuns.push(fnRun)
                                }
                            }

                            return Promise.all(scriptRuns).then(results => {
                                console.log(`Scripts run in ${performance.now() - start} ms`);

                                start = performance.now();

                                const overlayIndicators = [];
                                const stackedIndicators = [];

                                results.map(({ scriptName, result }, n) => {
                                    if (result) {
                                        const tvar = baseSer.varOf(scriptName) as TVar<unknown[]>;
                                        const size = baseSer.size();
                                        const indicator = result.indicator;
                                        const plots = Object.values(result.plots) as Plot[];
                                        const dataValues = plots.map(({ data }) => data);
                                        try {
                                            for (let i = 0; i < size; i++) {
                                                const vs = dataValues.map(v => v ? v[i].value : undefined);
                                                tvar.setByIndex(i, vs);
                                            }

                                        } catch (error) {
                                            console.error(error, dataValues)
                                        }

                                        const titles = plots.map((plot) => plot.title)
                                        // console.log(result)
                                        console.log(plots.map(x => x.data))
                                        console.log(plots.map(x => x.options))

                                        const isOverlayIndicator = indicator !== undefined && indicator.overlay

                                        // plot1, plot2 from fill function
                                        const outputs = plots.reduce(([overlay, stacked], { title, plot1, plot2, options }, atIndex) => {
                                            const style = options.style
                                            const location = options.location

                                            // for fill function
                                            const plot1Value = (plot1 && typeof plot1 === 'string')
                                                ? titles.findIndex(title => title === plot1)
                                                : plot2

                                            const plot2Value = (plot2 && typeof plot2 === 'string')
                                                ? titles.findIndex(title => title === plot2)
                                                : plot2

                                            console.log(titles, plot1Value, plot2Value)

                                            const isOverlayOutput = (style === 'shape' || style === 'char')
                                                && (location === 'abovebar' || location === 'belowbar')

                                            if (isOverlayOutput || isOverlayIndicator) {
                                                overlay.push({ atIndex, title, plot1: plot1Value, plot2: plot2Value, options })

                                            } else {
                                                stacked.push({ atIndex, title, plot1: plot1Value, plot2: plot2Value, options })
                                            }

                                            return [overlay, stacked]

                                        }, [[], []] as Output[][])

                                        if (outputs[0].length > 0) {
                                            overlayIndicators.push({ scriptName, tvar, outputs: outputs[0] })
                                        }

                                        if (outputs[1].length > 0) {
                                            stackedIndicators.push({ scriptName, tvar, outputs: outputs[1] })
                                        }

                                        console.log("overlay:", overlayIndicators, "\nstacked:", stackedIndicators)
                                    }
                                })

                                // console.log(`indicators added to series in ${performance.now() - start} ms`);

                                this.latestTime = latestTime;

                                this.updateState(
                                    {
                                        isLoaded: true,
                                        updateEvent: { type: 'chart', changed: this.state.updateEvent.changed + 1 },
                                        overlayIndicators,
                                        stackedIndicators,
                                    },
                                    () => {
                                        if (latestTime !== undefined && source === Source.binance) {
                                            this.reloadDataTimeoutId = setTimeout(() => { this.currentLoading = this.fetchData_runScripts(latestTime, 1000) }, 5000)
                                        }
                                    })

                            })
                        })

                })
        })


    override componentDidMount() {
        this.fetchOPredefinedScripts(allIndTags)
            .then(scripts => {
                this.predefinedScripts = new Map(scripts.map(p => [p.scriptName, p.script]))
            })
            .then(() => {
                this.ticker = source === Source.binance ? 'BTCUSDT' : 'BTC-USD'
                this.tframe = TFrame.DAILY
                this.tzone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                //this. tzone = "America/Vancouver" 

                this.baseSer = new DefaultTSer(this.tframe, this.tzone, 1000);
                this.kvar = this.baseSer.varOf(KVAR_NAME) as TVar<Kline>;
                this.xc = new ChartXControl(this.baseSer, this.width - ChartView.AXISY_WIDTH);

                this.currentLoading = this.fetchData_runScripts(undefined, 1000).then(() => {
                    this.globalKeyboardListener = this.onGlobalKeyDown;
                    document.addEventListener("keydown", this.onGlobalKeyDown);

                    if (this.containerRef.current) {
                        this.containerRef.current.focus()
                    }
                })

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

    updateState(newState: Partial<State>, callback?: () => void) {
        const xc = this.xc;

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
        const geometry = newState.stackedIndicators
            ? this.#calcGeometry(newState.stackedIndicators)
            : undefined

        this.setState({ ...(newState as (Pick<State, keyof State> | State)), ...geometry, referCursor, mouseCursor }, callback)
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
        if (this.state.drawingIdsToCreate === 'all' || this.state.drawingIdsToCreate.size > 0 || this.xc.isCrosshairEnabled) {
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

    onGlobalKeyDown(e: KeyboardEvent) {
        if (
            document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA'
        ) {
            return;
        }

        const xc = this.xc;
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


    onMouseLeave() {
        const xc = this.xc;

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
        const xc = this.xc;
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
            // is under drawing?
            xc.isMouseCursorEnabled = false;
            this.update({ type: 'cursors' });
            return
        }

        const b = xc.bx(x);

        if (this.isNotInAxisYArea(x)) {
            // show mouse cursor only when x is not in the axis-y area
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
        const xc = this.xc;
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
        const xc = this.xc;

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

        return new Promise<void>((resolve) => {
            this.setState(
                { selectedIndicatorTags },
                () => {
                    this.currentLoading = this.fetchData_runScripts(this.latestTime, 1000).then(() => {
                        resolve();
                    })

                    return this.currentLoading
                })
        })
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

    backToOriginalChartScale() {
        this.update({ type: 'chart', deltaMouse: { dx: undefined, dy: undefined } });
    }

    toggleCrosshairVisiable() {
        const xc = this.xc;

        xc.isCrosshairEnabled = !xc.isCrosshairEnabled

        this.update({ type: 'cursors' })
    }

    toggleKlineKind() {
        let kind: KlineKind
        switch (this.xc.klineKind) {
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

        this.xc.klineKind = kind;
        this.update({ type: 'chart' })
    }

    toggleScalar() {
        this.update({ type: 'chart', yScalar: true })
    }

    toggleOnCalendarMode() {
        this.xc.setOnCalendarMode(!this.xc.isOnCalendarMode)
        this.update({ type: 'chart' })
    }

    private handleTakeScreenshot() {
        this.takeScreenshot().then((screenshot) =>
            this.setState({ screenshot })
        )
    }

    takeScreenshot(): Promise<HTMLCanvasElement> {
        return html2canvas(this.containerRef.current, {
            useCORS: true // in case you have images stored in your application
        })
    }

    private handleTickerTimeframeChanged(ticker: string, timeframe?: string, tzone?: string) {
        if (this.reloadDataTimeoutId) {
            clearTimeout(this.reloadDataTimeoutId);
        }

        this.ticker = ticker
        this.tframe = timeframe === undefined ? this.tframe : TFrame.ofName(timeframe)
        this.tzone = tzone === undefined ? this.tzone : tzone

        this.baseSer = new DefaultTSer(this.tframe, this.tzone, 1000);
        this.kvar = this.baseSer.varOf(KVAR_NAME) as TVar<Kline>;
        this.xc = new ChartXControl(this.baseSer, this.width - ChartView.AXISY_WIDTH);

        // Force related components re-render .
        // NOTE When you call setState multiple times within the same synchronous block of code, 
        // React batches these calls into a single update for performance reasons.
        // So we set isLoaded to false here and use callback.
        return new Promise<void>((resolve) => {
            this.setState(
                { isLoaded: false },
                () => {
                    this.currentLoading = this.fetchData_runScripts(undefined, 1000).then(() => {
                        resolve();
                    })

                    return this.currentLoading
                })
        })
    }

    runScripts(scripts: { scriptName: string, script: string }[]) {
        if (this.reloadDataTimeoutId) {
            clearTimeout(this.reloadDataTimeoutId);
        }

        this.scripts = scripts;

        this.baseSer = new DefaultTSer(this.tframe, this.tzone, 1000);
        this.kvar = this.baseSer.varOf(KVAR_NAME) as TVar<Kline>;
        this.xc = new ChartXControl(this.baseSer, this.width - ChartView.AXISY_WIDTH);

        return new Promise<void>((resolve) => {
            console.log("runScripts ...")
            this.setState(
                { isLoaded: false },
                () => {
                    this.currentLoading = this.fetchData_runScripts(undefined, 1000).then(() => {
                        resolve();
                    })

                    return this.currentLoading
                })
        })
    }

    resetScripts() {
        if (this.reloadDataTimeoutId) {
            clearTimeout(this.reloadDataTimeoutId);
        }

        this.scripts = undefined

        this.baseSer = new DefaultTSer(this.tframe, this.tzone, 1000);
        this.kvar = this.baseSer.varOf(KVAR_NAME) as TVar<Kline>;
        this.xc = new ChartXControl(this.baseSer, this.width - ChartView.AXISY_WIDTH);

        return new Promise<void>((resolve) => {
            this.setState(
                {
                    isLoaded: false,
                }, () => {
                    this.currentLoading = this.fetchData_runScripts(undefined, 1000).then(() => {
                        resolve();
                    })

                    return this.currentLoading
                })
        })
    }

    changeTicker(ticker: string) {
        return this.handleTickerTimeframeChanged(ticker, this.tframe.shortName, this.tzone)
    }

    changeTimeframe(tframe: string) {
        return this.handleTickerTimeframeChanged(this.ticker, tframe, this.tzone)
    }

    changeTimezone(tzone: string) {
        return this.handleTickerTimeframeChanged(this.ticker, this.tframe.shortName, tzone)
    }

    changeTickerAndTimeframe(ticker: string, tframe: string) {
        return this.handleTickerTimeframeChanged(ticker, tframe, this.tzone)
    }

    render() {
        return (
            <div style={{ display: "flex" }} >

                {/* Toolbar */}
                <div style={{ display: "inline-block", paddingTop: '3px' }}>

                    <ActionButtonGroup orientation="vertical" >

                        <ToggleButtonGroup
                            orientation="vertical"
                            selectionMode="single"
                            selectedKeys={this.state.drawingIdsToCreate}
                            onSelectionChange={this.setDrawingIdsToCreate}
                        >
                            <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
                                <ToggleButton id="line">
                                    <Line />
                                </ToggleButton>
                                <Tooltip >
                                    Draw line
                                </Tooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
                                <ToggleButton id="parallel">
                                    <Properties />
                                </ToggleButton>
                                <Tooltip >
                                    Draw parallel
                                </Tooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
                                <ToggleButton id="gann_angles">
                                    <Collection />
                                </ToggleButton>
                                <Tooltip >
                                    Draw Gann angles
                                </Tooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
                                <ToggleButton id="fibonacci_retrace" >
                                    <DistributeSpaceVertically />
                                </ToggleButton>
                                <Tooltip >
                                    Draw Fibonacci retrace
                                </Tooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
                                <ToggleButton id="fibonacci_timezone">
                                    <DistributeSpaceHorizontally />
                                </ToggleButton>
                                <Tooltip >
                                    Draw Fibonacci time zone
                                </Tooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
                                <ToggleButton id="fibonacci_retrace_v">
                                    <AudioWave />
                                </ToggleButton>
                                <Tooltip >
                                    Draw Fibonacci time retrace
                                </Tooltip>
                            </TooltipTrigger>

                            <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
                                <ToggleButton id="polyline" >
                                    <DirectSelect />
                                </ToggleButton>
                                <Tooltip >
                                    Draw polyline
                                </Tooltip>
                            </TooltipTrigger>

                        </ToggleButtonGroup>

                        <Divider staticColor='auto' />

                        <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
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

                        <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
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

                        <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
                            <ActionButton onPress={this.toggleKlineKind} >
                                <DistributeHorizontalCenter />
                            </ActionButton>
                            <Tooltip >
                                Toggle candle/bar chart
                            </Tooltip>
                        </TooltipTrigger>

                        <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
                            <ActionButton onPress={this.toggleScalar} >
                                <Percentage />
                            </ActionButton>
                            <Tooltip >
                                Toggle Linear/Lg scale
                            </Tooltip>
                        </TooltipTrigger>

                        {/* <TooltipTrigger delay={TOOPTIP_DELAY} placement="end">
                            <ActionButton onPress={this.toggleOnCalendarMode} >
                                {this.state.xc.isOnCalendarMode ? <StarFilled /> : <Star />}
                            </ActionButton>
                            <Tooltip >
                                Toggle Calendar/Occurred mode
                            </Tooltip>
                        </TooltipTrigger> */}

                        <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
                            <ActionButton onPress={this.backToOriginalChartScale} >
                                <Maximize />
                            </ActionButton>
                            <Tooltip >
                                Original chart height
                            </Tooltip>
                        </TooltipTrigger>

                        <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
                            <ActionButton onPress={this.toggleCrosshairVisiable} >
                                <Add />
                            </ActionButton>
                            <Tooltip >
                                Toggle crosshair visible
                            </Tooltip>
                        </TooltipTrigger>

                        <Divider staticColor='auto' />

                        <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
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

                        <Divider staticColor='auto' />

                        <TooltipTrigger delay={TOOLTIP_DELAY} placement="end">
                            <DialogTrigger>
                                <ActionButton onPress={this.handleTakeScreenshot} >
                                    <Exposure />
                                </ActionButton>
                                <Tooltip>
                                    Take screenshot
                                </Tooltip>

                                <Popover>
                                    <div className="help" >
                                        <Screenshot canvas={this.state.screenshot} />
                                    </div>
                                </Popover>
                            </DialogTrigger>
                        </TooltipTrigger>

                    </ActionButtonGroup>

                </div>

                {/* View Container */}
                <div className="container" style={{ paddingLeft: '6px', width: this.width + 'px', height: this.state.containerHeight + 'px' }}
                    key="klineviewcontainer"
                    ref={this.containerRef}
                >
                    {this.state.isLoaded && (<>
                        <div className="title" style={{ width: this.width, height: this.hTitle }}>
                            <Title
                                width={this.width}
                                height={this.hTitle}
                                xc={this.xc}
                                tvar={this.kvar}
                                ticker={this.ticker}
                                updateEvent={this.state.updateEvent}
                                handleSymbolTimeframeChanged={this.handleTickerTimeframeChanged}
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
                                {allIndTags.map((tag, n) =>
                                    <Tag key={"ind-tag-" + n} id={tag}>{tag.toUpperCase()}</Tag>
                                )}
                            </TagGroup>
                        </div>
                        <div style={{ position: 'relative', width: this.width, height: this.state.svgHeight }}>
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
                                style={{ zIndex: 1 }}
                            >
                                <KlineView
                                    id={"kline"}
                                    x={0}
                                    y={this.state.yKlineView}
                                    width={this.width}
                                    height={this.hKlineView}
                                    name=""
                                    xc={this.xc}
                                    tvar={this.kvar}
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
                                    xc={this.xc}
                                    tvar={this.kvar}
                                    updateEvent={this.state.updateEvent}
                                />

                                <AxisX
                                    id={"axisx"}
                                    x={0}
                                    y={this.state.yAxisx}
                                    width={this.width}
                                    height={this.hAxisx}
                                    xc={this.xc}
                                    updateEvent={this.state.updateEvent}
                                />
                                {
                                    this.state.stackedIndicators.map(({ scriptName, tvar, outputs }, n) =>
                                        <IndicatorView
                                            key={"stacked-indicator-view-" + scriptName}
                                            id={this.#indicatorViewId(n)}
                                            name={"Indicator-" + n}
                                            x={0}
                                            y={this.state.yIndicatorViews + n * (this.hIndicatorView + this.hSpacing)}
                                            width={this.width}
                                            height={this.hIndicatorView}
                                            xc={this.xc}
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
                                                    outputs.map(({ title, options: { color } }, n) =>
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
                                                    this.xc.isReferCursorEnabled && outputs.map(({ title, options: { color } }, n) =>
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
                                                    outputs.map(({ title, options: { color } }, k) =>
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
                                                    this.xc.isReferCursorEnabled && outputs.map(({ title, options: { color } }, k) =>
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
                    </>)}

                </div >
            </div >
        )
    }
}

export default KlineViewContainer
