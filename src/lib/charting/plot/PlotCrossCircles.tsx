import { TVar } from "../../timeseris/TVar";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";
import type { Seg } from "../../svg/Seg";
import { Circle } from "../../svg/Circle";
import type { PlotOptions } from "./Plot";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<unknown[]>,
    name: string,
    atIndex: number,
    options: PlotOptions;
    depth?: number;
}

const PlotCrossCircles = (props: Props) => {
    const { xc, yc, tvar, name, atIndex, depth, options, } = props;

    const r = Math.max(Math.floor((xc.wBar - 2) / 2), 3);
    const d = r * 2
    //const strokeWidth = undefined// options.linewidth || 1


    function plot() {
        const segs = plotLine();

        return { segs }
    }

    function plotLine(): Seg[] {
        const path = new Path()
        const segs: Seg[] = [path]

        let y1: number // for prev
        let y2: number // for curr

        // For those need connect from one bar to the next, use bar++ instead of 
        // bar += xc.nBarsCompressed to avoid uncontinuted line.
        for (let bar = 1; bar <= xc.nBars; bar++) {
            // use `undefiend` to test if value has been set at least one time
            const vs: number[] = []
            for (let i = 0; i < xc.nBarsCompressed; i++) {
                const time = xc.tb(bar + i)
                if (tvar.occurred(time)) {
                    const values = tvar.getByTime(time);
                    const v = values ? values[atIndex] : NaN;
                    if (typeof v === "number" && isNaN(v) === false) {
                        vs.push(v)
                    }
                }
            }

            for (const value of vs) {
                if (value !== undefined && isNaN(value) === false) {
                    y2 = yc.yv(value)
                    // x1 shoud be decided here, it may not equal prev x2:
                    // think about the case of on calendar day mode
                    const x1 = xc.xb(bar - xc.nBarsCompressed)
                    const x2 = xc.xb(bar)

                    switch (options.style) {
                        case 'style_circles':
                            segs.push(new Circle(x2, y2, r))
                            break

                        case 'style_cross':
                            path.moveto(x2, y2 - d)
                            path.lineto(x2, y2)
                            path.moveto(x2 - r, y2 - r)
                            path.lineto(x2 + r, y2 - r)
                            break
                    }

                    y1 = y2;
                }
            }
        }

        return segs
    }

    const { segs } = plot();

    return (
        segs.map((seg, n) => seg.render({ key: 'seg-' + n, style: { stroke: options.color, fill: options.color } }))
    )
}

export default PlotCrossCircles;