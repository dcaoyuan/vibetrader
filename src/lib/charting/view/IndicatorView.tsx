import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "../scalar/LinearScala";
import { LG_SCALAR } from "../scalar/LgScalar";
import AxisY from "../pane/AxisY";
import PlotLine from "../plot/PlotLine";
import PlotHistogram from "../plot/PlotHistogram";
import { Fragment } from "react/jsx-runtime";
import PlotShape from "../plot/PlotShape";
import type { PlotShapeOptions } from "../plot/Plot";

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

        const chartLines = this.props.mainIndicatorOutputs.map(({ atIndex, title, options }) => {
            switch (options.style) {
                case 'style_histogram':
                case 'style_columns':
                    return <PlotHistogram
                        tvar={this.props.tvar as TVar<unknown[]>}
                        xc={this.props.xc}
                        yc={this.yc}
                        depth={0}
                        color={options.color}
                        name={title}
                        atIndex={atIndex}
                    />

                case 'shape':
                case 'char':
                    return <PlotShape
                        tvar={this.props.tvar as TVar<unknown[]>}
                        xc={this.props.xc}
                        yc={this.yc}
                        depth={0}
                        options={options as PlotShapeOptions}  // todo, back to PlotCharOption
                        name={title}
                        atIndex={atIndex} />

                case 'line':
                default:
                    return <PlotLine
                        tvar={this.props.tvar as TVar<unknown[]>}
                        xc={this.props.xc}
                        yc={this.yc}
                        depth={0}
                        color={options.color}
                        name={title}
                        atIndex={atIndex}
                    />
            }
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

        for (let i = 1; i <= xc.nBars; i++) {
            const time = xc.tb(i)
            if (xc.occurred(time)) {
                const values = this.props.tvar.getByTime(time);
                for (const { atIndex } of this.props.mainIndicatorOutputs) {
                    const v = values[atIndex];
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
