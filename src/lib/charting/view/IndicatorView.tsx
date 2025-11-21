import QuoteChart from "../chart/QuoteChart"
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
import VolmueChart from "../chart/VolumeChart";

export class IndicatorView extends ChartView<ViewProps, ViewState> {
  quoteVar: TVar<Quote>;
  maxVolume = 0.0;
  minVolume = 0.0

  constructor(props: ViewProps) {
    super(props);

    this.quoteVar = props.tvar as TVar<Quote>;
    this.width = props.width;
    this.height = props.height;
    this.isQuote = props.isQuote;

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
      axisx: <></>,
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

    const chart = VolmueChart({
      quoteVar: this.quoteVar,
      ycontrol: this.ycontrol,
      xcontrol: this.xcontrol,
      depth: 0
    });

    const axisy = AxisY({
      x: this.width - ChartView.AXISY_WIDTH,
      y: 0,
      width: ChartView.AXISY_WIDTH,
      height: this.height - ChartView.AXISX_HEIGHT,
      xcontrol: this.xcontrol,
      ycontrol: this.ycontrol,
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
    while (i <= this.xcontrol.nBars) {
      const time = this.xcontrol.tb(i)
      if (this.xcontrol.exists(time)) {
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
    switch (this.ycontrol.valueScalar.kind) {
      case LINEAR_SCALAR.kind:
        this.ycontrol.valueScalar = LG_SCALAR;
        break;

      default:
        this.ycontrol.valueScalar = LINEAR_SCALAR;
    }
  }

  override valueAtTime(time: number) {
    return this.quoteVar.getByTime(time).volume //value;
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
          {this.state.axisy}
          {this.state.mouseCursor}
          {this.state.referCursor}
        </svg>
      </div>
    )
  }
}

