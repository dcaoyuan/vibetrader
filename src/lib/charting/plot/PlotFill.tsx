import { TVar } from "../../timeseris/TVar";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";
import type { PlotOptions } from "./Plot";
import type { TimeData } from "../../domain/Kline";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<unknown[]>,
    name: string,
    options: PlotOptions;
    plot1: TimeData[];
    plot2: TimeData[];
    depth?: number;
}

const PlotFill = (props: Props) => {
    const { xc, yc, tvar, name, depth, plot1, plot2, options } = props;

    function plot() {
        const path = new Path();
        const points_a = linePoints(plot1);
        const points_b = linePoints(plot2).reverse();
        const points = [...points_a, ...points_b]

        for (let i = 0; i < points.length; i++) {
            const [x, y] = points[i]
            if (i === 0) {
                path.moveto(x, y)
            } else {
                path.lineto(x, y)
            }
        }

        path.closepath()

        return { path }
    }

    function linePoints(datas: TimeData[]) {
        const points: number[][] = []

        // For those need connect from one bar to the next, use bar++ instead of 
        // bar += xc.nBarsCompressed to avoid uncontinuted line.
        for (let bar = 1; bar <= xc.nBars; bar++) {
            // use `undefiend` to test if value has been set at least one time
            let value: number
            const time = xc.tb(bar)
            if (tvar.occurred(time)) {
                const index = tvar.timestamps().indexOfOccurredTime(time)
                const data = index >= 0 && index < datas.length ? datas[index] : undefined
                const v = data ? data.value : NaN;

                // console.log(index, data)

                if (typeof v === "number" && isNaN(v) === false) {
                    value = v;
                }
            }

            if (value !== undefined && isNaN(value) === false) {
                const x = xc.xb(bar)
                const y = yc.yv(value)

                if (y !== undefined && !isNaN(y)) {
                    points.push([x, y])
                }
            }
        }

        return points
    }

    const { path } = plot();

    return (
        path.render({ style: { stroke: options.color, fill: options.color } })
    )
}

export default PlotFill;