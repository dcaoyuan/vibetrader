import { TVar } from "../../timeseris/TVar";
import { Theme } from "../theme/Theme";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<unknown[]>,
    name: string,
    atIndex: number,
    color: string;
    depth?: number;
}

const LineChart = (props: Props) => {
    const { xc, yc, tvar, name, atIndex, depth, color } = props;

    function plotChart() {
        const path = new Path(color);
        plotLineChart(path);

        return { path }
    }

    function plotLineChart(path: Path) {
        let y1 = NaN // for prev
        let y2 = NaN // for curr
        let bar = 1
        while (bar <= xc.nBars) {
            // use `undefiend` to test if value has been set at least one time
            let open = NaN
            let close = NaN
            let max = Number.NEGATIVE_INFINITY;
            let min = Number.POSITIVE_INFINITY;
            let i = 0;
            while (i < xc.nBarsCompressed) {
                const time = xc.tb(bar + i)
                if (tvar.occurred(time)) {
                    const values = tvar.getByTime(time);
                    const v = values ? values[atIndex] : NaN;
                    if (typeof v === "number" && !isNaN(v)) {
                        if (open === undefined) {
                            /** only get the first open as compressing period's open */
                            open = v;
                        }
                        close = v;
                        max = Math.max(max, close);
                        min = Math.min(min, close);
                    }
                }

                i++;
            }

            if (!isNaN(close)) {
                y2 = yc.yv(close)
                if (xc.nBarsCompressed > 1) {
                    // draw a vertical line to cover the min to max
                    const x = xc.xb(bar)
                    path.moveto(x, yc.yv(min));
                    path.lineto(x, yc.yv(max));
                    console.log(yc.yv(min), yc.yv(max))

                } else {
                    if (!isNaN(y1)) {
                        // x1 shoud be decided here, it may not equal prev x2:
                        // think about the case of on calendar day mode
                        const x1 = xc.xb(bar - xc.nBarsCompressed)
                        const x2 = xc.xb(bar)
                        path.moveto(x1, y1);
                        path.lineto(x2, y2);
                    }
                }
                y1 = y2;

            }

            bar++;
        }
    }

    const { path } = plotChart();

    return (
        <>
            {path && path.render('line-' + depth)}
        </>
    )
}

export default LineChart;