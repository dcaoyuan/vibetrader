import PlotKline from "../plot/PlotKline"
import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "../scalar/LinearScala";
import { LG_SCALAR } from "../scalar/LgScalar";
import { Kline } from "../../domain/Kline";
import AxisY from "../pane/AxisY";
import PlotLine from "../plot/PlotLine";
import { type JSX } from "react";
import { LN_SCALAR } from "../scalar/LnScalar";
import PlotStepLine from "../plot/PlotStepLine";
import PlotCrossCircles from "../plot/PlotCrossCircles";
import PlotShape from "../plot/PlotShape";
import type { PlotOptions, PlotShapeOptions } from "../plot/Plot";
import PlotHline from "../plot/PlotHline";
import PlotFill from "../plot/PlotFill";
import PlotBgcolor from "../plot/PlotBgcolor";


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
            <PlotKline
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
                const xc = this.props.xc
                const yc = this.yc
                const tvar = indicator.tvar;

                for (const { title, atIndex, plot1, plot2, options } of indicator.outputs) {
                    let chart: JSX.Element;
                    switch (options.style) {
                        case 'style_linebr':
                        case "style_stepline":
                            chart = <PlotStepLine
                                tvar={tvar}
                                name={title}
                                options={options as PlotOptions}
                                atIndex={atIndex}
                                xc={xc}
                                yc={yc}
                                depth={depth++}
                            />
                            break

                        case "style_circles":
                        case "style_cross":
                            chart = <PlotCrossCircles
                                tvar={tvar}
                                name={title}
                                options={options as PlotOptions}
                                atIndex={atIndex}
                                xc={xc}
                                yc={yc}
                                depth={depth++}
                            />
                            break

                        case 'shape':
                        case 'char':
                            chart = <PlotShape
                                tvar={tvar}
                                xc={xc}
                                yc={yc}
                                depth={0}
                                options={options as PlotShapeOptions}  // todo, back to PlotCharOption
                                name={title}
                                atIndex={atIndex} />
                            break

                        case "hline":
                            chart = <PlotHline
                                tvar={tvar}
                                xc={xc}
                                yc={yc}
                                depth={0}
                                options={options as PlotOptions}
                                name={title}
                                atIndex={atIndex}
                            />
                            break

                        case "fill":
                            chart = <PlotFill
                                tvar={tvar}
                                xc={xc}
                                yc={yc}
                                depth={0}
                                options={options as PlotOptions}
                                name={title}
                                plot1={plot1}
                                plot2={plot2}
                            />
                            break

                        case 'background':
                            chart = <PlotBgcolor
                                tvar={tvar}
                                xc={xc}
                                yc={yc}
                                depth={0}
                                atIndex={atIndex}
                                options={options as PlotOptions}
                                name={title}
                            />
                            break

                        case "line":
                        case "style_line":
                        default:
                            chart = <PlotLine
                                tvar={tvar}
                                name={title}
                                options={options as PlotOptions}
                                atIndex={atIndex}
                                xc={xc}
                                yc={yc}
                                depth={depth++}
                            />
                    }

                    if (chart !== undefined) {
                        overlayChartLines.push(chart)
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

