import { QuoteChart } from "../chart/QuoteChart"
import { ChartXControl } from "./ChartXControl"
import { ChartView } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "./scalar/LinearScala";
import { LG_SCALAR } from "./scalar/LgScalar";
import { Quote } from "../../domain/Quote";
import { AxisXPane } from "../pane/AxisXPane";
import { AxisYPane } from "../pane/AxisYPane";
import './chartview.css';

export class QuoteChartView extends ChartView {

  static switchAllQuoteChartType(originalKind: QuoteChart.Kind, targetKind: QuoteChart.Kind): QuoteChart.Kind {
    let newKind: QuoteChart.Kind;
    if (targetKind !== undefined) {
      newKind = targetKind;

    } else {
      switch (originalKind) {
        case QuoteChart.Kind.Candle:
          newKind = QuoteChart.Kind.Ohlc
          break;

        case QuoteChart.Kind.Ohlc:
          newKind = QuoteChart.Kind.Line
          break;

        case QuoteChart.Kind.Line:
          newKind = QuoteChart.Kind.Candle
          break;
        default:
          newKind = QuoteChart.Kind.Candle
      }
    }

    return newKind;
  }

  quoteChart: QuoteChart
  quoteVar: TVar<Quote>;

  constructor(xcontrol: ChartXControl, quoteVar: TVar<Quote>) {
    super(xcontrol, quoteVar.belongsTo);
    this.quoteChart = new QuoteChart(quoteVar, this.ycontrol);
    this.quoteVar = quoteVar;

    //if (axisXPane != null) {
    //  axisXPane.setTimeZone(sec.exchange.timeZone)
    //}
  }

  maxVolume = 0.0;
  minVolume = 0.0

  protected initComponents(): void {
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
    while (i <= this.nBars) {
      const time = this.tb(i)
      if (this.quoteVar.exists(time)) {
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
    switch (this.ycontrol.valueScalar.kind) {
      case LINEAR_SCALAR.kind:
        this.ycontrol.valueScalar = LG_SCALAR;
        break;

      default:
        this.ycontrol.valueScalar = LINEAR_SCALAR;
    }
  }

  // @throws(classOf[Throwable])
  // override protected def finalize {
  //   super.finalize
  // }

  handleMouseMove(e: MouseEvent) {
    console.log(`Mouse X: ${e.clientX}, Mouse Y: ${e.clientY}`);
  }

  render() {
    this.prePaintComponent();
    const chartPaths = this.quoteChart.paths();

    // use div style to force the dimension and avoid extra 4px height at bottom of parent container.
    const chartPaneStyle = {
      width: this.wChart() + 'px',
      height: this.height + 'px',
    };

    const axisxPane = new AxisXPane(this);
    axisxPane.width = this.width;
    axisxPane.height = ChartView.AXISX_HEIGHT;

    const axisyPane = new AxisYPane(this, this.quoteVar);
    axisyPane.width = ChartView.AXISY_WIDTH;
    axisyPane.height = this.height;

    return (
      <div className="container" style={{ width: this.width + 'px' }}>
        <div className="content">
          <div style={chartPaneStyle} >
            <svg width={this.wChart()} height={this.height} onMouseMove={(e) => console.log(e.clientX, e.clientY, e.target)}>
              {chartPaths.map((path => path.render()))}
            </svg>
          </div>
        </div>
        <div className="axisy">{axisyPane.render()}</div>
        <div className="axisx">
          {axisxPane.render()}
        </div>
      </div>
    )
  }
}


