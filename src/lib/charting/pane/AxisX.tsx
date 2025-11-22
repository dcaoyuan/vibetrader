import { TUnit } from "../../timeseris/TUnit";
import { ChartXControl } from "../view/ChartXControl";
import { Theme } from "../theme/Theme";
import { Path } from "../../svg/Path";
import { Texts } from "../../svg/Text";
import { Temporal } from "temporal-polyfill";
import { Component, type JSX, } from "react";
import type { RefreshCursor } from "../view/ChartView";

const TICK_SPACING = 100 // in pixels

type Props = {
  id: number,
  x: number,
  y: number,
  xc: ChartXControl,
  width: number,
  height: number,
  refreshChart: number,
  refreshCursors: RefreshCursor,
}

type State = {
  chart: JSX.Element,

  referCursor: JSX.Element,
  mouseCursor: JSX.Element,
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

    console.log("AxisX render");
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
    let referCursor = <></>
    let mouseCursor = <></>
    const referColor = '#00F0F0'; // 'orange'
    const mouseColor = '#00F000';

    if (this.xc.isReferCuroseVisible) {
      const time = this.xc.tr(this.xc.referCursorRow)
      if (this.xc.exists(time)) {
        const cursorX = this.xc.xr(this.xc.referCursorRow)

        referCursor = this.#plotCursor(cursorX, time, referColor)
      }
    }

    if (this.xc.isMouseCuroseVisible) {
      const time = this.xc.tr(this.xc.mouseCursorRow)
      if (this.xc.exists(time)) {
        const cursorX = this.xc.xr(this.xc.mouseCursorRow)

        mouseCursor = this.#plotCursor(cursorX, time, mouseColor)
      }
    }

    this.setState({ ...state, referCursor, mouseCursor })
  }

  #plotCursor(x: number, time: number, color: string) {
    const w = 48; // annotation width
    const h = 13; // annotation height

    const timeZone = this.xc.baseSer.timeZone;
    const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, timeZone);
    const dtStr = this.xc.baseSer.freq.unit.formatNormalDate(dt, timeZone)


    const axisxText = new Texts('#000000')
    const axisxPath = new Path(color, color);
    const y0 = 2;
    axisxPath.moveto(x, y0);
    axisxPath.lineto(x + w, y0);
    axisxPath.lineto(x + w, y0 + h);
    axisxPath.lineto(x, y0 + h);
    axisxPath.closepath();
    axisxText.text(x + 1, h, dtStr);

    return (
      <g>
        {[axisxPath, axisxText].map(seg => seg.render())}
      </g>
    )
  }

  render() {
    const transform = `translate(${this.x} ${this.y})`;

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
