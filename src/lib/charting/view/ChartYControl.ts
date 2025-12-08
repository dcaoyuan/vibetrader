import type { TSer } from "../../timeseris/TSer";
import { LINEAR_SCALAR } from "../scalar/LinearScala";
import type { Scalar } from "../scalar/Scalar";

export class ChartYControl {
    static readonly VALUE_SCALE_UNIT = 10000;

    baseSer: TSer;
    height: number;

    constructor(baseSer: TSer, height: number) {
        this.baseSer = baseSer;
        this.height = height;
    }

    valueScalar: Scalar = LINEAR_SCALAR

    isAutoReferCursorValue: boolean;

    mouseCursorValue: number;
    mouseCursorY: number;

    /** geometry that need to be set before chart plotting and render */
    #hChart = 0               // chart height in pixels, corresponds to the value range (maxValue - minValue)
    #hCanvas = 0              // canvas height in pixels
    #hChartOffsetToCanvas = 0 // chart's axis-y offset in canvas, named hXXXX means positive is from lower to upper;
    #hSpaceLower = 0          // height of spare space at lower side
    #hSpaceUpper = 0          // height of spare space at upper side
    #yCanvasLower = 0         // y of canvas' lower side
    #yChartLower = 0          // y of chart's lower side
    #hOne = 0.0               // pixels per 1.0 value
    #maxValue = 0.0           // fetched from view
    #minValue = 0.0           // fetched from view
    #maxScalarValue = 0.0
    #minScalarValue = 0.0

    /**
     * the percent of hCanvas to be used to render charty, is can be used to scale the chart
     */
    #yChartScale = 1.0;

    /** the pixels used to record the chart vertically moving */
    #hChartScrolled: number = 0;

    computeGeometry(
        maxValue: number, minValue: number,
        maxVolume: number = undefined, minVolume: number = undefined
    ) {
        /**
         * @TIPS:
         * if want to leave spare space at lower side, do hCanvas -= space
         * if want to leave spare space at upper side, do hChart = hCanvas - space
         *     hOne = hChart / (maxValue - minValue)
         */
        this.#hSpaceLower = 0
        // if (this.view.xControlPane !== undefined) {
        //   /** leave xControlPane's space at lower side */
        //   this.#hSpaceLower += this.view.xControlPane.getHeight
        // }

        /** default values: */
        this.#hSpaceUpper = 0
        this.#maxValue = maxValue
        this.#minValue = minValue

        /** adjust if necessary */
        if (maxVolume !== undefined && minVolume !== undefined) {
            this.#maxValue = maxVolume;
            this.#minValue = minVolume;
        }

        this.#maxScalarValue = this.valueScalar.doScale(this.#maxValue)
        this.#minScalarValue = this.valueScalar.doScale(this.#minValue)

        this.#hCanvas = this.height - this.#hSpaceLower - this.#hSpaceUpper;

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
        this.#hOne = this.#hChart / (this.#maxScalarValue - this.#minScalarValue)

        /** avoid hOne == 0 */
        this.#hOne = Math.max(this.#hOne, 0.0000000001)

        // console.log('ChartYControl computeGeometry:',
        //   {
        //     hCanvas: this.#hCanvas,
        //     hChart: this.#hChart,
        //     hChartOffsetToCanvas: this.#hChartOffsetToCanvas,
        //     hOne: this.#hOne,
        //     hSpaceLower: this.#hSpaceLower,
        //     hSpaceUpper: this.#hSpaceUpper,
        //     maxValue: this.#maxValue,
        //     minValue: this.#minValue,
        //     maxScaledValue: this.#maxScalarValue,
        //     minScaledValue: this.#minScalarValue,
        //     yCanvasLower: this.#yCanvasLower,
        //     yChartLower: this.#yChartLower,
        //     yChartScale: this.#yChartScale
        //   },
        // )

    }

    get yChartScale(): number {
        return this.#yChartScale;
    }
    set yChartScale(yChartScale: number) {
        this.#yChartScale = yChartScale
    }

    setMouseCursorValue(mouseCursorValue: number, mouseCursorY: number) {
        this.mouseCursorValue = mouseCursorValue;
        this.mouseCursorY = mouseCursorY;
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
     * y <- value
     *
     * @param value
     * @return y on the pane
     */
    yv(value: number): number {
        const scalarValue = this.valueScalar.doScale(value)
        return -((this.#hOne * (scalarValue - this.#minScalarValue) - this.#yChartLower));
    }

    /**
     * value <- y
     * @param y y on the pane
     * @return value
     */
    vy(y: number): number {
        const scalarValue = -((y - this.#yChartLower) / this.#hOne - this.#minScalarValue);
        return this.valueScalar.unScale(scalarValue);
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

    static yOfLine(x: number, baseX: number, baseY: number, k: number): number {
        return (baseY + (x - baseX) * k);
    }

    /**
     * @param x
     * @param xCenter center point x of arc
     * @param yCenter center point y of arc
     * @return y or Null.Double
     */
    static yOfCircle(x: number, xCenter: number, yCenter: number, radius: number, positiveSide: boolean): number {
        const dx = x - xCenter;
        const dy = Math.sqrt(radius * radius - dx * dx);
        return positiveSide ? yCenter + dy : yCenter - dy;
    }

    // export function yOfCircle(x: number, circle: Arc2D, positiveSide: Boolean): number {
    //   const xCenter = circle.getCenterX
    //   const yCenter = circle.getCenterY
    //   const radius  = circle.getHeight / 2.0
    //   return yOfCircle(x, xCenter, yCenter, radius, positiveSide)
    // }

    // export function distanceToCircle(x: number, y: number, circle: Arc2D): number  {
    //   const xCenter = circle.getCenterX
    //   const yCenter = circle.getCenterY
    //   const radius  = circle.getHeight / 2.0
    //   const dx = x - xCenter
    //   const dy = y - yCenter
    //   return (Math.sqrt(dx * dx + dy * dy) - radius)
    // }

    static samePoint(x1: number, y1: number, x2: number, y2: number): boolean {
        return Math.round(x1) === Math.round(x2) && Math.round(y1) === Math.round(y2);
    }

}

