import { QuoteChart } from "../chart/QuoteChart"
import { ChartView, type ViewProps, type ViewState } from "./ChartView";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "./scalar/LinearScala";
import { LG_SCALAR } from "./scalar/LgScalar";
import { Quote } from "../../domain/Quote";
import AxisX from "../pane/AxisX";
import AxisY from "../pane/AxisY";
import { Path } from "../../svg/Path";
import { Text } from "../../svg/Text";
import { Temporal } from "temporal-polyfill";
import { TUnit } from "../../timeseris/TUnit";
import { COMMON_DECIMAL_FORMAT } from "./Format";
import type React from "react";
import './chartview.css';
import type { Seg } from "../../svg/Seg";

export class QuoteChartView extends ChartView<ViewProps, ViewState> {
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

  constructor(props: ViewProps) {
    super(props);
    this.quoteVar = props.tvar as TVar<Quote>;

    this.quoteChart = new QuoteChart(this.quoteVar, this.ycontrol);
    this.width = props.width;
    this.height = props.height;
    this.isQuote = props.isQuote;

    const { chartSegs, axisxSegs, axisySegs } = this.plot();

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

      chartSegs,
      axisxSegs,
      axisySegs,

      mouseCursorSegs: [],
      referCursorSegs: [],
    };

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  maxVolume = 0.0;
  minVolume = 0.0

  protected initComponents(): void {
  }

  protected plot() {
    this.computeGeometry();

    const axisxSegs = AxisX({
      x: 0,
      y: this.height - ChartView.AXISX_HEIGHT,
      width: this.width,
      height: ChartView.AXISX_HEIGHT,
      xcontrol: this.xcontrol,
      ycontrol: this.ycontrol,
      view: this,
    })

    const axisySegs = AxisY({
      x: this.width - ChartView.AXISY_WIDTH,
      y: 0,
      width: ChartView.AXISY_WIDTH,
      height: this.height - ChartView.AXISX_HEIGHT,
      xcontrol: this.xcontrol,
      ycontrol: this.ycontrol,
    })

    const chartSegs = this.quoteChart.plot()

    return { chartSegs, axisxSegs, axisySegs }
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

  plotCursor(x: number, y: number, time: number, value: number, color: string): Seg[] {
    const w = 12 * 4; // annotation width
    const h = 12;     // annotation height

    const crossPath = new Path(0, 0, color);
    const axisxText = new Text(0, this.height - ChartView.AXISX_HEIGHT, '#000000')
    const axisxPath = new Path(0, this.height - ChartView.AXISX_HEIGHT, color, color);
    const axisyText = new Text(this.width - ChartView.AXISY_WIDTH, 0, '#000000')
    const axisyPath = new Path(this.width - ChartView.AXISY_WIDTH, 0, color, color)

    const timeZone = this.xcontrol.baseSer.timeZone;
    const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, timeZone);
    const dtStr = this.xcontrol.baseSer.freq.unit.formatNormalDate(dt, timeZone)

    const valueStr = COMMON_DECIMAL_FORMAT.format(value);

    // axis-x
    crossPath.moveto(x, 0);
    crossPath.lineto(x, this.height)

    const y0 = 1;
    axisxPath.moveto(x, y0);
    axisxPath.lineto(x + w, y0);
    axisxPath.lineto(x + w, y0 + h);
    axisxPath.lineto(x, y0 + h);
    axisxPath.closepath();
    axisxText.text(x + 1, y0 + h, dtStr);

    // axis-y
    crossPath.moveto(0, y);
    crossPath.lineto(this.width, y)

    const x0 = 1
    axisyPath.moveto(x0, y);
    axisyPath.lineto(x0 + w, y);
    axisyPath.lineto(x0 + w, y - h);
    axisyPath.lineto(x0, y - h);
    axisyPath.closepath();
    axisyText.text(x0 + 1, y, valueStr);

    // Pay attention to the order to avoid text being overlapped
    return [crossPath, axisxPath, axisxText, axisyPath, axisyText]
  }

  updateState(state: object) {
    let referCursorSegs: Seg[] = []
    if (this.isReferCuroseVisible) {
      const time = this.xcontrol.tr(this.xcontrol.referCursorRow)
      if (this.xcontrol.exists(time)) {
        const b = this.xcontrol.bt(time)

        if (b >= 1 && b <= this.xcontrol.nBars) {

          const cursorX = this.xcontrol.xr(this.xcontrol.referCursorRow)
          const value = this.tvar.getByTime(time).value;
          const cursorY = this.ycontrol.yv(value)

          referCursorSegs = this.plotCursor(cursorX, cursorY, time, value, '#00F0F0')
        }
      }
    }

    this.setState({ ...state, referCursorSegs })
  }

  handleMouseMove(e: React.MouseEvent) {
    const targetRect = e.currentTarget.getBoundingClientRect();
    const x = e.pageX - targetRect.left;
    const y = e.pageY - targetRect.top;

    const time = this.xcontrol.tx(x);

    // align x to bar center
    const b = this.xcontrol.bx(x);
    const cursorX = this.xcontrol.xb(b)

    let value: number;
    let cursorY: number
    if (y >= this.height - ChartView.AXISX_HEIGHT && this.xcontrol.exists(time)) {
      // enter axis-x area
      value = this.tvar.getByTime(time).value;
      cursorY = this.ycontrol.yv(value)

    } else {
      value = this.ycontrol.vy(y);
      cursorY = y;
    }

    // draw mouse cursor only when not in the axis-y area
    if (x < this.width - ChartView.AXISY_WIDTH) {
      const mouseCursorSegs = this.plotCursor(cursorX, cursorY, time, value, '#00F000')

      this.updateState({ mouseCursorSegs })

    } else {
      this.updateState({ mouseCursorSegs: [] })
    }
  }

  handleMouseLeave() {
    this.updateState({ mouseCursorSegs: [] })
  }

  handleMouseDown(e: React.MouseEvent) {
    if (e.ctrlKey) {
      // will select chart on pane

    } else {
      // set refer cursor
      const targetRect = e.currentTarget.getBoundingClientRect();
      const x = e.pageX - targetRect.left;
      const y = e.pageY - targetRect.top;

      const time = this.xcontrol.tx(x);
      if (!this.xcontrol.exists(time)) {
        return;
      }

      // align x to bar center
      const b = this.xcontrol.bx(x);

      // draw refer cursor only when not in the axis-y area
      if (x < this.width - ChartView.AXISY_WIDTH) {
        if (
          y >= ChartView.TITLE_HEIGHT_PER_LINE && y <= this.height &&
          b >= 1 && b <= this.xcontrol.nBars
        ) {
          const row = this.xcontrol.rb(b)
          this.xcontrol.setReferCursorByRow(row, true)
          this.isReferCuroseVisible = true;
          this.updateState({});
        }
      }
    }
  }

  handleWheel(e: React.WheelEvent) {
    const fastSteps = Math.floor(this.xcontrol.nBars * 0.168)
    const delta = Math.round(e.deltaY / this.xcontrol.nBars);
    console.log(e, delta)

    if (e.shiftKey) {
      /** zoom in / zoom out */
      this.xcontrol.growWBar(delta)

    } else if (e.ctrlKey) {
      if (!this.isInteractive) {
        return
      }

      const unitsToScroll = this.xcontrol.isCursorAccelerated ? delta * fastSteps : delta;
      /** move refer cursor left / right */
      this.xcontrol.scrollReferCursor(unitsToScroll, true)

    } else {
      if (!this.isInteractive) {
        return
      }

      const unitsToScroll = this.xcontrol.isCursorAccelerated ? delta * fastSteps : delta;
      /** keep referCursor stay same x in screen, and move */
      this.xcontrol.scrollChartsHorizontallyByBar(unitsToScroll)
    }

    if (!this.xcontrol.referCursorRow) {
      this.xcontrol.referCursorRow = 0;
    }

    const { chartSegs, axisxSegs, axisySegs } = this.plot();

    this.updateState({ chartSegs, axisxSegs, axisySegs, mouseCursorSegs: [] })
  }

  handleKeyDown(e: React.KeyboardEvent) {
    const fastSteps = Math.floor(this.xcontrol.nBars * 0.168)

    switch (e.key) {
      case "ArrowLeft":
        if (e.ctrlKey) {
          this.#moveCursorInDirection(fastSteps, -1)
        } else {
          this.#moveChartsInDirection(fastSteps, -1)
        }
        break;

      case "ArrowRight":
        if (e.ctrlKey) {
          this.#moveCursorInDirection(fastSteps, 1)
        } else {
          this.#moveChartsInDirection(fastSteps, 1)
        }
        break;

      case "ArrowUp":
        if (!e.ctrlKey) {
          this.xcontrol.growWBar(1)
        }
        break;

      case "ArrowDown":
        if (!e.ctrlKey) {
          this.xcontrol.growWBar(-1);
        }
        break;

      default:
    }

    const { chartSegs, axisxSegs, axisySegs } = this.plot();
    this.updateState({ chartSegs, axisxSegs, axisySegs, mouseCursorSegs: [] })
  }

  #moveCursorInDirection(fastSteps: number, DIRECTION: number) {
    const steps = (this.xcontrol.isCursorAccelerated ? fastSteps : 1) * DIRECTION

    this.xcontrol.scrollReferCursor(steps, true)
  }

  #moveChartsInDirection(fastSteps: number, DIRECTION: number) {
    const steps = (this.xcontrol.isCursorAccelerated ? fastSteps : 1) * DIRECTION

    this.xcontrol.scrollChartsHorizontallyByBar(steps)
  }

  handleKeyUp(e: React.KeyboardEvent) {
    switch (e.key) {
      case " ":
        this.xcontrol.isCursorAccelerated = !this.xcontrol.isCursorAccelerated
        break;

      case "Escape":
        this.isReferCuroseVisible = false;
        this.updateState({})
        break;

      default:
    }
  }

  render() {
    return (
      // onKeyDown/onKeyUp etc upon <div/> should combine tabIndex={0} to work correctly.
      <div className="container" style={{ width: this.width + 'px', height: this.height + 'px' }} >

        <div style={{ width: this.width + 'px', height: this.height + 'px', position: "absolute", }}
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
            {this.state.chartSegs.map(seg => seg.render())}
            {this.state.axisxSegs.map(seg => seg.render())}
            {this.state.axisySegs.map(seg => seg.render())}
            {this.state.mouseCursorSegs.map(seg => seg.render())}
            {this.state.referCursorSegs.map(seg => seg.render())}
          </svg>
        </div>
      </div>
    )
  }
}

