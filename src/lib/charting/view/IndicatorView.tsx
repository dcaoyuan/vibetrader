import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "../scalar/LinearScala";
import { LG_SCALAR } from "../scalar/LgScalar";
import type { PineData } from "../../domain/PineData";
import AxisYLayer from "./layer/AxisYLayer";
import IndicatorLayer from "./layer/IndicatorLayer";
import CrosshairLayer from "./layer/CrosshairLayer";
import IndicatorLabelsLayer from "./layer/IndicatorLabelsLayer";

export class IndicatorView extends ChartView<ViewProps, ViewState> {
    constructor(props: ViewProps) {
        super(props);

        this.state = {}
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
        const latestTime = this.props.xc.lastOccurredTime();
        let latestIndicatorValues: string[]
        if (this.props.mainIndicatorOutputs !== undefined) {
            const tvar = this.props.tvar as TVar<PineData[]>;
            if (latestTime !== undefined && latestTime > 0) {
                const datas = tvar.getByTime(latestTime);
                latestIndicatorValues = datas && datas.map(data => {
                    const v = data ? data.value : NaN;
                    return typeof v === 'number'
                        ? isNaN(v) ? "" : v.toFixed(2)
                        : '' + v
                });
            }
        }

        // update gemoetry
        const atleastMinValue = this.props.mainIndicatorOutputs.some(({ options }) => options.style === 'style_columns') ? 0 : undefined
        this.computeGeometry(atleastMinValue);

        // console.log(`IndicatorView render`)

        const transform = `translate(${this.props.x} ${this.props.y})`;
        return (
            <g transform={transform}>
                <IndicatorLayer
                    tvar={this.props.tvar as TVar<PineData[]>}
                    xc={this.props.xc}
                    yc={this.yc}
                    outputs={this.props.mainIndicatorOutputs}
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
                    chartUpdateTicker={this.props.updateEvent.chartUpdateTicker}
                />

                <CrosshairLayer
                    id={this.props.id}
                    xc={this.props.xc}
                    yc={this.yc}
                    width={this.props.width}
                    colorScheme={this.props.colorScheme}
                    font={this.font}
                    valueAtTime={() => undefined}
                    mouseWho={this.props.updateEvent.xyMouse?.who}
                    mouseX={this.props.updateEvent.xyMouse?.x}
                    mouseY={this.props.updateEvent.xyMouse?.y}
                    crosshairUpdateTicker={this.props.updateEvent.crosshairUpdateTicker}
                    isCreateDrawing={this.props.updateDrawing && this.props.updateDrawing.createDrawingId !== undefined}
                />

                <IndicatorLabelsLayer
                    xc={this.props.xc}
                    width={this.props.width}
                    tvar={this.props.tvar as TVar<PineData[]>}
                    colorScheme={this.props.colorScheme}
                    outputs={this.props.mainIndicatorOutputs}
                    latestIndicatorValues={latestIndicatorValues}
                    chartUpdateTicker={this.props.updateEvent.chartUpdateTicker}
                    crosshairUpdateTicker={this.props.updateEvent.crosshairUpdateTicker}
                />

            </g>
        )
    }
}
