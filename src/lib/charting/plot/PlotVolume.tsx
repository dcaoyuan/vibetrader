import type { Kline } from "../../domain/Kline";
import { Path } from "../../svg/Path";
import type { TVar } from "../../timeseris/TVar";
import type { ChartXControl } from "../view/ChartXControl";
import type { ChartYControl } from "../view/ChartYControl";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    kvar: TVar<Kline>,
    depth: number;
}

const PlotVolmue = (props: Props) => {
    const { xc, yc, kvar } = props;

    function plot() {
        const thin = false;

        const posPath = new Path()
        const negPath = new Path()

        const r = xc.wBar < 2
            ? 0
            : Math.floor((xc.wBar - 2) / 2);

        const y1 = yc.yv(0)

        for (let bar = 1; bar <= xc.nBars; bar += xc.nBarsCompressed) {
            let open: number
            let close: number
            let volume = Number.NEGATIVE_INFINITY; // we are going to get max of volume during nBarsCompressed
            for (let i = 0; i < xc.nBarsCompressed; i++) {
                const time = xc.tb(bar + i)
                if (xc.occurred(time)) {
                    const kline = kvar.getByTime(time);
                    if (kline.close !== 0) {
                        if (open === undefined) {
                            /** only get the first open as compressing period's open */
                            open = kline.open;
                        }
                        close = kline.close
                        volume = Math.max(volume, kline.volume)
                    }
                }
            }

            if (volume >= 0 /* means we've got volume value */) {
                const path = close >= open ? posPath : negPath || posPath;

                const x = xc.xb(bar)

                const y2 = yc.yv(volume)
                if (thin || xc.wBar <= 2) {
                    path.moveto(x, y1);
                    path.lineto(x, y2);

                } else {
                    path.moveto(x - r, y1)
                    path.lineto(x - r, y2)
                    path.lineto(x + r, y2)
                    path.lineto(x + r, y1)
                }
            }
        }

        return { posPath, negPath }
    }

    const { posPath, negPath } = plot();

    return (
        <g className="volumechart">
            {posPath.render({ className: 'positive' })}
            {negPath.render({ className: 'negative' })}
        </g>
    )
}

export default PlotVolmue;