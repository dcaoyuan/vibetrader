import KlineChart from "../chart/KlineChart"
import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "../scalar/LinearScala";
import { LG_SCALAR } from "../scalar/LgScalar";
import { Kline } from "../../domain/Kline";
import AxisY from "../pane/AxisY";
import './chartview.css';
import { KlineChartKind } from "../chart/Kinds";
import LineChart from "../chart/LineChart";
import { Fragment, type JSX } from "react";
import { LN_SCALAR } from "../scalar/LnScalar";
import { type Drawing, type TPoint } from "../drawing/Drawing";
import { createDrawing } from "../drawing/drawings";


const HANDLE_CURSOR = "crosshair"
const DEFAULT_CURSOR = "default"
const MOVE_CURSOR = "move"

export class KlineView extends ChartView<ViewProps, ViewState> {

    static switchAllKlineChartKind(originalKind: KlineChartKind, targetKind: KlineChartKind): KlineChartKind {
        let newKind: KlineChartKind
        if (targetKind !== undefined) {
            newKind = targetKind;

        } else {
            switch (originalKind) {
                case KlineChartKind.Candle:
                    newKind = KlineChartKind.Bar
                    break;

                case KlineChartKind.Bar:
                    newKind = KlineChartKind.Line
                    break;

                case KlineChartKind.Line:
                    newKind = KlineChartKind.Candle
                    break;

                default:
                    newKind = KlineChartKind.Candle
            }
        }

        return newKind;
    }

    constructor(props: ViewProps) {
        super(props);

        this.yc.valueScalar = LINEAR_SCALAR;

        const { charts, axisy, overlayCharts } = this.plot();

        this.state = {
            isInteractive: true,
            isPinned: false,

            charts,
            axisy,
            overlayCharts,
            drawing: []
        };

        this.onDrawingMouseDoubleClick = this.onDrawingMouseDoubleClick.bind(this)
        this.onDrawingMouseDown = this.onDrawingMouseDown.bind(this)
        this.drawingMouseDrag = this.drawingMouseDrag.bind(this)
        this.onDrawingMouseMove = this.onDrawingMouseMove.bind(this)
        this.onDrawingMouseUp = this.onDrawingMouseUp.bind(this)
    }

    override plot() {
        this.computeGeometry();

        const charts = [
            <KlineChart
                kvar={this.props.tvar as TVar<Kline>}
                xc={this.props.xc}
                yc={this.yc}
                kind={KlineChartKind.Candle}
                depth={0}
            />
        ]

        const axisy = <AxisY
            x={this.props.width - ChartView.AXISY_WIDTH}
            y={0}
            width={ChartView.AXISY_WIDTH}
            height={this.props.height}
            xc={this.props.xc}
            yc={this.yc}
        />

        const overlayCharts = this.plotOverlayCharts();

        return { charts, axisy, overlayCharts }
    }

    override plotOverlayCharts() {
        const overlayCharts: JSX.Element[] = []
        if (this.props.overlayIndicators) {
            let depth = 1;
            this.props.overlayIndicators.map((indicator, n) => {
                const tvar = indicator.tvar;
                for (const { style: plot, title: name, color, atIndex } of indicator.outputs) {
                    let ovchart: JSX.Element;
                    switch (plot) {
                        case "line":
                            ovchart = <LineChart
                                tvar={tvar}
                                name={name}
                                color={color}
                                atIndex={atIndex}
                                xc={this.props.xc}
                                yc={this.yc}
                                depth={depth++}
                            />
                            break;

                        default:
                    }

                    if (ovchart !== undefined) {
                        overlayCharts.push(ovchart)
                    }
                }

            })
        }

        return overlayCharts;
    }

    override computeMaxValueMinValue() {
        let max = Number.NEGATIVE_INFINITY;
        let min = Number.POSITIVE_INFINITY;

        const xc = this.props.xc;
        for (let i = 1; i <= xc.nBars; i++) {
            const time = xc.tb(i)
            if (xc.occurred(time)) {
                const kline = this.props.tvar.getByTime(time) as Kline;
                if (kline.close > 0) {
                    max = Math.max(max, kline.high)
                    min = Math.min(min, kline.low)
                }
            }
        }

        if (max == min) {
            max *= 1.05
            min *= 0.95
        }

        return [max, min]
    }

    swithScalarType() {
        switch (this.yc.valueScalar.kind) {
            case LINEAR_SCALAR.kind:
                this.yc.valueScalar = LG_SCALAR;
                break;

            case LG_SCALAR.kind:
                this.yc.valueScalar = LN_SCALAR;
                break;

            default:
                this.yc.valueScalar = LINEAR_SCALAR;
        }
    }

    override valueAtTime(time: number) {
        return (this.props.tvar.getByTime(time) as Kline).close;
    }

    selectedDrawing: Drawing

    workingDrawing() {
        if (this.selectedDrawing === undefined) {
            if (this.props.isUnderDrawing) {
                this.selectedDrawing = createDrawing(this.props.isUnderDrawing, this.props.xc, this.yc)
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
        if (this.props.isUnderDrawing === undefined) {
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
                const drawing = working.renderDrawing();
                this.setState({ drawing: [drawing] })
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

        const hit = working && working.hits(x, y)
        // console.log(hit)
        // if (hit) {
        //     const drawingWithHandles = working.renderWithHandles()
        //     this.setState({ drawing: [drawingWithHandles] })
        // }

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
                    const drawingWithHandles = working.stretchHandle(this.p(x, y))
                    this.setState({ drawing: [drawingWithHandles] })
                }
            }
        }
    }


    onDrawingMouseDoubleClick(e: React.MouseEvent) {
        if (this.props.isUnderDrawing === undefined) {
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
        if (this.props.isUnderDrawing === undefined) {
            return;
        }

        console.log('mouse down', e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        const [x, y] = this.translate(e)

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
        if (this.props.isUnderDrawing === undefined) {
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

                {this.state.charts.map((c, n) => <Fragment key={n}>{c}</Fragment>)}
                {this.state.axisy}
                {this.state.latestValueLabel}
                {this.state.referCursor}
                {this.state.mouseCursor}
                {this.state.overlayCharts.map((c, n) => <Fragment key={n}>{c}</Fragment>)}
                {this.state.drawing.map((c, n) => <Fragment key={n}>{c}</Fragment>)}
            </g >
        )
    }
}

