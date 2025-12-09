import { TVal } from "../../timeseris/TVal";
import { type TSer } from "../../timeseris/TSer";
import { TVar } from "../../timeseris/TVar";
import { Chart } from "../chart/Chart";
import { ChartXControl } from "./ChartXControl";
import { ChartYControl } from "./ChartYControl";
import { Component, type JSX } from "react";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";
import { Kline } from "../../domain/Kline";

export enum UpdateEvent {
    Chart,
    Cursors
}

export type ChartParts = {
    charts: JSX.Element[],
    axisy: JSX.Element
}

export type UpdateCursor = {
    changed: number,
    xyMouse?: { who: string, x: number, y: number }
}

export type Indicator = {
    tvar: TVar<unknown[]>,
    outputs: Output[],
    overlay?: boolean
}

export type Output = {
    atIndex: number,
    title: string,
    style: string,
    color: string,
}

export interface ViewProps {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    xc: ChartXControl;
    baseSer: TSer;
    tvar: TVar<unknown>;
    shouldUpdateChart: number;
    shouldUpdateCursors: UpdateCursor;
    name: string;

    // for indicator chart view's main indicator outputs
    mainIndicatorOutputs?: Output[]

    overlayIndicators?: Indicator[];

    updateOverlayIndicatorLabels?: (vs: string[][], refVs?: string[][]) => void;
    updateStackedIndicatorLabels?: (vs: string[], refVs?: string[]) => void;
}

export interface ViewState {
    width: number;
    height: number;

    hasInnerVolume: false;
    maxVolume?: number;
    minVolume?: number;

    maxValue: 1.0
    minValue: 0.0

    isInteractive: true
    isPinned: false

    charts: JSX.Element[];
    axisy?: JSX.Element;

    mouseCursor?: JSX.Element
    referCursor?: JSX.Element

    latestValueLabel?: JSX.Element

    stackCharts?: JSX.Element[];
}

/**
 * A ChartView's container can be any Component even without a ChartViewContainer,
 * but should reference back to a control. All ChartViews shares the same
 * control will have the same cursor behaves.
 *
 * Example: you can add a ChartView directly to a JFrame.
 *
 * baseSer: the ser instaceof TSer, with the calendar time feature,
 *            it's put in the masterView to control the cursor;
 * mainSer: vs overlappingSer, this view's main ser.
 *
 *       1..n           1..n
 * ser --------> chart ------> var
 *
 *
 * ChangeSubject cases:
 *   rightSideRow
 *   referCursorRow
 *   wBar
 *   onCalendarMode
 */
export abstract class ChartView<P extends ViewProps, S extends ViewState> extends Component<P, S> {

    static readonly AXISY_WIDTH = 55
    static readonly CONTROL_HEIGHT = 12
    static readonly TITLE_HEIGHT_PER_LINE = 14

    yc: ChartYControl;
    baseSer: TSer;

    // share same xc through all views that are in the same viewcontainer.
    constructor(props: P) {
        super(props)

        this.yc = new ChartYControl(props.baseSer, props.height);

        console.log(`${this.props.name} ChartView render`)
    }

    protected readonly overlappingSerChartToVars = new Map<TSer, Map<Chart, Set<TVar<TVal>>>>()

    readonly mainSerChartToVars = new Map<Chart, Set<TVar<TVal>>>()

    hasInnerVolume = false;
    maxVolume?: number;
    minVolume?: number;

    maxValue = 1.0
    minValue = 0.0

    isInteractive = true

    #isPinned = false

    /**
     * what may affect the geometry:
     * 1. the size of this component changed;
     * 3. the ser's value changed or its items added, which need computeMaxMin();
     *
     * The control only define wBar (the width of each bar), this component
     * will compute number of bars according to its size. So, if you want to more
     * bars displayed, such as an appointed newNBars, you should compute the size of
     * this's container, and call container.setBounds() to proper size, then, the
     * layout manager will layout the size of its ChartView instances automatically,
     * and if success, the newNBars computed here will equals the newNBars you want.
     */
    protected computeGeometry() {
        this.computeMaxMin();

        // compute y after compute maxmin
        this.yc.computeGeometry(this.maxValue, this.minValue)
    }

    protected setMaxMinValue(max: number, min: number) {
        this.maxValue = max;
        this.minValue = min;
    }

    wChart(): number {
        return this.props.width - ChartView.AXISY_WIDTH;
    }

    get isSelected() {
        return false;
        //return this.glassPane.isSelected;
    }
    set isSelected(b: boolean) {
        //this.glassPane.isSelected = b;
    }

    get isPinned(): boolean {
        return this.#isPinned;
    }
    pin() {
        //this.glassPane.pin(true);

        this.#isPinned = true;
    }

    unPin() {
        //this.glassPane.pin(false);

        this.#isPinned = false;
    }

    chartToVarsOf(ser: TSer): Map<Chart, Set<TVar<TVal>>> | undefined {
        //assert(ser != null, "Do not pass me a null ser!")
        //let x = this.overlappingSerChartToVars.get(ser);
        return ser === this.baseSer ? this.mainSerChartToVars : this.overlappingSerChartToVars.get(ser);
    }

    overlappingSers() {
        return this.overlappingSerChartToVars.keys();
    }

    allSers() {
        const _allSers = new Set<TSer>()

        _allSers.add(this.baseSer);
        for (const s of this.overlappingSers()) {
            _allSers.add(s);
        }

        return _allSers
    }

    popupToDesktop() {
    }

    computeMaxMin() {
        // if no need maxValue/minValue, don't let them all equal 0, just set to 1 and 0 
        this.maxValue = 1;
        this.minValue = 0;
    }

    // return `value !== undefined` to show cursor value of time
    abstract valueAtTime(time: number): number

    abstract plot(): ChartParts;

    protected updateChart_Cursor(willUpdateChart: boolean, willUpdateCursor: boolean, xMouse: number, yMouse: number) {
        let chartParts = undefined;
        if (willUpdateChart) {
            // clear mouse cursor and prev value
            this.props.xc.isMouseCuroseVisible = false;
            this.yc.setMouseCursorValue(undefined, undefined)

            chartParts = this.plot();
        }

        if (willUpdateCursor) {
            this.updateState(chartParts, xMouse, yMouse)

        } else if (willUpdateChart) {
            this.updateState(chartParts);
        }
    }

    protected updateChart() {
        // clear mouse cursor and prev value
        this.props.xc.isMouseCuroseVisible = false;
        this.yc.setMouseCursorValue(undefined, undefined)

        const chartParts = this.plot();
        this.updateState(chartParts);
    }

    protected updateCursors(xMouse: number, yMouse: number) {
        this.updateState({}, xMouse, yMouse);
    }

    protected updateState(state: object, xMouse?: number, yMouse?: number) {
        let referCursor = undefined
        let mouseCursor = undefined
        let latestValueLabel = undefined
        const referColor = '#00F0F0C0';
        const mouseColor = '#00F000';
        let latestColor = '#ffa500'; // orange

        const xc = this.props.xc;

        const latestTime = this.props.xc.lastOccurredTime();

        let referTime = undefined;
        if (xc.isReferCuroseVisible) {
            referTime = xc.tr(xc.referCursorRow)
            const isOccurredTime = xc.occurred(referTime);

            if (isOccurredTime) {
                const cursorX = xc.xr(xc.referCursorRow)

                let cursorY: number
                let value = this.valueAtTime(referTime);
                if (value && !isNaN(value)) {
                    cursorY = this.yc.yv(value)

                    if (this.yc.shouldNormScale) {
                        value /= this.yc.normScale
                    }

                    referCursor = this.#plotCursor(cursorX, cursorY, referTime, value, referColor)
                }
            }
        }

        let mouseTime = undefined;
        if (xc.isMouseCuroseVisible) {
            mouseTime = xc.tr(xc.mouseCursorRow)
            const isOccurredTime = xc.occurred(mouseTime);
            // try to align x to bar center
            const cursorX = isOccurredTime ? xc.xr(xc.mouseCursorRow) : xMouse;

            let value: number;
            let cursorY: number;
            if (yMouse === undefined && isOccurredTime) {
                value = this.valueAtTime(mouseTime);
                if (value !== undefined && !isNaN(value)) {
                    cursorY = this.yc.yv(value);
                }

            } else {
                cursorY = yMouse;
                value = this.yc.vy(cursorY);
            }

            if (cursorY !== undefined && !isNaN(cursorY) && value !== undefined && !isNaN(value)) {
                if (this.yc.shouldNormScale) {
                    value /= this.yc.normScale
                }

                mouseCursor = this.#plotCursor(cursorX, cursorY, mouseTime, value, mouseColor)
            }

        } else {
            // mouse cursor invisible, will show latest value
            mouseTime = latestTime;
        }

        if (latestTime !== undefined && latestTime > 0) {
            const kline = this.props.tvar.getByTime(latestTime)
            if (kline !== undefined && kline instanceof Kline) {
                latestColor = "#fdf6e3" // kline.close > kline.open ? "#BB0000" : "#00AA00"
            }

            let value = this.valueAtTime(latestTime);
            if (value !== undefined && !isNaN(value)) {
                const y = this.yc.yv(value);

                if (this.yc.shouldNormScale) {
                    value /= this.yc.normScale
                }

                latestValueLabel = this.plotYValueLabel(y, value, "#000000", latestColor)
            }
        }

        this.tryToUpdateIndicatorLables(mouseTime, referTime);
        this.setState({ ...state, referCursor, mouseCursor, latestValueLabel })
    }

    tryToUpdateIndicatorLables(mouseTime: number, referTime?: number) {
        // overlay indicators
        if (this.props.overlayIndicators && this.props.updateOverlayIndicatorLabels) {
            const allmvs = []
            const allrvs = []
            this.props.overlayIndicators.map((indicator, n) => {
                const tvar = indicator.tvar;

                let mvs = undefined;
                if (mouseTime !== undefined && mouseTime > 0) {
                    mvs = indicator.outputs.map(({ atIndex }, n) => {
                        const values = tvar.getByTime(mouseTime);
                        const v = values ? values[atIndex] : '';
                        return typeof v === 'number'
                            ? isNaN(v) ? "" : v.toFixed(2)
                            : '' + v
                    })

                } else {
                    mvs = new Array(indicator.outputs.length);
                }

                allmvs.push(mvs)

                let rvs = undefined;
                if (referTime != undefined && referTime > 0) {
                    rvs = indicator.outputs.map(({ atIndex }, n) => {
                        const values = tvar.getByTime(referTime);
                        const v = values ? values[atIndex] : '';
                        return typeof v === 'number'
                            ? isNaN(v) ? "" : v.toFixed(2)
                            : '' + v
                    })

                } else {
                    rvs = new Array(indicator.outputs.length);
                }

                allrvs.push(rvs)
            })

            this.props.updateOverlayIndicatorLabels(allmvs, allrvs);
        }

        // stacked indicators
        if (this.props.updateStackedIndicatorLabels) {
            const tvar = this.props.tvar;
            let mvs = undefined;
            if (mouseTime != undefined && mouseTime > 0) {
                const values = tvar.getByTime(mouseTime);
                mvs = values && (values as unknown[]).map((v) =>
                    typeof v === 'number'
                        ? isNaN(v) ? "" : v.toFixed(2)
                        : '' + v
                );

            }

            let rvs = undefined;
            if (referTime !== undefined && referTime > 0) {
                const values = tvar.getByTime(referTime);
                rvs = values && (values as unknown[]).map((v) =>
                    typeof v === 'number'
                        ? isNaN(v) ? "" : v.toFixed(2)
                        : '' + v
                );
            }

            this.props.updateStackedIndicatorLabels(mvs, rvs);
        }
    }

    #plotCursor(x: number, y: number, time: number, value: number, background: string) {
        const wAxisY = ChartView.AXISY_WIDTH

        const crossPath = new Path;
        // crossPath.stroke_dasharray = '1, 1'

        // horizontal line
        crossPath.moveto(0, y);
        crossPath.lineto(this.props.width - wAxisY, y)

        const valueLabel = this.plotYValueLabel(y, value, "#000000", background);

        return (
            <>
                <g shapeRendering="crispEdges" >
                    {crossPath.render('axisy-cross', { stroke: background })}
                </g>
                {valueLabel}
            </>
        )
    }

    plotYValueLabel(y: number, value: number, textColor: string, backgroud: string) {
        const valueStr = value.toFixed(3);

        const wLabel = ChartView.AXISY_WIDTH; // label width
        const hLabel = 12; // label height

        const wAxisY = ChartView.AXISY_WIDTH

        const axisyTexts = new Texts
        const axisyPath = new Path
        const y0 = y + 6
        const x0 = 6
        // draw arrow
        axisyPath.moveto(6, y - 3);
        axisyPath.lineto(0, y);
        axisyPath.lineto(6, y + 3);

        axisyPath.moveto(x0, y0);
        axisyPath.lineto(x0 + wLabel, y0);
        axisyPath.lineto(x0 + wLabel, y0 - hLabel);
        axisyPath.lineto(x0, y0 - hLabel);
        axisyPath.closepath();
        axisyTexts.text(8, y0 - 1, valueStr);

        const transformYAnnot = `translate(${this.props.width - wAxisY}, ${0})`

        return (
            // pay attention to the order to avoid text being overlapped
            <>
                <g transform={transformYAnnot}>
                    {axisyPath.render('axisy-tick', { stroke: backgroud, fill: backgroud })}
                    {axisyTexts.render('axisy-annot', { fill: textColor })}
                </g>
            </>
        )
    }

    override componentDidMount(): void {
        // call to update labels;
        this.updateCursors(undefined, undefined);
    }

    // Important: Be careful when calling setState within componentDidUpdate
    // Ensure you have a conditional check to prevent infinite re-renders.
    // If setState is called unconditionally, it will trigger another update,
    // potentially leading to a loop.
    override componentDidUpdate(prevProps: ViewProps, prevState: ViewState) {
        let willUpdateChart = false
        let willUpdateCursor = false;
        let xMouse = undefined;
        let yMouse = undefined;

        if (this.props.shouldUpdateChart !== prevProps.shouldUpdateChart) {
            willUpdateChart = true;
        }

        if (areDeeplyEqualArrays(this.props.overlayIndicators, prevProps.overlayIndicators)) {
            willUpdateChart = true;
        }

        if (this.props.shouldUpdateCursors.changed !== prevProps.shouldUpdateCursors.changed) {
            const xyMouse = this.props.shouldUpdateCursors.xyMouse;
            if (xyMouse !== undefined) {
                if (xyMouse.who === this.props.id) {
                    willUpdateCursor = true;
                    xMouse = xyMouse.x;
                    yMouse = xyMouse.y;

                } else {
                    willUpdateCursor = true;
                    xMouse = xyMouse.x;
                    yMouse = undefined;
                }

            } else {
                willUpdateCursor = true;
                xMouse = undefined;
                yMouse = undefined;
            }
        }

        if (willUpdateChart || willUpdateCursor) {
            this.updateChart_Cursor(willUpdateChart, willUpdateCursor, xMouse, yMouse)
        }
    }

}

function areDeeplyEqualArrays(arr1, arr2) {
    // Check if both inputs are arrays
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
        return false;
    }

    // Check if lengths are equal
    if (arr1.length !== arr2.length) {
        return false;
    }

    // Iterate and recursively compare elements
    for (let i = 0; i < arr1.length; i++) {
        const elem1 = arr1[i];
        const elem2 = arr2[i];

        // If elements are not primitive and are arrays/objects, recurse
        if (typeof elem1 === 'object' && elem1 !== null &&
            typeof elem2 === 'object' && elem2 !== null) {
            if (!areDeeplyEqualArrays(elem1, elem2)) { // Assuming a general deep equal function handles objects as well
                return false;
            }

        } else if (elem1 !== elem2) { // Primitive comparison
            return false;
        }
    }

    return true;
}


