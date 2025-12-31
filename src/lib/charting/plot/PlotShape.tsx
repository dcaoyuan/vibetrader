import { TVar } from "../../timeseris/TVar";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";
import type { Kline } from "../../domain/Kline";
import { KVAR_NAME } from "../view/KlineViewContainer";
import type { Location } from "./Plot";
import type { Shape } from "./Plot";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<unknown[]>,
    name: string,
    atIndex: number,
    shape: Shape
    location: Location
    color: string;
    depth?: number;
}

const PlotShape = (props: Props) => {
    const { xc, yc, tvar, name, atIndex, depth, color } = props;

    const kvar = xc.baseSer.varOf(KVAR_NAME) as TVar<Kline>;


    function plot() {
        const path = new Path()

        plotShape(path);

        return { path }
    }

    function plotShape(path: Path) {
        const d = xc.wBar;
        const r = d / 2;

        let bar = 1
        while (bar <= xc.nBars) {
            // use `undefiend` to test if value has been set at least one time
            let high = Number.NEGATIVE_INFINITY;
            let low = Number.POSITIVE_INFINITY
            let v = false
            for (let i = 0; i < xc.nBarsCompressed; i++) {
                const time = xc.tb(bar + i)
                if (tvar.occurred(time)) {
                    const time = xc.tb(bar + i)
                    if (xc.occurred(time)) {
                        const kline = kvar.getByTime(time);
                        if (kline) {
                            high = Math.max(high, kline.high)
                            low = Math.min(low, kline.low)
                        }

                        const values = tvar.getByTime(time) as boolean[];
                        v = v || values ? values[atIndex] : v;
                    }
                }
            }

            const x = xc.xb(bar)

            let y: number
            switch (props.location) {
                case 'abovebar':
                    y = yc.yv(high)
                    y = yc.hCanvas
                    break;

                case 'belowbar':
                default:
                    y = yc.yv(low)
                    y = yc.hCanvas
                    break;
            }

            if (v) {
                path.moveto(x, y - d)
                path.lineto(x + r, y)
                path.lineto(x - r, y)
                path.lineto(x, y - d)
            }

            bar += xc.nBarsCompressed
        }
    }

    const { path } = plot();

    return (
        path && path.render({ style: { stroke: color } })
    )
}

export default PlotShape;