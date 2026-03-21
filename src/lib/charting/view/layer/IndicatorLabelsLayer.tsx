import { Fragment, memo } from "react";
import { ChartView, type Output } from "../ChartView";
import type { PineData } from "../../../domain/PineData";
import type { TVar } from "../../../timeseris/TVar";
import { styleOfLabel } from "../../../colors";
import { H_SPACING } from "../KlineViewContainer";
import type { ColorScheme } from "../../../../App";
import type { ChartXControl } from "../ChartXControl";

type IndicatorLabelsLayerProps = {
    xc: ChartXControl;
    width: number;
    tvar: TVar<PineData[]>;
    colorScheme: ColorScheme;
    outputs: Output[];
    latestIndicatorValues: string[];
    chartUpdateTicker: number;
    crosshairUpdateTicker: number;
}

export const IndicatorLabelsLayer = memo(function Layer({
    xc, outputs, tvar, width, colorScheme, latestIndicatorValues
}: IndicatorLabelsLayerProps) {

    const plotIndicatorLabels = (mouseIndicatorValues: string[], referIndicatorValues?: string[]) => {
        const chartWidth = width;

        // Calculate Y position. 
        // Note: SVG <text> y-coordinate is the baseline. 
        // The "+ 10" is an offset to approximate HTML's top-left positioning.
        const yPos = - H_SPACING + 2 + 10;

        const styleOfMouse = styleOfLabel('label-mouse', colorScheme);
        const styleOfRefer = styleOfLabel('label-refer', colorScheme);

        return (
            <g style={{ fontSize: '12px' }}>
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
            </g >
        )
    }

    if (outputs !== undefined) {
        let mouseTime: number
        let referTime: number

        if (xc.isMouseCrosshairEnabled) {
            mouseTime = xc.tr(xc.mouseCrosshairRow)
        }

        if (xc.isReferCrosshairEnabled) {
            referTime = xc.tr(xc.referCrosshairRow)
        }

        let mouseIndicatorValues: string[]
        if (mouseTime !== undefined && mouseTime > 0 && xc.baseSer.occurred(mouseTime)) {
            const datas = tvar.getByTime(mouseTime);
            mouseIndicatorValues = datas && datas.map(data => {
                const v = data ? data.value : NaN;
                return typeof v === 'number'
                    ? isNaN(v) ? "" : v.toFixed(2)
                    : '' + v
            });
        }

        mouseIndicatorValues = mouseTime === undefined
            ? latestIndicatorValues
            : mouseIndicatorValues

        let referIndicatorValues: string[]
        if (referTime !== undefined && referTime > 0 && xc.baseSer.occurred(referTime)) {
            const datas = tvar.getByTime(referTime);
            referIndicatorValues = datas && datas.map(data => {
                const v = data ? data.value : NaN
                return typeof v === 'number'
                    ? isNaN(v) ? "" : v.toFixed(2)
                    : '' + v
            });
        }

        return plotIndicatorLabels(mouseIndicatorValues, referIndicatorValues)

    } else {
        return <></>
    }
})
