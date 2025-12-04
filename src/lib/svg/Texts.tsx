import type { Seg } from "./Seg";

export type TextData = { x: number, y: number, text: string }

export class Texts implements Seg {
    texts: TextData[] = [];

    text(x: number, y: number, text: string) {
        this.texts.push({ x, y, text })
    }

    render(key: string, style?: {
        fill?: string,
        opacity?: number
    }) {
        return (
            <>
                {this.texts.map((text, i) =>
                    <text
                        key={key + i}
                        x={text.x}
                        y={text.y}
                        fill={style && style.fill}
                        opacity={style && style.opacity}
                    >
                        {text.text}
                    </text>
                )}
            </>
        )
    }
}