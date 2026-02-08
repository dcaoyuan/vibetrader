import { TVar } from "../../timeseris/TVar";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";
import type { PlotOptions } from "./Plot";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<unknown[]>,
    name: string,
    atIndex: number,
    options: PlotOptions
    depth?: number;
}

const PlotStepLine = (props: Props) => {
    const { xc, yc, tvar, name, atIndex, depth, options } = props;

    function plot() {
        const path = plotLine();

        return { path }
    }

    function plotLine(): Path {
        const path = new Path()

        const r = xc.wBar < 2
            ? 0
            : Math.floor((xc.wBar - 2) / 2);

        let y1: number // for prev
        let y2: number // for curr

        let prevValue: number

        // For those need connect from one bar to the next, use bar++ instead of 
        // bar += xc.nBarsCompressed to avoid uncontinuted line.
        for (let bar = 1; bar <= xc.nBars; bar++) {
            // use `undefiend` to test if value has been set at least one time
            let value: number
            let high = Number.NEGATIVE_INFINITY;
            let low = Number.POSITIVE_INFINITY;
            for (let i = 0; i < xc.nBarsCompressed; i++) {
                const time = xc.tb(bar + i)
                if (tvar.occurred(time)) {
                    const values = tvar.getByTime(time);
                    const v = values ? values[atIndex] : NaN;
                    if (typeof v === "number" && isNaN(v) === false) {
                        value = v;
                        high = Math.max(high, value);
                        low = Math.min(low, value);
                    }
                }
            }

            if (value !== undefined && isNaN(value) === false) {
                y2 = yc.yv(value)
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
                        if (prevValue !== undefined && prevValue !== value) {
                            const x = x1 + r
                            path.moveto(x, y1);
                            path.lineto(x, y2);

                            path.moveto(x1, y1);
                            path.lineto(x, y1);

                            path.moveto(x, y2);
                            path.lineto(x2, y2);

                        } else {
                            path.moveto(x1, y1);
                            path.lineto(x2, y2);
                        }
                    }
                }
                y1 = y2;

            }

            prevValue = value
        }

        return path
    }

    const { path } = plot();

    return (
        path.render({ style: { stroke: options.color, fill: options.color } })
    )
}

export default PlotStepLine;