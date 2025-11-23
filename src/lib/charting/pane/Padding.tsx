import { Component, type JSX } from "react";
import { Path } from "../../svg/Path";
import { Theme } from "../theme/Theme";

type Props = {
  id: number,
  x: number,
  y: number,
  width: number,
  height: number,
  upOrDown?: string,
}

type State = {
  path?: JSX.Element
}

class Padding extends Component<Props, State> {

  constructor(props: Props) {
    super(props);
    const { width, height, upOrDown } = props;
    const path = new Path(Theme.now().axisColor);

    switch (upOrDown) {
      case "up":
        // draw border line
        path.moveto(0, height);
        path.lineto(width, height);

        // draw end line
        path.moveto(0, height);
        path.lineto(0, height - 8);
        break;

      case "down":
        // draw border line
        path.moveto(0, 0);
        path.lineto(width, 0);

        // draw end line
        path.moveto(0, 0);
        path.lineto(0, 8);
        break;

      default:
        // it seems we have to draw something to occupy the space, at least for Firefox
        path.opacity = 0.0;

        path.moveto(0, 0);
        path.lineto(width, 0);

        path.moveto(0, 0);
        path.lineto(0, 8);
    }

    this.state = { path: path.render() };
  }

  render() {
    console.log("Padding render", this.props);

    const transform = `translate(${this.props.x} ${this.props.y})`;

    return (
      <g transform={transform} shapeRendering="crispEdges" >
        {this.state.path}
      </g>
    )

  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    if (
      this.props.x !== nextProps.x ||
      this.props.y !== nextProps.y ||
      this.props.width !== nextProps.width ||
      this.props.height !== nextProps.height ||
      this.props.upOrDown !== nextProps.upOrDown
    ) {
      return true;
    }

    return false;
  }
}

export default Padding;
