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
        const path = new Path;

        plotLineChart(path);

        return { path }
    }

    function plotLineChart(path: Path) {
        let y1 = undefined // for prev
        let y2 = undefined // for curr
        let bar = 1
        while (bar <= xc.nBars) {
            // use `undefiend` to test if value has been set at least one time
            let open = undefined
            let close = undefined
            let max = Number.NEGATIVE_INFINITY;
            let min = Number.POSITIVE_INFINITY;
            for (let i = 0; i < xc.nBarsCompressed; i++) {
                const time = xc.tb(bar + i)
                if (tvar.occurred(time)) {
                    const values = tvar.getByTime(time);
                    const v = values ? values[atIndex] : NaN;
                    if (typeof v === "number" && isNaN(v) === false) {
                        if (open === undefined) {
                            /** only get the first open as compressing period's open */
                            open = v;
                        }
                        close = v;
                        max = Math.max(max, close);
                        min = Math.min(min, close);
                    }
                }
            }

            if (close !== undefined && isNaN(close) === false) {
                y2 = yc.yv(close)
                if (xc.nBarsCompressed > 1) {
                    // draw a vertical line to cover the min to max
                    const x = xc.xb(bar)
                    path.moveto(x, yc.yv(min));
                    path.lineto(x, yc.yv(max));

                } else {
                    if (y1 !== undefined && isNaN(y1) === false) {
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
        path && path.render({ key: 'line-' + depth, style: { stroke: color } })
    )
}

export default LineChart;