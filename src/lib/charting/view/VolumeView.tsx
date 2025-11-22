import QuoteChart from "../chart/QuoteChart"
import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "./scalar/LinearScala";
import { LG_SCALAR } from "./scalar/LgScalar";
import { Quote } from "../../domain/Quote";
import AxisY from "../pane/AxisY";
import './chartview.css';
import VolmueChart from "../chart/VolumeChart";

export class VolumeView extends ChartView<ViewProps, ViewState> {
  quoteVar: TVar<Quote>;
  maxVolume = 0.0;
  minVolume = 0.0

  constructor(props: ViewProps) {
    super(props);

    this.quoteVar = props.tvar as TVar<Quote>;

    const { chart, axisy } = this.plot();

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
      axisy,

      mouseCursor: <></>,
      referCursor: <></>,
    };

  }

  override plot() {
    this.computeGeometry();

    const chart = VolmueChart({
      quoteVar: this.quoteVar,
      xc: this.xc,
      yc: this.yc,
      depth: 0
    });

    const axisy = AxisY({
      x: this.width - ChartView.AXISY_WIDTH,
      y: 0,
      width: ChartView.AXISY_WIDTH,
      height: this.height,
      xc: this.xc,
      yc: this.yc,
    })

    return { chart, axisy }
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
    const min = 0// Number.POSITIVE_INFINITY;

    let i = 1
    while (i <= this.xc.nBars) {
      const time = this.xc.tb(i)
      if (this.xc.exists(time)) {
        const quote = this.quoteVar.getByTime(time);
        if (quote.close > 0) {
          max = Math.max(max, quote.volume)
        }
      }

      i++
    }

    if (max === 0) {
      max = 1
    }

    if (max === min) {
      this.maxVolume++;
    }

    // if (max === min) {
    //   max *= 1.05
    //   min *= 0.95
    // }

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
    return this.quoteVar.getByTime(time).volume //value;
  }

  render() {
    const transform = `translate(${this.props.x} ${this.props.y})`;
    return (
      <g transform={transform}>
        {this.state.chart}
        {this.state.axisy}
        {this.state.mouseCursor}
        {this.state.referCursor}
      </g>
    )
  }
}
