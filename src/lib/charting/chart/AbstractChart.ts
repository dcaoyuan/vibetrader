import { Chart, StrokeType } from './Chart';
import type { DatumPlane } from '../pane/DatumPlane';
import { Geometry } from './Geometry';
import { Path } from '../../svg/Path';
import { ChartControl } from '../view/ChartControl';

abstract class AbstractChart implements Chart {
  protected _datumPlane: DatumPlane;
  protected _control: ChartControl;

  depth;

  constructor(datumPlane: DatumPlane, depth = 0) {
    this._datumPlane = datumPlane;
    this._control = datumPlane.view.control;
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

  plot() {
    this.nBars = this._datumPlane.nBars
    this.wBar = this._datumPlane.wBar

    // wSeg = math.max(wBar, Chart.MIN_SEGMENT_WIDTH).toInt
    // nSegs = (nBars * wBar / wSeg).toInt + 1

    this.nBarsCompressed = this.wBar >= 1 ? 1 : Math.floor(1 / this.wBar)

    this.plotChart();
  }

  protected abstract plotChart(): void;

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
    return this._datumPlane.xb(barIndex);
  }

  protected yv(value: number): number {
    return this._datumPlane.yv(value);
  }

  protected bx(x: number): number {
    return this._datumPlane.bx(x);
  }

  protected vy(y: number): number {
    return this._datumPlane.vy(y);
  }

  protected rb(barIndex: number): number {
    return this._datumPlane.rb(barIndex);
  }

  protected br(row: number): number {
    return this._datumPlane.br(row);
  }

  protected sb(barIdx: number): number {
    return Math.floor(barIdx * this.wBar / this.wSeg) + 1;
  }

  protected bs(segIdx: number): number {
    return Math.floor(((segIdx - 1) * this.wSeg) / this.wBar);
  }

  protected tb(barIdx: number): number {
    return this._datumPlane.tb(barIdx);
  }

  protected bt(time: number): number {
    return this._datumPlane.bt(time);
  }

  protected exists(time: number): boolean {
    return this._datumPlane.exists(time);
  }

  protected plotLine(xBase: number, yBase: number, k: number, path: Path) {
    const xFr = 0;
    const yFr = Geometry.yOfLine(xFr, xBase, yBase, k);
    const xTo = this._datumPlane.width;
    const yTo = Geometry.yOfLine(xTo, xBase, yBase, k);

    path.moveto(xFr, yFr);
    path.lineto(xTo, yTo);
  }

  protected plotVerticalLine(bar: number, path: Path): void {
    const x = this.xb(bar);
    const yFr = this._datumPlane.yCanvasLower;
    const yTo = this._datumPlane.yCanvasUpper;

    path.moveto(x, yFr);
    path.lineto(x, yTo);
  }

  protected plotLineSegment(xFr: number, yFr: number, xTo: number, yTo: number, path: Path) {
    path.moveto(xFr, yFr);
    path.lineto(xTo, yTo);
  }

  protected plotVerticalLineSegment(bar: number, yFr: number, yTo: number, path: Path) {
    const x = this.xb(bar);
    path.moveto(x, yFr);
    path.lineto(x, yTo);
  }

  compare(another: Chart): number {
    return this.depth === another.depth ?
      0 :
      this.depth < another.depth ? -1 : 1;
  }

  abstract paths(): Path[];
}

export { AbstractChart, StrokeType };
