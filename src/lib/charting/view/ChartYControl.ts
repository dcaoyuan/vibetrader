import type { BaseTSer } from "../../timeseris/BaseTSer";
import { Geometry } from "../chart/Geometry";
import { withVolumePane, type WithVolumePane } from "../pane/WithVolumePane";
import { ChartView } from "../view/ChartView";
import { LINEAR_SCALAR } from "../view/scalar/LinearScala";
import type { Scalar } from "../view/scalar/Scalar";

/**
 *
 * @todo the ChangeObservable should notify according to priority
 *
 * call super(view, null) will let the super know this pane will be its
 * own datumPlane.
 * @see Pane#Pane(ChartView, DatumPlane)
 */
export class ChartYControl {
  view: ChartView;
  baseSer: BaseTSer;

  constructor(view: ChartView) {
    this.view = view;
    this.baseSer = this.view.xcontrol.baseSer;
  }

  isGeometryValid = false;

  width: number;
  height: number;

  /** geometry that need to be set before chart plotting and render */
  #nBars = 0                // fetched from view, number of bars, you may consider it as chart width
  #hChart = 0               // chart height in pixels, corresponds to the value range (maxValue - minValue)
  #hCanvas = 0              // canvas height in pixels
  #hChartOffsetToCanvas = 0 // chart's axis-y offset in canvas, named hXXXX means positive is from lower to upper;
  #hSpaceLower = 0          // height of spare space at lower side
  #hSpaceUpper = 0          // height of spare space at upper side
  #yCanvasLower = 0         // y of canvas' lower side
  #yChartLower = 0          // y of chart's lower side
  #wBar = 0.0               // fetched from viewContainer, pixels per bar
  #hOne = 0.0               // pixels per 1.0 value
  #maxValue = 0.0           // fetched from view
  #minValue = 0.0           // fetched from view
  #maxScaledValue = 0.0
  #minScaledValue = 0.0

  valueScalar: Scalar = LINEAR_SCALAR

  isMouseEntered: boolean;
  yMouse: number;
  referCursorValue: number;
  isAutoReferCursorValue: boolean;


  /**
   * the percent of hCanvas to be used to render charty, is can be used to scale the chart
   */
  #yChartScale = 1.0;

  /** the pixels used to record the chart vertically moving */
  #hChartScrolled: number = 0;

  computeGeometry() {
    this.#wBar = this.view.xcontrol.wBar()
    this.#nBars = this.view.nBars

    /**
     * @TIPS:
     * if want to leave spare space at lower side, do hCanvas -= space
     * if want to leave spare space at upper side, do hChart = hCanvas - space
     *     hOne = hChart / (maxValue - minValue)
     */
    this.#hSpaceLower = 1
    // if (this.view.xControlPane !== undefined) {
    //   /** leave xControlPane's space at lower side */
    //   this.#hSpaceLower += this.view.xControlPane.getHeight
    // }

    /** default values: */
    this.#hSpaceUpper = 0
    this.#maxValue = this.view.maxValue
    this.#minValue = this.view.minValue

    /** adjust if necessary */
    if (this as unknown as ChartYControl === this.view.ycontrol) {
      this.#hSpaceUpper += ChartView.TITLE_HEIGHT_PER_LINE
      //let x = (this.view as unknown as WithVolumePane).volumeChartPane

    } else if (
      withVolumePane(this.view) &&
      (this as unknown as ChartYControl) === (this.view as unknown as WithVolumePane).volumeChartPane
    ) {
      this.#maxValue = (this.view as unknown as WithVolumePane).maxVolume;
      this.#minValue = (this.view as unknown as WithVolumePane).minVolume;
    }

    this.#maxScaledValue = this.valueScalar.doScale(this.#maxValue)
    this.#minScaledValue = this.valueScalar.doScale(this.#minValue)

    this.#hCanvas = this.height - this.#hSpaceLower - this.#hSpaceUpper

    const hChartCouldBe = this.#hCanvas
    this.#hChart = hChartCouldBe * this.#yChartScale

    /** allocate sparePixelsBroughtByYChartScale to upper and lower averagyly */
    const sparePixelsBroughtByYChartScale = hChartCouldBe - this.#hChart
    this.#hChartOffsetToCanvas = this.#hChartScrolled + (sparePixelsBroughtByYChartScale * 0.5)


    this.#yCanvasLower = this.#hSpaceUpper + this.#hCanvas
    this.#yChartLower = this.#yCanvasLower - this.#hChartOffsetToCanvas

    /**
     * @NOTICE
     * the chart height corresponds to value range.
     * (not canvas height, which may contain values exceed max/min)
     */
    this.#hOne = this.#hChart / (this.#maxScaledValue - this.#minScaledValue)

    /** avoid hOne == 0 */
    this.#hOne = Math.max(this.#hOne, 0.0000000001)

    console.log(
      {
        hCanvas: this.#hCanvas,
        hChart: this.#hChart,
        hChartOffsetToCanvas: this.#hChartOffsetToCanvas,
        hOne: this.#hOne,
        hSpaceLower: this.#hSpaceLower,
        hSpaceUpper: this.#hSpaceUpper,
        maxValue: this.#maxValue,
        minValue: this.#minValue,
        maxScaledValue: this.#maxScaledValue,
        minScaledValue: this.#minScaledValue,
        nBars: this.#nBars,
        wBars: this.#wBar,
        yCanvasLower: this.#yCanvasLower,
        yChartLower: this.#yChartLower,
        yChartScale: this.#yChartScale
      },
    )

    this.isGeometryValid = true
  }

  get yChartScale(): number { return this.#yChartScale; }
  set yChartScale(yChartScale: number) {
    const oldValue = this.#yChartScale
    this.#yChartScale = yChartScale

    if (oldValue != this.#yChartScale) {
      this.isGeometryValid = false
      //repaint();
    }
  }

  growYChartScale(increment: number) {
    this.yChartScale += increment;
  }

  yChartScaleByCanvasValueRange(canvasValueRange: number) {
    const oldCanvasValueRange = this.vy(this.yCanvasUpper) - this.vy(this.yCanvasLower)
    const scale = oldCanvasValueRange / canvasValueRange
    const newYChartScale = this.#yChartScale * scale

    this.yChartScale = newYChartScale
  }

  scrollChartsVerticallyByPixel(increment: number) {
    this.#hChartScrolled += increment

    /** let repaint() to update the hChartOffsetToCanvas and other geom */
    //repaint();
  }


  /**
   * barIndex -> x
   *
   * @param i index of bars, start from 1 to nBars
   * @return x
   */
  xb(barIndex: number): number {
    return this.#wBar * (barIndex - 1);
  }

  xr(row: number): number {
    return this.xb(this.br(row));
  }

  /**
   * y <- value
   *
   * @param value
   * @return y on the pane
   */
  yv(value: number): number {
    const scaledValue = this.valueScalar.doScale(value)
    return Geometry.yv(scaledValue, this.#hOne, this.#minScaledValue, this.#yChartLower)
  }

  /**
   * value <- y
   * @param y y on the pane
   * @return value
   */
  vy(y: number): number {
    const scaledValue = Geometry.vy(y, this.#hOne, this.#minScaledValue, this.#yChartLower)
    return this.valueScalar.unScale(scaledValue);
  }

  /**
   * barIndex <- x
   *
   * @param x x on the pane
   * @return index of bars, start from 1 to nBars
   */
  bx(x: number): number {
    return Math.round(x / this.#wBar + 1)
  }


  /**
   * time <- x
   */
  tx(x: number): number {
    return this.tb(this.bx(x));
  }

  /** row <- x */
  rx(x: number): number {
    return this.rb(this.bx(x))
  }

  rb(barIndex: number): number {
    /** when barIndex equals it's max: nBars, row should equals rightTimeRow */
    return this.view.xcontrol.rightSideRow - this.#nBars + barIndex
  }

  br(row: number): number {
    return row - this.view.xcontrol.rightSideRow + this.#nBars
  }

  exists(time: number): boolean {
    return this.baseSer.exists(time);
  }

  /**
   * barIndex -> time
   *
   * @param barIndex, index of bars, start from 1 and to nBars
   * @return time
   */
  tb(barIndex: number): number {
    return this.view.baseSer.timeOfRow(this.rb(barIndex));
  }

  tr(row: number): number {
    return this.baseSer.timeOfRow(row);
  }

  rt(time: number): number {
    return this.baseSer.rowOfTime(time);
  }

  /**
   * time -> barIndex
   *
   * @param time
   * @return index of bars, start from 1 and to nBars
   */
  bt(time: number): number {
    return this.br(this.view.xcontrol.baseSer.rowOfTime(time))
  }

  get nBars(): number {
    return this.#nBars;
  }

  get wBar(): number {
    return this.#wBar;
  }

  /**
   * @return height of 1.0 value in pixels
   */
  get hOne(): number {
    return this.#hOne;
  }

  get hCanvas(): number {
    return this.#hCanvas;
  }

  get yCanvasLower(): number {
    return this.#yCanvasLower;
  }

  get yCanvasUpper(): number {
    return this.#hSpaceUpper;
  }

  /**
   * @return chart height in pixels, corresponds to the value range (maxValue - minValue)
   */
  get hChart(): number {
    return this.#hChart;
  }

  get yChartLower(): number {
    return this.#yChartLower
  }

  get yChartUpper(): number {
    return this.yChartLower - this.#hChart;
  }

  get maxValue(): number {
    return this.#maxValue;
  }

  get minValue(): number {
    return this.#minValue;
  }

  // @throws(classOf[Throwable])
  // override protected def finalize {
  //   view.control.removeObserversOf(this)
  //   view.removeObserversOf(this)

  //   super.finalize
  // }

}

