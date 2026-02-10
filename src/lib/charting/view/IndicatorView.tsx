import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "../scalar/LinearScala";
import { LG_SCALAR } from "../scalar/LgScalar";
import AxisY from "../pane/AxisY";
import PlotLine from "../plot/PlotLine";
import PlotHistogram from "../plot/PlotHistogram";
import { Fragment, type JSX } from "react/jsx-runtime";
import PlotShape from "../plot/PlotShape";
import type { PlotOptions, PlotShapeOptions } from "../plot/Plot";
import PlotHline from "../plot/PlotHline";
import PlotCrossCircles from "../plot/PlotCrossCircles";
import PlotFill from "../plot/PlotFill";
import type { PineData } from "../../domain/PineData";
import PlotBgcolor from "../plot/PlotBgcolor";

export class IndicatorView extends ChartView<ViewProps, ViewState> {
    constructor(props: ViewProps) {
        super(props);

        const { chartLines, chartAxisy } = this.plot();

        this.state = {
            chartLines,
            chartAxisy,
        };
    }

    override plot() {
        this.computeGeometry();

        const xc = this.props.xc
        const yc = this.yc
        const tvar = this.props.tvar as TVar<PineData[]>

        const chartLines = this.props.mainIndicatorOutputs.map(({ atIndex, title, plot1, plot2, options }) => {
            let chart: JSX.Element;
            switch (options.style) {
                case 'style_histogram':
                case 'style_columns':
                    chart = <PlotHistogram
                        tvar={tvar}
                        xc={xc}
                        yc={yc}
                        depth={0}
                        options={options as PlotOptions}
                        name={title}
                        atIndex={atIndex}
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
                        depth={0}
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
                        atIndex={atIndex}
                    />
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

                case 'line':
                case 'dashed':
                default:
                    chart = <PlotLine
                        tvar={tvar}
                        xc={xc}
                        yc={yc}
                        depth={0}
                        options={options as PlotOptions}
                        name={title}
                        atIndex={atIndex}
                    />
            }

            return chart;
        })

        const chartAxisy = <AxisY
            x={this.props.width - ChartView.AXISY_WIDTH}
            y={0}
            width={ChartView.AXISY_WIDTH}
            height={this.props.height}
            xc={this.props.xc}
            yc={this.yc}
        />

        return { chartLines, chartAxisy }
    }

    override computeMaxValueMinValue() {
        let max = Number.NEGATIVE_INFINITY;
        let min = Number.POSITIVE_INFINITY;

        const xc = this.props.xc;
        const tvar = this.props.tvar as TVar<PineData[]>

        for (let i = 1; i <= xc.nBars; i++) {
            const time = xc.tb(i)
            if (xc.occurred(time)) {
                const datas = tvar.getByTime(time);
                for (const { atIndex } of this.props.mainIndicatorOutputs) {
                    const data = datas ? datas[atIndex] : undefined;
                    const v = data ? data.value : NaN
                    if (v !== undefined && typeof v === 'number' && !isNaN(v)) {
                        max = Math.max(max, v)
                        min = Math.min(min, v)
                    }
                }
            }
        }

        if (max === 0) {
            max = 1
        }

        // if (max === min) {
        //   max *= 1.05
        //   min *= 0.95
        // }

        return [max, min]
    }

    swithScalarType() {
        switch (this.yc.valueScalar.kind) {
            case LINEAR_SCALAR.kind:
                this.yc.valueScalar = LG_SCALAR;
                break;

            default:
                this.yc.valueScalar = LINEAR_SCALAR;
        }
    }

    // won't show cursor value of time.
    override valueAtTime(time: number) {
        return undefined;
    }

    render() {
        const transform = `translate(${this.props.x} ${this.props.y})`;
        return (
            <g transform={transform}>
                {this.state.chartLines.map((c, n) => <Fragment key={n}>{c}</Fragment>)}
                {this.state.chartAxisy}
                {this.state.referCursor}
                {this.state.mouseCursor}
            </g>
        )
    }
}
