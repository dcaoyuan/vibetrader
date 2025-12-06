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

type State = {
    path: Path,
    texts: Texts,
}

export const AxisY = (props: Props) => {
    const { x, y, width, height, yc } = props;
    const symmetricByMiddleValue = false;

    const color = Theme.now().axisColor;

    const chart = plot();

    // const [symmetricByMiddleValue, setSymmetricByMiddleValue] = useState(false);
    // const [state, setState] = useState<State>(plotAxisY())

    function normTickUnit(unit: number) {
        // which pow will bring tick between >= 1 & < 10
        const normPow = Math.ceil(Math.log10(1 / unit))
        const normScale = Math.pow(10, normPow)

        unit = Math.round(unit * normScale)

        if (unit >= 2 && unit <= 7) {
            unit = 5;

        } else if (unit > 7) {
            unit = 10;
        }

        unit = unit / normScale

        return unit;
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
        let nTicks = 6.0;
        while (Math.floor(yc.hCanvas / nTicks) < MIN_TICK_SPACING && nTicks > 2) {
            nTicks -= 1
        }

        const maxValueOnCanvas = yc.maxValue
        const minValueOnCanvas = yc.minValue

        const vMaxTick = maxValueOnCanvas
        let vMinTick = minValueOnCanvas // init value, will adjust later

        const vRange = vMaxTick - vMinTick
        let vTickUnit = vRange / nTicks
        vTickUnit = normTickUnit(vTickUnit);

        vMinTick = normMinTick(vMinTick);

        // console.log(vTickUnit, vMinTick)

        // if (!symmetricByMiddleValue) {
        //     vTickUnit = roundTickUnit(vTickUnit)
        //     vMinTick = Math.ceil(vMinTick / vTickUnit) * vTickUnit
        // }

        // 
        const vMidTick = minValueOnCanvas < 0 && maxValueOnCanvas > 0 ? 0 : undefined

        const shouldScale = Math.abs(vMaxTick) >= ChartYControl.VALUE_SCALE_UNIT;
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
        console.log(vTicks)

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
