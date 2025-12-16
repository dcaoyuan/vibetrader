import type { Seg } from "./Seg";

/**
 * https://svgwg.org/svg2-draft/paths.html#PathElement
 */
export type PathData = { type: string, values: number[] }

export class Path implements Seg {
    pathDatas: PathData[] = [];
    opacity: number;

    moveto(x: number, y: number, relative = false) {
        const c = relative ?
            { type: "m", values: [Math.round(x), Math.round(y)] } :
            { type: "M", values: [Math.round(x), Math.round(y)] }

        this.pathDatas.push(c)
    }

    closepath() {
        const c = { type: "Z", values: [] as number[] }

        this.pathDatas.push(c)
    }

    lineto(x: number, y: number, relative = false) {
        const c = relative ?
            { type: "l", values: [Math.round(x), Math.round(y)] } :
            { type: "L", values: [Math.round(x), Math.round(y)] }

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

    render(key: string, style?: {
        fill?: string,
        stroke?: string,
        strokeWidth?: string | number,
        strokeDasharray?: string | number,
        opacity?: number
    }, className?: string) {
        let path = '';
        for (const { type, values } of this.pathDatas) {
            path = path + type;
            for (let i = 0; i < values.length; i++) {
                path = path + values[i] + " "
            }
        }

        return (
            <path
                className={className}
                key={key}
                d={path}
                fill={style && style.fill}
                stroke={style && style.stroke}
                strokeWidth={style && style.strokeWidth}
                strokeDasharray={style && style.strokeDasharray}
                opacity={style && style.opacity}
            />
        )
    }
}
