import { TVar } from "../../timeseris/TVar";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";
import type { PlotOptions } from "./Plot";
import type { PineData } from "../../domain/PineData";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<PineData[]>,
    name: string,
    atIndex: number,
    options: PlotOptions
    depth?: number;
}

const PlotStepLine = (props: Props) => {
    const { xc, yc, tvar, name, atIndex, depth, options } = props;

    if (options.display && !options.display) {
        return <></>
    }

    const r = xc.wBar < 2
        ? 0
        : Math.floor((xc.wBar - 2) / 2);

    function plot() {
        const path = new Path()

        const points = collectPoints()

        let prevY: number
        for (let m = 0; m < points.length; m++) {
            const [x, y] = points[m]

            if (y === undefined) {
                prevY = undefined

            } else {
                if (prevY === undefined) {
                    // new segment
                    path.moveto(x, y)

                } else {
                    if (prevY === y) {
                        path.lineto(x, y)

                    } else {
                        path.lineto(x + r, prevY)
                        path.lineto(x + r, y)
                    }
                }
            }

            prevY = y
        }

        return { path }
    }

    function collectPoints() {
        const points: number[][] = []

        for (let bar = 1; bar <= xc.nBars; bar++) {
            // use `undefined` to test if value has been set at least one time
            let value: number
            const time = xc.tb(bar)
            if (tvar.occurred(time)) {
                const datas = tvar.getByTime(time);
                const data = datas ? datas[atIndex] : undefined;
                const v = data ? data.value : NaN
                if (typeof v === "number" && !isNaN(v)) {
                    value = v;
                }

                // console.log(index, data)

                if (typeof v === "number" && isNaN(v) === false) {
                    value = v;
                }
            }

            if (value !== undefined && isNaN(value) === false) {
                const x = xc.xb(bar)
                const y = yc.yv(value)

                if (y !== undefined && !isNaN(y)) {
                    points.push([x, y])
                }

            } else {
                points.push([undefined, undefined])
            }
        }

        return points
    }

    const { path } = plot();

    return (
        path.render({ style: { stroke: options.color, fill: 'none' } })
    )
}

export default PlotStepLine;