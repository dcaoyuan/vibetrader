import { ChartXControl } from "../view/ChartXControl";
import { Path } from "../../svg/Path";
import { Text } from "../../svg/Text";
import { Theme } from "../theme/Theme";
import type { ChartYControl } from "../view/ChartYControl";
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
  texts: Text,
}

export const AxisY = (props: Props) => {
  const { x, y, width, height, xc, yc } = props;
  const symmetricByMiddleValue = false;

  const segs = plot();

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

    const color = Theme.now().axisColor;
    const path = new Path(x, y, color);
    const texts = new Text(x, y, color);

    // draw left border line */
    path.moveto(0, 0)
    path.lineto(0, height)

    let shouldScale = false
    let i = 0
    let breakNow = false
    while (i < nTicks + 2 && !breakNow) {
      let vTick = vMinTick + vTickUnit * i
      const yTick = yc.yv(vTick)

      if (yTick < hFm) {
        breakNow = true

      } else {
        path.moveto(0, yTick)
        path.lineto(4, yTick)

        if (Math.abs(vTick) >= 100000) {
          vTick = Math.abs(vTick / 100000.0)
          shouldScale = true

        } else {
          vTick = Math.abs(vTick)
        }

        if (i === 0 && shouldScale) {
          const multiple = "x10000"

          texts.text(4, yTick, multiple);

        } else {
          texts.text(4, yTick, COMMON_DECIMAL_FORMAT.format(vTick));
        }
      }

      i++;
    }

    return { path, texts };
  }

  return (
    <g>
      <g shapeRendering="crispEdges" >
        {segs.path.render()}
      </g>
      <g>
        {segs.texts.render()}
      </g>
    </g>
  );
}

export default AxisY;
