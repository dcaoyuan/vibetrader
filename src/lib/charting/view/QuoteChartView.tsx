import QuoteChart from "../chart/QuoteChart"
import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "./scalar/LinearScala";
import { LG_SCALAR } from "./scalar/LgScalar";
import { Quote } from "../../domain/Quote";
import AxisX from "../pane/AxisX";
import AxisY from "../pane/AxisY";
import './chartview.css';
import { QuoteChartKind } from "../chart/Kinds";

export class QuoteChartView extends ChartView<ViewProps, ViewState> {

  static switchAllQuoteChartType(originalKind: QuoteChartKind, targetKind: QuoteChartKind): QuoteChartKind {
    let newKind: QuoteChartKind
    if (targetKind !== undefined) {
      newKind = targetKind;

    } else {
      switch (originalKind) {
        case QuoteChartKind.Candle:
          newKind = QuoteChartKind.Ohlc
          break;

        case QuoteChartKind.Ohlc:
          newKind = QuoteChartKind.Line
          break;

        case QuoteChartKind.Line:
          newKind = QuoteChartKind.Candle
          break;

        default:
          newKind = QuoteChartKind.Candle
      }
    }

    return newKind;
  }

  quoteVar: TVar<Quote>;
  maxVolume = 0.0;
  minVolume = 0.0

  constructor(props: ViewProps) {
    super(props);

    this.quoteVar = props.tvar as TVar<Quote>;

    const { chart, axisx, axisy } = this.plot();

    this.state = {
      width: props.width,
      height: props.height,

      isQuote: false,
      hasInnerVolume: false,
      maxVolume: undefined,
      minVolume: undefined,

      maxValue: 1.0,
      minValue: 0.0,

      isInteractive: true,
      isPinned: false,

      chart,
      axisx,
      axisy,

      mouseCursor: <></>,
      referCursor: <></>,
    };

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  protected initComponents() { }

  override plot() {
    this.computeGeometry();

    const chart = QuoteChart({
      quoteVar: this.quoteVar,
      xc: this.xc,
      yc: this.yc,
      kind: QuoteChartKind.Candle,
      depth: 0
    });

    const axisx = AxisX({
      x: 0,
      y: this.height - ChartView.AXISX_HEIGHT,
      width: this.width,
      height: ChartView.AXISX_HEIGHT,
      xc: this.xc,
      yc: this.yc,
      view: this,
    })

    const axisy = AxisY({
      x: this.width - ChartView.AXISY_WIDTH,
      y: 0,
      width: ChartView.AXISY_WIDTH,
      height: this.height - ChartView.AXISX_HEIGHT,
      xc: this.xc,
      yc: this.yc,
    })

    return { chart, axisx, axisy }
  }

  protected putChartsOfMainSer() {
    // const vars = new Set<TVar<TVal>>();
    // for (let [name, v] of this.mainSer.vars()) {
    //   if (v.plot === Plot.Quote) {
    //     vars.add(v);
    //     this.quoteVar = v as TVar<Quote>;
    //   }
    // }
    // //mainSerChartToVars.put(this.quoteChart, vars)

    // this.mainChartPane.putChart(this.quoteChart)
  }

  override computeMaxMin() {
    let max = Number.NEGATIVE_INFINITY;
    let min = Number.POSITIVE_INFINITY;

    /** minimum volume should be 0 */
    this.maxVolume = Number.NEGATIVE_INFINITY;
    this.minVolume = 0
    let i = 1
    while (i <= this.xc.nBars) {
      const time = this.xc.tb(i)
      if (this.xc.exists(time)) {
        const quote = this.quoteVar.getByTime(time);
        if (quote.close > 0) {
          max = Math.max(max, quote.high)
          min = Math.min(min, quote.low)
          this.maxVolume = Math.max(this.maxVolume, quote.volume)
        }
      }

      i++
    }

    if (this.maxVolume == 0) {
      this.maxVolume = 1
    }

    if (this.maxVolume == this.minVolume) {
      this.maxVolume++;
    }

    if (max == min) {
      max *= 1.05
      min *= 0.95
    }

    this.setMaxMinValue(max, min)
  }

  swithScalarType() {
    switch (this.yc.valueScalar.kind) {
      case LINEAR_SCALAR.kind:
        this.yc.valueScalar = LG_SCALAR;
        break;

      default:
        this.yc.valueScalar = LINEAR_SCALAR;
    }
  }

  override valueAtTime(time: number) {
    return this.quoteVar.getByTime(time).close;
  }

  render() {
    return (
      // onKeyDown/onKeyUp etc upon <div/> should combine tabIndex={0} to work correctly.
      <div style={{ width: this.width + 'px', height: this.height + 'px' }}
        onKeyDown={this.handleKeyDown}
        onKeyUp={this.handleKeyUp}
        tabIndex={0}
      >

        <svg width={this.width} height={this.height}
          onMouseMove={this.handleMouseMove}
          onMouseLeave={this.handleMouseLeave}
          onMouseDown={this.handleMouseDown}
          onWheel={this.handleWheel}
        >
          {this.state.chart}
          {this.state.axisx}
          {this.state.axisy}
          {this.state.mouseCursor}
          {this.state.referCursor}
        </svg>
      </div>
    )
  }
}

