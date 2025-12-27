import KlineChart from "../chart/KlineChart"
import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "../scalar/LinearScala";
import { LG_SCALAR } from "../scalar/LgScalar";
import { Kline } from "../../domain/Kline";
import AxisY from "../pane/AxisY";
import LineChart from "../chart/LineChart";
import { type JSX } from "react";
import { LN_SCALAR } from "../scalar/LnScalar";


export class KlineView extends ChartView<ViewProps, ViewState> {

    constructor(props: ViewProps) {
        super(props);

        this.yc.valueScalar = LINEAR_SCALAR;

        const { chartLines, chartAxisy, overlayChartLines, drawingLines } = this.plot();

        this.state = {
            chartLines,
            chartAxisy,
            overlayChartLines,
            drawingLines
        };
    }

    override plot() {
        this.computeGeometry();

        const chartLines = [
            <KlineChart
                kvar={this.props.tvar as TVar<Kline>}
                xc={this.props.xc}
                yc={this.yc}
                kind={this.props.xc.klineKind}
                depth={0}
            />
        ]

        const chartAxisy = <AxisY
            x={this.props.width - ChartView.AXISY_WIDTH}
            y={0}
            width={ChartView.AXISY_WIDTH}
            height={this.props.height}
            xc={this.props.xc}
            yc={this.yc}
        />

        const overlayChartLines = this.plotOverlayCharts();
        const drawingLines = this.plotDrawings()

        return { chartLines, chartAxisy, overlayChartLines, drawingLines }
    }

    protected override plotOverlayCharts() {
        const overlayChartLines: JSX.Element[] = []
        if (this.props.overlayIndicators) {
            let depth = 1;
            this.props.overlayIndicators.map((indicator, n) => {
                const tvar = indicator.tvar;
                for (const { style: plot, title: name, color, atIndex } of indicator.outputs) {
                    let ovchart: JSX.Element;
                    switch (plot) {
                        case "line":
                        default:
                            ovchart = <LineChart
                                tvar={tvar}
                                name={name}
                                color={color}
                                atIndex={atIndex}
                                xc={this.props.xc}
                                yc={this.yc}
                                depth={depth++}
                            />
                    }

                    if (ovchart !== undefined) {
                        overlayChartLines.push(ovchart)
                    }
                }

            })
        }

        return overlayChartLines;
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

}

