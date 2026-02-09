import type { PineData } from "../../domain/PineData";
import { Path } from "../../svg/Path";
import type { TVar } from "../../timeseris/TVar";
import type { ChartXControl } from "../view/ChartXControl";
import type { ChartYControl } from "../view/ChartYControl";
import type { PlotOptions } from "./Plot";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<PineData[]>,
    name: string,
    atIndex: number,
    options: PlotOptions;
    depth?: number;
}

const PlotBgcolor = (props: Props) => {
    const { xc, yc, tvar, atIndex } = props;

    function plot() {
        const thin = false

        const posPath = new Path()
        const negPath = new Path()

        const r = xc.wBar < 2
            ? 0
            : Math.floor((xc.wBar - 2) / 2);

        for (let bar = 1; bar <= xc.nBars; bar++) {
            const time = xc.tb(bar)
            if (tvar.occurred(time)) {
                const datas = tvar.getByTime(time);
                const data = datas ? datas[atIndex] : undefined;
                const v = data?.options?.color
            }

            // if (!(max === 0 && min === 0)) {
            //     let yValue = 0;
            //     let yDatum = 0;
            //     let path: Path;
            //     if (Math.abs(max) > Math.abs(min)) {
            //         path = posPath;
            //         yValue = yc.yv(max);
            //         yDatum = yc.yv(min);
            //     } else {
            //         path = negPath;
            //         yValue = yc.yv(min)
            //         yDatum = yc.yv(max)
            //     }

            //     const x = xc.xb(bar)

            //     if (thin || xc.wBar <= 2) {
            //         path.moveto(x, yDatum);
            //         path.lineto(x, yValue);

            //     } else {
            //         path.moveto(x - r, yDatum)
            //         path.lineto(x - r, yValue)
            //         path.lineto(x + r, yValue)
            //         path.lineto(x + r, yDatum)
            //     }
            // }

        }

        return { posPath, negPath }
    }

    const { posPath, negPath } = plot();

    return (
        <g className="volumechart">
            {posPath.render({ className: 'positive' })}
            {negPath.render({ className: 'negative' })}
        </g>
    )
}

export default PlotBgcolor;