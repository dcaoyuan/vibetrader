import { TUnit } from "../../timeseris/TUnit";
import type { DatumPlane } from "./DatumPlane";
import { ChartView } from "../view/ChartView";
import { ChartControl } from "../view/ChartControl";
import { Theme } from "../theme/Theme";
import { Path } from "../../svg/Path";
import { Text } from "../../svg/Text";
import { Temporal } from "temporal-polyfill";

export class AxisXPane /*extends Pane(aview, adatumPlane) */ {
  #view: ChartView;
  #datumPlane: DatumPlane;
  #control: ChartControl;
  width = 0;
  height = 0;

  constructor(view: ChartView) {
    this.#view = view;
    this.#datumPlane = view.mainChartPane;
    this.#control = view.control;
  }

  private readonly TICK_SPACING = 100 // in pixels

  // private mouseCursorLabel: any;

  // private referCursorLabel: any;



  // setTimeZone(timeZone: string) {
  //   this.timeZone = timeZone
  //   this.cal = Calendar.getInstance(timeZone)
  //   this.currDate = cal.getTime
  //   this.prevDate = cal.getTime
  // }

  // private updateMouseCursorLabel() {
  //   this.#datumPlane.computeGeometry()
  //   const controller = this.#view.control

  //   if (controller.isMouseEnteredAnyChartPane) {
  //     const mousePosition = controller.mouseCursorRow
  //     const mouseTime = controller.mouseCursorTime
  //     const freq = controller.baseSer.freq
  //     const x = this.#datumPlane.xr(mousePosition)
  //     cal.setTimeInMillis(mouseTime)
  //     const dateStr = freq.unit.formatNormalDate(cal.getTime, timeZone)

  //     mouseCursorLabel.setForeground(LookFeel().mouseCursorTextColor)
  //     mouseCursorLabel.setBackground(LookFeel().mouseCursorTextBgColor)
  //     mouseCursorLabel.setFont(LookFeel().axisFont)
  //     mouseCursorLabel.setText(dateStr)
  //     const fm = mouseCursorLabel.getFontMetrics(mouseCursorLabel.getFont)
  //     mouseCursorLabel.setBounds(x + 1, 1, fm.stringWidth(mouseCursorLabel.getText) + 2, getHeight - 2)

  //     mouseCursorLabel.setVisible(true)
  //   } else {
  //     mouseCursorLabel.setVisible(false)
  //   }

  // }

  // private updateReferCursorLabel() {
  //   this.#datumPlane.computeGeometry()
  //   const control = this.#view.control

  //   const referPosition = control.referCursorRow
  //   const referTime = control.referCursorTime
  //   const freq = control.baseSer.freq
  //   const x = this.#datumPlane.xr(referPosition).toInt
  //   cal.setTimeInMillis(referTime)
  //   const dateStr = freq.unit.formatNormalDate(cal.getTime, timeZone)

  //   referCursorLabel.setForeground(LookFeel().referCursorTextColor)
  //   referCursorLabel.setBackground(LookFeel().referCursorTextBgColor)
  //   referCursorLabel.setFont(LookFeel().axisFont)
  //   referCursorLabel.setText(dateStr)
  //   const fm = referCursorLabel.getFontMetrics(referCursorLabel.getFont)
  //   referCursorLabel.setBounds(x + 1, 1, fm.stringWidth(referCursorLabel.getText) + 2, getHeight - 2)

  //   referCursorLabel.setVisible(true)
  // }

  // syncWithView() {
  //   updateReferCursorLabel
  // }

  render() {
    return this.plotAxisX();
  }

  private plotAxisX() {
    const nTicks = this.width / this.TICK_SPACING

    const nBars = this.#datumPlane.nBars
    /** bTickUnit(bars per tick) cound not be 0, actually it should not less then 2 */
    const bTickUnit = Math.max(Math.round(nBars / nTicks), 2)

    const color = Theme.now().axisColor;
    const path = new Path(color);
    const texts: Text[] = [];

    /** Draw border line */
    path.moveto(0, 0)
    path.lineto(this.width, 0)
    path.moveto(0, this.height)
    path.lineto(this.width, this.height)

    const timeZone = this.#control.baseSer.timeZone;
    let prevDt = Temporal.Now.zonedDateTimeISO(timeZone);
    let currDt = Temporal.Now.zonedDateTimeISO(timeZone);
    let currDateYear: number;
    let currDateDay: number;
    let prevDateYear: number;
    let prevDateDay: number;

    const hTick = this.height;
    const xLastTick = this.#datumPlane.xb(nBars)
    console.log(nBars)
    let i = 1;
    while (i <= nBars) {
      if (i % bTickUnit == 0 || i == nBars || i == 1) {
        const xCurrTick = this.#datumPlane.xb(i)

        if (xLastTick - xCurrTick < this.TICK_SPACING && i != nBars) {
          /** too close */

        } else {
          path.moveto(xCurrTick, 1)
          path.lineto(xCurrTick, hTick)

          const time = this.#datumPlane.tb(i)
          currDt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, timeZone);
          let stridingDate = false
          const freqUnit = this.#control.baseSer.freq.unit
          switch (freqUnit) {
            case TUnit.Day:
              currDateYear = currDt.year;
              //cal.setTime(prevDate)
              prevDateYear = prevDt.year; // cal.get(Calendar.YEAR)
              if (currDateYear > prevDateYear && i != nBars || i == 1) {
                stridingDate = true
              }
              break;

            case TUnit.Hour:
            case TUnit.Minute:
            case TUnit.Second:
              //cal.setTime(prevDate)
              currDateDay = currDt.daysInWeek;
              prevDateDay = prevDt.daysInMonth; //get(Calendar.DAY_OF_MONTH)
              if (currDateDay > prevDateDay && i != nBars || i == 1) {
                stridingDate = true
              }
              break;

            default:
          }

          const dateStr = stridingDate ?
            freqUnit.formatStrideDate(currDt, timeZone) :
            freqUnit.formatNormalDate(currDt, timeZone)

          console.log(dateStr)

          const text = new Text(xCurrTick + 2, this.height - 4, dateStr);
          text.fill = color;
          texts.push(text);

          prevDt = currDt;
        }
      }

      i++;
    }

    // use div style to force the dimension and avoid extra 4px height at bottom of parent container.
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
