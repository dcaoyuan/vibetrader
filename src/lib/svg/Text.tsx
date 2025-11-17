export class Text {
  x: number;
  y: number;
  text: string;
  fill?: string;
  opacity?: number;

  constructor(x: number, y: number, text: string) {
    this.x = x;
    this.y = y;
    this.text = text;
  }

  render() {
    return (
      <text
        x={this.x}
        y={this.y}
        fill={this.fill}
        opacity={this.opacity}
      >
        {this.text}
      </text>
    )
  }
}