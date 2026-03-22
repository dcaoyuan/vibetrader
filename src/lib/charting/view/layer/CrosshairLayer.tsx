import { memo, type JSX } from "react";
import type { ChartXControl } from "../ChartXControl";
import type { ChartYControl } from "../ChartYControl";
import { styleOfAnnot } from "../../../colors";
import type { ColorScheme } from "../../../../App";
import { AXISY_WIDTH } from "../chartviews";
import { Path } from "../../../svg/Path";
import { stringMetrics } from "../../../utils";
import { Texts } from "../../../svg/Texts";

type CrosshairLayerProps = {
    id: string;
    xc: ChartXControl;
    yc: ChartYControl;
    width: number;
    colorScheme: ColorScheme;
    font: string;

    valueAtTime: (time: number) => number;

    mouseWho: string;
    mouseX: number;
    mouseY: number;

    crosshairUpdateTicker: number;
    isCreateDrawing: boolean;
}

const CrosshairLayer = ({
    id, xc, yc, width, colorScheme, font, valueAtTime, mouseWho, mouseX, mouseY, isCreateDrawing
}: CrosshairLayerProps) => {

    // Show vertical crosshair according to mouse y if mouse is in this view.
    const yMouse = mouseWho === id
        ? mouseY
        : undefined;

    const Crosshair = () => {
        let referCrosshair: JSX.Element
        let mouseCrosshair: JSX.Element

        const latestTime = xc.lastOccurredTime();

        let referTime: number
        if (xc.isReferCrosshairEnabled) {
            referTime = xc.tr(xc.referCrosshairRow)
            const isOccurredTime = xc.occurred(referTime);

            if (isOccurredTime) {
                const crosshairX = xc.xr(xc.referCrosshairRow)

                let crosshairY: number
                let value = valueAtTime(referTime);
                if (value && !isNaN(value)) {
                    crosshairY = yc.yv(value)

                    if (yc.shouldNormScale) {
                        value /= yc.normScale
                    }

                    referCrosshair = plotCrosshair(crosshairX, crosshairY, referTime, value, "annot-refer")
                }
            }
        }

        let mouseTime: number
        if (xc.isMouseCrosshairEnabled) {
            mouseTime = xc.tr(xc.mouseCrosshairRow)
            const isOccurredTime = xc.occurred(mouseTime);
            // try to align x to bar center
            const crosshairX = isOccurredTime ? xc.xr(xc.mouseCrosshairRow) : mouseX;

            let value: number;
            let crosshairY: number;
            if (yMouse === undefined && isOccurredTime) {
                value = valueAtTime(mouseTime);
                if (value !== undefined && value !== null && !isNaN(value)) {
                    crosshairY = yc.yv(value);
                }

            } else {
                crosshairY = mouseY;
                value = yc.vy(crosshairY);
            }

            if (crosshairY !== undefined && !isNaN(crosshairY) && value !== undefined && value !== null && !isNaN(value)) {
                if (yc.shouldNormScale) {
                    value /= yc.normScale
                }

                mouseCrosshair = plotCrosshair(crosshairX, crosshairY, mouseTime, value, "annot-mouse")
            }

        } else {
            // mouse crosshair invisible, will show latest value
            mouseTime = latestTime;
        }


        return (
            <g>
                {referCrosshair}
                {mouseCrosshair}
            </g>)

        // may need to update drawing handles when mouse over
        // this.chartElements.drawingLines = this.plotDrawings();
    }


    const plotCrosshair = (x: number, y: number, time: number, value: number, className: string) => {
        const pathStyle = styleOfAnnot(className, colorScheme);

        const wAxisY = AXISY_WIDTH

        let crosshair: Path
        if (
            !isCreateDrawing &&
            !xc.isCrosshairEnabled
        ) {
            crosshair = new Path();

            // horizontal line
            crosshair
                .moveto(0, y)
                .lineto(width - wAxisY, y)
        }

        const valueLabel = plotYValueLabel(y, value, className);

        return (
            <>
                <g className={className}>
                    {crosshair && crosshair.render({ style: pathStyle })}
                </g>
                {valueLabel}
            </>
        )
    }

    const plotYValueLabel = (y: number, value: number, className: string) => {
        const pathStyle = styleOfAnnot(className, colorScheme);
        const textStyle = styleOfAnnot(className, colorScheme, true);

        const valueStr = value.toFixed(3);

        const metrics = stringMetrics(valueStr, font)
        const wLabel = metrics.width + 4
        const hLabel = 13;

        const wAxisY = AXISY_WIDTH

        const axisyTexts = new Texts
        const axisyPath = new Path
        const y0 = y + 6
        const x0 = 6

        // draw arrow
        axisyPath
            .moveto(6, y - 3)
            .lineto(0, y)
            .lineto(6, y + 3);

        axisyPath.moveto(x0, y0)
            .lineto(x0 + wLabel, y0)
            .lineto(x0 + wLabel, y0 - hLabel)
            .lineto(x0, y0 - hLabel)
            .closepath();

        axisyTexts
            .text(8, y0 - 2, valueStr);

        const transformYAnnot = `translate(${width - wAxisY}, ${0})`
        return (
            // pay attention to the order to avoid text being overlapped
            <g transform={transformYAnnot} className={className}>
                {axisyPath.render({ style: pathStyle })}
                {axisyTexts.render({ style: textStyle })}
            </g>
        )
    }


    return Crosshair();
}

export default memo(CrosshairLayer)