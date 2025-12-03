import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "./scalar/LinearScala";
import { LG_SCALAR } from "./scalar/LgScalar";
import { Kline } from "../../domain/Kline";
import AxisY from "../pane/AxisY";
import './chartview.css';
import VolmueChart from "../chart/VolumeChart";

export class VolumeView extends ChartView<ViewProps, ViewState> {
    klineVar: TVar<Kline>;
    maxVolume = 0.0;
    minVolume = 0.0

    constructor(props: ViewProps) {
        super(props);

        this.klineVar = props.tvar as TVar<Kline>;

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

        const charts = [VolmueChart({
            klineVar: this.klineVar,
            xc: this.props.xc,
            yc: this.yc,
            depth: 0
        })];

        const axisy = AxisY({
            x: this.props.width - ChartView.AXISY_WIDTH,
            y: 0,
            width: ChartView.AXISY_WIDTH,
            height: this.props.height,
            xc: this.props.xc,
            yc: this.yc,
        })

        return { charts, axisy }
    }

    override computeMaxMin() {
        let max = Number.NEGATIVE_INFINITY;
        const min = 0// Number.POSITIVE_INFINITY;

        const xc = this.props.xc;

        for (let i = 1; i <= xc.nBars; i++) {
            const time = xc.tb(i)
            if (xc.occurred(time)) {
                const kline = this.klineVar.getByTime(time);
                if (kline.close > 0) {
                    max = Math.max(max, kline.volume)
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

    override valueAtTime(time: number) {
        return this.klineVar.getByTime(time).volume
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
