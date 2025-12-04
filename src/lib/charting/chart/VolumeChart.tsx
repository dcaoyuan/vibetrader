import type { Kline } from "../../domain/Kline";
import { Path } from "../../svg/Path";
import type { TVar } from "../../timeseris/TVar";
import { Theme } from "../theme/Theme"
import type { ChartXControl } from "../view/ChartXControl";
import type { ChartYControl } from "../view/ChartYControl";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    klineVar: TVar<Kline>,
    depth: number;
}

const VolmueChart = (props: Props) => {
    const { xc, yc, klineVar } = props;

    const posColor = Theme.now().getPositiveColor();
    const negColor = Theme.now().getNegativeColor();
    const isFill = Theme.now().isFillBar;

    function plotChart() {
        const thin = Theme.now().isThinVolumeBar; //|| m.thin

        const posPath = new Path;
        const negPath = posColor === negColor ? undefined : new Path;

        const xRadius = xc.wBar < 2 ? 0 : Math.floor((xc.wBar - 2) / 2);

        const y1 = yc.yv(0)
        let bar = 1
        while (bar <= xc.nBars) {
            let open = undefined as number;
            let close = undefined as number;
            let volume = Number.NEGATIVE_INFINITY; // we are going to get max of volume during nBarsCompressed
            for (let i = 0; i < xc.nBarsCompressed; i++) {
                const time = xc.tb(bar + i)
                if (xc.occurred(time)) {
                    const kline = klineVar.getByTime(time);
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

                const xCenter = xc.xb(bar)

                const y2 = yc.yv(volume)
                if (thin || xc.wBar <= 2) {
                    path.moveto(xCenter, y1);
                    path.lineto(xCenter, y2);

                } else {
                    path.moveto(xCenter - xRadius, y1)
                    path.lineto(xCenter - xRadius, y2)
                    path.lineto(xCenter + xRadius, y2)
                    path.lineto(xCenter + xRadius, y1)
                }
            }

            bar += xc.nBarsCompressed
        }

        return { posPath, negPath }
    }

    const { posPath, negPath } = plotChart();

    return (
        <g className="volumechart">
            {posPath && posPath.render('volume-pos', {}, 'positive')}
            {negPath && negPath.render('volume-neg', {}, 'negative')}
        </g>
    )
}

export default VolmueChart;