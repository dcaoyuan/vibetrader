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

const HistogramChart = (props: Props) => {
    const { xc, yc, tvar, atIndex } = props;

    function plotChart() {
        const thin = false

        const posPath = new Path()
        const negPath = new Path()

        const xRadius = xc.wBar < 2 ? 0 : Math.floor((xc.wBar - 2) / 2);

        const y1 = yc.yv(0)
        let bar = 1
        while (bar <= xc.nBars) {
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

                const xCenter = xc.xb(bar)

                if (thin || xc.wBar <= 2) {
                    path.moveto(xCenter, yDatum);
                    path.lineto(xCenter, yValue);

                } else {
                    path.moveto(xCenter - xRadius, yDatum)
                    path.lineto(xCenter - xRadius, yValue)
                    path.lineto(xCenter + xRadius, yValue)
                    path.lineto(xCenter + xRadius, yDatum)
                }
            }

            bar += xc.nBarsCompressed
        }

        return { posPath, negPath }
    }

    const { posPath, negPath } = plotChart();

    return (
        <g className="volumechart">
            {posPath && posPath.render({ key: 'histogram-pos', className: 'positive' })}
            {negPath && negPath.render({ key: 'histogram-neg', className: 'negative' })}
        </g>
    )
}

export default HistogramChart;