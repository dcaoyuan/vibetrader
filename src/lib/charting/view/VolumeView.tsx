import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "../scalar/LinearScala";
import { LG_SCALAR } from "../scalar/LgScalar";
import { Kline } from "../../domain/Kline";
import AxisY from "../pane/AxisY";
import PlotVolmue from "../plot/PlotVolume";
import { Fragment } from "react/jsx-runtime";

export class VolumeView extends ChartView<ViewProps, ViewState> {

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

        const chartLines = [
            <PlotVolmue
                kvar={this.props.tvar as TVar<Kline>}
                xc={this.props.xc}
                yc={this.yc}
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

        return { chartLines, chartAxisy }
    }

    override computeMaxValueMinValue() {
        let max = Number.NEGATIVE_INFINITY;
        const min = 0// Number.POSITIVE_INFINITY;

        const xc = this.props.xc;

        for (let i = 1; i <= xc.nBars; i++) {
            const time = xc.tb(i)
            if (xc.occurred(time)) {
                const kline = this.props.tvar.getByTime(time) as Kline;
                if (kline.close > 0) {
                    max = Math.max(max, kline.volume)
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

    override valueAtTime(time: number) {
        return (this.props.tvar.getByTime(time) as Kline).volume
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
