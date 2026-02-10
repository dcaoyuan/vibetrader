import type { PineData } from "../../domain/PineData";
import { Path } from "../../svg/Path";
import { Rect } from "../../svg/Rect";
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

const PlotBgcolor = (props: Props) => {
    const { xc, yc, tvar, atIndex } = props;

    function plot() {
        const segs: { seg: Seg, color: string }[] = []

        const d = xc.wBar
        const r = Math.floor(xc.wBar / 2) + 1

        for (let bar = 1; bar <= xc.nBars; bar++) {
            const time = xc.tb(bar)
            let color: string
            if (tvar.occurred(time)) {
                const datas = tvar.getByTime(time);
                const data = datas ? datas[atIndex] : undefined;
                color = data?.options?.color

            }

            if (color) {
                const x = xc.xb(bar)
                const rect = { seg: new Rect(x - r, 0, d, yc.hChart), color }
                segs.push(rect)
            }
        }

        return { segs }
    }

    const { segs } = plot();

    return (
        <g>
            {
                segs.map(({ seg, color }, n) => seg.render({ key: 'seg-' + n, style: { stroke: 'none', fill: color } }))
            }
        </g>
    )
}

export default PlotBgcolor;