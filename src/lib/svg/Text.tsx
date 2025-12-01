import type { Seg } from "./Seg";

export type TextData = { x: number, y: number, text: string }

export class Texts implements Seg {
    texts: TextData[] = [];

    fill?: string;
    opacity?: number;

    constructor(fill: string) {
        this.fill = fill;
    }

    text(x: number, y: number, text: string) {
        this.texts.push({ x, y, text })
    }

    render(key: string) {
        return (
            <>
                {this.texts.map((text, i) =>
                    <text
                        key={key + i}
                        x={text.x}
                        y={text.y}
                        fill={this.fill}
                        opacity={this.opacity}
                    >
                        {text.text}
                    </text>
                )}
            </>
        )
    }
}