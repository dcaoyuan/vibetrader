import { TUnit } from "../../timeseris/TUnit";
import { ChartXControl } from "../view/ChartXControl";
import { Theme } from "../theme/Theme";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Text";
import { Temporal } from "temporal-polyfill";
import { Component, type JSX } from "react";

const TICK_SPACING = 100 // in pixels

type Props = {
  x: number,
  y: number,
  xc: ChartXControl,
  width: number,
  height: number,
  refreshChart: number,
  refreshCursors: number,
}

type State = {
  referCursor: JSX.Element,
  mouseCursor: JSX.Element,
  chart: JSX.Element,
}

class AxisX extends Component<Props, State> {
  xc: ChartXControl;
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(props: Props) {
    super(props);
    this.xc = props.xc;
    this.x = props.x;
    this.y = props.y;
    this.width = props.width;
    this.height = props.height;

    const chart = this.plot();
    this.state = { chart, referCursor: <></>, mouseCursor: <></> };
  }

  plot() {
    const nTicks = this.width / TICK_SPACING

    const nBars = this.xc.nBars
    // bTickUnit(bars per tick) cound not be 0, actually it should not less then 2
    const bTickUnit = Math.max(Math.round(nBars / nTicks), 2)

    const color = Theme.now().axisColor;
    const path = new Path(color);
    const texts = new Texts(color);

    // draw axis-x line 
    path.moveto(0, 0)
    path.lineto(this.width, 0)

    const timeZone = this.xc.baseSer.timeZone;
    let prevDt = Temporal.Now.zonedDateTimeISO(timeZone);
    let currDt = Temporal.Now.zonedDateTimeISO(timeZone);
    let currDateYear: number;
    let currDateDay: number;
    let prevDateYear: number;
    let prevDateDay: number;

    const hTick = 4;
    const xLastTick = this.xc.xb(nBars)
    let i = 1;
    while (i <= nBars) {
      if (i % bTickUnit === 0 || i === nBars || i === 1) {
        const xCurrTick = this.xc.xb(i)

        if (xLastTick - xCurrTick < TICK_SPACING && i !== nBars) {
          // too close

        } else {
          path.moveto(xCurrTick, 1)
          path.lineto(xCurrTick, hTick)

          const time = this.xc.tb(i)
          currDt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, timeZone);
          let stridingDate = false
          const freqUnit = this.xc.baseSer.freq.unit
          switch (freqUnit) {
            case TUnit.Day:
              currDateYear = currDt.year;
              prevDateYear = prevDt.year;
              if (currDateYear > prevDateYear && i !== nBars || i === 1) {
                stridingDate = true
              }
              break;

            case TUnit.Hour:
            case TUnit.Minute:
            case TUnit.Second:
              currDateDay = currDt.daysInWeek;
              prevDateDay = prevDt.daysInMonth;
              if (currDateDay > prevDateDay && i !== nBars || i === 1) {
                stridingDate = true
              }
              break;

            default:
          }

          const dateStr = stridingDate
            ? freqUnit.formatStrideDate(currDt, timeZone)
            : freqUnit.formatNormalDate(currDt, timeZone)

          texts.text(xCurrTick + 2, this.height - 3, dateStr);

          prevDt = currDt;
        }
      }

      i++;
    }

    return (
      <>
        <g shapeRendering="crispEdges" >
          {path.render()}
        </g>
        <g>
          {texts.render()}
        </g>
      </>
    );
  }

  protected updateChart() {
    // clear mouse cursor and prev value
    this.xc.isMouseCuroseVisible = false;

    const chart = this.plot();
    this.updateState({ chart });
  }

  protected updateCursors() {
    this.updateState({});
  }

  protected updateState(state: object) {
    const referCursor = <></>
    const mouseCursor = <></>
    this.setState({ ...state, referCursor, mouseCursor })
  }

  render() {
    const transform = `translate(${this.x} ${this.y})`;

    console.log("AxisX render");
    return (
      <g transform={transform}>
        {this.state.chart}
        {this.state.mouseCursor}
        {this.state.referCursor}
      </g >
    )
  }

  // Important: Be careful when calling setState within componentDidUpdate
  // Ensure you have a conditional check to prevent infinite re-renders.
  // If setState is called unconditionally, it will trigger another update,
  // potentially leading to a loop.
  override componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.props.refreshChart !== prevProps.refreshChart) {
      this.updateChart();
    }

    if (this.props.refreshCursors !== prevProps.refreshCursors) {
      this.updateCursors();
    }
  }

}

export default AxisX;
