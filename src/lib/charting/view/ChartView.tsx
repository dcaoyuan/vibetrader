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
    action?: 'create' | 'delete' | 'hide' | 'unselect'
    createDrawingId?: string
    isHidingDrawing: boolean;
}

export interface ViewProps {
    name: string;
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    xc: ChartXControl;
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

    cursor?: string;
}

export type CallbacksToContainer = {
    updateOverlayIndicatorLabels: (vs: string[][], refVs?: string[][]) => void
    updateStackedIndicatorLabels: (indexOfStackedIndicators: number, vs: string[], refVs?: string[]) => void
    updateDrawingIdsToCreate: (ids?: Set<Key>) => void;
}

const DEFAULT_CURSOR = "default"
const HANDLE_CURSOR = "pointer"
const GRAB_CURSOR = "grab"
const MOVE_CURSOR = "all-scroll" // 'move' doesn't work?

/**
 * All ChartViews shares the same x-control, have the same cursor behaves.
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

    // share same xc through all views that are in the same viewcontainer.
    constructor(props: P) {
        super(props)

        this.yc = new ChartYControl(props.xc.baseSer, props.height);

        this.onDrawingMouseDoubleClick = this.onDrawingMouseDoubleClick.bind(this)
        this.onDrawingMouseDown = this.onDrawingMouseDown.bind(this)
        this.onDrawingMouseMove = this.onDrawingMouseMove.bind(this)
        this.onDrawingMouseUp = this.onDrawingMouseUp.bind(this)

        console.log(`${this.props.name} ChartView render`)
    }

    /**
     * What may affect the geometry:
     * 1. the size of this component changed;
     * 3. the ser's value changed or items added, which need computeMaxMin();
     *
     * The control only define wBar (the width of each bar), this component
     * will calculate number of bars according to its size. If you need more
     * bars to display, such as an appointed newNBars, you should compute the size of
     * this's container, and call container.setBounds() to proper size, then, the
     * layout manager will layout the size of its ChartView instances automatically,
     * and if success, the newNBars computed here will equals the newNBars you want.
     */
    protected computeGeometry() {
        const [maxValue, minValue] = this.computeMaxValueMinValue();

        // compute y-geometry after compute maxmin
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
                if (mouseTime !== undefined && mouseTime > 0 && this.props.xc.baseSer.occurred(mouseTime)) {
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
                if (referTime !== undefined && referTime > 0 && this.props.xc.baseSer.occurred(referTime)) {
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
            if (mouseTime !== undefined && mouseTime > 0 && this.props.xc.baseSer.occurred(mouseTime)) {
                const values = tvar.getByTime(mouseTime);
                mvs = values && (values as unknown[]).map((v) =>
                    typeof v === 'number'
                        ? isNaN(v) ? "" : v.toFixed(2)
                        : '' + v
                );

            }

            let rvs: string[]
            if (referTime !== undefined && referTime > 0 && this.props.xc.baseSer.occurred(referTime)) {
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
        // call to update labels right now
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

                    case 'unselect':
                        this.unselectDrawing();
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

    drawings: Drawing[] = []
    creatingDrawing: Drawing
    isDragging: boolean

    protected plotDrawings() {
        return this.drawings.map((drawing, n) => this.props.xc.selectedDrawingIdx === n || this.props.xc.mouseMoveHitDrawingIdx === n
            ? drawing.renderDrawingWithHandles("drawing-" + n)
            : drawing.renderDrawing("drawing-" + n))
    }

    protected deleteSelectedDrawing() {
        const idx = this.props.xc.selectedDrawingIdx;
        if (idx !== undefined) {
            const drawingLines = [
                ...this.state.drawingLines.slice(0, idx),
                ...this.state.drawingLines.slice(idx + 1)
            ];

            const drawings = [
                ...this.drawings.slice(0, idx),
                ...this.drawings.slice(idx + 1)
            ]

            // should also clear hitDrawingIdx
            this.props.xc.selectedDrawingIdx = undefined
            this.props.xc.mouseMoveHitDrawingIdx = undefined

            this.drawings = drawings
            this.setState({ drawingLines })
        }
    }

    protected unselectDrawing(cursor?: string) {
        if (this.props.xc.selectedDrawingIdx !== undefined) {
            this.updateDrawingsWithUnselect(this.props.xc.selectedDrawingIdx, cursor)
            this.props.xc.selectedDrawingIdx = undefined
        }
    }

    private updateDrawingsWithSelected(idx: number, cursor?: string) {
        const drawingLine = this.drawings[idx].renderDrawingWithHandles("drawing-" + idx)
        const drawingLines = [
            ...this.state.drawingLines.slice(0, idx),
            drawingLine,
            ...this.state.drawingLines.slice(idx + 1)
        ];

        this.setState({ drawingLines, cursor })
    }

    private updateDrawingsWithUnselect(idx: number, cursor?: string) {
        const drawingLine = this.drawings[idx].renderDrawing("drawing-" + idx)
        const drawingLines = [
            ...this.state.drawingLines.slice(0, idx),
            drawingLine,
            ...this.state.drawingLines.slice(idx + 1)
        ];

        this.setState({ drawingLines, cursor })
    }

    private p(x: number, y: number): TPoint {
        return { time: this.props.xc.tx(x), value: this.yc.vy(y) }
    }

    onDrawingMouseDown(e: React.MouseEvent) {
        // console.log('mouse down', e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        this.isDragging = true;

        const [x, y] = this.translate(e)

        // select drawing ?
        const hitDrawingIdx = this.drawings.findIndex(drawing => drawing.hits(x, y))
        if (hitDrawingIdx >= 0) {
            // record the mouseDownHitDrawingIdx for dragging decision
            this.props.xc.mouseDownHitDrawingIdx = hitDrawingIdx

            // selected drawing
            this.props.xc.selectedDrawingIdx = hitDrawingIdx
            const selectedOne = this.drawings[hitDrawingIdx]

            const handleIdx = selectedOne.getHandleIdxAt(x, y)
            if (handleIdx >= 0) {
                // ready to drag handle 
                selectedOne.currHandleIdx = handleIdx
                this.updateDrawingsWithSelected(hitDrawingIdx, HANDLE_CURSOR)

            } else {
                // ready to drag whole drawing
                selectedOne.rememberHandlesWhenMousePressed(this.p(x, y))

                selectedOne.currHandleIdx = -1
                this.updateDrawingsWithSelected(hitDrawingIdx, MOVE_CURSOR)
            }

        } else {
            // not going to drag drawing (and handle), it's ok to drag any other things if you want
            this.props.xc.mouseDownHitDrawingIdx = undefined

            if (this.props.xc.selectedDrawingIdx !== undefined) {
                this.drawings[this.props.xc.selectedDrawingIdx].currHandleIdx = -1
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

    onDrawingMouseMove(e: React.MouseEvent) {
        // console.log('mouse move', e.nativeEvent.offsetX, e.nativeEvent.offsetY, e.target)
        const [x, y] = this.translate(e)

        if (this.creatingDrawing?.isCompleted === false) {
            if (this.creatingDrawing.isAnchored) {
                const sketching = this.creatingDrawing.stretchCurrentHandle(this.p(x, y))
                this.setState({ sketching, cursor: DEFAULT_CURSOR })
            }

            return
        }

        if (this.isDragging) {
            if (this.props.xc.selectedDrawingIdx !== undefined &&
                this.props.xc.selectedDrawingIdx === this.props.xc.mouseDownHitDrawingIdx
            ) {
                const selectedOne = this.drawings[this.props.xc.selectedDrawingIdx]
                if (selectedOne.currHandleIdx >= 0) {
                    // drag handle
                    selectedOne.stretchCurrentHandle(this.p(x, y))

                    this.updateDrawingsWithSelected(this.props.xc.selectedDrawingIdx, HANDLE_CURSOR)

                } else {
                    // drag whole drawing
                    selectedOne.dragDrawing(this.p(x, y))

                    this.updateDrawingsWithSelected(this.props.xc.selectedDrawingIdx, MOVE_CURSOR)
                }

            } else {
                this.setState({ cursor: GRAB_CURSOR })
            }

        } else {
            // process hit drawing
            const hitDrawingIdx = this.drawings.findIndex(drawing => drawing.hits(x, y))
            if (hitDrawingIdx >= 0) {
                // show as selected
                this.props.xc.mouseMoveHitDrawingIdx = hitDrawingIdx
                const hitOne = this.drawings[hitDrawingIdx]

                const handleIdx = hitOne.getHandleIdxAt(x, y)
                if (handleIdx >= 0) {
                    this.updateDrawingsWithSelected(hitDrawingIdx, HANDLE_CURSOR)

                } else {
                    this.updateDrawingsWithSelected(hitDrawingIdx, MOVE_CURSOR)
                }

            } else {
                if (this.props.xc.mouseMoveHitDrawingIdx >= 0) {
                    if (this.props.xc.mouseMoveHitDrawingIdx !== this.props.xc.selectedDrawingIdx) {
                        //  not the selecte one, show as unselected
                        const tobeUnselect = this.props.xc.mouseMoveHitDrawingIdx
                        this.props.xc.mouseMoveHitDrawingIdx = undefined
                        this.updateDrawingsWithUnselect(tobeUnselect, DEFAULT_CURSOR)

                    } else {
                        this.setState({ cursor: DEFAULT_CURSOR })
                    }

                } else {
                    this.setState({ cursor: DEFAULT_CURSOR })
                }

            }
        }
    }

    // simulate single click only
    onDrawingMouseUp(e: React.MouseEvent) {
        // console.log('mouse up', e.detail, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        this.isDragging = false

        if (e.detail >= 2) {
            return // pass double+ click 
        }

        // sinlge-clicked 

        const [x, y] = this.translate(e)

        if (this.creatingDrawing === undefined) {
            if (this.props.shouldUpdateDrawing.createDrawingId) {
                this.creatingDrawing = createDrawing(this.props.shouldUpdateDrawing.createDrawingId, this.props.xc, this.yc)
            }
        }

        if (this.creatingDrawing?.isCompleted === false) {
            // completing new drawing
            const isCompleted = this.creatingDrawing.anchorHandle(this.p(x, y))
            if (isCompleted) {
                const drawingLines = this.state.drawingLines

                this.drawings.push(this.creatingDrawing)
                this.props.xc.selectedDrawingIdx = this.drawings.length - 1;
                this.props.callbacksToContainer.updateDrawingIdsToCreate(undefined)

                const drawingLine = this.creatingDrawing.renderDrawingWithHandles("drawing-new")
                this.creatingDrawing = undefined

                this.setState({ drawingLines: [...drawingLines, drawingLine], sketching: undefined })
            }
        }
    }


    onDrawingMouseDoubleClick(e: React.MouseEvent) {
        console.log('mouse doule clicked', e.detail, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        if (e.detail === 2) {
            const [x, y] = this.translate(e)

            // double clicked, process drawing that whose nHandles is variable
            const working = this.creatingDrawing
            if (working?.isCompleted === false) {
                if (working.nHandles === undefined) {
                    working.isAnchored = false;
                    working.isCompleted = true;
                    working.currHandleIdx = -1;
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
                cursor={this.state.cursor}
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
                    this.props.shouldUpdateDrawing && this.props.shouldUpdateDrawing.isHidingDrawing
                        ? <></>
                        : this.state.drawingLines.map((c, n) => <Fragment key={n}>{c}</Fragment>)
                }
                {this.state.sketching}
            </g >
        )
    }

}

