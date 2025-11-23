import { TUnit } from "../../timeseris/TUnit";
import { ChartXControl } from "../view/ChartXControl";
import { Temporal } from "temporal-polyfill";
import { Component, type JSX, } from "react";
import type { RefreshCursor } from "../view/ChartView";
import type { TVar } from "../../timeseris/TVar";
import type { Quote } from "../../domain/Quote";
import '../view/chartview.css';
import { Label } from 'react-aria-components';

type Props = {
  xc: ChartXControl,
  width: number,
  height: number,
  refreshChart: number,
  refreshCursors: RefreshCursor,

  tvar: TVar<Quote>;
}

type State = {
  chart: JSX.Element,

  referCursor: JSX.Element,
  mouseCursor: JSX.Element,
}

class Title extends Component<Props, State> {
  xc: ChartXControl;
  width: number;
  height: number;

  constructor(props: Props) {
    super(props);
    this.xc = props.xc;
    this.width = props.width;
    this.height = props.height;

    const chart = this.plot();
    this.state = { chart, referCursor: <></>, mouseCursor: <></> };

    console.log("Title render", props);
  }

  plot() {
    return (
      <>
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
    let referCursor = <label></label>
    let mouseCursor = <label></label>
    const referColor = '#00F0F0'; // 'orange'
    const mouseColor = '#00F000';

    if (this.xc.isReferCuroseVisible) {
      const time = this.xc.tr(this.xc.referCursorRow)
      if (this.xc.exists(time)) {
        referCursor = this.#plotCursor(time, referColor)
      }
    }

    if (this.xc.isMouseCuroseVisible) {
      const time = this.xc.tr(this.xc.mouseCursorRow)
      if (this.xc.exists(time)) {
        mouseCursor = this.#plotCursor(time, mouseColor)
      }
    }

    this.setState({ ...state, referCursor, mouseCursor })
  }

  #plotCursor(time: number, color: string) {
    const timeZone = this.xc.baseSer.timeZone;
    const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, timeZone);
    const dtStr = this.xc.baseSer.freq.unit.formatNormalDate(dt, timeZone)
    const quote = this.props.tvar.getByTime(time);
    const valueStr = `${dtStr} - O: ${quote.open}, H: ${quote.high}, L: ${quote.low}, C: ${quote.close}, V: ${quote.volume}`;

    return (
      <div >
        <Label style={{ color: color }}>{valueStr}</Label>
      </div>
    )
  }

  render() {
    return (
      <div style={{ width: this.width, height: this.height, textAlign: 'left' }}>
        {this.state.referCursor}
        {this.state.mouseCursor}
      </div>
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

export default Title;
