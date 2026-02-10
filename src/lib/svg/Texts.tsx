import { Fragment } from "react/jsx-runtime";
import type { Options, Seg } from "./Seg";

export type TextData = { x: number, y: number, text: string, color: string }

export class Texts implements Seg {
    texts: TextData[] = [];

    text(x: number, y: number, text: string, color?: string) {
        this.texts.push({ x, y, text, color })
    }

    render(options?: Options) {
        const { key, style, className } = options ?? {}

        return (
            <Fragment key={key}>
                {this.texts.map((text, i) =>
                    <text
                        key={'text-' + i}
                        x={text.x}
                        y={text.y}
                        fill={text.color || style && style.fill}
                        opacity={style && style.opacity}
                        className={className}
                    >
                        {text.text}
                    </text>
                )}
            </Fragment>
        )
    }
}