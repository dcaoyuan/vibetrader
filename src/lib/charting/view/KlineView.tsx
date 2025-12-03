import KlineChart from "../chart/KlineChart"
import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "./scalar/LinearScala";
import { LG_SCALAR } from "./scalar/LgScalar";
import { Kline } from "../../domain/Kline";
import AxisY from "../pane/AxisY";
import './chartview.css';
import { KlineChartKind } from "../chart/Kinds";
import LineChart from "../chart/LineChart";
import type { JSX } from "react";

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

    klineVar: TVar<Kline>;
    maxVolume = 0.0;
    minVolume = 0.0

    constructor(props: ViewProps) {
        super(props);

        this.klineVar = props.tvar as TVar<Kline>;

        const { charts, axisy, stackCharts } = this.plot();

        this.state = {
            width: props.width,
            height: props.height,

            hasInnerVolume: false,
            maxVolume: undefined,
            minVolume: undefined,

            maxValue: 1.0,
            minValue: 0.0,

            isInteractive: true,
            isPinned: false,

            charts,
            axisy,
            stackCharts,

            mouseCursor: <></>,
            referCursor: <></>,
        };

    }

    override plot() {
        this.computeGeometry();

        const charts = [KlineChart({
            klineVar: this.klineVar,
            xc: this.props.xc,
            yc: this.yc,
            kind: KlineChartKind.Candle,
            depth: 0
        })];

        const axisy = AxisY({
            x: this.props.width - ChartView.AXISY_WIDTH,
            y: 0,
            width: ChartView.AXISY_WIDTH,
            height: this.props.height,
            xc: this.props.xc,
            yc: this.yc,
            isMasterView: true
        })

        const stackCharts = []
        if (this.props.overlayIndicator) {
            let depth = 1;
            const tvar = this.props.overlayIndicator.tvar;
            for (const { plot, name, color, atIndex } of this.props.overlayIndicator.outputs) {
                let ovchart: JSX.Element;
                switch (plot) {
                    case "line":
                        ovchart = LineChart({
                            tvar,
                            name,
                            color,
                            atIndex,
                            xc: this.props.xc,
                            yc: this.yc,
                            depth: depth++
                        });
                        break;

                    default:
                }
                if (ovchart) {
                    stackCharts.push(ovchart)
                }
            }
        }

        return { charts, axisy, stackCharts }
    }

    override computeMaxMin() {
        let max = Number.NEGATIVE_INFINITY;
        let min = Number.POSITIVE_INFINITY;

        /** minimum volume should be 0 */
        this.maxVolume = Number.NEGATIVE_INFINITY;
        this.minVolume = 0

        const xc = this.props.xc;
        for (let i = 1; i <= xc.nBars; i++) {
            const time = xc.tb(i)
            if (xc.occurred(time)) {
                const kline = this.klineVar.getByTime(time);
                if (kline.close > 0) {
                    max = Math.max(max, kline.high)
                    min = Math.min(min, kline.low)
                    this.maxVolume = Math.max(this.maxVolume, kline.volume)
                }
            }
        }

        if (this.maxVolume == 0) {
            this.maxVolume = 1
        }

        if (this.maxVolume == this.minVolume) {
            this.maxVolume++;
        }

        if (max == min) {
            max *= 1.05
            min *= 0.95
        }

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
        return this.klineVar.getByTime(time).close;
    }

    render() {
        const transform = `translate(${this.props.x} ${this.props.y})`;
        return (
            <g transform={transform}>
                {this.state.charts.map((c, n) => <g key={n}>{c}</g>)}
                {this.state.axisy}
                {this.state.referCursor}
                {this.state.mouseCursor}
                {this.state.latestValueLabel}
                {this.state.stackCharts.map((c, n) => <g key={n}>{c}</g>)}
            </g >
        )
    }
}

