import { TUnit } from "../../timeseris/TUnit";
import { ChartView, type ViewProps, type ViewState } from "../view/ChartView";
import { ChartXControl } from "../view/ChartXControl";
import { Theme } from "../theme/Theme";
import { Path } from "../../svg/Path";
import { Text } from "../../svg/Text";
import { Temporal } from "temporal-polyfill";
import type { ChartYControl } from "../view/ChartYControl";

const TICK_SPACING = 100 // in pixels

type Props = {
  view: ChartView<ViewProps, ViewState>,
  ycontrol: ChartYControl,
  xcontrol: ChartXControl,
  x: number,
  y: number,
  width: number,
  height: number,
}

type State = {
  path: Path,
  texts: Text
}

const AxisX = (props: Props) => {
  const { xcontrol, x, y, width, height } = props;

  // const [state, setState] = useState<State>(plotAxisX())

  // private mouseCursorLabel: unknown;
  // private referCursorLabel: unknown;

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

  function plot() {
    const nTicks = width / TICK_SPACING

    const nBars = xcontrol.nBars
    /** bTickUnit(bars per tick) cound not be 0, actually it should not less then 2 */
    const bTickUnit = Math.max(Math.round(nBars / nTicks), 2)

    const color = Theme.now().axisColor;
    const path = new Path(x, y, color);
    const texts = new Text(x, y, color);

    /** Draw border line */
    path.moveto(0, 0)
    path.lineto(width, 0)
    path.moveto(0, height)
    path.lineto(width, height)

    const timeZone = xcontrol.baseSer.timeZone;
    let prevDt = Temporal.Now.zonedDateTimeISO(timeZone);
    let currDt = Temporal.Now.zonedDateTimeISO(timeZone);
    let currDateYear: number;
    let currDateDay: number;
    let prevDateYear: number;
    let prevDateDay: number;

    const hTick = height;
    const xLastTick = xcontrol.xb(nBars)
    let i = 1;
    while (i <= nBars) {
      if (i % bTickUnit == 0 || i == nBars || i == 1) {
        const xCurrTick = xcontrol.xb(i)

        if (xLastTick - xCurrTick < TICK_SPACING && i != nBars) {
          /** too close */

        } else {
          path.moveto(xCurrTick, 1)
          path.lineto(xCurrTick, hTick)

          const time = xcontrol.tb(i)
          currDt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, timeZone);
          let stridingDate = false
          const freqUnit = xcontrol.baseSer.freq.unit
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

          texts.text(xCurrTick + 2, height - 4, dateStr);

          prevDt = currDt;
        }
      }

      i++;
    }

    return [path, texts];
  }

  return plot();
}

export default AxisX;
