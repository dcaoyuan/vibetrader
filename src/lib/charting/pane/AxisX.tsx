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
  xc: ChartXControl,
  yc: ChartYControl,
  x: number,
  y: number,
  width: number,
  height: number,
}

const AxisX = (props: Props) => {
  const { xc, x, y, width, height } = props;

  const segs = plot();

  function plot() {
    const nTicks = width / TICK_SPACING

    const nBars = xc.nBars
    // bTickUnit(bars per tick) cound not be 0, actually it should not less then 2
    const bTickUnit = Math.max(Math.round(nBars / nTicks), 2)

    const color = Theme.now().axisColor;
    const path = new Path(x, y, color);
    const texts = new Text(x, y, color);

    // draw axis-x line 
    path.moveto(0, 0)
    path.lineto(width, 0)

    const timeZone = xc.baseSer.timeZone;
    let prevDt = Temporal.Now.zonedDateTimeISO(timeZone);
    let currDt = Temporal.Now.zonedDateTimeISO(timeZone);
    let currDateYear: number;
    let currDateDay: number;
    let prevDateYear: number;
    let prevDateDay: number;

    const hTick = height;
    const xLastTick = xc.xb(nBars)
    let i = 1;
    while (i <= nBars) {
      if (i % bTickUnit === 0 || i === nBars || i === 1) {
        const xCurrTick = xc.xb(i)

        if (xLastTick - xCurrTick < TICK_SPACING && i !== nBars) {
          // too close

        } else {
          if (i !== 1) {
            path.moveto(xCurrTick, 1)
            path.lineto(xCurrTick, hTick)
          }

          const time = xc.tb(i)
          currDt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, timeZone);
          let stridingDate = false
          const freqUnit = xc.baseSer.freq.unit
          switch (freqUnit) {
            case TUnit.Day:
              currDateYear = currDt.year;
              //cal.setTime(prevDate)
              prevDateYear = prevDt.year; // cal.get(Calendar.YEAR)
              if (currDateYear > prevDateYear && i !== nBars || i === 1) {
                stridingDate = true
              }
              break;

            case TUnit.Hour:
            case TUnit.Minute:
            case TUnit.Second:
              //cal.setTime(prevDate)
              currDateDay = currDt.daysInWeek;
              prevDateDay = prevDt.daysInMonth; //get(Calendar.DAY_OF_MONTH)
              if (currDateDay > prevDateDay && i !== nBars || i === 1) {
                stridingDate = true
              }
              break;

            default:
          }

          const dateStr = stridingDate
            ? freqUnit.formatStrideDate(currDt, timeZone)
            : freqUnit.formatNormalDate(currDt, timeZone)

          texts.text(xCurrTick + 2, height - 3, dateStr);

          prevDt = currDt;
        }
      }

      i++;
    }

    return [path, texts];
  }

  return (
    <g shapeRendering="crispEdges">
      {segs.map(seg => seg.render())}
    </g>
  );
}

export default AxisX;
