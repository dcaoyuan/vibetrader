import { TVar } from "../../timeseris/TVar";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";
import type { PlotOptions } from "./Plot";
import type { PineData } from "../../domain/PineData";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<PineData[]>,
    name: string,
    atIndex: number,
    options: PlotOptions;
    depth?: number;
}

const PlotLine = (props: Props) => {
    const { xc, yc, tvar, name, atIndex, depth, options } = props

    const fillgap = options.fillgaps;

    function plot() {
        const path = new Path()

        const points = collectPoints();

        let prevY: number
        for (let m = 0; m < points.length; m++) {
            const [x, y] = points[m]

            if (y !== undefined) {
                if (prevY === undefined) {
                    // new segment
                    path.moveto(x, y)

                } else {
                    path.lineto(x, y)
                }
            }

            prevY = y
        }

        return { path }
    }

    function collectPoints() {
        const points: number[][] = []

        for (let bar = 1; bar <= xc.nBars; bar++) {
            let value: number
            const time = xc.tb(bar)
            if (tvar.occurred(time)) {
                const datas = tvar.getByTime(time);
                const data = datas ? datas[atIndex] : undefined;
                const v = data ? data.value : NaN;
                if (typeof v === "number" && !isNaN(v)) {
                    value = v;
                }
            }

            if (value !== undefined && !isNaN(value)) {
                const x = xc.xb(bar)
                const y = yc.yv(value)

                if (y !== undefined && !isNaN(y)) {
                    points.push([x, y])
                }

            } else {
                if (!fillgap) {
                    points.push([undefined, undefined])
                }
            }
        }

        return points
    }

    const { path } = plot();

    return (
        path.render({ style: { stroke: options.color, fill: 'none' } })
    )
}

export default PlotLine;