import { TVal } from "../../timeseris/TVal";
import type { BaseTSer } from "../../timeseris/BaseTSer";
import type { TSer } from "../../timeseris/TSer";
import { TVar } from "../../timeseris/TVar";
import { Chart } from "../chart/Chart";
import { Pane } from "../pane/Pane";
import { ChartControl } from "./ChartControl";
import type { Scalar } from "./scalar/Scalar";
import { ChartPane } from "../pane/ChartPane";

/**
 * A ChartView's container can be any Component even without a ChartViewContainer,
 * but should reference back to a control. All ChartViews shares the same
 * control will have the same cursor behaves.
 *
 * Example: you can add a ChartView directly to a JFrame.
 *
 * baseSer: the ser instaceof BaseTSer, with the calendar time feature,
 *            it's put in the masterView to control the cursor;
 * mainSer: vs overlappingSer, this view's main ser.
 *
 *       1..n           1..n
 * ser --------> chart ------> var
 *
 *
 * ChangeSubject cases:
 *   rightSideRow
 *   referCursorRow
 *   wBar
 *   onCalendarMode
 */
export abstract class ChartView {
  static readonly AXISX_HEIGHT = 16
  static readonly AXISY_WIDTH = 50
  static readonly CONTROL_HEIGHT = 12
  static readonly TITLE_HEIGHT_PER_LINE = 12

  drawLine(): SVGPathElement {
    return document.createElementNS("http://www.w3.org/2000/svg", "path");
  }

  control: ChartControl;
  mainSer?: TSer;

  width: number;
  height: number;

  isQuote = false;

  protected readonly overlappingSerChartToVars = new Map<TSer, Map<Chart, Set<TVar<TVal>>>>()

  readonly mainSerChartToVars = new Map<Chart, Set<TVar<TVal>>>()

  readonly mainChartPane: ChartPane;
  //readonly glassPane = new GlassPane(this, this.mainChartPane)
  //readonly axisXPane = new AxisXPane(this, this.mainChartPane)
  //readonly axisYPane = new AxisYPane(this, this.mainChartPane)
  //readonly divisionPane = new DivisionPane(this, this.mainChartPane)

  constructor(control: ChartControl, mainSer: TSer) {
    this.control = control
    this.mainSer = mainSer
    this.#baseSer = control.baseSer

    this.#createBasisComponents();

    this.initComponents();
    this.putChartsOfMainSer()

    this.mainChartPane = new ChartPane(this);

    //listenTo(this._mainSer);

    /** @TODO should consider: in case of overlapping indciators, how to avoid multiple repaint() */
  }



  //   const mainLayeredPane = new JLayeredPane {
  //     /** this will let the pane components getting the proper size when init */
  //     override protected def paintComponent(g: Graphics) {
  //       val width = getWidth
  //       val height = getHeight
  //       for (c <- getComponents if c.isInstanceOf[Pane]) {
  //         c.setBounds(0, 0, width, height)
  //       }
  //     }
  //   }

  // x-control pane, may be <code>null</code>
  //xControlPane?: XControlPane;
  // y-control pane, may be <code>null</code>
  yControlPane?: Pane; //YControlPane;

  /** geometry */
  #nBars = 0 // number of bars
  #maxValue = 1.0
  #minValue = 0.0
  #oldMaxValue = this.#maxValue
  #oldMinValue = this.#minValue

  #isInteractive = true
  #isPinned = false

  #baseSer?: BaseTSer;
  #lastDepthOfOverlappingChart = 0; // Pane.DEPTH_CHART_BEGIN

  protected abstract initComponents(): void;

  #createBasisComponents() {

    /**
     * !NOTICE
     * To make background works, should keep three conditions:
     * 1. It should be a JPanel instead of a JComponent(which may have no background);
     * 2. It should be opaque;
     * 3. If override paintComponent(g0), should call super.paintComponent(g0) ?
     */
    // setOpaque(true);

    // this.mainLayeredPane.setPreferredSize(new Dimension(10, (10 - 10 / 6.18).toInt))
    // this.mainLayeredPane.add(mainChartPane, JLayeredPane.DEFAULT_LAYER)

    // this.glassPane.setPreferredSize(new Dimension(10, (10 - 10 / 6.18).toInt))

    // this.axisXPane.setPreferredSize(new Dimension(10, AXISX_HEIGHT))
    // this.axisYPane.setPreferredSize(new Dimension(AXISY_WIDTH, 10))
    // this.divisionPane.setPreferredSize(new Dimension(10, 1))
  }

  /**
   * The paintComponent() method will always be called automatically whenever
   * the component need to be reconstructed as it is a JComponent.
   */
  protected paintComponent() {
    this.prePaintComponent()

    // if (isOpaque) {
    //   /**
    //    * Process background by self,
    //    *
    //    * @NOTICE
    //    * don't forget to setBackgroud() to keep this component's properties consistent
    //    */
    //   setBackground(LookFeel().backgroundColor)
    //   g.setColor(getBackground)
    //   g.fillRect(0, 0, getWidth, getHeight)
    // }

    /**
     * @NOTICE:
     * if we call:
     *   super.paintComponent(g);
     * here, this.paintComponent(g) will be called three times!!!, the reason
     * may be that isOpaque() == true
     */
    this.postPaintComponent()
  }

  protected prePaintComponent() {
    this.computeGeometry()

    this.mainChartPane.computeGeometry()
  }

  /**
   * what may affect the geometry:
   * 1. the size of this component changed;
   * 2. the rightCursorRow changed;
   * 3. the ser's value changed or its items added, which need computeMaxMin();
   *
   * The control only define wBar (the width of each bar), this component
   * will compute number of bars according to its size. So, if you want to more
   * bars displayed, such as an appointed newNBars, you should compute the size of
   * this's container, and call container.setBounds() to proper size, then, the
   * layout manager will layout the size of its ChartView instances automatically,
   * and if success, the newNBars computed here will equals the newNBars you want.
   */
  protected computeGeometry() {
    /**
     * @Note
     * 1.Should get wBar firstly, then calculator nBars
     * 2.Get this view's width to compute nBars instead of mainChartPane's
     * width, because other panes may be repainted before mainChartPane is
     * properly layouted (the width of mainChartPane is still not good)
     */
    const nBars1 = this.control.isFixedNBars() ?
      this.control.fixedNBars :
      Math.floor(this.wChart() / this.control.wBar())

    /** avoid nBars == 0 */
    this.nBars = Math.max(nBars1, 1)

    if (this.control.isFixedLeftSideTime) {
      this.control.setLeftSideRowByTime(this.control.fixedLeftSideTime, false)
    }

    /**
     * We only need computeMaxMin() once when a this should be repainted,
     * so do it here.
     */
    this.computeMaxMin();
    if (this.#maxValue != this.#oldMaxValue || this.#minValue != this.#oldMinValue) {
      this.#oldMaxValue = this.#maxValue
      this.#oldMinValue = this.#minValue
      //this.notifyChanged(classOf[ChartValidityObserver])
    }
  }

  protected setMaxMinValue(max: number, min: number) {
    this.#maxValue = max;
    this.#minValue = min;
  }

  protected postPaintComponent() {
    /**
     * update controlPane's scrolling thumb position etc.
     *
     * @NOTICE
     * We choose here do update controlPane, because the paint() called in
     * Java Swing is async, we not sure when it will be really called from
     * outside, even in this's container, so here is relative safe place to
     * try, because here means the paint() is truely beging called by awt.
     */
    // if (this.axisXPane != null) {
    //   this.axisXPane.syncWithView
    // }

    // if (this.axisYPane != null) {
    //   this.axisYPane.syncWithView
    // }

    // if (this.xControlPane != null) {
    //   this.xControlPane.syncWithView
    // }

    // if (this.yControlPane != null) {
    //   this.yControlPane.syncWithView
    // }

  }

  get nBars(): number {
    return this.#nBars;
  }
  private set nBars(nBars: number) {
    const oldValue = this.#nBars
    this.#nBars = nBars;
    if (this.#nBars != oldValue) {
      //this.notifyChanged(classOf[ChartValidityObserver])
    }
  }

  // should decide width by this component's width and constant AXISY_WIDTH, since the width of children may not be decided yet.
  wChart(): number {
    return this.width - ChartView.AXISY_WIDTH;
  }

  get isSelected() {
    return false;
    //return this.glassPane.isSelected;
  }
  set isSelected(b: boolean) {
    //this.glassPane.isSelected = b;
  }

  get isInteractive() {
    return this.#isInteractive;
  }
  set isInteractive(b: boolean) {
    //this.glassPane.interactive(b);

    this.#isInteractive = b;
  }

  get isPinned(): boolean {
    return this.#isPinned;
  }
  pin() {
    //this.glassPane.pin(true);

    this.#isPinned = true;
  }

  unPin() {
    //this.glassPane.pin(false);

    this.#isPinned = false;
  }

  get yChartScale() {
    return this.mainChartPane.yChartScale;
  }
  set yChartScale(yChartScale: number) {
    if (this.mainChartPane != null) {
      const datumPane = this.mainChartPane
      datumPane.yChartScale = yChartScale
    }

    //repaint()
  }

  valueScalar(valueScalar: Scalar) {
    if (this.mainChartPane != null) {
      const datumPane = this.mainChartPane
      datumPane.valueScalar = valueScalar
    }

    //repaint()
  }

  adjustYChartScale(increment: number) {
    if (this.mainChartPane != null) {
      const datumPane = this.mainChartPane
      datumPane.growYChartScale(increment)
    }

    //repaint()
  }

  yChartScaleByCanvasValueRange(canvasValueRange: number) {
    if (this.mainChartPane != null) {
      const datumPane = this.mainChartPane
      datumPane.yChartScaleByCanvasValueRange(canvasValueRange)
    }

    //repaint()
  }

  scrollChartsVerticallyByPixel(increment: number) {
    const datumPane = this.mainChartPane
    if (datumPane != null) {
      datumPane.scrollChartsVerticallyByPixel(increment)
    }

    //repaint()
  }

  /**
   * barIndex -> time
   *
   * @param barIndex, index of bars, start from 1 and to nBars
   * @return time
   */
  tb(barIndex: number): number {
    return this.#baseSer.timeOfRow(this.rb(barIndex));
  }

  rb(barIndex: number): number {
    /** when barIndex equals it's max: nBars, row should equals rightTimeRow */
    return this.control.rightSideRow - this.#nBars + barIndex;
  }

  /**
   * time -> barIndex
   *
   * @param time
   * @return index of bars, start from 1 and to nBars
   */
  bt(time: number): number {
    return this.br(this.#baseSer.rowOfTime(time))
  }

  br(row: number): number {
    return row - this.control.rightSideRow + this.#nBars
  }

  get maxValue() {
    return this.#maxValue;
  }
  get minValue(): number {
    return this.#minValue;
  }


  get baseSer(): BaseTSer {
    return this.#baseSer;
  }


  chartToVarsOf(ser: TSer): Map<Chart, Set<TVar<TVal>>> | undefined {
    //assert(ser != null, "Do not pass me a null ser!")
    //let x = this.overlappingSerChartToVars.get(ser);
    return ser === this.mainSer ? this.mainSerChartToVars : this.overlappingSerChartToVars.get(ser);
  }

  overlappingSers() {
    return this.overlappingSerChartToVars.keys();
  }

  allSers() {
    const _allSers = new Set<TSer>()

    _allSers.add(this.mainSer);
    for (const s of this.overlappingSers()) {
      _allSers.add(s);
    }

    return _allSers
  }

  popupToDesktop() {
  }

  // addOverlappingCharts(ser: TSer) {
  //   this.listenTo(ser)

  //   let chartToVars = this.overlappingSerChartToVars.get(ser)
  //   if (chartToVars === undefined) {
  //     chartToVars = new Map<Chart, Set<TVar<unknown>>>()
  //     this.overlappingSerChartToVars.set(ser, chartToVars)
  //   }

  //   let depthGradient = Pane.DEPTH_GRADIENT_BEGIN

  //   for (let [k, v] of ser.vars if v.plot != Plot.None) {
  //     const chart = if (v.plot == Plot.Signal && baseSer instanceOf QuoteSer) {
  //       const qser = baseSer.asInstanceOf[QuoteSer]
  //       ChartFactory.createVarChart(v, qser.high, qser.low)

  //     } else if (v.plot === Plot.Info) {
  //       ChartFactory.createVarChart(v, ser.vars : _ *)

  //     } else {
  //       ChartFactory.createVarChart(v)
  //     }

  //     if (chart != null) {
  //       let vars = chartToVars.get(chart);
  //       if (vars === undefined) {
  //         vars = new Set<TVar<unknown>>()
  //         chartToVars.set(chart, vars)
  //       }
  //       vars.add(v);

  //       switch (chart.tag) {
  //         case "GradientChart":
  //           chart.depth = depthGradient; depthGradient--
  //           break;
  //         case "ProfileChart":
  //           chart.depth = depthGradient; depthGradient--
  //           break;
  //         case "StickChart":
  //           chart.depth = -8
  //           break;
  //         default:
  //           chart.depth = this.#lastDepthOfOverlappingChart;
  //           this.#lastDepthOfOverlappingChart++;
  //       }

  //       chart.set(this.mainChartPane, ser)
  //       this.mainChartPane.putChart(chart)
  //     }
  //   }

  //   notifyChanged(classOf[ChartValidityObserver])

  //   repaint()
  // }

  // removeOverlappingCharts(ser: TSer) {
  //   deafTo(ser)

  //   const chartToVars = this.overlappingSerChartToVars.get(ser) ?? new Map<Chart, Set<TVar<unknown>>>();
  //   chartToVars.forEach(
  //     chartToVars => {
  //       for (let chart of chartToVars.keys()) {
  //         mainChartPane.removeChart(chart)
  //         switch (chart.tag) {
  //           case "GradientChart": /** noop */
  //           case "ProfileChart": /** noop */
  //           case "StickChart": /** noop */
  //             break;
  //           default:
  //             this.#lastDepthOfOverlappingChart--
  //         }
  //       }
  //       /** release chartToVars */
  //       chartToVars.clear
  //       overlappingSerChartToVars.remove(ser)
  //     }
  //   )

  //   notifyChanged(classOf[ChartValidityObserver])

  //   repaint()
  // }

  computeMaxMin() {
    /** if don't need maxValue/minValue, don't let them all equal 0, just set them to 1 and 0 */
    this.#maxValue = 1;
    this.#minValue = 0;
  }

  protected abstract putChartsOfMainSer(): void

  /** this method only process FinishedComputing event, if you want more, do it in subclass */
  // protected updateView(evt: TSerEvent) {
  //   switch (evt) {
  //     case TSerEvent.Computed(_, _, _, _, _, _):
  //       switch (this) {
  //         case drawPane: WithDrawingPane:
  //           const drawing = drawPane.selectedDrawing
  //           if (drawing !== undefined && drawing.isInDrawing) {
  //             return
  //           }
  //           break;
  //         default:
  //       }

  //       notifyChanged(classOf[ChartValidityObserver])

  //       // repaint this chart view
  //       repaint();
  //       break;
  //     default:
  //   }
  // }

  //   @throws(classOf[Throwable])
  //   override protected def finalize {
  //     deafTo(_mainSer)
  //     super.finalize
  //   }
}


