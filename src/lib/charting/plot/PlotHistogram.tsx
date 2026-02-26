import type { PineData } from "../../domain/PineData";
import { Path } from "../../svg/Path";
import type { Seg } from "../../svg/Seg";
import type { TVar } from "../../timeseris/TVar";
import type { ChartXControl } from "../view/ChartXControl";
import type { ChartYControl } from "../view/ChartYControl";
import type { PlotOptions } from "./Plot";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<PineData[]>,
    name: string,
    atIndex: number,
    options: PlotOptions;
    depth?: number;
}

const PlotHistogram = (props: Props) => {
    const { xc, yc, tvar, atIndex } = props;

    function plot() {
        const thin = false

        const paths: Record<string, Path> = {}

        const r = xc.wBar < 2
            ? 0
            : Math.floor((xc.wBar - 2) / 2);

        for (let bar = 1; bar <= xc.nBars; bar++) {
            let color: string;
            let value: number;
            const time = xc.tb(bar)
            if (tvar.occurred(time)) {
                const datas = tvar.getByTime(time);
                const data = datas ? datas[atIndex] : undefined;
                const v = data ? data.value : NaN;
                if (typeof v === "number" && !isNaN(v)) {
                    value = v;
                }
                color = data?.options?.color
            }

            if (value !== undefined && !isNaN(value)) {
                if (!paths[color]) {
                    paths[color] = new Path()
                }

                const path = paths[color]

                const y0 = yc.yv(0);
                const yValue = yc.yv(value)

                const x = xc.xb(bar)

                if (thin || xc.wBar <= 2) {
                    path.moveto(x, y0);
                    path.lineto(x, yValue);

                } else {
                    path.moveto(x - r, y0)
                    path.lineto(x - r, yValue)
                    path.lineto(x + r, yValue)
                    path.lineto(x + r, y0)
                }
            }
        }

        return paths
    }

    const paths = plot();

    return (
        <g>
            {
                Object.keys(paths).map((color, n) => paths[color].render({ key: 'seg-' + n, style: { stroke: color, fill: color } }))
            }
        </g>
    )
}

export default PlotHistogram;