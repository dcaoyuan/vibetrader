import { ChartXControl } from "../view/ChartXControl";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";
import { Theme } from "../theme/Theme";
import { ChartYControl } from "../view/ChartYControl";
import { getNormPow, normMinTick, normTickUnit } from "../Normalize";

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
    const { x, y, height, yc } = props;
    const symmetricByMiddleValue = false;

    const color = Theme.now().axisColor;

    const chart = plot();

    // const [symmetricByMiddleValue, setSymmetricByMiddleValue] = useState(false);

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

        const vMinTick = normMinTick(minValueOnCanvas);

        // if (!symmetricByMiddleValue) {
        //     vTickUnit = roundTickUnit(vTickUnit)
        //     vMinTick = Math.ceil(vMinTick / vTickUnit) * vTickUnit
        // }

        // 
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

        const path = new Path;
        const texts = new Texts;

        // draw axis-y line */
        path.moveto(0, 0)
        path.lineto(0, height)

        const wTick = 4;
        for (let i = 0; i < vTicks.length; i++) {
            let vTick = vTicks[i];

            const yTick = Math.round(yc.yv(vTick))

            path.moveto(0, yTick)
            path.lineto(wTick, yTick)

            vTick = yc.shouldNormScale
                ? vTick / yc.normScale
                : vTick;

            const vStr = i === 0 && yc.shouldNormScale
                ? yc.normMultiple
                : parseFloat(vTick.toFixed(4)).toString();

            const yText = yTick + 4
            texts.text(8, yText, vStr);
        }

        // draw end line 
        path.moveto(0, 0);
        path.lineto(8, 0);

        return { path, texts };
    }

    const transform = `translate(${x} ${y})`;
    return (
        <g transform={transform} >
            <g shapeRendering="crispEdges" >
                {chart.path.render('axisy-tick', { stroke: color })}
            </g>
            <g>
                {chart.texts.render('axisy-text', { fill: color })}
            </g>
        </g>
    );
}

export default AxisY;
