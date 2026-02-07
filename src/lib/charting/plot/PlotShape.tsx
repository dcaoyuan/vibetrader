import { TVar } from "../../timeseris/TVar";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";
import { KVAR_NAME, type Kline } from "../../domain/Kline";
import type { Location, PlotShapeOptions } from "./Plot";
import type { Shape } from "./Plot";
import type { Seg } from "../../svg/Seg";
import { Circle } from "../../svg/Circle";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<unknown[]>,
    name: string,
    atIndex: number,
    options: PlotShapeOptions
    depth?: number;
}

const PlotShape = (props: Props) => {
    const { xc, yc, tvar, name, atIndex, depth, options: { color, style, shape, location } } = props;

    const kvar = xc.baseSer.varOf(KVAR_NAME) as TVar<Kline>;

    function plot() {
        const segs = plotShape();

        return { segs }
    }

    function plotShape(): Seg[] {
        const r = Math.floor(xc.wBar / 2);
        const d = r * 2

        const path = new Path()
        const segs: Seg[] = [path]

        for (let bar = 1; bar <= xc.nBars; bar += xc.nBarsCompressed) {
            // use `undefiend` to test if value has been set at least one time
            let high = Number.NEGATIVE_INFINITY;
            let low = Number.POSITIVE_INFINITY
            let v = false
            for (let i = 0; i < xc.nBarsCompressed; i++) {
                const time = xc.tb(bar + i)
                if (tvar.occurred(time)) {
                    const values = tvar.getByTime(time) as boolean[];
                    v = v || values ? values[atIndex] : v;

                    if (xc.occurred(time)) {
                        const kline = kvar.getByTime(time);
                        if (kline) {
                            high = Math.max(high, kline.high)
                            low = Math.min(low, kline.low)
                        }
                    }
                }
            }

            if (v) {
                const x = xc.xb(bar)

                let y: number
                switch (location) {
                    case 'abovebar':
                        y = yc.yv(high) - 2
                        break;

                    case 'belowbar':
                        y = yc.yv(low) + d + 2
                        break

                    case 'top':
                        y = 0
                        break

                    case 'bottom':
                    default:
                        y = yc.hCanvas + d
                }

                switch (shape) {
                    case 'xcross':
                        path.moveto(x - r, y - d)
                        path.lineto(x + r, y)
                        path.moveto(x - r, y)
                        path.lineto(x + r, y - d)
                        break

                    case 'cross':
                        path.moveto(x, y - d)
                        path.lineto(x, y)
                        path.moveto(x - r, y - r)
                        path.lineto(x + r, y - r)
                        break

                    case 'circle':
                        segs.push(new Circle(x + r, y - r, r))
                        break

                    case 'triangleup':
                        path.moveto(x, y - d)
                        path.lineto(x + r, y)
                        path.lineto(x - r, y)
                        path.lineto(x, y - d)
                        break;

                    case 'triangledown':
                        path.moveto(x, y)
                        path.lineto(x + r, y - d)
                        path.lineto(x - r, y - d)
                        path.lineto(x, y)
                        break;

                    case 'flag':
                        path.moveto(x - r + 1, y)
                        path.lineto(x - r + 1, y - d)
                        path.lineto(x + r - 1, y - d)
                        path.lineto(x + r - 1, y - r)
                        path.lineto(x - r + 1, y - r)
                        break;

                    case 'arrowup':
                        path.moveto(x, y - d)
                        path.lineto(x + r, y - r)
                        path.lineto(x + r / 2, y - r)
                        path.lineto(x + r / 2, y)
                        path.lineto(x - r / 2, y)
                        path.lineto(x - r / 2, y - r)
                        path.lineto(x - r, y - r)
                        path.closepath()
                        break

                    case 'arrowdown':
                        path.moveto(x, y)
                        path.lineto(x - r, y - r)
                        path.lineto(x - r / 2, y - r)
                        path.lineto(x - r / 2, y - d)
                        path.lineto(x + r / 2, y - d)
                        path.lineto(x + r / 2, y - r)
                        path.lineto(x + r, y - r)
                        path.closepath()
                        break

                    case 'square':
                        path.moveto(x - r, y - d)
                        path.lineto(x - r, y)
                        path.lineto(x + r, y)
                        path.lineto(x + r, y - d)
                        path.closepath()
                        break

                    case 'diamond':
                        path.moveto(x, y - d)
                        path.lineto(x + r, y - r)
                        path.lineto(x, y)
                        path.lineto(x - r, y - r)
                        path.closepath()
                        break;

                    case 'labelup':
                    case 'labeldown':
                    default: // cross
                        path.moveto(x, y - d)
                        path.lineto(x, y)
                        path.moveto(x - r, y - r)
                        path.lineto(x + r, y - r)
                }
            }
        }

        return segs
    }

    const { segs } = plot();

    return (
        segs.map((seg, n) => seg.render({ key: 'seg-' + n, style: { stroke: color, fill: color } }))
    )
}

export default PlotShape;