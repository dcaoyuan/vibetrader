import { Path } from "../../svg/Path";
import type { TVar } from "../../timeseris/TVar";
import type { ChartXControl } from "../view/ChartXControl";
import type { ChartYControl } from "../view/ChartYControl";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<unknown[]>,
    name: string,
    atIndex: number,
    color: string;
    depth?: number;
}

const PlotHistogram = (props: Props) => {
    const { xc, yc, tvar, atIndex } = props;

    function plot() {
        const thin = false

        const posPath = new Path()
        const negPath = new Path()

        const r = xc.wBar < 2
            ? 0
            : Math.floor((xc.wBar - 2) / 2);

        for (let bar = 1; bar <= xc.nBars; bar += xc.nBarsCompressed) {
            let max = Number.NEGATIVE_INFINITY;
            let min = Number.POSITIVE_INFINITY;
            for (let i = 0; i < xc.nBarsCompressed; i++) {
                const time = xc.tb(bar + i)
                if (tvar.occurred(time)) {
                    const values = tvar.getByTime(time);
                    const v = values ? values[atIndex] : NaN;
                    if (typeof v === "number" && isNaN(v) === false) {
                        max = Math.max(max, v);
                        min = Math.min(min, v);
                    }
                }
            }

            max = Math.max(max, 0) // max not less than 0
            min = Math.min(min, 0) // min not more than 0

            if (!(max === 0 && min === 0)) {
                let yValue = 0;
                let yDatum = 0;
                let path: Path;
                if (Math.abs(max) > Math.abs(min)) {
                    path = posPath;
                    yValue = yc.yv(max);
                    yDatum = yc.yv(min);
                } else {
                    path = negPath;
                    yValue = yc.yv(min)
                    yDatum = yc.yv(max)
                }

                const x = xc.xb(bar)

                if (thin || xc.wBar <= 2) {
                    path.moveto(x, yDatum);
                    path.lineto(x, yValue);

                } else {
                    path.moveto(x - r, yDatum)
                    path.lineto(x - r, yValue)
                    path.lineto(x + r, yValue)
                    path.lineto(x + r, yDatum)
                }
            }

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

export default PlotHistogram;