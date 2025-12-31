import { TVar } from "../../timeseris/TVar";
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

const PlotLine = (props: Props) => {
    const { xc, yc, tvar, name, atIndex, depth, color } = props;

    function plot() {
        const path = new Path()

        plotLineChart(path);

        return { path }
    }

    function plotLineChart(path: Path) {
        let y1: number // for prev
        let y2: number // for curr

        // For those need connect from one bar to the next, use bar++ instead of 
        // bar += xc.nBarsCompressed to avoid uncontinuted line.
        for (let bar = 1; bar <= xc.nBars; bar++) {
            // use `undefiend` to test if value has been set at least one time
            let open: number
            let close: number
            let high = Number.NEGATIVE_INFINITY;
            let low = Number.POSITIVE_INFINITY;
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
                        high = Math.max(high, close);
                        low = Math.min(low, close);
                    }
                }
            }

            if (close !== undefined && isNaN(close) === false) {
                y2 = yc.yv(close)
                if (xc.nBarsCompressed > 1) {
                    // draw a vertical line to cover the min to max
                    const x = xc.xb(bar)
                    path.moveto(x, yc.yv(low));
                    path.lineto(x, yc.yv(high));

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
        }
    }

    const { path } = plot();

    return (
        path && path.render({ style: { stroke: color, fill: color } })
    )
}

export default PlotLine;