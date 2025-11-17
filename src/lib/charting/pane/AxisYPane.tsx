import { TVar } from "../../timeseris/TVar";
import { ChartXControl } from "../view/ChartXControl";
import { ChartView } from "../view/ChartView";
import type { DatumPlane } from "./DatumPlane";
import { TVal } from "../../timeseris/TVal";
import { Path } from "../../svg/Path";
import { Text } from "../../svg/Text";
import { Theme } from "../theme/Theme";

export class AxisYPane /*extends Pane(aview, adatumPlane)*/ {
  static readonly CURRENCY_DECIMAL_FORMAT = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }); // DecimalFormat("0.###")

  static readonly COMMON_DECIMAL_FORMAT = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }); // DecimalFormat("0.###")

  #datumPlane: DatumPlane;
  #control: ChartXControl;
  #view: ChartView;
  #tvar: TVar<TVal>;

  width = 0;
  height = 0;

  constructor(view: ChartView, tvar: TVar<TVal>) {
    this.#view = view;
    this.#datumPlane = view.ycontrol;
    this.#control = view.control;
    this.#tvar = tvar;
  }

  private _symmetricByMiddleValue = false;

  // private mouseCursorLabel = new JLabel
  // private referCursorLabel = new JLabel

  // private updateMouseCursorLabel() {
  //   this.#datumPlane.computeGeometry()
  //   if (this.#control.isMouseEnteredAnyChartPane) {
  //     let y, v = 0.0
  //     if (this.#datumPlane.view.isQuote) {
  //       if (this.#datumPlane.isMouseEntered) {
  //         y = this.#datumPlane.yMouse
  //         v = this.#datumPlane.vy(y)
  //       } else {
  //         const mouseRow = this.#control.mouseCursorRow
  //         const quoteVar = this.#tvar as TVar<Quote>;
  //         const time = this.#datumPlane.tr(mouseRow)
  //         v = quoteVar.exists(time) ? quoteVar.getByTime(time).close : 0
  //         y = this.#datumPlane.yv(v)
  //       }
  //       const valueStr = AxisYPane.COMMON_DECIMAL_FORMAT.format(v)

  //       mouseCursorLabel.setForeground(LookFeel().mouseCursorTextColor)
  //       mouseCursorLabel.setBackground(LookFeel().mouseCursorTextBgColor)
  //       mouseCursorLabel.setFont(LookFeel().axisFont)
  //       mouseCursorLabel.setText(valueStr)
  //       const fm = mouseCursorLabel.getFontMetrics(mouseCursorLabel.getFont)
  //       mouseCursorLabel.setBounds(
  //         3, Math.round(y).toInt - fm.getHeight + 1,
  //         fm.stringWidth(mouseCursorLabel.getText) + 2, fm.getHeight + 1)

  //       mouseCursorLabel.setVisible(true)
  //     } else {
  //       if (this.#datumPlane.isMouseEntered) {
  //         y = this.#datumPlane.yMouse
  //         v = this.#datumPlane.vy(y)
  //         const valueStr = AxisYPane.COMMON_DECIMAL_FORMAT.format(v)

  //         mouseCursorLabel.setForeground(LookFeel().mouseCursorTextColor)
  //         mouseCursorLabel.setBackground(LookFeel().mouseCursorTextBgColor)
  //         mouseCursorLabel.setFont(LookFeel().axisFont)
  //         mouseCursorLabel.setText(valueStr)
  //         const fm = mouseCursorLabel.getFontMetrics(mouseCursorLabel.getFont)
  //         mouseCursorLabel.setBounds(3, Math.round(y).toInt - fm.getHeight + 1,
  //           fm.stringWidth(mouseCursorLabel.getText) + 2, fm.getHeight + 1)

  //         mouseCursorLabel.setVisible(true)
  //       } else {
  //         mouseCursorLabel.setVisible(false)
  //       }
  //     }
  //   } else {
  //     mouseCursorLabel.setVisible(false)
  //   }
  // }

  // /**
  //  * CursorChangeEvent only notice the cursor's position changes, but the
  //  * referCursorLable is also aware of the refer value's changes, so we could
  //  * not rely on the CursorChangeEvent only, instead, we call this method via
  //  * syncWithView()
  //  */
  // private updateReferCursorLabel() {
  //   this.#datumPlane.computeGeometry()

  //   var y, v = 0.0
  //   if (this.#datumPlane.view.isQuote) {
  //     const referRow = this.#control.referCursorRow
  //     const quoteVar = this.#tvar as TVar<Quote>;
  //     const time = this.#datumPlane.tr(referRow)
  //     v = quoteVar.exists(time) ? quoteVar.getByTime(time).close : 0
  //     y = this.#datumPlane.yv(v)
  //     const valueStr = AxisYPane.COMMON_DECIMAL_FORMAT.format(v)

  //     referCursorLabel.setForeground(LookFeel().referCursorTextColor)
  //     referCursorLabel.setBackground(LookFeel().referCursorTextBgColor)
  //     referCursorLabel.setFont(LookFeel().axisFont)
  //     referCursorLabel.setText(valueStr)
  //     cosnt fm = referCursorLabel.getFontMetrics(referCursorLabel.getFont)
  //     referCursorLabel.setBounds(3, Math.round(y).toInt - fm.getHeight + 1,
  //       fm.stringWidth(referCursorLabel.getText) + 2, fm.getHeight)

  //     referCursorLabel.setVisible(true)
  //   } else {
  //     referCursorLabel.setVisible(false)
  //   }
  // }

  /**
   * Try to round tickUnit
   */
  private roundTickUnit(avTickUnit: number) {
    /** sample : 0.032 */
    let vTickUnit = avTickUnit
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
      const unitStr = AxisYPane.CURRENCY_DECIMAL_FORMAT.format(vTickUnit)
      try {
        vTickUnit = Number(unitStr.trim);
      } catch (ex) {
        // todo 
      }
    } else if (vTickUnit > 0.005 && vTickUnit < 1) {
      /** for stock */
      const unitStr = AxisYPane.COMMON_DECIMAL_FORMAT.format(vTickUnit)
      try {
        vTickUnit = Number(unitStr.trim);
      } catch (ex) {
        // todo
      }
    }

    return vTickUnit;
  }


  render() {
    return this.plotAxisY()
  }

  private plotAxisY() {
    //const hFm = fm.getHeight
    const hFm = 12;

    let nTicks = 6.0;
    while (Math.floor(this.#datumPlane.hCanvas / nTicks) < hFm + 20 && nTicks > 2) {
      nTicks -= 2 // always keep even
    }

    const maxValueOnCanvas = this.#datumPlane.vy(this.#datumPlane.yCanvasUpper)
    const minValueOnCanvas = this.#view.yControlPane !== undefined ?
      this.#datumPlane.vy(this.#datumPlane.yCanvasLower - this.#view.yControlPane.height) :
      this.#datumPlane.vy(this.#datumPlane.yCanvasLower)


    const vMaxTick = maxValueOnCanvas
    let vMinTick = minValueOnCanvas // init value, will adjust later

    const vRange = vMaxTick - vMinTick
    let vTickUnit = Math.floor(vRange / nTicks)

    if (!this._symmetricByMiddleValue) {
      vTickUnit = this.roundTickUnit(vTickUnit)
      vMinTick = Math.ceil(vMinTick / vTickUnit) * vTickUnit
    }

    const color = Theme.now().axisColor;
    const path = new Path(color);
    const texts: Text[] = []

    /** Draw left border line */
    path.moveto(0, 0)
    path.lineto(0, this.height)

    let shouldScale = false
    let i = 0
    let breakNow = false
    while (i < nTicks + 2 && !breakNow) {
      let vTick = vMinTick + vTickUnit * i
      const yTick = this.#datumPlane.yv(vTick)

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
          const text = new Text(4, yTick, AxisYPane.COMMON_DECIMAL_FORMAT.format(vTick));
          text.fill = color;
          texts.push(text);
        }
      }

      i++;

    }

    const style = {
      width: this.width + 'px',
      height: this.height + 'px',
    };

    return (
      <div style={style}>
        <svg width={this.width} height={this.height}>
          {path.render()}
          {texts.map((text) => text.render())}
        </svg>
      </div>
    );
  }

}
