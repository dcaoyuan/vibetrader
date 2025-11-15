import { TSer } from "../../timeseris/TSer";
import { DefaultBaseTSer } from "../../timeseris/DefaultBaseTSer"
import { QuoteChart } from "../chart/QuoteChart"
import { ChartControl } from "./ChartControl"
import { ChartView } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "./scalar/LinearScala";
import { LG_SCALAR } from "./scalar/LgScalar";
import { Quote } from "../../domain/Quote";

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
      }
    }

    return newKind;
  }

  quoteChart: QuoteChart
  quoteVar: TVar<Quote>;

  constructor(control: ChartControl, quoteVar: TVar<Quote>) {
    super(control, quoteVar.belongsTo);
    this.quoteChart = new QuoteChart(quoteVar, this.mainChartPane);
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
    switch (this.mainChartPane.valueScalar.kind) {
      case LINEAR_SCALAR.kind:
        this.mainChartPane.valueScalar = LG_SCALAR;
        break;

      default:
        this.mainChartPane.valueScalar = LINEAR_SCALAR;
    }
  }

  // @throws(classOf[Throwable])
  // override protected def finalize {
  //   super.finalize
  // }

  paths() {
    this.prePaintComponent();
    return this.quoteChart.paths();
  }
}


