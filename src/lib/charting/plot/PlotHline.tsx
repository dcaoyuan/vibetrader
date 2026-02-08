import { TVar } from "../../timeseris/TVar";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";
import type { Seg } from "../../svg/Seg";
import type { PlotOptions } from "./Plot";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<unknown[]>,
    name: string,
    atIndex: number,
    options: PlotOptions,
    depth?: number;
}

const PlotHline = (props: Props) => {
    const { xc, yc, tvar, name, atIndex, depth, options } = props;

    let strokeDasharray: string
    switch (options.linestyle) {
        case 'dashed':
            strokeDasharray = "4 3"
            break

        case 'dotted':
            strokeDasharray = "1 2"
            break

        default:
    }

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
        segs.map((seg, n) => seg.render({ key: 'seg-' + n, style: { stroke: options.color, fill: options.color, strokeDasharray } }))
    )
}

export default PlotHline;