import type { BaseTSer } from "../../timeseris/BaseTSer";
import { ChartView } from "../view/ChartView";
import type { Scalar } from "../view/scalar/Scalar";

export interface DatumPlane {
  width: number
  height: number

  isMouseEntered: boolean
  yMouse: number
  referCursorValue: number
  isAutoReferCursorValue: boolean

  view: ChartView

  baseSer: BaseTSer

  /**
   * in DatumPlane, we define this public interface for its users to call in case
   * of being painted earlier than DatumPlane, for example: AxisXPane and AxisYPane.
   */
  computeGeometry(): void
  isGeometryValid: boolean

  nBars: number
  wBar: number

  hOne: number

  maxValue: number
  minValue: number

  xb(barIndex: number): number
  bx(x: number): number

  xr(row: number): number
  rx(x: number): number

  yv(value: number): number
  vy(y: number): number

  rb(barIndex: number): number
  br(row: number): number

  tb(barIdx: number): number
  bt(time: number): number

  tx(x: number): number

  tr(row: number): number;
  rt(time: number): number;

  exists(time: number): boolean;

  hCanvas: number

  yCanvasLower: number

  yCanvasUpper: number

  /**
   * @return chart height in pixels, corresponds to the value range (maxValue - minValue)
   */
  hChart: number

  yChartLower: number

  yChartUpper: number

  valueScalar: Scalar

  yChartScale: number

  growYChartScale(increment: number): void

  yChartScaleByCanvasValueRange(canvasValueRange: number): void

  scrollChartsVerticallyByPixel(increment: number): void

}






