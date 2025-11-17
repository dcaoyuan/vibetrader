import { Chart } from "../chart/Chart";
import { ChartView } from "../view/ChartView"
import type { DatumPlane } from "./DatumPlane"
import { CursorChart } from "../chart/CursorChart";

export abstract class Pane {
  static readonly DEPTH_FRONT = 1000
  /** usually for quote chart, so charts of other indicatos can begin from 0: */
  static readonly DEPTH_DEFAULT = -1
  static readonly DEPTH_CHART_BEGIN = 0
  /** usually for drawing chart, it will be in front: */
  static readonly DEPTH_DRAWING = 100
  static readonly DEPTH_GRADIENT_BEGIN = -10
  static readonly DEPTH_INVISIBLE = -100


  readonly view: ChartView;
  readonly datumPlane: DatumPlane;

  constructor(view: ChartView, datumPlane: DatumPlane) {
    this.view = view;
    this.datumPlane = datumPlane;

    if (this.datumPlane === undefined) {
      /** if a null datumPlane given, we assume it will be just me, such as a ChartPane */
      //assert(this instanceof DatumPlane, "A null datumPlane given, the datumPlane should be myself!")
      this.datumPlane = this as unknown as DatumPlane;
    }

    // if (this.isInstanceOf<WithCursorChart>) {
    //   createCursorChart(this.datumPlane)
    //   view.control.addObserver(this, new MouseCursorObserver {
    //     val updater: Updater = {
    //       case _: ChartControl =>
    //       paintChartOnXORMode(mouseCursorChart)
    //     }
    //   })
    // }
  }

  width: number;
  height: number;

  private _referCursorValue = 0.0
  private _isAutoReferCursorValue = true
  private _charts = new Set<Chart>
  private referCursorChart?: CursorChart;
  private mouseCursorChart?: CursorChart;

  /** helper method for implementing WithCursorChart */
  // private createCursorChart(datumPlane: DatumPlane) {
  //   if (!(this instanceof WithCursorChart)) {
  //     //assert(false, "Only WithCursorChart supports this method!")
  //     return
  //   }

  //   /** create refer cursor chart */
  //   this.referCursorChart = new CursorChart {

  //   } //this.asInstanceOf<WithCursorChart>.createCursorChartInstance(datumPlane)
  //   this.referCursorChart.setType(CursorChart.Type.Refer)
  //   this.referCursorChart.set(datumPlane, view.control.baseSer, Pane.DEPTH_DEFAULT - 1)

  //   /** create mouse cursor chart */
  //   this.mouseCursorChart = this.asInstanceOf<WithCursorChart>.createCursorChartInstance(datumPlane)
  //   this.mouseCursorChart.setType(CursorChart.Type.Mouse)
  //   this.mouseCursorChart.set(datumPlane, view.control.baseSer, Pane.DEPTH_FRONT)

  //   this.referCursorChart.isFirstPlotting = true
  //   this.mouseCursorChart.isFirstPlotting = true
  // }

  /**
   * @NOTICE
   * Should reset: chart.setFirstPlotting(true) when ever repaint() or
   * paint() happened.
   *
   * @param chart, chart to be plot and paint
   * @see #postPaintComponent()
   */
  // protected paintChartOnXORMode(chart: Chart) {
  //   const g = getGraphics()
  //   if (g !== undefined) {
  //     try {
  //       g.setXORMode(getBackground)

  //       if (chart.isFirstPlotting) {
  //         chart.isFirstPlotting = false
  //       } else {
  //         /** erase previous drawing */
  //         chart.render(g)
  //       }
  //       /** current new drawing */
  //       chart.plot()
  //       chart.render(g)

  //       /** restore to paintMode */
  //       g.setPaintMode
  //     } finally {
  //       g.dispose
  //     }
  //   }
  // }

  // protected paintComponent() {
  //   this.prePaintComponent()

  //   this.render(g)

  //   this.postPaintComponent()
  // }

  protected prePaintComponent() {
    //assert(this.datumPlane !== undefined, "datumPlane can not be null!");
    /**
     * @NOTICE
     * The repaint order in Java Swing is not certain, the axisXPane and
     * axisYPane etc may be painted earlier than datumPlane, that will cause
     * incorrect geometry for axisXPane and axisYPane, for example: the
     * maxValue and minValue changed, but the datumPlane's computeGeometry()
     * is still not been called yet. Although we can let datumPlane aware of
     * all of the changes that may affect geometry, but the simplest way is
     * just ask the Objects that depend on datumPlane and may be painted
     * earlier than datumPlane, call datumPlane.computeGeomtry() first.
     */
    this.datumPlane.computeGeometry()
  }

  // protected postPaintComponent() {
  //   if (this instanceof WithCursorChart) {
  //     this.referCursorChart.isFirstPlotting = true
  //     this.mouseCursorChart.isFirstPlotting = true
  //   }
  // }

  // private processUserRenderOptions(g0: Graphics) {
  //   const g = g0.asInstanceOf<Graphics2D>

  //   if (isOpaque) {
  //     /**
  //      * Process background by self,
  //      *
  //      * @NOTICE
  //      * don't forget to setBackgroud() to keep this component's properties consistent
  //      */
  //     setBackground(Theme.now().backgroundColor)
  //     g.setColor(getBackground)
  //     g.fillRect(0, 0, getWidth, getHeight)
  //   }

  //   setFont(Theme.now().axisFont)
  //   g.setFont(getFont())
  // }

  /**
   * @NOTICE
   * charts should be set() here only, because this method will be called in
   * paintComponent() after fetching some very important parameters which will
   * be used by charts' plotting;
   */
  // private render(g0: Graphics) {
  //   const g = g0.asInstanceOf<Graphics2D>

  //   processUserRenderOptions(g)

  //   /** plot and render segments added by plotMore() */
  //   this.widgets.length = 0;
  //   this.plotPane()
  //   for (let widget of this.widgets) {
  //     widget.render(g);
  //   }

  //   /** plot and render charts that have been put */
  //   for (let chart of this._charts) {
  //     chart.plot()
  //     chart.render()
  //   }

  //   /** plot and render refer cursor chart */
  //   if (this instanceof WithCursorChart) {
  //     this.referCursorChart.plot()
  //     this.referCursorChart.render(g)
  //   }
  // }

  protected charts(): Set<Chart> {
    return this._charts;
  }

  putChart(chart: Chart) {
    this._charts.add(chart)
  }

  containsChart(chart: Chart): boolean {
    return this._charts.has(chart)
  }

  removeChart(chart: Chart) {
    this._charts.delete(chart)
  }

  get referCursorValue() {
    return this._referCursorValue;
  }
  set referCursorValue(referCursorValue: number) {
    this._referCursorValue = referCursorValue;
  }


  get isAutoReferCursorValue(): boolean {
    return this._isAutoReferCursorValue;
  }
  set isAutoReferCursorValue(b: boolean) {
    this._isAutoReferCursorValue = b
  }

  // chartAt(x: number, y: number): Chart {
  //   for (let chart of this._charts) {
  //     if (chart instanceof CursorChart) {
  //     } else if (chart.hits(x, y)) {
  //       return chart
  //     }
  //   }
  //   return undefined
  // }

  isCursorCrossVisible(): boolean {
    return this.view.xcontrol.isCursorCrossVisible
  }

  /*- @RESERVER
   * MouseEvent retargetedEvent = new MouseEvent(target,
   *   e.getID(),
   *   e.getWhen(),
   *   e.getModifiers() | e.getModifiersEx(),
   *   e.getX(),
   *   e.getY(),
   *   e.getClickCount(),
   *   e.isPopupTrigger());
   *
   * Helper method
   */
  // protected forwardMouseEvent(source: Component, target: Component, e: MouseEvent) {
  //   if (target !== undefined && target.isVisible) {
  //     const retargetedEvent = SwingUtilities.convertMouseEvent(source, e, target)
  //     target.dispatchEvent(retargetedEvent)
  //   }
  // }

  /**
   * plot more custom segments into segsPlotMore
   *   -- beyond the charts put by putCharts()
   */
  protected plotPane(): void {
  }

  /**
   * The releasing is required for preventing memory leaks.
   */
  // protected finalize() {
  //   this.view.control.removeObserversOf(this)
  //   this.view.removeObserversOf(this)

  //   super.finalize()
  // }

}



