import { ChartXControl } from "../view/ChartXControl";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";
import { Theme } from "../theme/Theme";
import { ChartYControl } from "../view/ChartYControl";
import { COMMON_DECIMAL_FORMAT, CURRENCY_DECIMAL_FORMAT } from "../view/Format";

const MIN_TICK_SPACING = 40 // in pixels

type Props = {
    x: number,
    y: number,
    width: number,
    height: number,
    xc: ChartXControl,
    yc: ChartYControl
}

export const AxisY = (props: Props) => {
    const { x, y, height, yc } = props;
    const symmetricByMiddleValue = false;

    const color = Theme.now().axisColor;

    const chart = plot();

    // const [symmetricByMiddleValue, setSymmetricByMiddleValue] = useState(false);

    function normTickUnit(potantialUnit: number, range: number, nTicksMax: number) {
        // which pow will bring tick between >= 1 & < 10
        const normPow = Math.ceil(Math.log10(1 / potantialUnit))
        const normScale = Math.pow(10, normPow)

        // determine which N is the best N in [1, 2, 5, 10]
        const normUnits = [1, 2, 5, 10]
        let i = 0;
        while (i < normUnits.length) {
            const normUnit = normUnits[i];
            const unit = normUnit / normScale;

            const nTicks = Math.round(range / unit)
            if (nTicks <= nTicksMax) {
                return unit;
            }

            i++;
        }
    }

    function normMinTick(tick: number) {
        const sign = Math.sign(tick);
        tick = Math.abs(tick)
        if (tick === 0) {
            return tick
        }

        // which pow will bring tick between >= 1 & < 10
        const normPow = Math.ceil(Math.log10(1 / tick))
        const normScale = Math.pow(10, normPow)

        tick = Math.round(tick * normScale)
        tick = tick / normScale

        return sign * tick;
    }

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

        const shouldScale = Math.abs(maxValueOnCanvas) >= ChartYControl.VALUE_SCALE_UNIT;
        const multiple = "x10^" + Math.log10(ChartYControl.VALUE_SCALE_UNIT);

        const vTicks = [];
        if (vMidTick === undefined) {
            let i = 0
            let vTick = minValueOnCanvas;
            while (vTick <= maxValueOnCanvas) {
                vTick = vMinTick + vTickUnit * i
                if ((vTick > minValueOnCanvas || shouldScale) && vTick <= maxValueOnCanvas) {
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
                if ((vTick > minValueOnCanvas || shouldScale) && vTick <= maxValueOnCanvas) {
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

            vTick = shouldScale
                ? vTick / ChartYControl.VALUE_SCALE_UNIT
                : vTick;

            const vStr = i === 0 && shouldScale
                ? multiple
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
