import { ChartXControl } from "../view/ChartXControl";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Texts";
import { Theme } from "../theme/Theme";
import { ChartYControl } from "../view/ChartYControl";
import { COMMON_DECIMAL_FORMAT, CURRENCY_DECIMAL_FORMAT } from "../view/Format";

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

    function roundTickUnit(vtUnit: number) {
        // sample : 0.032 
        let vTickUnit = vtUnit
        const roundedExponent = Math.round(Math.log10(vTickUnit)) - 1   // -2
        const adjustFactor = Math.pow(10, -roundedExponent)             // 100
        const adjustedValue = Math.round(vTickUnit * adjustFactor)      // 3.2 -> 3
        vTickUnit = adjustedValue / adjustFactor                        // 0.03

        // following DecimalFormat <-> double converts are try to round the decimal 
        if (vTickUnit <= 0.001) {
            // for currency 
            vTickUnit = 0.001

        } else if (vTickUnit > 0.001 && vTickUnit < 0.005) {
            // for currency
            const unitStr = CURRENCY_DECIMAL_FORMAT.format(vTickUnit)
            try {
                vTickUnit = Number(unitStr.trim);

            } catch (ex) {
                // todo 
            }

        } else if (vTickUnit > 0.005 && vTickUnit < 1) {
            // for stock 
            const unitStr = COMMON_DECIMAL_FORMAT.format(vTickUnit)
            try {
                vTickUnit = Number(unitStr.trim);
            } catch (ex) {
                // todo
            }
        }

        return vTickUnit;
    }

    function plot() {
        //const hFm = fm.getHeight
        const hFm = 12;

        let nTicks = 6.0;
        while (Math.floor(yc.hCanvas / nTicks) < hFm + 20 && nTicks > 2) {
            nTicks -= 2 // always keep even
        }

        const maxValueOnCanvas = yc.vy(yc.yCanvasUpper)
        const minValueOnCanvas =
            /* this.#view.yControlPane !== undefined ?
              this.#yc.vy(this.#yc.yCanvasLower - this.#view.yControlPane.height) : */
            yc.vy(yc.yCanvasLower)


        const vMaxTick = maxValueOnCanvas
        let vMinTick = minValueOnCanvas // init value, will adjust later

        const vRange = vMaxTick - vMinTick
        let vTickUnit = Math.floor(vRange / nTicks)

        if (!symmetricByMiddleValue) {
            vTickUnit = roundTickUnit(vTickUnit)
            vMinTick = Math.ceil(vMinTick / vTickUnit) * vTickUnit
        }

        const shouldScale = Math.abs(vMaxTick) >= ChartYControl.VALUE_SCALE_UNIT;
        const multiple = "x10^" + Math.log10(ChartYControl.VALUE_SCALE_UNIT);

        const path = new Path;
        const texts = new Texts;

        // draw axis-y line */
        path.moveto(0, 0)
        path.lineto(0, height)

        const wTick = 4;
        let i = 0
        let breakNow = false
        while (i < nTicks + 2 && !breakNow) {
            let vTick = vMinTick + vTickUnit * i
            const yTick = yc.yv(vTick)

            if (yTick < hFm) {
                breakNow = true

            } else {
                path.moveto(0, yTick)
                path.lineto(wTick, yTick)

                vTick = shouldScale ? Math.abs(vTick / ChartYControl.VALUE_SCALE_UNIT) : Math.abs(vTick);
                const vStr = i === 0 && shouldScale ? multiple : vTick.toPrecision();

                const yText = yTick + 4
                texts.text(8, yText, vStr);
            }

            i++;
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
