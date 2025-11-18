import React from "react";
import { ChartXControl } from "../view/ChartXControl";
import { Path } from "../../svg/Path";
import { Text } from "../../svg/Text";
import { Theme } from "../theme/Theme";
import type { ChartYControl } from "../view/ChartYControl";
import { useState } from "react";

const CURRENCY_DECIMAL_FORMAT = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
}); // DecimalFormat("0.###")

const COMMON_DECIMAL_FORMAT = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
}); // DecimalFormat("0.###")

type Props = {
  width: number,
  height: number,
  xcontrol: ChartXControl,
  ycontrol: ChartYControl
}

type State = {
  path: Path,
  texts: Text[]
}

const AxisYPane: React.FC<Props> = (props) => {
  const { width, height, xcontrol, ycontrol } = props;

  const [symmetricByMiddleValue, setSymmetricByMiddleValue] = useState(false);
  const [state, setState] = useState<State>(plotAxisY())

  function roundTickUnit(vtUnit: number) {
    /** sample : 0.032 */
    let vTickUnit = vtUnit
    const roundedExponent = Math.round(Math.log10(vTickUnit)) - 1   // -2
    const adjustFactor = Math.pow(10, -roundedExponent)               // 100
    const adjustedValue = Math.round(vTickUnit * adjustFactor) // 3.2 -> 3
    vTickUnit = adjustedValue / adjustFactor     // 0.03

    /** following DecimalFormat <-> double converts are try to round the decimal */
    if (vTickUnit <= 0.001) {
      /** for currency */
      vTickUnit = 0.001
    } else if (vTickUnit > 0.001 && vTickUnit < 0.005) {
      /** for currency */
      const unitStr = CURRENCY_DECIMAL_FORMAT.format(vTickUnit)
      try {
        vTickUnit = Number(unitStr.trim);
      } catch (ex) {
        // todo 
      }
    } else if (vTickUnit > 0.005 && vTickUnit < 1) {
      /** for stock */
      const unitStr = COMMON_DECIMAL_FORMAT.format(vTickUnit)
      try {
        vTickUnit = Number(unitStr.trim);
      } catch (ex) {
        // todo
      }
    }

    return vTickUnit;
  }

  function plotAxisY() {
    //const hFm = fm.getHeight
    const hFm = 12;

    console.log(width, height)

    let nTicks = 6.0;
    while (Math.floor(ycontrol.hCanvas / nTicks) < hFm + 20 && nTicks > 2) {
      nTicks -= 2 // always keep even
    }

    const maxValueOnCanvas = ycontrol.vy(ycontrol.yCanvasUpper)
    const minValueOnCanvas =
      /* this.#view.yControlPane !== undefined ?
        this.#ycontrol.vy(this.#ycontrol.yCanvasLower - this.#view.yControlPane.height) : */
      ycontrol.vy(ycontrol.yCanvasLower)


    const vMaxTick = maxValueOnCanvas
    let vMinTick = minValueOnCanvas // init value, will adjust later

    const vRange = vMaxTick - vMinTick
    let vTickUnit = Math.floor(vRange / nTicks)

    if (!symmetricByMiddleValue) {
      vTickUnit = roundTickUnit(vTickUnit)
      vMinTick = Math.ceil(vMinTick / vTickUnit) * vTickUnit
    }

    const color = Theme.now().axisColor;
    const path = new Path(color);
    const texts: Text[] = []

    /** Draw left border line */
    path.moveto(0, 0)
    path.lineto(0, height)

    let shouldScale = false
    let i = 0
    let breakNow = false
    while (i < nTicks + 2 && !breakNow) {
      let vTick = vMinTick + vTickUnit * i
      const yTick = ycontrol.yv(vTick)

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

        if (i == 0 && shouldScale) {
          const multiple = "x10000"

          const text = new Text(4, yTick, multiple);
          text.fill = color;
          texts.push(text);

        } else {
          const text = new Text(4, yTick, COMMON_DECIMAL_FORMAT.format(vTick));
          text.fill = color;
          texts.push(text);
        }
      }

      i++;
    }

    return { path: path, texts: texts };
  }

  return (
    // use div style to force the dimension and avoid extra 4px height at bottom of parent container.
    <div style={{ width: width + 'px', height: height + 'px' }}>
      <svg width={width} height={height}>
        {state.path.render()}
        {state.texts.map((text) => text.render())}
      </svg>
    </div>
  );
}

export default AxisYPane;
