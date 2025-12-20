import type { Options, Seg } from "./Seg";

export class Rect implements Seg {
    x: number
    y: number
    width: number
    height: number
    rx: number
    ry: number

    constructor(x: number, y: number, width: number, height: number, rx?: number, yx?: number) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.rx = rx
        this.ry = yx
    }

    render(options: Options) {
        const { key, style, className } = options

        return (
            <rect
                x={this.x}
                y={this.y}
                width={this.width}
                height={this.height}
                rx={this.rx}
                ry={this.ry}
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
