import { TVar } from "../../timeseris/TVar";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";
import type { Seg } from "../../svg/Seg";
import { Circle } from "../../svg/Circle";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<unknown[]>,
    name: string,
    atIndex: number,
    color: string;
    linewidth?: number,
    depth?: number;
}

const PlotCrossCircle = (props: Props) => {
    const { xc, yc, tvar, name, atIndex, depth, color, linewidth } = props;

    const d = linewidth ? linewidth : 6
    const r = d / 2

    function plot() {
        const segs = plotLine();

        return { segs }
    }

    function plotLine(): Seg[] {
        const path = new Path()
        const segs: Seg[] = [path]

        // For those need connect from one bar to the next, use bar++ instead of 
        // bar += xc.nBarsCompressed to avoid uncontinuted line.
        let value: number;
        for (let bar = 1; bar <= xc.nBars; bar++) {
            for (let i = 0; i < xc.nBarsCompressed; i++) {
                const time = xc.tb(bar + i)
                if (tvar.occurred(time)) {
                    const values = tvar.getByTime(time);
                    const v = values ? values[atIndex] : NaN;
                    if (typeof v === "number" && isNaN(v) === false) {
                        value = v;
                        break;
                    }
                }
            }
        }

        const y = yc.yv(value)
        path.moveto(0, y);
        path.lineto(xc.wChart, y)

        return segs
    }

    const { segs } = plot();

    return (
        segs.map((seg, n) => seg.render({ key: 'seg-' + n, style: { stroke: color, fill: color, strokeDasharray: "4 3" } }))
    )
}

export default PlotCrossCircle;