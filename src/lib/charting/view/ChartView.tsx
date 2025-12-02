import { TVal } from "../../timeseris/TVal";
import { type TSer } from "../../timeseris/TSer";
import { TVar } from "../../timeseris/TVar";
import { Chart } from "../chart/Chart";
import { ChartXControl } from "./ChartXControl";
import { ChartYControl } from "./ChartYControl";
import { Component, type JSX } from "react";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Text";
import { Temporal } from "temporal-polyfill";
import { TUnit } from "../../timeseris/TUnit";
import { COMMON_DECIMAL_FORMAT } from "./Format";

export enum RefreshEvent {
    Chart,
    Cursors
}

export type ChartParts = {
    chart: JSX.Element,
    axisy: JSX.Element
}

export type RefreshCursor = {
    changed: number,
    yMouse: { who?: string, y?: number }
}

export type ChartOf = {
    tvar: TVar<unknown[]>;
    atIndex: number,
    name: string,
    kind: string,
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
    isKline?: boolean;
    isMasterView?: boolean;
    refreshChart: number;
    refreshCursors: RefreshCursor;
    name: string;
    overlappingCharts?: ChartOf[];
}

export interface ViewState {
    width: number;
    height: number;

    isKline: false;
    hasInnerVolume: false;
    maxVolume?: number;
    minVolume?: number;

    maxValue: 1.0
    minValue: 0.0

    isInteractive: true
    isPinned: false

    chart: JSX.Element;
    axisy?: JSX.Element;

    mouseCursor: JSX.Element
    referCursor: JSX.Element

    overlappingCharts?: JSX.Element[];
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

    static readonly AXISY_WIDTH = 50
    static readonly CONTROL_HEIGHT = 12
    static readonly TITLE_HEIGHT_PER_LINE = 14

    yc: ChartYControl;
    baseSer: TSer;
    isMasterView: boolean;

    tvar: TVar<unknown>;

    name: string
    id: string;

    // share same xc through all views that are in the same viewcontainer.
    constructor(props: P) {
        super(props)

        this.yc = new ChartYControl(props.baseSer, props.height);

        this.name = props.name;
        this.id = props.id;

        console.log(`${this.name} ChartView render`)
    }

    protected readonly overlappingSerChartToVars = new Map<TSer, Map<Chart, Set<TVar<TVal>>>>()

    readonly mainSerChartToVars = new Map<Chart, Set<TVar<TVal>>>()

    isKline = false;
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

    // addOverlappingCharts(ser: TSer) {
    //   this.listenTo(ser)

    //   let chartToVars = this.overlappingSerChartToVars.get(ser)
    //   if (chartToVars === undefined) {
    //     chartToVars = new Map<Chart, Set<TVar<unknown>>>()
    //     this.overlappingSerChartToVars.set(ser, chartToVars)
    //   }

    //   let depthGradient = Pane.DEPTH_GRADIENT_BEGIN

    //   for (let [k, v] of ser.vars if v.plot != Plot.None) {
    //     const chart = if (v.plot == Plot.Signal && baseSer instanceOf KlineSer) {
    //       const qser = baseSer.asInstanceOf[KlineSer]
    //       ChartFactory.createVarChart(v, qser.high, qser.low)

    //     } else if (v.plot === Plot.Info) {
    //       ChartFactory.createVarChart(v, ser.vars : _ *)

    //     } else {
    //       ChartFactory.createVarChart(v)
    //     }

    //     if (chart != null) {
    //       let vars = chartToVars.get(chart);
    //       if (vars === undefined) {
    //         vars = new Set<TVar<unknown>>()
    //         chartToVars.set(chart, vars)
    //       }
    //       vars.add(v);

    //       switch (chart.tag) {
    //         case "GradientChart":
    //           chart.depth = depthGradient; depthGradient--
    //           break;
    //         case "ProfileChart":
    //           chart.depth = depthGradient; depthGradient--
    //           break;
    //         case "StickChart":
    //           chart.depth = -8
    //           break;
    //         default:
    //           chart.depth = this.#lastDepthOfOverlappingChart;
    //           this.#lastDepthOfOverlappingChart++;
    //       }

    //       chart.set(this.mainChartPane, ser)
    //       this.mainChartPane.putChart(chart)
    //     }
    //   }

    //   notifyChanged(classOf[ChartValidityObserver])

    //   repaint()
    // }

    // removeOverlappingCharts(ser: TSer) {
    //   deafTo(ser)

    //   const chartToVars = this.overlappingSerChartToVars.get(ser) ?? new Map<Chart, Set<TVar<unknown>>>();
    //   chartToVars.forEach(
    //     chartToVars => {
    //       for (let chart of chartToVars.keys()) {
    //         mainChartPane.removeChart(chart)
    //         switch (chart.tag) {
    //           case "GradientChart": /** noop */
    //           case "ProfileChart": /** noop */
    //           case "StickChart": /** noop */
    //             break;
    //           default:
    //             this.#lastDepthOfOverlappingChart--
    //         }
    //       }
    //       /** release chartToVars */
    //       chartToVars.clear
    //       overlappingSerChartToVars.remove(ser)
    //     }
    //   )

    //   notifyChanged(classOf[ChartValidityObserver])

    //   repaint()
    // }

    computeMaxMin() {
        // if don't need maxValue/minValue, don't let them all equal 0, just set them to 1 and 0 
        this.maxValue = 1;
        this.minValue = 0;
    }

    abstract valueAtTime(time: number): number

    abstract plot(): ChartParts;

    protected updateChart() {
        // clear mouse cursor and prev value
        this.props.xc.isMouseCuroseVisible = false;
        this.yc.setMouseCursorValue(undefined, undefined)

        const chartParts = this.plot();
        this.updateState(chartParts);
    }

    protected updateCursors(yMouse: number) {
        this.updateState({}, yMouse);
    }

    protected updateState(state: object, yMouse?: number) {
        let referCursor = <></>
        let mouseCursor = <></>
        const referColor = '#00F0F0'; // 'orange'
        const mouseColor = '#00F000';

        const xc = this.props.xc;

        if (xc.isReferCuroseVisible) {
            const time = xc.tr(xc.referCursorRow)
            if (xc.occurred(time)) {
                const cursorX = xc.xr(xc.referCursorRow)

                let value = this.valueAtTime(time);
                const cursorY = this.yc.yv(value)

                if (Math.abs(value) >= ChartYControl.VALUE_SCALE_UNIT) {
                    value /= ChartYControl.VALUE_SCALE_UNIT
                }

                referCursor = this.#plotCursor(cursorX, cursorY, time, value, referColor)
            }
        }

        if (xc.isMouseCuroseVisible) {
            const time = xc.tr(xc.mouseCursorRow)
            if (xc.occurred(time)) {
                const cursorX = xc.xr(xc.mouseCursorRow)

                let value: number;
                let cursorY: number;
                if (yMouse === undefined) {
                    value = this.valueAtTime(time);
                    cursorY = this.yc.yv(value);

                } else {
                    cursorY = yMouse;
                    value = this.yc.vy(cursorY);
                }

                if (Math.abs(value) >= ChartYControl.VALUE_SCALE_UNIT) {
                    value /= ChartYControl.VALUE_SCALE_UNIT
                }

                mouseCursor = this.#plotCursor(cursorX, cursorY, time, value, mouseColor)
            }
        }

        this.setState({ ...state, referCursor, mouseCursor })
    }

    #plotCursor(x: number, y: number, time: number, value: number, color: string) {
        const wAnnot = 44; // annotation width
        const hAnnot = 12; // annotation height

        const wAxisY = ChartView.AXISY_WIDTH

        const valueStr = value.toPrecision(5);

        const crossPath = new Path(color);
        // crossPath.stroke_dasharray = '1, 1'

        // horizontal line
        crossPath.moveto(0, y);
        crossPath.lineto(this.props.width - wAxisY, y)

        const axisyText = new Texts('#000000')
        const axisyPath = new Path(color, color)
        const y0 = y + 6
        const x0 = 6
        // draw arrow
        axisyPath.moveto(6, y - 3);
        axisyPath.lineto(0, y);
        axisyPath.lineto(6, y + 3);

        axisyPath.moveto(x0, y0);
        axisyPath.lineto(x0 + wAnnot, y0);
        axisyPath.lineto(x0 + wAnnot, y0 - hAnnot);
        axisyPath.lineto(x0, y0 - hAnnot);
        axisyPath.closepath();
        axisyText.text(8, y0 - 1, valueStr);

        const transformYAnnot = `translate(${this.props.width - wAxisY}, ${0})`

        return (
            // pay attention to the order to avoid text being overlapped
            <>
                <g shapeRendering="crispEdges" >
                    {crossPath.render('axisy-cross')}
                </g>
                <g transform={transformYAnnot}>
                    {axisyPath.render('axisy-tick')}
                    {axisyText.render('axisy-annot')}
                </g>
            </>
        )
    }

    // Important: Be careful when calling setState within componentDidUpdate
    // Ensure you have a conditional check to prevent infinite re-renders.
    // If setState is called unconditionally, it will trigger another update,
    // potentially leading to a loop.
    override componentDidUpdate(prevProps: ViewProps, prevState: ViewState) {
        if (this.props.refreshChart !== prevProps.refreshChart) {
            this.updateChart();
        }

        if (this.props.overlappingCharts !== prevProps.overlappingCharts) {
            this.updateChart();
        }

        if (this.props.refreshCursors.changed !== prevProps.refreshCursors.changed) {
            const yMouse = this.props.refreshCursors.yMouse;
            if (yMouse.who && yMouse.who === this.id) {
                this.updateCursors(yMouse.y);
            } else {
                this.updateCursors(undefined);
            }
        }
    }

}


