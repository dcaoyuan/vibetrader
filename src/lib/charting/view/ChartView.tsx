import { type TSer } from "../../timeseris/TSer";
import { TVar } from "../../timeseris/TVar";
import { ChartXControl } from "./ChartXControl";
import { ChartYControl } from "./ChartYControl";
import { Component, Fragment, type JSX } from "react";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";
import { Kline } from "../../domain/Kline";
import type { Key } from "react-aria-components";
import type { Drawing, TPoint } from "../drawing/Drawing";
import { createDrawing } from "../drawing/Drawings";

export enum UpdateEvent {
    Chart,
    Cursors
}

export type UpdateCursor = {
    changed: number,
    xyMouse?: { who: string, x: number, y: number }
}

export type Indicator = {
    indName: string,
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

export type UpdateDrawing = {
    action?: 'create' | 'delete' | 'hide' | 'deselect'
    createDrawingId?: string
    isHidingDrawing?: boolean;
}

export interface ViewProps {
    name: string;
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    xc: ChartXControl;
    baseSer: TSer;
    tvar: TVar<unknown>;
    shouldUpdateChart: number;
    shouldUpdateCursor: UpdateCursor;
    shouldUpdateDrawing?: UpdateDrawing;

    // for indicator chart view's main indicator outputs
    mainIndicatorOutputs?: Output[]

    indexOfStackedIndicators?: number
    overlayIndicators?: Indicator[];

    callbacksToContainer?: CallbacksToContainer;
}

export interface ViewState {

    chartLines: JSX.Element[];
    chartAxisy?: JSX.Element;
    overlayChartLines?: JSX.Element[];
    drawingLines?: JSX.Element[];

    mouseCursor?: JSX.Element
    referCursor?: JSX.Element

    latestValueLabel?: JSX.Element

    sketching?: JSX.Element
}

export type CallbacksToContainer = {
    updateOverlayIndicatorLabels: (vs: string[][], refVs?: string[][]) => void
    updateStackedIndicatorLabels: (indexOfStackedIndicators: number, vs: string[], refVs?: string[]) => void
    updateSelectedDrawingIds: (ids?: Set<Key>) => void;
}

const HANDLE_CURSOR = "crosshair"
const DEFAULT_CURSOR = "default"
const MOVE_CURSOR = "move"


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

    drawings: Drawing[] = []

    // share same xc through all views that are in the same viewcontainer.
    constructor(props: P) {
        super(props)

        this.yc = new ChartYControl(props.baseSer, props.height);

        console.log(`${this.props.name} ChartView render`)
    }

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
        const [maxValue, minValue] = this.computeMaxValueMinValue();

        // compute y after compute maxmin
        this.yc.computeGeometry(maxValue, minValue)
    }

    wChart(): number {
        return this.props.width - ChartView.AXISY_WIDTH;
    }

    popupToDesktop() {
    }

    computeMaxValueMinValue() {
        // if no need maxValue/minValue, don't let them all equal 0, just set to 1 and 0 
        return [1, 0];
    }

    // return `value !== undefined` to show cursor value of time
    abstract valueAtTime(time: number): number

    abstract plot(): Pick<ViewState, "chartLines" | "chartAxisy" | "overlayChartLines" | "drawingLines">;

    protected plotOverlayCharts(): JSX.Element[] {
        return [];
    }

    protected updateChart_Cursor(
        willUpdateChart: boolean,
        willUpdateOverlayCharts: boolean,
        willUpdateCursor: boolean, xMouse: number, yMouse: number
    ) {

        let state: Partial<ViewState> = {};

        if (willUpdateChart) {
            const { chartLines, chartAxisy, overlayChartLines, drawingLines } = this.plot();
            state = { ...state, chartLines, chartAxisy, overlayChartLines, drawingLines }
        }

        if (!willUpdateChart && willUpdateOverlayCharts) {
            const overlayChartLines = this.plotOverlayCharts()
            state = { ...state, overlayChartLines }
        }

        if (willUpdateCursor) {
            this.updateState(state, xMouse, yMouse)

        } else {
            this.updateState(state);
        }
    }

    protected updateChart() {
        const { chartLines, chartAxisy } = this.plot();
        this.updateState({ chartLines, chartAxisy });
    }

    protected updateCursors(xMouse: number, yMouse: number) {
        this.updateState({}, xMouse, yMouse);
    }

    protected updateState(state: Partial<ViewState>, xMouse?: number, yMouse?: number) {
        let referCursor: JSX.Element
        let mouseCursor: JSX.Element
        let latestValueLabel: JSX.Element

        const referColor = '#00F0F0C0';
        const mouseColor = '#00F000';
        let latestColor = '#ffa500'; // orange

        const xc = this.props.xc;
        const yc = this.yc;

        const latestTime = this.props.xc.lastOccurredTime();

        let referTime: number
        if (xc.isReferCursorEnabled) {
            referTime = xc.tr(xc.referCursorRow)
            const isOccurredTime = xc.occurred(referTime);

            if (isOccurredTime) {
                const cursorX = xc.xr(xc.referCursorRow)

                let cursorY: number
                let value = this.valueAtTime(referTime);
                if (value && !isNaN(value)) {
                    cursorY = yc.yv(value)

                    if (yc.shouldNormScale) {
                        value /= yc.normScale
                    }

                    referCursor = this.#plotCursor(cursorX, cursorY, referTime, value, referColor)
                }
            }
        }

        let mouseTime: number
        if (xc.isMouseCursorEnabled) {
            mouseTime = xc.tr(xc.mouseCursorRow)
            const isOccurredTime = xc.occurred(mouseTime);
            // try to align x to bar center
            const cursorX = isOccurredTime ? xc.xr(xc.mouseCursorRow) : xMouse;

            let value: number;
            let cursorY: number;
            if (yMouse === undefined && isOccurredTime) {
                value = this.valueAtTime(mouseTime);
                if (value !== undefined && !isNaN(value)) {
                    cursorY = yc.yv(value);
                }

            } else {
                cursorY = yMouse;
                value = yc.vy(cursorY);
            }

            if (cursorY !== undefined && !isNaN(cursorY) && value !== undefined && !isNaN(value)) {
                if (yc.shouldNormScale) {
                    value /= yc.normScale
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
                const y = yc.yv(value);

                if (yc.shouldNormScale) {
                    value /= yc.normScale
                }

                latestValueLabel = this.plotYValueLabel(y, value, "#000000", latestColor)
            }
        }

        this.tryToUpdateIndicatorLables(mouseTime, referTime);
        this.setState({ ...(state as object), referCursor, mouseCursor, latestValueLabel })
    }

    tryToUpdateIndicatorLables(mouseTime: number, referTime?: number) {
        // overlay indicators
        if (this.props.overlayIndicators !== undefined) {
            const allmvs: string[][] = []
            const allrvs: string[][] = []
            this.props.overlayIndicators.map((indicator, n) => {
                const tvar = indicator.tvar;

                let mvs: string[]
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

                let rvs: string[]
                if (referTime !== undefined && referTime > 0) {
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

            this.props.callbacksToContainer.updateOverlayIndicatorLabels(allmvs, allrvs);
        }

        // stacked indicators
        if (this.props.indexOfStackedIndicators !== undefined) {
            const tvar = this.props.tvar;
            let mvs: string[]
            if (mouseTime !== undefined && mouseTime > 0) {
                const values = tvar.getByTime(mouseTime);
                mvs = values && (values as unknown[]).map((v) =>
                    typeof v === 'number'
                        ? isNaN(v) ? "" : v.toFixed(2)
                        : '' + v
                );

            }

            let rvs: string[]
            if (referTime !== undefined && referTime > 0) {
                const values = tvar.getByTime(referTime);
                rvs = values && (values as unknown[]).map((v) =>
                    typeof v === 'number'
                        ? isNaN(v) ? "" : v.toFixed(2)
                        : '' + v
                );
            }

            this.props.callbacksToContainer.updateStackedIndicatorLabels(this.props.indexOfStackedIndicators, mvs, rvs);
        }
    }

    #plotCursor(x: number, y: number, time: number, value: number, background: string) {
        const wAxisY = ChartView.AXISY_WIDTH

        let crosshair: Path
        if (
            !(this.props.shouldUpdateDrawing && this.props.shouldUpdateDrawing.createDrawingId) &&
            !this.props.xc.isCrosshairEnabled
        ) {
            crosshair = new Path();

            // horizontal line
            crosshair.moveto(0, y);
            crosshair.lineto(this.props.width - wAxisY, y)
        }

        const valueLabel = this.plotYValueLabel(y, value, "#000000", background);

        return (
            <>
                {crosshair && crosshair.render({ key: 'axisy-cross', style: { stroke: background, strokeWidth: "0.7px" } })}
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
            <g transform={transformYAnnot}>
                {axisyPath.render({ key: 'axisy-tick', style: { stroke: backgroud, fill: backgroud, strokeWidth: "0.7px" } })}
                {axisyTexts.render({ key: 'axisy-annot', style: { fill: textColor } })}
            </g>
        )
    }

    // translate offset x, y to svg to x, y to this view
    protected translate(eOnWholeSVG: React.MouseEvent) {
        return [
            eOnWholeSVG.nativeEvent.offsetX - this.props.x,
            eOnWholeSVG.nativeEvent.offsetY - this.props.y
        ]
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
        let willUpdateOverlayCharts = false;

        let xMouse: number
        let yMouse: number

        if (this.props.shouldUpdateChart !== prevProps.shouldUpdateChart) {
            willUpdateChart = true;
        }

        if (this.isOverlayIndicatorsChanged(this.props.overlayIndicators, prevProps.overlayIndicators)) {
            // console.log(this.props.id, "overlayIndicators changed")
            willUpdateOverlayCharts = true;
        }

        if (this.props.shouldUpdateCursor.changed !== prevProps.shouldUpdateCursor.changed) {
            const xyMouse = this.props.shouldUpdateCursor.xyMouse;
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

        if (this.props.shouldUpdateDrawing != prevProps.shouldUpdateDrawing) {
            if (this.props.shouldUpdateDrawing) {
                switch (this.props.shouldUpdateDrawing.action) {
                    case 'delete':
                        this.deleteSelectedDrawing()
                        break;

                    case 'deselect':
                        this.deselectDrawing();
                        break;
                }
            }
        }

        if (willUpdateChart || willUpdateOverlayCharts || willUpdateCursor) {
            this.updateChart_Cursor(willUpdateChart, willUpdateOverlayCharts, willUpdateCursor, xMouse, yMouse)
        }
    }

    isOverlayIndicatorsChanged(newInds: Indicator[], oldInds: Indicator[]) {
        if (newInds === undefined && oldInds === undefined) {
            return false;

        } else if (newInds === undefined || oldInds === undefined) {
            return true;
        }

        if (newInds.length !== oldInds.length) {
            return true;
        }

        for (let i = 0; i < newInds.length; i++) {
            const newInd = newInds[i];
            const oldInd = oldInds[i];

            if (newInd.indName !== oldInd.indName) {
                return true
            }
        }

        return false;

    }

    // --- drawing ---

    selectedDrawing: Drawing

    protected plotDrawings() {
        return this.drawings.map((drawing, n) => this.props.xc.selectedDrawingIdx === n
            ? drawing.renderDrawingWithHandles("drawing-" + n)
            : drawing.renderDrawing("drawing-" + n))
    }

    protected deleteSelectedDrawing() {
        const selectedDrawingIdx = this.props.xc.selectedDrawingIdx;
        if (selectedDrawingIdx !== undefined) {
            const drawingLines = [
                ...this.state.drawingLines.slice(0, selectedDrawingIdx),
                ...this.state.drawingLines.slice(selectedDrawingIdx + 1)
            ];

            const drawings = [
                ...this.drawings.slice(0, selectedDrawingIdx),
                ...this.drawings.slice(selectedDrawingIdx + 1)
            ]

            // should also clear hitDrawingIdx
            this.props.xc.selectedDrawingIdx = undefined
            this.props.xc.hitDrawingIdx = undefined

            this.drawings = drawings
            this.setState({ drawingLines })
        }
    }


    protected deselectDrawing() {
        if (this.props.xc.selectedDrawingIdx !== undefined) {
            this.showDrawingDeselect(this.props.xc.selectedDrawingIdx)
            this.props.xc.selectedDrawingIdx = undefined
        }
    }

    private showDrawingSelect(idx: number) {
        const drawingLine = this.drawings[idx].renderDrawingWithHandles()
        const drawingLines = [
            ...this.state.drawingLines.slice(0, idx),
            drawingLine,
            ...this.state.drawingLines.slice(idx + 1)
        ];

        this.setState({ drawingLines })
    }

    private showDrawingDeselect(idx: number) {
        const drawingLine = this.drawings[idx].renderDrawing()
        const drawingLines = [
            ...this.state.drawingLines.slice(0, idx),
            drawingLine,
            ...this.state.drawingLines.slice(idx + 1)
        ];

        this.setState({ drawingLines })
    }

    workingDrawing() {
        if (this.selectedDrawing === undefined) {
            if (this.props.shouldUpdateDrawing.createDrawingId) {
                this.selectedDrawing = createDrawing(this.props.shouldUpdateDrawing.createDrawingId, this.props.xc, this.yc)
                this.selectedDrawing.activate()
            }
        }

        return this.selectedDrawing;
    }

    private cursor: string = undefined

    private p(x: number, y: number): TPoint {
        return { time: this.props.xc.tx(x), value: this.yc.vy(y) }
    }

    onDrawingMouseUp(e: React.MouseEvent) {
        if (this.props.shouldUpdateDrawing.createDrawingId === undefined) {
            return;
        }

        if (e.detail >= 2) {
            return;
        }

        // sinlge-clicked ? go on drawing, or, check my selection status 

        console.log('mouse up', e.detail, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        const x = e.nativeEvent.offsetX - this.props.x
        const y = e.nativeEvent.offsetY - this.props.y

        const working = this.workingDrawing()

        // go on drawing ?
        if (working.isActivated && !working.isCompleted) {
            const isCompleted = working.anchorHandle(this.p(x, y))
            if (isCompleted) {
                const drawingLine = working.renderDrawing()
                const drawingLines = this.state.drawingLines
                this.setState({ drawingLines: [...drawingLines, drawingLine], sketching: undefined })

                this.drawings.push(working)
                this.selectedDrawing = undefined
                this.props.callbacksToContainer.updateSelectedDrawingIds()
            }

            // always set is selected in such case: 
            working.isSelected = true

        } else {
            // else, check selection status
            if (working.hits(x, y)) {
                if (working.isSelected) {
                    //   this.chart.lookupActionAt(classOf[EditAction], e.getPoint) foreach {
                    //     action =>
                    //       /** as the glassPane is always in the front, so add it there */
                    //       action.anchorEditor(drawingPane.view.glassPane)
                    //     action.execute
                    //   }
                }

                working.isSelected = true
                // chart is just selected, don't call activate() here, let drawingPane 
                // to decide if also activate it.

            } else {
                working.isSelected = false
                // chart is just deselected, don't call passivate() here, let drawingPane
                // to decide if also passivate it.
            }
        }
    }

    onDrawingMouseMove(e: React.MouseEvent) {
        // console.log('mouse move', e.nativeEvent.offsetX, e.nativeEvent.offsetY, e.target)
        const [x, y] = this.translate(e)

        const working = this.workingDrawing()

        const hitIdx = this.drawings.findIndex(drawing => drawing.hits(x, y))
        if (hitIdx != -1) {
            this.props.xc.hitDrawingIdx = hitIdx
            this.showDrawingSelect(hitIdx)

        } else {
            if (this.props.xc.hitDrawingIdx >= 0 && this.props.xc.selectedDrawingIdx !== this.props.xc.hitDrawingIdx) {
                this.showDrawingDeselect(this.props.xc.hitDrawingIdx)
                this.props.xc.hitDrawingIdx = undefined
            }
        }

        if (working === undefined) {
            return // TODO
        }

        if (working.isActivated) {
            if (working.isCompleted) {
                // completed, decide what kind of cursor will be used and if it's ready to be moved
                const handle = working.getHandleAt(x, y)
                // mouse points to this handle ? 
                if (handle !== undefined) {
                    const idx = working.handles.indexOf(handle)
                    if (idx >= 0) {
                        working.currHandleIdx = idx
                    }

                    this.cursor = HANDLE_CURSOR

                } else {
                    // else, mouse does not point to any handle 
                    working.currHandleIdx = -1
                    // mouse points to this chart ? 
                    if (working.hits(x, y)) {
                        working.isReadyToDrag = true
                        this.cursor = MOVE_CURSOR

                    } else {
                        // else, mouse does not point to this chart 
                        working.isReadyToDrag = false
                        this.cursor = DEFAULT_CURSOR
                    }
                }

            } else {
                // not completed, strecth handle
                if (working.isAnchored) {
                    const sketching = working.stretchHandle(this.p(x, y))
                    this.setState({ sketching })
                }
            }
        }
    }


    onDrawingMouseDoubleClick(e: React.MouseEvent) {
        if (this.props.shouldUpdateDrawing.createDrawingId === undefined) {
            return;
        }

        console.log('mouse doule clicked', e.detail, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        if (e.detail === 2) {
            const [x, y] = this.translate(e)

            const working = this.workingDrawing()
            // double clicked, process chart whose nHandles is variable
            if (!working.isCompleted) {
                if (working.nHandles === undefined) {
                    working.isAnchored = false;
                    working.isCompleted = true;
                    working.currHandleIdx = -1;
                }
            }
        }
    }

    onDrawingMouseDown(e: React.MouseEvent) {
        console.log('mouse down', e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        const [x, y] = this.translate(e)

        const hitIdx = this.drawings.findIndex(drawing => drawing.hits(x, y))
        if (hitIdx != -1) {
            // this.props.xc.isReferCursorVisible = true
            this.props.xc.selectedDrawingIdx = hitIdx
            this.showDrawingSelect(hitIdx)

        } else {
            if (this.props.xc.selectedDrawingIdx !== undefined) {
                this.deselectDrawing()
            }
        }

        if (this.props.shouldUpdateDrawing.createDrawingId === undefined) {
            return;
        }

        const working = this.workingDrawing()
        if (working.isReadyToDrag) {
            working.mousePressedPoint = this.p(x, y)
            // record handles when mouse pressed, for moveChart() 
            const n = working.handles.length
            let i = 0
            while (i < n) {
                working.currHandlesWhenMousePressed[i].point = working.handles[i].point
                i++
            }
        }

        /** @TODO */
        //            if (isAccomplished() && isActive()) {
        //                if (nHandles == VARIABLE_NUMBER_OF_HANDLES) {
        //                    /** edit(add/delete handle) chart whose nHandles is variable */
        //                    if (e.isControlDown()) {
        //                        Handle theHandle = handleAt(e.getX(), e.getY());
        //                        if (theHandle != null) {
        //                            /** delete handle */
        //                            int idx = currentHandles.indexOf(theHandle);
        //                            if (idx > 0) {
        //                                currentHandles.remove(idx);
        //                                previousHandles.remove(idx);
        //                                currentHandlesWhenMousePressed.remove(idx);
        //                            }
        //                        } else {
        //                            /** add handle */
        //                        }
        //                    }
        //                }
        //            }

    }

    drawingMouseDrag(e: React.MouseEvent) {
        if (this.props.shouldUpdateDrawing.createDrawingId === undefined) {
            return;
        }

        console.log("mouse drag", e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        const [x, y] = this.translate(e)

        const working = this.workingDrawing()
        // only do something when isCompleted() 
        if (working.isActivated && working.isCompleted) {
            if (working.currHandleIdx != -1) {
                working.stretchHandle(this.p(x, y))

            } else {
                if (working.isReadyToDrag) {
                    working.moveDrawing(this.p(x, y))
                }
            }
        }
    }

    render() {
        const transform = `translate(${this.props.x} ${this.props.y})`;
        return (
            <g transform={transform}
                onDoubleClick={this.onDrawingMouseDoubleClick}
                onMouseDown={this.onDrawingMouseDown}
                onMouseMove={this.onDrawingMouseMove}
                onMouseUp={this.onDrawingMouseUp}
                onDrag={this.drawingMouseDrag}
            >
                {/* Invisible background to capture clicks in empty space */}
                <rect width="100%" height="100%" fill="transparent" pointerEvents="all" />

                {this.state.chartLines.map((c, n) => <Fragment key={n}>{c}</Fragment>)}
                {this.state.chartAxisy}
                {this.state.latestValueLabel}
                {this.state.referCursor}
                {this.state.mouseCursor}
                {this.state.overlayChartLines.map((c, n) => <Fragment key={n}>{c}</Fragment>)}
                {
                    !(this.props.shouldUpdateDrawing && this.props.shouldUpdateDrawing.isHidingDrawing) &&
                    this.state.drawingLines.map((c, n) => <Fragment key={n}>{c}</Fragment>)}
                {this.state.sketching}
            </g >
        )
    }

}

