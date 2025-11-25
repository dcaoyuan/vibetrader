import { ChartXControl } from "../view/ChartXControl";
import { Component, type JSX, } from "react";
import type { RefreshCursor } from "../view/ChartView";
import type { TVar } from "../../timeseris/TVar";
import type { Quote } from "../../domain/Quote";
import '../view/chartview.css';
import { Theme } from "../theme/Theme";
import { ListBox, ListBoxItem } from 'react-aria-components';
import { Text } from 'react-aria-components';

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

  referQuote: Quote,
  mouseQuote: Quote,
  delta: { period: number, percent: number, volumeSum: number, freqName: string }
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
    this.state = { chart, mouseQuote: undefined, referQuote: undefined, delta: undefined };

    console.log("Title render");
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
    let referQuote: Quote = undefined
    let mouseQuote: Quote = undefined

    if (this.xc.isReferCuroseVisible) {
      const time = this.xc.tr(this.xc.referCursorRow)
      if (this.xc.occurred(time)) {
        referQuote = this.props.tvar.getByTime(time);
      }
    }

    if (this.xc.isMouseCuroseVisible) {
      const time = this.xc.tr(this.xc.mouseCursorRow)
      if (this.xc.occurred(time)) {
        mouseQuote = this.props.tvar.getByTime(time);
      }
    }

    const delta = this.calcDelta()

    this.setState({ ...state, referQuote, mouseQuote, delta })
  }

  calcDelta() {
    if (!this.xc.isReferCuroseVisible || !this.xc.isMouseCuroseVisible) {
      return undefined;
    }

    const isAutoReferCursorValue = true; // TODO

    const rRow = this.xc.referCursorRow;
    const mRow = this.xc.mouseCursorRow;
    if (isAutoReferCursorValue) { // normal QuoteChartView
      const rTime = this.xc.tr(rRow)
      const mTime = this.xc.tr(mRow)
      if (this.xc.occurred(rTime) && this.xc.occurred(mTime)) {
        const rQuote = this.props.tvar.getByTime(rTime);
        const rValue = rQuote.close;

        const period = this.xc.br(mRow) - this.xc.br(rRow)
        const mValue = this.props.tvar.getByTime(mTime).close
        const percent = mRow > rRow
          ? 100 * (mValue - rValue) / rValue
          : 100 * (rValue - mValue) / mValue

        let volumeSum = 0.0
        const rowBeg = Math.min(rRow, mRow)
        const rowEnd = Math.max(rRow, mRow)
        let i = rowBeg + 1
        while (i <= rowEnd) {
          const time = this.xc.tr(i)
          if (this.xc.occurred(time)) {
            const mQuote = this.props.tvar.getByTime(time);
            volumeSum += mQuote.volume;
          }
          i += 1
        }

        let freqName = this.xc.baseSer.freq.compactName;
        freqName = period === 1 ? freqName : freqName + 's'
        freqName = freqName.startsWith('1') ? freqName.slice(1).toLowerCase() : '(' + freqName.toLowerCase + ')'

        return { period, percent, volumeSum, freqName }
      }

    } else { // else, usually RealtimeQuoteChartView
      // const vRefer = GlassPane.this.referCursorValue
      // const vYMouse = datumPlane.vy(y)
      // const percent = vRefer === 0 ? 0.0 : 100 * (vYMouse - vRefer) / vRefer

      //new StringBuilder(20).append(MONEY_DECIMAL_FORMAT.format(vYMouse)).append("  ").append("%+3.2f".format(percent)).append("%").toString
    }

    return undefined;
  }

  render() {
    const lColor = '#F00000'; // Theme.now().axisColor
    const rColor = '#00F0F0'; // 'orange'
    const mColor = '#00F000'; // Theme.now().axisColor 
    const rQuote = this.state.referQuote
    const mQuote = this.state.mouseQuote
    const delta = this.state.delta;

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontFamily: 'monospace', fontSize: '12px' }}>
        <ListBox layout="grid" aria-label="Mouse quote" style={{ textAlign: 'left', fontFamily: 'monospace' }}>
          <ListBoxItem textValue="O">
            {mQuote && <>
              <Text style={{ color: lColor }}>O </Text>
              <Text style={{ color: mColor }}>{mQuote.open}</Text>
            </>}
          </ListBoxItem>
          <ListBoxItem textValue="H">
            {mQuote && <>
              <Text style={{ color: lColor }}>H </Text>
              <Text style={{ color: mColor }}>{mQuote.high}</Text>
            </>}
          </ListBoxItem>
          <ListBoxItem textValue="L">
            {mQuote && <>
              <Text style={{ color: lColor }}>L </Text>
              <Text style={{ color: mColor }}>{mQuote.low}</Text>
            </>}
          </ListBoxItem>
          <ListBoxItem textValue="C">
            {mQuote && <>
              <Text style={{ color: lColor }}>C </Text>
              <Text style={{ color: mColor }}>
                {delta
                  ? mQuote.close + ` (${delta.percent.toFixed(2)}% in ${Math.abs(delta.period)} ${delta.freqName})`
                  : mQuote.close
                }
              </Text>
            </>}
          </ListBoxItem>
          <ListBoxItem textValue="V">
            {mQuote && <>
              <Text style={{ color: lColor }}>V </Text>
              <Text style={{ color: mColor }}>{mQuote.volume}</Text>
            </>}
          </ListBoxItem>
        </ListBox>

        <ListBox layout="grid" aria-label="Refer quote" style={{ textAlign: 'left' }}>
          <ListBoxItem textValue="O">
            {rQuote && <>
              <Text style={{ color: lColor }}>O </Text>
              <Text style={{ color: rColor }}>{rQuote.open}</Text>
            </>}
          </ListBoxItem>
          <ListBoxItem textValue="H">
            {rQuote && <>
              <Text style={{ color: lColor }}>H </Text>
              <Text style={{ color: rColor }}>{rQuote.high}</Text>
            </>}
          </ListBoxItem>
          <ListBoxItem textValue="L">
            {rQuote && <>
              <Text style={{ color: lColor }}>L </Text>
              <Text style={{ color: rColor }}>{rQuote.low}</Text>
            </>}
          </ListBoxItem>
          <ListBoxItem textValue="C">
            {rQuote && <>
              <Text style={{ color: lColor }}>C </Text>
              <Text style={{ color: rColor }}>{rQuote.close}</Text>
            </>}
          </ListBoxItem>
          <ListBoxItem textValue="V">
            {rQuote && <>
              <Text style={{ color: lColor }}>V </Text>
              <Text style={{ color: rColor }}>{rQuote.volume}</Text>
            </>}
          </ListBoxItem>
        </ListBox>
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

    if (this.props.refreshCursors.changed !== prevProps.refreshCursors.changed) {
      this.updateCursors();
    }
  }

}

export default Title;
