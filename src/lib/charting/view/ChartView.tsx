import { TVal } from "../../timeseris/TVal";
import { type BaseTSer } from "../../timeseris/BaseTSer";
import { type TSer } from "../../timeseris/TSer";
import { TVar } from "../../timeseris/TVar";
import { Chart } from "../chart/Chart";
import { Pane } from "../pane/Pane";
import { ChartXControl } from "./ChartXControl";
import { ChartYControl } from "./ChartYControl";
import { Component, type JSX } from "react";
import { ChartViewContainer } from "./ChartViewContainer";
import { type Scalar } from "./scalar/Scalar";
import { Path } from "../../svg/Path";
import { Text } from "../../svg/Text";
import { Temporal } from "temporal-polyfill";
import { TUnit } from "../../timeseris/TUnit";
import { COMMON_DECIMAL_FORMAT } from "./Format";

export type ChartParts = {
  chart: JSX.Element,
  axisx?: JSX.Element,
  axisy: JSX.Element
}

export interface ViewProps {
  baseSer: BaseTSer;
  tvar: TVar<TVal>;
  width: number;
  height: number;
  isQuote: boolean;
}

export interface ViewState {

  width: number;
  height: number;

  isQuote: false;
  hasInnerVolume: false;
  maxVolume?: number;
  minVolume?: number;

  maxValue: 1.0
  minValue: 0.0

  isInteractive: true
  isPinned: false

  chart: JSX.Element;
  axisx: JSX.Element;
  axisy: JSX.Element;

  mouseCursor: JSX.Element
  referCursor: JSX.Element
}

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
export abstract class ChartView<P extends ViewProps, S extends ViewState> extends Component<P, S> {

  static readonly AXISX_HEIGHT = 16
  static readonly AXISY_WIDTH = 50
  static readonly CONTROL_HEIGHT = 12
  static readonly TITLE_HEIGHT_PER_LINE = 12

  readonly xc: ChartXControl;
  readonly yc: ChartYControl;
  baseSer: TSer;

  tvar: TVar<TVal>;

  //readonly glassPane = new GlassPane(this, this.mainChartPane)
  //readonly axisXPane = new AxisXPane(this, this.mainChartPane)
  //readonly axisYPane = new AxisYPane(this, this.mainChartPane)
  //readonly divisionPane = new DivisionPane(this, this.mainChartPane)

  constructor(props: P) {
    super(props)

    this.xc = new ChartXControl(props.baseSer, props.width - ChartView.AXISY_WIDTH);
    this.yc = new ChartYControl(props.baseSer, props.height - ChartView.AXISX_HEIGHT);

    this.baseSer = props.baseSer;
    this.tvar = props.tvar;

    this.#createBasisComponents();

    this.initComponents();
    this.putChartsOfMainSer();
  }

  protected readonly overlappingSerChartToVars = new Map<TSer, Map<Chart, Set<TVar<TVal>>>>()

  readonly mainSerChartToVars = new Map<Chart, Set<TVar<TVal>>>()

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

  width: number;
  height: number;

  isQuote = false;
  hasInnerVolume = false;
  maxVolume?: number;
  minVolume?: number;

  maxValue = 1.0
  minValue = 0.0

  isReferCuroseVisible = false
  isMouseCuroseVisible = false
  isInteractive = true

  #isPinned = false

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
    // compute x first;
    this.xc.computeGeometry();

    this.computeMaxMin();

    // compute y after compute maxmin
    this.yc.computeGeometry(this.maxValue, this.minValue)
  }

  protected setMaxMinValue(max: number, min: number) {
    this.maxValue = max;
    this.minValue = min;
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

  chartToVarsOf(ser: TSer): Map<Chart, Set<TVar<TVal>>> | undefined {
    //assert(ser != null, "Do not pass me a null ser!")
    //let x = this.overlappingSerChartToVars.get(ser);
    return ser === this.baseSer ? this.mainSerChartToVars : this.overlappingSerChartToVars.get(ser);
  }

  overlappingSers() {
    return this.overlappingSerChartToVars.keys();
  }

  allSers() {
    const _allSers = new Set<TSer>()

    _allSers.add(this.baseSer);
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
    this.maxValue = 1;
    this.minValue = 0;
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

  abstract plot(): ChartParts;

  valueAtTime(time: number) {
    return this.tvar.getByTime(time).value;
  }

  plotCursor(x: number, y: number, time: number, value: number, color: string) {
    const w = 12 * 4; // annotation width
    const h = 12;     // annotation height

    const crossPath = new Path(0, 0, color);
    const axisxText = new Text(0, this.height - ChartView.AXISX_HEIGHT, '#000000')
    const axisxPath = new Path(0, this.height - ChartView.AXISX_HEIGHT, color, color);
    const axisyText = new Text(this.width - ChartView.AXISY_WIDTH, 0, '#000000')
    const axisyPath = new Path(this.width - ChartView.AXISY_WIDTH, 0, color, color)

    const timeZone = this.xc.baseSer.timeZone;
    const dt = new Temporal.ZonedDateTime(BigInt(time) * TUnit.NANO_PER_MILLI, timeZone);
    const dtStr = this.xc.baseSer.freq.unit.formatNormalDate(dt, timeZone)

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
    const segs = [crossPath, axisxPath, axisxText, axisyPath, axisyText]

    return (
      <>
        {segs.map(seg => seg.render())}
      </>
    )
  }

  updateState(state: object) {
    let referCursor = <></>
    let mouseCursor = <></>
    if (this.isReferCuroseVisible) {
      const time = this.xc.tr(this.xc.referCursorRow)
      if (this.xc.exists(time)) {
        const b = this.xc.bt(time)

        if (b >= 1 && b <= this.xc.nBars) {

          const cursorX = this.xc.xr(this.xc.referCursorRow)
          const value = this.valueAtTime(time);
          const cursorY = this.yc.yv(value)

          referCursor = this.plotCursor(cursorX, cursorY, time, value, '#00F0F0')
        }
      }
    }

    if (this.isMouseCuroseVisible) {
      const time = this.xc.tr(this.xc.mouseCursorRow)
      const cursorX = this.xc.xr(this.xc.mouseCursorRow)
      const value = this.xc.mouseCursorValue;
      const cursorY = this.xc.mouseCursorY;

      mouseCursor = this.plotCursor(cursorX, cursorY, time, value, '#00F000')
    }

    this.setState({ ...state, referCursor, mouseCursor })
  }

  handleMouseLeave() {
    this.isMouseCuroseVisible = false;
    this.updateState({})
  }

  handleMouseMove(e: React.MouseEvent) {
    const targetRect = e.currentTarget.getBoundingClientRect();
    const x = e.pageX - targetRect.left;
    const y = e.pageY - targetRect.top;

    const time = this.xc.tx(x);

    // align x to bar center
    const b = this.xc.bx(x);
    const cursorX = this.xc.xb(b)

    let value: number;
    let cursorY: number
    if (y >= this.height - ChartView.AXISX_HEIGHT && this.xc.exists(time)) {
      // enter axis-x area
      value = this.valueAtTime(time)
      cursorY = this.yc.yv(value)

    } else {
      value = this.yc.vy(y);
      cursorY = y;
    }

    // draw mouse cursor only when not in the axis-y area
    if (x < this.width - ChartView.AXISY_WIDTH) {
      const row = this.xc.rb(b)
      this.xc.setMouseCursorByRow(row, value, cursorY)
      this.isMouseCuroseVisible = true
      this.updateState({})

    } else {
      this.isMouseCuroseVisible = false;
      this.updateState({})
    }
  }

  handleMouseDown(e: React.MouseEvent) {
    if (e.ctrlKey) {
      // will select chart on pane

    } else {
      // set refer cursor
      const targetRect = e.currentTarget.getBoundingClientRect();
      const x = e.pageX - targetRect.left;
      const y = e.pageY - targetRect.top;

      const time = this.xc.tx(x);
      if (!this.xc.exists(time)) {
        return;
      }

      // align x to bar center
      const b = this.xc.bx(x);

      // draw refer cursor only when not in the axis-y area
      if (x < this.width - ChartView.AXISY_WIDTH) {
        if (
          y >= ChartView.TITLE_HEIGHT_PER_LINE && y <= this.height &&
          b >= 1 && b <= this.xc.nBars
        ) {
          const row = this.xc.rb(b)
          this.xc.setReferCursorByRow(row, true)
          this.isReferCuroseVisible = true;
          this.updateState({});
        }
      }
    }
  }

  handleWheel(e: React.WheelEvent) {
    const fastSteps = Math.floor(this.xc.nBars * 0.168)
    const delta = Math.round(e.deltaY / this.xc.nBars);
    console.log(e, delta)

    if (e.shiftKey) {
      // zoom in / zoom out 
      this.xc.growWBar(delta)

    } else if (e.ctrlKey) {
      if (!this.isInteractive) {
        return
      }

      const unitsToScroll = this.xc.isCursorAccelerated ? delta * fastSteps : delta;
      // move refer cursor left / right 
      this.xc.scrollReferCursor(unitsToScroll, true)

    } else {
      if (!this.isInteractive) {
        return
      }

      const unitsToScroll = this.xc.isCursorAccelerated ? delta * fastSteps : delta;
      // keep referCursor stay same x in screen, and move
      this.xc.scrollChartsHorizontallyByBar(unitsToScroll)
    }

    if (!this.xc.referCursorRow) {
      this.xc.referCursorRow = 0;
    }

    const { chart, axisx, axisy } = this.plot();

    this.updateState({ chart, axisx, axisy, mouseCursor: <></> })
  }

  handleKeyDown(e: React.KeyboardEvent) {
    const fastSteps = Math.floor(this.xc.nBars * 0.168)

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
          this.xc.growWBar(1)
        }
        break;

      case "ArrowDown":
        if (!e.ctrlKey) {
          this.xc.growWBar(-1);
        }
        break;

      default:
    }

    const { chart, axisx, axisy } = this.plot();
    this.updateState({ chart, axisx, axisy, mouseCursor: <></> })
  }

  #moveCursorInDirection(fastSteps: number, DIRECTION: number) {
    const steps = (this.xc.isCursorAccelerated ? fastSteps : 1) * DIRECTION

    this.xc.scrollReferCursor(steps, true)
  }

  #moveChartsInDirection(fastSteps: number, DIRECTION: number) {
    const steps = (this.xc.isCursorAccelerated ? fastSteps : 1) * DIRECTION

    this.xc.scrollChartsHorizontallyByBar(steps)
  }

  handleKeyUp(e: React.KeyboardEvent) {
    switch (e.key) {
      case " ":
        this.xc.isCursorAccelerated = !this.xc.isCursorAccelerated
        break;

      case "Escape":
        this.isReferCuroseVisible = false;
        this.updateState({})
        break;

      default:
    }
  }

}


