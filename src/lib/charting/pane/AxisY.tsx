import { ChartXControl } from "../view/ChartXControl";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";
import { ChartYControl } from "../view/ChartYControl";
import { normMinTick, normTickUnit } from "../Normalize";

const MIN_TICK_SPACING = 40 // in pixels

type Props = {
    x: number,
    y: number,
    width: number,
    height: number,
    xc: ChartXControl,
    yc: ChartYControl
}

const AxisY = (props: Props) => {
    const { x, y, height, xc, yc } = props;

    const chart = plot();

    function plot() {
        let nTicksMax = 6.0;
        while (yc.hCanvas / nTicksMax < MIN_TICK_SPACING && nTicksMax > 2) {
            nTicksMax -= 1
        }

        const maxValueOnCanvas = yc.maxValue
        const minValueOnCanvas = yc.minValue


        const vRange = maxValueOnCanvas - minValueOnCanvas
        const potentialUnit = vRange / nTicksMax;
        const vTickUnit = normTickUnit(potentialUnit, vRange, nTicksMax);

        const vMinTick = normMinTick(minValueOnCanvas, vTickUnit);
        const vMidTick = minValueOnCanvas < 0 && maxValueOnCanvas > 0 ? 0 : undefined

        const vTicks = [];
        if (vMidTick === undefined) {
            let i = 0
            let vTick = minValueOnCanvas;
            while (vTick <= maxValueOnCanvas) {
                vTick = vMinTick + vTickUnit * i
                if ((vTick > minValueOnCanvas || yc.shouldNormScale) && vTick <= maxValueOnCanvas) {
                    vTicks.push(vTick);
                }

                i++;
            }

        } else {
            const minI = Math.sign(minValueOnCanvas) * Math.floor(Math.abs(minValueOnCanvas / vTickUnit));
            let i = minI
            let vTick = 0;
            while (vTick >= minValueOnCanvas && vTick <= maxValueOnCanvas) {
                vTick = vMidTick + vTickUnit * i
                if ((vTick > minValueOnCanvas || yc.shouldNormScale) && vTick <= maxValueOnCanvas) {
                    vTicks.push(vTick);
                }

                i++;
            }
        }

        const gridPath = new Path;
        const tickPath = new Path;
        const tickTexts = new Texts;

        // draw axis-y line */
        tickPath.moveto(0, 0)
        tickPath.lineto(0, height)

        const wTick = 4;
        for (let i = 0; i < vTicks.length; i++) {
            let vTick = vTicks[i];
            const yTick = Math.round(yc.yv(vTick))

            if (yc.shouldNormScale && yTick > yc.hCanvas - 10) {
                // skip to leave space for normMultiple text 

            } else {
                tickPath.moveto(0, yTick)
                tickPath.lineto(wTick, yTick)

                vTick = yc.shouldNormScale
                    ? vTick / yc.normScale
                    : vTick;

                const vStr = parseFloat(vTick.toFixed(4)).toString();
                const yText = yTick + 4

                tickTexts.text(8, yText, vStr);

                gridPath.moveto(-xc.wChart, yTick);
                gridPath.lineto(0, yTick);
            }
        }

        if (yc.shouldNormScale) {
            tickTexts.text(8, yc.hCanvas, yc.normMultiple);
        }

        // draw end line 
        tickPath.moveto(0, 0);
        tickPath.lineto(8, 0);

        if (yc.valueScalar.kind !== 'Linear') {
            tickTexts.text(-1, -8, yc.valueScalar.kind)
        }

        return { tickPath, tickTexts, gridPath };
    }

    const transform = `translate(${x} ${y})`;
    return (
        <>
            <g transform={transform} className="axis" >
                {chart.tickPath.render()}
                {chart.tickTexts.render()}
            </g>
            <g transform={transform} className="grid" >
                {chart.gridPath.render()}
            </g>
        </>
    );
}

export default AxisY;
