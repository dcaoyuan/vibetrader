import { Fragment, memo } from "react";
import { ChartView, type Indicator, type Output } from "../ChartView";
import { styleOfLabel } from "../../../colors";
import { H_SPACING } from "../KlineViewContainer";
import type { ColorScheme } from "../../../../App";
import type { ChartXControl } from "../ChartXControl";

type OverlayIndicatorLabelsLayerProps = {
    xc: ChartXControl;
    width: number;
    colorScheme: ColorScheme;
    indicators: Indicator[],
    latestIndicatorValues: string[][]
    chartUpdateTicker: number;
    crosshairUpdateTicker: number;
}

const OverlayIndicatorLabelsLayer = ({
    xc, indicators, width, colorScheme, latestIndicatorValues
}: OverlayIndicatorLabelsLayerProps) => {

    const plotIndicatorLabels = (mouseIndicatorValues: string[][], referIndicatorValues?: string[][]) => {
        const chartWidth = width;

        const styleOfMouse = styleOfLabel('label-mouse', colorScheme);
        const styleOfRefer = styleOfLabel('label-refer', colorScheme);

        return indicators.map(({ outputs }, m) => {
            // Calculate Y position. 
            // Note: SVG <text> y-coordinate is the baseline. 
            // The "+ 10" is an offset to approximate HTML's top-left positioning.
            const yPos = m * 13 - H_SPACING + 2 + 10;

            return (
                <g key={"indicator-labels-" + m} style={{ fontSize: '12px' }}>
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
                                    {
                                        mouseIndicatorValues !== undefined &&
                                        mouseIndicatorValues[m] !== undefined &&
                                        mouseIndicatorValues[m][n]
                                    }
                                </tspan>
                                {n === outputs.length - 1
                                    ? <tspan></tspan>
                                    : <tspan>{'\u00A0\u00B7\u00A0'}</tspan>
                                }
                            </Fragment>
                        )}
                    </text>

                    {/* Right Aligned - Refer Indicator Values */}
                    {xc.isReferCrosshairEnabled && referIndicatorValues && (
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
                                        {
                                            referIndicatorValues &&
                                            referIndicatorValues[m] &&
                                            referIndicatorValues[m][n]
                                        }
                                    </tspan>
                                    {n === outputs.length - 1
                                        ? <tspan></tspan>
                                        : <tspan>{'\u00A0\u00B7\u00A0'}</tspan>
                                    }
                                </Fragment>
                            )}
                        </text>
                    )}
                </g>
            );
        });
    }

    if (indicators !== undefined) {
        let mouseTime: number
        let referTime: number

        if (xc.isMouseCrosshairEnabled) {
            mouseTime = xc.tr(xc.mouseCrosshairRow)
        }

        if (xc.isReferCrosshairEnabled) {
            referTime = xc.tr(xc.referCrosshairRow)
        }

        let mouseIndicatorValues: string[][] = []
        const referIndicatorValues: string[][] = []
        indicators.map((indicator, n) => {
            const tvar = indicator.tvar;

            let mvs: string[]
            if (mouseTime !== undefined && mouseTime > 0 && xc.baseSer.occurred(mouseTime)) {
                mvs = indicator.outputs.map(({ atIndex }, n) => {
                    const datas = tvar.getByTime(mouseTime);
                    const data = datas ? datas[atIndex] : undefined;
                    const v = data ? data.value : NaN
                    return typeof v === 'number'
                        ? isNaN(v) ? "" : v.toFixed(2)
                        : '' + v
                })

            } else {
                mvs = new Array(indicator.outputs.length);
            }

            mouseIndicatorValues.push(mvs)

            let rvs: string[]
            if (referTime !== undefined && referTime > 0 && xc.baseSer.occurred(referTime)) {
                rvs = indicator.outputs.map(({ atIndex }, n) => {
                    const datas = tvar.getByTime(referTime);
                    const data = datas ? datas[atIndex] : undefined;
                    const v = data ? data.value : NaN
                    return typeof v === 'number'
                        ? isNaN(v) ? "" : v.toFixed(2)
                        : '' + v
                })

            } else {
                rvs = new Array(indicator.outputs.length);
            }

            referIndicatorValues.push(rvs)
        })

        mouseIndicatorValues = mouseTime === undefined
            ? latestIndicatorValues
            : mouseIndicatorValues

        return plotIndicatorLabels(mouseIndicatorValues, referIndicatorValues)

    } else {
        return <></>
    }
}

export default memo(OverlayIndicatorLabelsLayer)