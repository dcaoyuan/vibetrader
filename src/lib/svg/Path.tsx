/**
 * https://svgwg.org/svg2-draft/paths.html#PathElement
 */
export type PathData = { type: string, values: number[] }

export class Path {
  #x0: number;
  #y0: number;

  pathDatas: PathData[] = [];
  stroke: string;
  stroke_width: number;
  stroke_dasharray: number[];
  fill: string;
  opacity: number;

  constructor(x: number, y: number, stroke: string, fill: string = "none") {
    this.#x0 = x;
    this.#y0 = y;
    this.stroke = stroke;
    this.fill = fill;
  }

  moveto(x: number, y: number, relative = false) {
    const c = relative ?
      { type: "m", values: [Math.round(x), Math.round(y)] } :
      { type: "M", values: [Math.round(x) + this.#x0, Math.round(y) + this.#y0] }

    this.pathDatas.push(c)
  }

  closepath() {
    const c = { type: "Z", values: [] as number[] }

    this.pathDatas.push(c)
  }

  lineto(x: number, y: number, relative = false) {
    const c = relative ?
      { type: "l", values: [Math.round(x), Math.round(y)] } :
      { type: "L", values: [Math.round(x) + this.#x0, Math.round(y) + this.#y0] }

    this.pathDatas.push(c)
  }

  horizontal_lineto(x: number, relative = false) {
    const c = relative ?
      { type: "h", values: [Math.round(x)] } :
      { type: "H", values: [Math.round(x)] }

    this.pathDatas.push(c)
  }

  vertical_lineto(y: number, relative = false) {
    const c = relative ?
      { type: "v", values: [Math.round(y)] } :
      { type: "V", values: [Math.round(y)] }

    this.pathDatas.push(c)
  }

  curveto(x1: number, y1: number, x2: number, y2: number, x: number, y: number, relative = false) {
    const c = relative ?
      { type: "c", values: [Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2), Math.round(x), Math.round(y)] } :
      { type: "C", values: [Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2), Math.round(x), Math.round(y)] }

    this.pathDatas.push(c)
  }

  smooth_curveto(x2: number, y2: number, x: number, y: number, relative = false) {
    const c = relative ?
      { type: "s", values: [Math.round(x2), Math.round(y2), Math.round(x), Math.round(y)] } :
      { type: "S", values: [Math.round(x2), Math.round(y2), Math.round(x), Math.round(y)] }

    this.pathDatas.push(c)
  }

  quadratic_bezier_curveto(x1: number, y1: number, x: number, y: number, relative = false) {
    const c = relative ?
      { type: "q", values: [Math.round(x1), Math.round(y1), Math.round(x), Math.round(y)] } :
      { type: "Q", values: [Math.round(x1), Math.round(y1), Math.round(x), Math.round(y)] }

    this.pathDatas.push(c)
  }

  smooth_quadratic_bezier_curveto(x: number, y: number, relative = false) {
    const c = relative ?
      { type: "t", values: [Math.round(x), Math.round(y)] } :
      { type: "T", values: [Math.round(x), Math.round(y)] }

    this.pathDatas.push(c)
  }

  elliptical_arc(rx: number, ry: number, x_axis_rotation: number, large_arc_flag: number, sweep_flag: number, x: number, y: number, relative = false) {
    const c = relative ?
      { type: "a", values: [rx, ry, x_axis_rotation, large_arc_flag, sweep_flag, Math.round(x), Math.round(y)] } :
      { type: "A", values: [rx, ry, x_axis_rotation, large_arc_flag, sweep_flag, Math.round(x), Math.round(y)] }

    this.pathDatas.push(c)
  }

  render() {
    let path = '';
    for (const { type, values } of this.pathDatas) {
      path = path + type;
      let i = 0;
      while (i < values.length) {
        path = path + values[i]
        if (i < values.length - 1) {
          path = path + " ";
        }
        i++;
      }
    }

    return (
      <path
        d={path}
        fill={this.fill}
        stroke={this.stroke}
        strokeWidth={this.stroke_width}
        strokeDasharray={this.stroke_dasharray}
        opacity={this.opacity}
      />
    )
  }
}
