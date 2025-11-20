import { Chart, StrokeType } from './Chart';
import { Geometry } from './Geometry';
import { Path } from '../../svg/Path';
import { ChartXControl } from '../view/ChartXControl';
import type { ChartYControl } from '../view/ChartYControl';
import type { Seg } from '../../svg/Seg';

abstract class AbstractChart implements Chart {
  protected _ycontrol: ChartYControl;
  protected _xcontrol: ChartXControl;

  depth;

  constructor(ycontrol: ChartYControl, depth = 0) {
    this._ycontrol = ycontrol;
    this._xcontrol = ycontrol.view.xcontrol;
    this.depth = depth;
  }

  isFirstPlotting = false;
  isSelected = false;

  nBars = 0;
  wBar = 0;
  wSeg = Chart.MIN_SEGMENT_WIDTH;
  nSegs = 0;
  nBarsCompressed = 1;

  strockWidth = 1;
  stroke: string;

  #markPoints: DOMPoint[] = [];

  plot(): Seg[] {
    this.nBars = this._xcontrol.nBars
    this.wBar = this._xcontrol.wBar

    // wSeg = math.max(wBar, Chart.MIN_SEGMENT_WIDTH).toInt
    // nSegs = (nBars * wBar / wSeg).toInt + 1

    this.nBarsCompressed = this._xcontrol.nBarsCompressed

    return this.plotChart();
  }

  protected abstract plotChart(): Seg[];

  reset() {
    this.#markPoints.length = 0;
  }

  protected addMarkPoint(x: number, y: number) {
    this.#markPoints.push(new DOMPoint(x, y));
  }

  protected widgetIntersects(x: number, y: number, width: number, height: number): boolean {
    return false;
  }

  // protected renderWidget() {
  //   const w = Math.floor(this.strockWidth);
  //   let stroke: BasicStroke;

  //   switch (this.strokeType) {
  //     case StrokeType.Base:
  //       stroke = w <= Chart.BASE_STROKES.length ?
  //         Chart.BASE_STROKES[w - 1] :
  //         new BasicStroke(w);
  //       break;

  //     case StrokeType.Dash:
  //       stroke = w <= Chart.DASH_STROKES.length ?
  //         Chart.DASH_STROKES[w - 1] :
  //         new BasicStroke(w, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 10.0, Chart.DASH_PATTERN, 0);
  //       break;

  //     default:
  //       stroke = new BasicStroke(w);
  //   }

  //   g.setStroke(stroke);

  //   if (this.isSelected) {
  //     this.#markPoints.forEach(point => this.#renderMarkAtPoint(g, point));
  //   }
  // }

  // #renderMarkAtPoint(point: DOMPoint) {
  //   g.setColor(Theme.now().handleColor);
  //   g.fillRect(point.x - 2, point.y - 2, 5, 5);
  // }

  setStroke(stroke: string, width: number) {
    this.strockWidth = width;
    this.stroke = stroke;
  }

  protected xb(barIndex: number): number {
    return this._xcontrol.xb(barIndex);
  }

  protected yv(value: number): number {
    return this._ycontrol.yv(value);
  }

  protected bx(x: number): number {
    return this._xcontrol.bx(x);
  }

  protected vy(y: number): number {
    return this._ycontrol.vy(y);
  }

  protected rb(barIndex: number): number {
    return this._xcontrol.rb(barIndex);
  }

  protected br(row: number): number {
    return this._xcontrol.br(row);
  }

  protected sb(barIdx: number): number {
    return Math.floor(barIdx * this.wBar / this.wSeg) + 1;
  }

  protected bs(segIdx: number): number {
    return Math.floor(((segIdx - 1) * this.wSeg) / this.wBar);
  }

  protected tb(barIdx: number): number {
    return this._xcontrol.tb(barIdx);
  }

  protected bt(time: number): number {
    return this._xcontrol.bt(time);
  }

  protected exists(time: number): boolean {
    return this._xcontrol.exists(time);
  }

  compare(another: Chart): number {
    return this.depth === another.depth
      ? 0
      : this.depth < another.depth ? -1 : 1;
  }
}

export { AbstractChart, StrokeType };
