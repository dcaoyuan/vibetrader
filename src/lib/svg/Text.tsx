export type TextData = { x: number, y: number, text: string }

export class Text {
  #x0: number;
  #y0: number;
  texts: TextData[] = [];

  fill?: string;
  opacity?: number;

  constructor(x: number, y: number, fill: string) {
    this.#x0 = x;
    this.#y0 = y;
    this.fill = fill;
  }

  text(x: number, y: number, text: string) {
    this.texts.push({ x: x + this.#x0, y: y + this.#y0, text })
  }

  render() {
    return (
      <>
        {this.texts.map(text =>
          <text
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