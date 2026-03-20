import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "../scalar/LinearScala";
import { LG_SCALAR } from "../scalar/LgScalar";
import AxisY from "../pane/AxisY";
import { Fragment, type JSX } from "react/jsx-runtime";
import type { PineData } from "../../domain/PineData";
import { H_SPACING } from "./KlineViewContainer";
import { styleOfLabel } from "../../colors";
import { plotLines } from "../plot/plots";

export class IndicatorView extends ChartView<ViewProps, ViewState> {
    constructor(props: ViewProps) {
        super(props);

        this.state = {}
    }

    override plot() {
        const atleastMinValue = this.props.mainIndicatorOutputs.some(({ options }) => options.style === 'style_columns') ? 0 : undefined
        this.computeGeometry(atleastMinValue);

        const xc = this.props.xc
        const yc = this.yc
        const tvar = this.props.tvar as TVar<PineData[]>

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

        const chartLines = plotLines(this.props.mainIndicatorOutputs, tvar, xc, yc)

        const chartAxisy = <AxisY
            x={this.props.width - ChartView.AXISY_WIDTH}
            y={0}
            height={this.props.height}
            xc={this.props.xc}
            yc={this.yc}
            tvar={tvar}
            colorScheme={this.props.colorScheme}
        />

        const indicatorLabels = this.plotIndicatorLabels(latestIndicatorValues);

        return { chartLines, chartAxisy, indicatorLabels }
    }

    plotIndicatorLabels(mouseIndicatorValues: string[], referIndicatorValues?: string[]) {
        const chartWidth = this.props.width;

        const outputs = this.props.mainIndicatorOutputs;

        // Calculate Y position. 
        // Note: SVG <text> y-coordinate is the baseline. 
        // The "+ 10" is an offset to approximate HTML's top-left positioning.
        const yPos = - H_SPACING + 2 + 10;

        const styleOfMouse = styleOfLabel('label-mouse', this.props.colorScheme);
        const styleOfRefer = styleOfLabel('label-refer', this.props.colorScheme);

        return (
            [<g style={{ fontSize: '12px' }}>
                {/* Left Aligned - Mouse Indicator Values */}
                <text
                    x={0}
                    y={yPos}
                    textAnchor="start"
                >
                    {outputs.map(({ title, options: { color } }, n) =>
                        <Fragment key={"indicator-label-" + n}>
                            <tspan style={styleOfMouse}>
                                {title ? title + '\u00A0' : ''}
                            </tspan>
                            <tspan fill={color}>
                                {mouseIndicatorValues && mouseIndicatorValues[n]}
                            </tspan>
                            {mouseIndicatorValues && n === mouseIndicatorValues.length - 1
                                ? <tspan></tspan>
                                : <tspan>{'\u00A0\u00B7\u00A0'}</tspan>
                            }
                        </Fragment>
                    )}
                </text>

                {/* Right Aligned - Refer Indicator Values */}
                {this.props.xc.isReferCrosshairEnabled && referIndicatorValues && (
                    <text
                        x={chartWidth - ChartView.AXISY_WIDTH}
                        y={yPos}
                        textAnchor="end"
                    >
                        {outputs.map(({ title, options: { color } }, n) =>
                            <Fragment key={"indicator-label-" + n}>
                                <tspan style={styleOfRefer}>
                                    {title ? title + '\u00A0' : ''}
                                </tspan>
                                <tspan fill={color}>
                                    {referIndicatorValues && referIndicatorValues[n]}
                                </tspan>
                                {referIndicatorValues && n === referIndicatorValues.length - 1
                                    ? <tspan></tspan>
                                    : <tspan>{'\u00A0\u00B7\u00A0'}</tspan>
                                }
                            </Fragment>
                        )}
                    </text>
                )}
            </g >]
        )
    }

    override UpdateIndicatorLabels(mouseTime: number, referTime?: number) {
        if (this.props.mainIndicatorOutputs !== undefined) {
            const tvar = this.props.tvar as TVar<PineData[]>;
            let mouseIndicatorValues: string[]
            if (mouseTime !== undefined && mouseTime > 0 && this.props.xc.baseSer.occurred(mouseTime)) {
                const datas = tvar.getByTime(mouseTime);
                mouseIndicatorValues = datas && datas.map(data => {
                    const v = data ? data.value : NaN;
                    return typeof v === 'number'
                        ? isNaN(v) ? "" : v.toFixed(2)
                        : '' + v
                });
            }

            let referIndicatorValues: string[]
            if (referTime !== undefined && referTime > 0 && this.props.xc.baseSer.occurred(referTime)) {
                const datas = tvar.getByTime(referTime);
                referIndicatorValues = datas && datas.map(data => {
                    const v = data ? data.value : NaN
                    return typeof v === 'number'
                        ? isNaN(v) ? "" : v.toFixed(2)
                        : '' + v
                });
            }

            const indicatorLabels = this.plotIndicatorLabels(mouseIndicatorValues, referIndicatorValues)
            this.chartElements.indicatorLabels = indicatorLabels;
            // this.setState({ indicatorLabels })
        }
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
        this.checkUpdate();

        const transform = `translate(${this.props.x} ${this.props.y})`;
        return (
            <g transform={transform}>
                {this.chartElements.chartLines?.map((c, n) => <Fragment key={n}>{c}</Fragment>)}
                {this.chartElements.indicatorLabels?.map((c, n) => <Fragment key={n}>{c}</Fragment>)}
                {this.chartElements.chartAxisy}
                {this.crosshairs.referCrosshair}
                {this.crosshairs.mouseCrosshair}
            </g>
        )
    }
}
