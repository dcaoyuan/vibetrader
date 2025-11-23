import { ChartXControl } from "../view/ChartXControl";
import { Component, type JSX, } from "react";
import type { RefreshCursor } from "../view/ChartView";
import type { TVar } from "../../timeseris/TVar";
import type { Quote } from "../../domain/Quote";
import '../view/chartview.css';
import { Theme } from "../theme/Theme";
import { ListBox, ListBoxItem, Virtualizer } from 'react-aria-components';
import { GridLayout, Size, Text } from 'react-aria-components';

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
    this.state = { chart, mouseQuote: undefined, referQuote: undefined };

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
    let referQuote: Quote = undefined
    let mouseQuote: Quote = undefined

    if (this.xc.isReferCuroseVisible) {
      const time = this.xc.tr(this.xc.referCursorRow)
      if (this.xc.exists(time)) {
        referQuote = this.props.tvar.getByTime(time);
      }
    }

    if (this.xc.isMouseCuroseVisible) {
      const time = this.xc.tr(this.xc.mouseCursorRow)
      if (this.xc.exists(time)) {
        mouseQuote = this.props.tvar.getByTime(time);
      }
    }

    this.setState({ ...state, referQuote, mouseQuote })
  }

  render() {
    const lColor = "red"
    const rColor = '#00F0F0'; // 'orange'
    const mColor = '#00F000'//Theme.now().axisColor //'#00F000';
    const rQuote = this.state.referQuote
    const mQuote = this.state.mouseQuote

    return (
      // NOTE: The ListBox must have content that can be focused to enable keyboard navigation. 
      // So we use opacity to control visible.
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontFamily: 'monospace', fontSize: '12px' }}>
        <ListBox layout="grid" aria-label="Mouse quote" style={{ textAlign: 'left', fontFamily: 'monospace' }}>
          <ListBoxItem>
            <Text style={{ color: lColor, opacity: mQuote ? 1 : 0 }}>O </Text><Text style={{ color: mColor }}>{mQuote && mQuote.open}</Text>
          </ListBoxItem>
          <ListBoxItem>
            <Text style={{ color: lColor, opacity: mQuote ? 1 : 0 }}>H </Text><Text style={{ color: mColor }}>{mQuote && mQuote.high}</Text>
          </ListBoxItem>
          <ListBoxItem>
            <Text style={{ color: lColor, opacity: mQuote ? 1 : 0 }}>L </Text><Text style={{ color: mColor }}>{mQuote && mQuote.low}</Text>
          </ListBoxItem>
          <ListBoxItem>
            <Text style={{ color: lColor, opacity: mQuote ? 1 : 0 }}>C </Text><Text style={{ color: mColor }}>{mQuote && mQuote.close}</Text>
          </ListBoxItem>
          <ListBoxItem>
            <Text style={{ color: lColor, opacity: mQuote ? 1 : 0 }}>V </Text><Text style={{ color: mColor }}>{mQuote && mQuote.volume}</Text>
          </ListBoxItem>
        </ListBox>
        <ListBox
          layout="grid" aria-label="Refer quote" style={{ textAlign: 'left' }}>
          <ListBoxItem>
            <Text style={{ color: lColor, opacity: rQuote ? 1 : 0 }}>O </Text><Text style={{ color: rColor }}>{rQuote && rQuote.open}</Text>
          </ListBoxItem>
          <ListBoxItem>
            <Text style={{ color: lColor, opacity: rQuote ? 1 : 0 }}>H </Text><Text style={{ color: rColor }}>{rQuote && rQuote.high}</Text>
          </ListBoxItem>
          <ListBoxItem>
            <Text style={{ color: lColor, opacity: rQuote ? 1 : 0 }}>L </Text><Text style={{ color: rColor }}>{rQuote && rQuote.low}</Text>
          </ListBoxItem>
          <ListBoxItem>
            <Text style={{ color: lColor, opacity: rQuote ? 1 : 0 }}>C </Text><Text style={{ color: rColor }}>{rQuote && rQuote.close}</Text>
          </ListBoxItem>
          <ListBoxItem>
            <Text style={{ color: lColor, opacity: rQuote ? 1 : 0 }}>V </Text><Text style={{ color: rColor }}>{rQuote && rQuote.volume}</Text>
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

    if (this.props.refreshCursors !== prevProps.refreshCursors) {
      this.updateCursors();
    }
  }

}

export default Title;
