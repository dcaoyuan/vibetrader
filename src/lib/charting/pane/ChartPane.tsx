import { useState } from "react";
import { Path } from "../../svg/Path";
import type { Chart } from "../chart/Chart";
import { Theme } from "../theme/Theme";

type Props = {
  width: number,
  height: number,
  chart: Chart
}

type ChartPaths = {
  paths: Path[],
}
type CursorPaths = {
  paths: Path[],
}


const ChartPane: React.FC<Props> = (props) => {
  const { width, height, chart } = props;

  const [chartPaths, setChartPaths] = useState<ChartPaths>(plot());
  const [cursorPaths, setCursorPaths] = useState<CursorPaths>({ paths: [] });

  function plot() {
    console.log("plot chart")
    return { paths: chart.paths() };
  }

  return (
    // use div style to force the dimension and avoid extra 4px height at bottom of parent container.
    <div style={{ width: width + 'px', height: height + 'px' }}>
      <svg width={width} height={height}
      >
        {chartPaths.paths.map(path => path.render())}
      </svg>
      <svg width={width} height={height}>
        {cursorPaths.paths.map(path => path.render())}
      </svg>
    </div>)

}

export default ChartPane;