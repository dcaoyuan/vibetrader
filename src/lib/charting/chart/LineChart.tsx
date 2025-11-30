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
    depth?: number;
}

const LineChart = (props: Props) => {
    const { xc, yc, tvar, name, atIndex, depth } = props;

    const color = Theme.now().getChartColor(depth);

    function plotChart() {
        const path = new Path(color);
        plotLineChart(path);

        return { path }
    }

    function plotLineChart(path: Path) {
        let y1: number = undefined as number // for prev
        let y2: number = undefined as number // for curr
        let bar = 1
        while (bar <= xc.nBars) {
            // use `undefiend` to test if value has been set at least one time
            let open: number = undefined as number
            let close: number = undefined as number
            let max = Number.NEGATIVE_INFINITY;
            let min = Number.POSITIVE_INFINITY;
            let i = 0;
            while (i < xc.nBarsCompressed) {
                const time = xc.tb(bar + i)
                if (tvar.occurred(time)) {
                    const values = tvar.getByTime(time);
                    const v = values ? values[atIndex] : undefined;
                    if (v && typeof v === "number") {
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

            if (close !== undefined && close !== 0) {

                y2 = yc.yv(close)
                if (xc.nBarsCompressed > 1) {
                    // draw a vertical line to cover the min to max
                    const x = xc.xb(bar)
                    path.moveto(x, yc.yv(min));
                    path.lineto(x, yc.yv(max));

                } else {
                    if (y1 !== undefined) {
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