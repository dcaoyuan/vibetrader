import { type TSer } from "../../timeseris/TSer";
import { TVar } from "../../timeseris/TVar";
import { ChartXControl } from "./ChartXControl";
import { ChartYControl } from "./ChartYControl";
import { Component, Fragment, type JSX, type RefObject } from "react";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";
import { Kline } from "../../domain/Kline";
import type { Drawing, TPoint } from "../drawing/Drawing";
import { createDrawing } from "../drawing/Drawings";
import { type Selection } from "@react-spectrum/s2"
import React from "react";
import type { Scalar } from "../scalar/Scalar";
import { LG_SCALAR } from "../scalar/LgScalar";
import { LINEAR_SCALAR } from "../scalar/LinearScala";
import type { PlotCharOptions, PlotOptions, PlotShapeOptions } from "../plot/Plot";
import { stringMetrics } from "../../Utils";

export type UpdateEvent = {
    type: 'chart' | 'cursors' | 'drawing'
    changed?: number,
    xyMouse?: { who: string, x: number, y: number }
    deltaMouse?: { dx: number, dy: number }
    yScalar?: boolean
}

export type Indicator = {
    pineName: string,
    tvar: TVar<unknown[]>,
    outputs: Output[],
    overlay?: boolean
}

export type Output = {
    atIndex: number,
    title: string,
    options: PlotOptions | PlotCharOptions | PlotShapeOptions

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

    updateEvent: UpdateEvent;
    updateDrawing?: UpdateDrawing;

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
    updateDrawingIdsToCreate: (ids?: Selection) => void;
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

    ref: RefObject<SVGAElement>;
    font: string;

    // share same xc through all views that are in the same viewcontainer.
    constructor(props: P) {
        super(props)

        this.yc = new ChartYControl(props.xc.baseSer, props.height);

        this.ref = React.createRef();

        this.onDrawingMouseDoubleClick = this.onDrawingMouseDoubleClick.bind(this)
        this.onDrawingMouseDown = this.onDrawingMouseDown.bind(this)
        this.onDrawingMouseMove = this.onDrawingMouseMove.bind(this)
        this.onDrawingMouseUp = this.onDrawingMouseUp.bind(this)

        console.log(`ChartView created`)
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
        const { chartLines, chartAxisy, drawingLines } = this.plot();
        this.updateState({ chartLines, chartAxisy, drawingLines });
    }

    protected updateCursors(xMouse: number, yMouse: number) {
        this.updateState({}, xMouse, yMouse);
    }

    protected updateState(state: Partial<ViewState>, xMouse?: number, yMouse?: number) {
        let referCursor: JSX.Element
        let mouseCursor: JSX.Element
        let latestValueLabel: JSX.Element
        let latestColor: string

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

                    referCursor = this.#plotCursor(cursorX, cursorY, referTime, value, "annot-refer")
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

                mouseCursor = this.#plotCursor(cursorX, cursorY, mouseTime, value, "annot-mouse")
            }

        } else {
            // mouse cursor invisible, will show latest value
            mouseTime = latestTime;
        }

        if (latestTime !== undefined && latestTime > 0) {
            const kline = this.props.tvar.getByTime(latestTime)
            if (kline !== undefined && kline instanceof Kline) {
                latestColor = kline.close > kline.open ? "annot-positive" : "annot-negative"
            }

            let value = this.valueAtTime(latestTime);
            if (value !== undefined && !isNaN(value)) {
                const y = yc.yv(value);

                if (yc.shouldNormScale) {
                    value /= yc.normScale
                }

                latestValueLabel = this.plotYValueLabel(y, value, latestColor)
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

    #plotCursor(x: number, y: number, time: number, value: number, className: string) {
        const wAxisY = ChartView.AXISY_WIDTH

        let crosshair: Path
        if (
            !(this.props.updateDrawing && this.props.updateDrawing.createDrawingId) &&
            !this.props.xc.isCrosshairEnabled
        ) {
            crosshair = new Path();

            // horizontal line
            crosshair.moveto(0, y);
            crosshair.lineto(this.props.width - wAxisY, y)
        }

        const valueLabel = this.plotYValueLabel(y, value, className);

        return (
            <>
                <g className={className}>
                    {crosshair && crosshair.render()}
                </g>
                {valueLabel}
            </>
        )
    }

    plotYValueLabel(y: number, value: number, className: string) {
        const valueStr = value.toFixed(3);

        const metrics = stringMetrics(valueStr, this.font)
        const wLabel = metrics.width + 4
        const hLabel = 13;

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
        axisyTexts.text(8, y0 - 2, valueStr);

        const transformYAnnot = `translate(${this.props.width - wAxisY}, ${0})`
        return (
            // pay attention to the order to avoid text being overlapped
            <g transform={transformYAnnot} className={className}>
                {axisyPath.render()}
                {axisyTexts.render()}
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
        if (this.ref.current) {
            const computedStyle = window.getComputedStyle(this.ref.current);
            const fontSize = computedStyle.getPropertyValue('font-size');
            const fontFamily = computedStyle.getPropertyValue('font-family');

            this.font = fontSize + ' ' + fontFamily;
        }

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

        const xyMouse = this.props.updateEvent.xyMouse;
        if (this.props.updateEvent.changed !== prevProps.updateEvent.changed) {

            switch (this.props.updateEvent.type) {
                case 'chart':
                    willUpdateChart = true;
                    if (this.props.id === "kline") {
                        if (this.props.updateEvent.deltaMouse) {
                            // apply delta to yc chart scale
                            const dy = this.props.updateEvent.deltaMouse.dy
                            if (dy === undefined) {
                                this.yc.yChartScale = 1 // back to 1

                            } else {
                                this.yc.yChartScale = this.yc.yChartScale * (1 - dy / this.yc.hChart)
                            }

                        } else if (this.props.updateEvent.yScalar) {
                            let scalar: Scalar
                            switch (this.yc.valueScalar.kind) {
                                case "Linear":
                                    scalar = LG_SCALAR
                                    break;

                                case "Lg":
                                    scalar = LINEAR_SCALAR
                                    break;
                            }

                            this.yc.valueScalar = scalar
                        }
                    }

                    break;

                case 'cursors':
                    willUpdateCursor = true;
                    if (xyMouse !== undefined) {
                        if (xyMouse.who === this.props.id) {
                            xMouse = xyMouse.x;
                            yMouse = xyMouse.y;

                        } else {
                            xMouse = xyMouse.x;
                            yMouse = undefined;
                        }

                    } else {
                        xMouse = undefined;
                        yMouse = undefined;
                    }

                    break;

                case 'drawing':
                    // TODO: handle drawing update here?
                    break;
            }
        }

        if (this.isOverlayIndicatorsChanged(this.props.overlayIndicators, prevProps.overlayIndicators)) {
            // console.log(this.props.id, "overlayIndicators changed")
            willUpdateOverlayCharts = true;
        }

        if (this.props.updateDrawing != prevProps.updateDrawing) {
            if (this.props.updateDrawing) {
                switch (this.props.updateDrawing.action) {
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

            if (newInd.pineName !== oldInd.pineName) {
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
            this.updateDrawingsWithoutHandles(this.props.xc.selectedDrawingIdx, cursor)
            this.props.xc.selectedDrawingIdx = undefined
        }
    }

    private selectAndUpdateDrawings(idx: number, cursor?: string) {
        let drawingLines = this.state.drawingLines
        const prevSelectedIdx = this.props.xc.selectedDrawingIdx
        if (prevSelectedIdx !== undefined && prevSelectedIdx !== idx) {
            // there is a different prev selected, unselect at the same time 
            const unselected = this.drawings[prevSelectedIdx].renderDrawing("drawing-" + prevSelectedIdx)

            drawingLines = [
                ...drawingLines.slice(0, prevSelectedIdx),
                unselected,
                ...drawingLines.slice(prevSelectedIdx + 1)
            ];
        }

        const selected = this.drawings[idx].renderDrawingWithHandles("drawing-" + idx)
        drawingLines = [
            ...drawingLines.slice(0, idx),
            selected,
            ...drawingLines.slice(idx + 1)
        ];

        this.props.xc.selectedDrawingIdx = idx

        this.setState({ drawingLines, cursor })
    }

    private updateDrawingsWithHandles(idxToAddHandles: number, cursor?: string) {
        const selected = this.drawings[idxToAddHandles].renderDrawingWithHandles("drawing-" + idxToAddHandles)
        let drawingLines = this.state.drawingLines
        drawingLines = [
            ...drawingLines.slice(0, idxToAddHandles),
            selected,
            ...drawingLines.slice(idxToAddHandles + 1)
        ];

        this.setState({ drawingLines, cursor })
    }

    private updateDrawingsWithoutHandles(idxToRemoveHandles: number, cursor?: string) {
        const unselected = this.drawings[idxToRemoveHandles].renderDrawing("drawing-" + idxToRemoveHandles)
        const drawingLines = [
            ...this.state.drawingLines.slice(0, idxToRemoveHandles),
            unselected,
            ...this.state.drawingLines.slice(idxToRemoveHandles + 1)
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

            const selectedOne = this.drawings[hitDrawingIdx]

            const handleIdx = selectedOne.getHandleIdxAt(x, y)
            if (handleIdx >= 0) {
                if (selectedOne.nHandles === undefined && e.ctrlKey) {
                    // delete handle for variable-handle drawing
                    selectedOne.deleteHandleAt(handleIdx)

                    selectedOne.currHandleIdx = -1
                    this.selectAndUpdateDrawings(hitDrawingIdx, DEFAULT_CURSOR)

                } else {
                    // ready to drag handle 
                    selectedOne.currHandleIdx = handleIdx
                    this.selectAndUpdateDrawings(hitDrawingIdx, HANDLE_CURSOR)
                }

            } else {
                if (selectedOne.nHandles === undefined && e.ctrlKey) {
                    // insert handle for variable-handle drawing
                    const newHandleIdx = selectedOne.insertHandle(this.p(x, y))

                    selectedOne.currHandleIdx = newHandleIdx;
                    this.selectAndUpdateDrawings(hitDrawingIdx, HANDLE_CURSOR)

                } else {
                    // ready to drag whole drawing
                    selectedOne.recordHandlesWhenMousePressed(this.p(x, y))

                    selectedOne.currHandleIdx = -1
                    this.selectAndUpdateDrawings(hitDrawingIdx, GRAB_CURSOR)
                }
            }

        } else {
            // not going to drag drawing (and handle), it's ok to drag any other things if you want

            this.props.xc.mouseDownHitDrawingIdx = undefined

            if (this.props.xc.selectedDrawingIdx !== undefined) {
                this.drawings[this.props.xc.selectedDrawingIdx].currHandleIdx = -1
            }
        }
    }

    onDrawingMouseMove(e: React.MouseEvent) {
        // console.log('mouse move', e.nativeEvent.offsetX, e.nativeEvent.offsetY, e.target)
        const [x, y] = this.translate(e)

        if (this.creatingDrawing?.isCompleted === false) {
            if (this.creatingDrawing.isAnchored) {
                const sketching = this.creatingDrawing.stretchCurrentHandle(this.p(x, y))

                // also reset mouseMoveHitDrawing to avoid render with handles during updateChart()
                this.props.xc.mouseMoveHitDrawingIdx = undefined

                const prevSelected = this.props.xc.selectedDrawingIdx
                if (prevSelected !== undefined) {
                    // unselect prevSelected at the same time 
                    const toUnselect = this.drawings[prevSelected].renderDrawing("drawing-" + prevSelected)

                    const drawingLines = [
                        ...this.state.drawingLines.slice(0, prevSelected),
                        toUnselect,
                        ...this.state.drawingLines.slice(prevSelected + 1)
                    ];

                    this.props.xc.selectedDrawingIdx = undefined

                    this.setState({ drawingLines, sketching, cursor: DEFAULT_CURSOR })

                } else {
                    this.setState({ sketching, cursor: DEFAULT_CURSOR })
                }
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

                } else {
                    // drag whole drawing
                    selectedOne.dragDrawing(this.p(x, y))
                }

                const cursor = selectedOne.currHandleIdx >= 0
                    ? HANDLE_CURSOR
                    : GRAB_CURSOR

                this.updateDrawingsWithHandles(this.props.xc.selectedDrawingIdx, cursor)

            } else {
                this.setState({ cursor: MOVE_CURSOR })
            }

        } else {
            // process hit drawing
            const hitDrawingIdx = this.drawings.findIndex(drawing => drawing.hits(x, y))
            if (hitDrawingIdx >= 0) {
                // show with handles 
                this.props.xc.mouseMoveHitDrawingIdx = hitDrawingIdx
                const hitOne = this.drawings[hitDrawingIdx]

                const handleIdx = hitOne.getHandleIdxAt(x, y)
                const cursor = handleIdx >= 0
                    ? HANDLE_CURSOR
                    : e.ctrlKey ? HANDLE_CURSOR : GRAB_CURSOR
                // ctrl + move means going to insert handle for variable-handle drawing, use HANDLE_CURSOR

                this.updateDrawingsWithHandles(hitDrawingIdx, cursor)

            } else {
                // previously hit drawing? show without handles if it's not the selected one
                if (this.props.xc.mouseMoveHitDrawingIdx >= 0 &&
                    this.props.xc.mouseMoveHitDrawingIdx !== this.props.xc.selectedDrawingIdx
                ) {
                    const tobeWithoutHandles = this.props.xc.mouseMoveHitDrawingIdx
                    this.props.xc.mouseMoveHitDrawingIdx = undefined

                    this.updateDrawingsWithoutHandles(tobeWithoutHandles, DEFAULT_CURSOR)

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

        if (e.detail === 2) {
            return
        }

        const [x, y] = this.translate(e)

        if (this.creatingDrawing === undefined) {
            if (this.props.updateDrawing.createDrawingId) {
                this.creatingDrawing = createDrawing(this.props.updateDrawing.createDrawingId, this.props.xc, this.yc)
            }
        }

        if (this.creatingDrawing?.isCompleted === false) {
            // completing new drawing
            const isCompleted = this.creatingDrawing.anchorHandle(this.p(x, y))

            if (isCompleted || e.ctrlKey) {
                // is it a variable-handle drawing and ctrl + clicked? complete it 
                if (this.creatingDrawing.nHandles === undefined && e.ctrlKey) {
                    this.creatingDrawing.isCompleted = true;
                    this.creatingDrawing.isAnchored = false;
                    this.creatingDrawing.currHandleIdx = -1;
                    // drop pre-created next handle, see anchorHandle(...)
                    this.creatingDrawing.handles.pop()
                }

                this.drawings.push(this.creatingDrawing)
                this.props.callbacksToContainer.updateDrawingIdsToCreate(undefined)

                const drawingLine = this.creatingDrawing.renderDrawingWithHandles("drawing-new")
                this.creatingDrawing = undefined

                let drawingLines: JSX.Element[]
                const prevSelected = this.props.xc.selectedDrawingIdx
                if (prevSelected !== undefined) {
                    // unselect it at the same time 
                    const toUnselect = this.drawings[prevSelected].renderDrawing("drawing-" + prevSelected)

                    drawingLines = [
                        ...this.state.drawingLines.slice(0, prevSelected),
                        toUnselect,
                        ...this.state.drawingLines.slice(prevSelected + 1),
                        drawingLine];

                } else {
                    drawingLines = [
                        ...this.state.drawingLines,
                        drawingLine];
                }

                // set it as new selected one
                this.props.xc.selectedDrawingIdx = this.drawings.length - 1;

                this.setState({ drawingLines, sketching: undefined })
            }
        }
    }


    onDrawingMouseDoubleClick(e: React.MouseEvent) {
        //console.log('mouse doule clicked', e.detail, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        if (e.detail === 2) {
            const [x, y] = this.translate(e)
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
                ref={this.ref}
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
                    this.props.updateDrawing && this.props.updateDrawing.isHidingDrawing
                        ? <></>
                        : this.state.drawingLines.map((c, n) => <Fragment key={n}>{c}</Fragment>)
                }
                {this.state.sketching}
            </g >
        )
    }

}

