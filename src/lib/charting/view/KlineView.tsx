import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "../scalar/LinearScala";
import { LG_SCALAR } from "../scalar/LgScalar";
import { Kline } from "../../domain/Kline";
import { createRef } from "react";
import { LN_SCALAR } from "../scalar/LnScalar";
import type { Scalar } from "../scalar/Scalar";

import KlinesLayer from "./layer/KlineLayer";
import AxisYLayer from "./layer/AxisYLayer";
import OverlayIndicatorsLayer from "./layer/OverlayIndicatorsLayer";
import CrosshairLayer from "./layer/CrosshairLayer";
import OverlayIndicatorLabelsLayer from "./layer/OverlayIndicatorLabelsLayer";
import DrawingLayer, { type DrawingLayerRef } from "./layer/DrawingLayer";

// Define the API KlineView will expose to its parent
export interface KlineViewRef {
    deleteDrawing: () => void;
    unselectDrawing: () => void;
    cancelSketch: () => void;
}

export class KlineView extends ChartView<ViewProps, ViewState> {

    private drawingLayerRef = createRef<DrawingLayerRef>();

    public deleteSelectedDrawing = () => {
        this.drawingLayerRef.current?.deleteSelected();
    }

    public unselectDrawing = () => {
        return this.drawingLayerRef.current?.unselect();
    }

    public cancelSketch = () => {
        return this.drawingLayerRef.current?.cancelSketch();
    }

    constructor(props: ViewProps) {
        super(props);

        this.yc.valueScalar = LINEAR_SCALAR;

        this.state = {}
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

    switchScalarType() {
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

    render() {
        const latestTime = this.props.xc.lastOccurredTime();

        let latestValue: { value: number, isPositive: boolean, axisyUpdated: number };
        if (latestTime !== undefined && latestTime > 0) {
            const kline = this.props.tvar.getByTime(latestTime);

            if (kline !== undefined && kline instanceof Kline) {
                latestValue = {
                    value: kline.close,
                    isPositive: kline.close > kline.open,
                    axisyUpdated: new Date().getTime()
                };
            }
        }

        const latestIndicatorValues: string[][] = []
        if (this.props.overlayIndicators !== undefined) {
            this.props.overlayIndicators.map((indicator, n) => {
                const tvar = indicator.tvar;

                let mvs: string[]
                if (latestTime !== undefined && latestTime > 0) {
                    mvs = indicator.outputs.map(({ atIndex }, n) => {
                        const datas = tvar.getByTime(latestTime);
                        const data = datas ? datas[atIndex] : undefined;
                        const v = data ? data.value : NaN
                        return typeof v === 'number'
                            ? isNaN(v) ? "" : v.toFixed(2)
                            : '' + v
                    })

                } else {
                    mvs = new Array(indicator.outputs.length);
                }

                latestIndicatorValues.push(mvs)
            })
        }

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

        // update gemoetry
        this.computeGeometry();

        // console.log(`KlineView render`)

        const transform = `translate(${this.props.x} ${this.props.y})`;
        return (
            <g transform={transform}
                ref={this.ref}
            >
                <DrawingLayer
                    ref={this.drawingLayerRef}
                    x={this.props.x}
                    y={this.props.y}
                    width={this.props.width}
                    height={this.props.height}
                    xc={this.props.xc}
                    yc={this.yc}
                    chartUpdateTicker={this.props.updateEvent.chartUpdateTicker}
                    isHidingDrawing={this.props.updateDrawing.isHidingDrawing}
                    createDrawingId={this.props.updateDrawing.createDrawingId}
                    callback={this.props.callbacksToContainer}
                />

                {/* Invisible background to capture clicks in empty space */}
                {/* <rect width={this.props.width} height={this.props.height} fill="transparent" pointerEvents="all" /> */}

                <KlinesLayer
                    kvar={this.props.tvar as TVar<Kline>}
                    xc={this.props.xc}
                    yc={this.yc}
                    kind={this.props.xc.klineKind}
                    colorScheme={this.props.colorScheme}
                    chartUpdateTicker={this.props.updateEvent.chartUpdateTicker}
                />

                <AxisYLayer
                    x={this.props.width - ChartView.AXISY_WIDTH}
                    y={0}
                    height={this.props.height}
                    xc={this.props.xc}
                    yc={this.yc}
                    tvar={this.props.tvar}
                    colorScheme={this.props.colorScheme}
                    latestValue={latestValue}
                    chartUpdateTicker={this.props.updateEvent.chartUpdateTicker}
                />

                <OverlayIndicatorsLayer
                    xc={this.props.xc}
                    yc={this.yc}
                    indicators={this.props.overlayIndicators}
                    chartUpdateTicker={this.props.updateEvent.chartUpdateTicker}
                />

                <CrosshairLayer
                    id={this.props.id}
                    xc={this.props.xc}
                    yc={this.yc}
                    width={this.props.width}
                    colorScheme={this.props.colorScheme}
                    font={this.font}
                    valueAtTime={(time) => (this.props.tvar.getByTime(time) as Kline).close}
                    mouseWho={this.props.updateEvent.xyMouse?.who}
                    mouseX={this.props.updateEvent.xyMouse?.x}
                    mouseY={this.props.updateEvent.xyMouse?.y}
                    crosshairUpdateTicker={this.props.updateEvent.crosshairUpdateTicker}
                    isCreateDrawing={this.props.updateDrawing && this.props.updateDrawing.createDrawingId !== undefined}
                />

                <OverlayIndicatorLabelsLayer
                    xc={this.props.xc}
                    width={this.props.width}
                    colorScheme={this.props.colorScheme}
                    indicators={this.props.overlayIndicators}
                    latestIndicatorValues={latestIndicatorValues}
                    chartUpdateTicker={this.props.updateEvent.chartUpdateTicker}
                    crosshairUpdateTicker={this.props.updateEvent.crosshairUpdateTicker}
                />
            </g >
        )
    }
}

