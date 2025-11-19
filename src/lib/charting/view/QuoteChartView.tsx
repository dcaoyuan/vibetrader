import { QuoteChart } from "../chart/QuoteChart"
import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "./scalar/LinearScala";
import { LG_SCALAR } from "./scalar/LgScalar";
import { Quote } from "../../domain/Quote";
import AxisX from "../pane/AxisX";
import './chartview.css';
import AxisY from "../pane/AxisY";
import { Path } from "../../svg/Path";
import { Text } from "../../svg/Text";
import { Temporal } from "temporal-polyfill";
import { TUnit } from "../../timeseris/TUnit";
import { Theme } from "../theme/Theme";
import { COMMON_DECIMAL_FORMAT } from "./Format";

interface QuoteChartViewProps extends ViewProps {
  quoteVar: TVar<Quote>;
}


export class QuoteChartView extends ChartView<QuoteChartViewProps, ViewState> {

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

  constructor(props: QuoteChartViewProps) {
    super(props);

    this.quoteChart = new QuoteChart(props.quoteVar, this.ycontrol);
    this.quoteVar = props.quoteVar;
    this.width = props.width;
    this.height = props.height;
    this.isQuote = props.isQuote;

    this.state = {
      xcontrol: undefined,
      ycontrol: undefined,

      baseSer: undefined,

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

      cursorPaths: [],
      cursorTexts: [],
    };

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
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
    while (i <= this.nBars()) {
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

  handleMouseMove(e: React.MouseEvent) {
    const targetRect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.pageX - targetRect.left;
    const offsetY = e.pageY - targetRect.top;

    console.log("plot cursor: " + this.width + "," + this.height, offsetX, offsetY)

    //const path = new Path(0, 0, '#F0F0F0');
    const path = new Path(0, 0, '#00f000');

    path.moveto(0, offsetY);
    path.lineto(this.width, offsetY)
    path.moveto(offsetX, 0);
    path.lineto(offsetX, this.height)

    const axisxTexts = new Text(0, this.height - ChartView.AXISX_HEIGHT, Theme.now().axisColor)
    const time = this.xcontrol.tx(offsetX);
    const timeZone = this.xcontrol.baseSer.timeZone;
    const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, timeZone);
    const dateStr = this.xcontrol.baseSer.freq.unit.formatNormalDate(dt, timeZone)
    axisxTexts.text(offsetX + 1, ChartView.AXISX_HEIGHT - 3, dateStr);

    const axisyTexts = new Text(this.width - ChartView.AXISY_WIDTH, 0, Theme.now().axisColor)
    const value = this.ycontrol.vy(offsetY);
    axisyTexts.text(4, offsetY, COMMON_DECIMAL_FORMAT.format(value));

    this.setState({ cursorPaths: [path], cursorTexts: [axisxTexts, axisyTexts] })

    console.log([path])
  }

  handleMouseLeave() {
    this.setState({ cursorPaths: [], cursorTexts: [] })
  }

  render() {
    this.computeGeometry();

    const axisx = AxisX({
      x: 0,
      y: this.height - ChartView.AXISX_HEIGHT,
      width: this.width,
      height: ChartView.AXISX_HEIGHT,
      xcontrol: this.xcontrol,
      ycontrol: this.ycontrol,
      view: this,
    })

    const axisy = AxisY({
      x: this.width - ChartView.AXISY_WIDTH,
      y: 0,
      width: ChartView.AXISY_WIDTH,
      height: this.height - ChartView.AXISX_HEIGHT,
      xcontrol: this.xcontrol,
      ycontrol: this.ycontrol,
    })

    const chart = this.quoteChart.paths()

    return (
      <div className="container" style={{ width: this.width + 'px', height: this.height + 'px' }} >

        <div style={{ width: this.width + 'px', height: this.height + 'px', position: "absolute" }}>
          <svg width={this.width} height={this.height}
            onMouseMove={this.handleMouseMove}
            onMouseLeave={this.handleMouseLeave}
          >
            {chart.map(path => path.render())}
            {axisx.path.render()}
            {axisx.texts.render()}
            {axisy.path.render()}
            {axisy.texts.render()}
            {this.state.cursorPaths.map(path => path.render())}
            {this.state.cursorTexts.map(text => text.render())}
          </svg>
        </div>
      </div>
    )
  }
}

