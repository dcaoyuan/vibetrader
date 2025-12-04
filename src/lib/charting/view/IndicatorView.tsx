import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "./scalar/LinearScala";
import { LG_SCALAR } from "./scalar/LgScalar";
import AxisY from "../pane/AxisY";
import './chartview.css';
import LineChart from "../chart/LineChart";

export class IndicatorView extends ChartView<ViewProps, ViewState> {
    maxVolume = 0.0;
    minVolume = 0.0

    constructor(props: ViewProps) {
        super(props);

        this.tvar = props.tvar

        const { charts, axisy } = this.plot();

        this.state = {
            width: props.width,
            height: props.height,

            hasInnerVolume: false,

            maxValue: 1.0,
            minValue: 0.0,

            isInteractive: true,
            isPinned: false,

            charts,
            axisy,
        };

    }

    override plot() {
        this.computeGeometry();

        const charts = this.props.mainIndicatorOutputs.map(({ atIndex, color, name, plot }) => {
            switch (plot) {
                case 'line':
                    return <LineChart
                        tvar={this.tvar as TVar<unknown[]>}
                        xc={this.props.xc}
                        yc={this.yc}
                        depth={0}
                        color={color}
                        name={name}
                        atIndex={atIndex}
                    />

                default:
                    return <></>

            }
        })

        const axisy = <AxisY
            x={this.props.width - ChartView.AXISY_WIDTH}
            y={0}
            width={ChartView.AXISY_WIDTH}
            height={this.props.height}
            xc={this.props.xc}
            yc={this.yc}
        />

        return { charts, axisy }
    }

    override computeMaxMin() {
        let max = Number.NEGATIVE_INFINITY;
        const min = 0// Number.POSITIVE_INFINITY;

        const xc = this.props.xc;

        for (let i = 1; i <= xc.nBars; i++) {
            const time = xc.tb(i)
            if (xc.occurred(time)) {
                const values = this.tvar.getByTime(time);
                for (const { atIndex } of this.props.mainIndicatorOutputs) {
                    const v = values[atIndex];
                    if (!isNaN(v)) {
                        max = Math.max(max, v)
                    }
                }
            }
        }

        if (max === 0) {
            max = 1
        }

        if (max === min) {
            this.maxVolume++;
        }

        // if (max === min) {
        //   max *= 1.05
        //   min *= 0.95
        // }

        this.setMaxMinValue(max, min)
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
                {this.state.charts.map((c, n) => <g key={n}>{c}</g>)}
                {this.state.axisy}
                {this.state.referCursor}
                {this.state.mouseCursor}
            </g>
        )
    }
}
