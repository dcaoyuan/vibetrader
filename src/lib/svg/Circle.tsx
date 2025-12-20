import type { Options, Seg } from "./Seg";

export class Circle implements Seg {
    cx: number
    cy: number
    r: number

    constructor(cx: number, cy: number, r: number) {
        this.cx = cx
        this.cy = cy
        this.r = r
    }

    render(options: Options) {
        const { key, style, className } = options

        return (
            <circle
                cx={this.cx}
                cy={this.cy}
                r={this.r}
                className={className}
                key={key}
                fill={style?.fill}
                stroke={style?.stroke}
                strokeWidth={style?.strokeWidth}
                strokeDasharray={style?.strokeDasharray}
                opacity={style?.opacity}
            />
        )
    }
}
