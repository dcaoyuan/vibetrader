import type { JSX } from "react";
import type { TVar } from "../../timeseris/TVar";
import PlotHistogram from "./PlotHistogram";
import PlotCrossCircles from "./PlotCrossCircles";
import PlotShape from "./PlotShape";
import PlotHline from "./PlotHline";
import PlotFill from "./PlotFill";
import PlotBgcolor from "./PlotBgcolor";
import PlotDrawingLine from "./PlotDrawingLine";
import PlotDrawingLineFill from "./PlotDrawingLineFill";
import PlotLine from "./PlotLine";
import type { PineData } from "../../domain/PineData";
import type { ChartXControl } from "../view/ChartXControl";
import type { ChartYControl } from "../view/ChartYControl";
import type { Output } from "../view/chartviews";

export function plotLines(outputs: Output[], tvar: TVar<PineData[]>, xc: ChartXControl, yc: ChartYControl) {
    return outputs.map(({ atIndex, options }) => {
        let chart: JSX.Element;
        switch (options.style) {
            case 'style_histogram':
            case 'style_columns':
                chart = <PlotHistogram
                    tvar={tvar}
                    xc={xc}
                    yc={yc}
                    atIndex={atIndex}
                    options={options}
                />
                break

            case "style_circles":
            case "style_cross":
                chart = <PlotCrossCircles
                    tvar={tvar}
                    xc={xc}
                    yc={yc}
                    atIndex={atIndex}
                    options={options}
                />
                break

            case 'shape':
            case 'char':
                chart = <PlotShape
                    tvar={tvar}
                    xc={xc}
                    yc={yc}
                    atIndex={atIndex}
                    options={options}
                />
                break

            case "hline":
                chart = <PlotHline
                    tvar={tvar}
                    xc={xc}
                    yc={yc}
                    atIndex={atIndex}
                    options={options}
                />
                break

            case "fill":
                chart = <PlotFill
                    tvar={tvar}
                    xc={xc}
                    yc={yc}
                    options={options}
                />
                break

            case 'background':
                chart = <PlotBgcolor
                    tvar={tvar}
                    xc={xc}
                    yc={yc}
                    atIndex={atIndex}
                    options={options}
                />
                break

            case 'drawing_line':
                chart = <PlotDrawingLine
                    tvar={tvar}
                    xc={xc}
                    yc={yc}
                    atIndex={atIndex}
                    options={options}
                />
                break

            case 'linefill':
                chart = <PlotDrawingLineFill
                    tvar={tvar}
                    xc={xc}
                    yc={yc}
                    atIndex={atIndex}
                    options={options}
                />
                break

            case 'line':
            case 'dashed':
            default:
                chart = <PlotLine
                    tvar={tvar}
                    xc={xc}
                    yc={yc}
                    atIndex={atIndex}
                    options={options}
                />
        }

        return chart;
    })
}