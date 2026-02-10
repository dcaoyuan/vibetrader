import { TVar } from "../../timeseris/TVar";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";
import type { PlotOptions } from "./Plot";
import type { PineData } from "../../domain/PineData";
import type { Seg } from "../../svg/Seg";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<PineData[]>,
    name: string,
    options: PlotOptions;
    plot1: PineData[];
    plot2: PineData[];
    depth?: number;
}

const PlotFill = (props: Props) => {
    const { xc, yc, tvar, name, depth, plot1, plot2, options } = props;

    const fillgaps = options.fillgaps;

    const r = xc.wBar < 2
        ? 0
        : Math.floor((xc.wBar - 2) / 2);

    function plot() {
        const segs: Seg[] = [];
        const points_a = collectPoints(plot1);
        const points_b = collectPoints(plot2);

        let shallStartNewFill = true

        let unClosedPath: Path
        let lastCloseIndex = 0

        for (let m = 0; m < points_a.length; m++) {
            const [xa, ya] = points_a[m]
            const [xb, yb] = points_b[m]

            if (xa === undefined || xb === undefined) {
                if (unClosedPath) {
                    for (let n = m - 1; n > lastCloseIndex; n--) {
                        const [xb, yb] = points_b[n]
                        unClosedPath.lineto(xb, yb)
                    }

                    unClosedPath.closepath()
                    unClosedPath = undefined
                }

                shallStartNewFill = true

            } else {
                if (shallStartNewFill) {
                    unClosedPath = new Path()
                    segs.push(unClosedPath)

                    unClosedPath.moveto(xa, ya)

                    lastCloseIndex = m
                    shallStartNewFill = false

                } else {
                    unClosedPath.lineto(xa, ya)
                }
            }
        }

        // reached point_a end, has unClosedPath ?
        if (unClosedPath) {
            for (let n = points_a.length - 1; n > lastCloseIndex; n--) {
                const [xb, yb] = points_b[n]
                unClosedPath.lineto(xb, yb)
                n--
            }

            unClosedPath.closepath()
        }

        return { segs }
    }

    function collectPoints(datas: PineData[]) {
        const points: number[][] = []

        for (let bar = 1; bar <= xc.nBars; bar++) {
            // use `undefined` to test if value has been set at least one time
            let value: number
            const time = xc.tb(bar)
            if (tvar.occurred(time)) {
                const index = tvar.timestamps().indexOfOccurredTime(time)
                const data = index >= 0 && index < datas.length ? datas[index] : undefined
                const v = data ? data.value : NaN;

                // console.log(index, data)

                if (typeof v === "number" && !isNaN(v)) {
                    value = v;
                }
            }

            if (value !== undefined && !isNaN(value)) {
                const x = xc.xb(bar)
                const y = yc.yv(value)

                if (y !== undefined && !isNaN(y)) {
                    points.push([x, y])
                }

            } else {
                if (!fillgaps) {
                    points.push([undefined, undefined])
                }
            }
        }

        return points
    }

    const { segs } = plot();

    return (
        segs.map((seg, n) => seg.render({ key: 'seg-' + n, style: { stroke: undefined, fill: options.color } }))
    )
}

export default PlotFill;