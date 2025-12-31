import { TVar } from "../../timeseris/TVar";
import { Kline } from "../../domain/Kline";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";

export type KlineKind = 'candle' | 'bar' | 'line'

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    kvar: TVar<Kline>,
    kind: KlineKind,
    depth: number;
}

const PlotKline = (props: Props) => {
    const { xc, yc, kvar, kind, depth } = props;

    // depth !== 0 is for comparing klines charts

    function plot() {

        const posPath = new Path()
        const negPath = new Path()

        switch (kind) {
            case 'candle':
            case 'bar':
                plotCandleOrBarChart(kind, posPath, negPath);
                break

            case 'line':
                plotLineChart(posPath, negPath);
                break;

            default:
                plotCandleOrBarChart(kind, posPath, negPath);
        }

        return { posPath, negPath }
    }

    function plotCandleOrBarChart(kind: KlineKind, posPath: Path, negPath: Path) {

        for (let bar = 1; bar <= xc.nBars; bar += xc.nBarsCompressed) {
            // use `undefiend` to test if value has been set at least one time
            let open: number = undefined
            let close: number = undefined
            let high = Number.NEGATIVE_INFINITY;
            let low = Number.POSITIVE_INFINITY
            for (let i = 0; i < xc.nBarsCompressed; i++) {
                const time = xc.tb(bar + i)
                if (xc.occurred(time)) {
                    const kline = kvar.getByTime(time);
                    if (kline && kline.open != 0) {
                        if (open === undefined) {
                            // only get the first open as compressing period's open
                            open = kline.open;
                        }
                        high = Math.max(high, kline.high)
                        low = Math.min(low, kline.low)
                        close = kline.close;
                    }
                }
            }

            if (close !== undefined && close != 0) {
                const path = close >= open ? posPath : negPath || posPath;

                const x = xc.xb(bar);

                const yOpen = yc.yv(open)
                const yHigh = yc.yv(high)
                const yLow = yc.yv(low)
                const yClose = yc.yv(close)

                switch (kind) {
                    case 'candle':
                        plotCandle(yOpen, yHigh, yLow, yClose, x, path);
                        break;

                    case 'bar':
                        plotBar(yOpen, yHigh, yLow, yClose, x, path);
                        break

                    default:
                        plotCandle(yOpen, yHigh, yLow, yClose, x, path);
                }
            }
        }
    }

    /**
     *        12341234
     *          |
     *         +-+  |
     *         | | +-+
     *         +-+ | |
     *          |  | |
     *          |  | |
     *             +-+
     *              |
     *
     *          ^   ^
     *          |___|___ barCenter
     */
    function plotCandle(yOpen: number, yHigh: number, yLow: number, yClose: number, x: number, path: Path) {
        /** why - 2 ? 1 for centre, 1 for space */
        const r = xc.wBar < 2 ? 0 : Math.floor((xc.wBar - 2) / 2);
        /** upper and lower of candle's rectangle */
        const yUpper = Math.min(yOpen, yClose)
        const yLower = Math.max(yOpen, yClose)

        if (xc.wBar <= 2) {
            path.moveto(x, yHigh)
            path.lineto(x, yLow)

        } else {
            path.moveto(x - r, yUpper)
            path.lineto(x + r, yUpper)
            path.lineto(x + r, yLower)
            path.lineto(x - r, yLower)
            path.closepath()

            path.moveto(x, yUpper)
            path.lineto(x, yHigh)

            path.moveto(x, yLower)
            path.lineto(x, yLow)
        }
    }

    /**
     *         12341234
     *          |
     *         -+   |
     *          |   +-
     *          +- -+
     *              |
     *
     *          ^   ^
     *          |___|___ barCenter
     */
    function plotBar(yOpen: number, yHigh: number, yLow: number, yClose: number, x: number, path: Path) {
        const width = xc.wBar;

        /** why - 2 ? 1 for centre, 1 for space */
        const r = width < 2 ? 0 : Math.floor((width - 2) / 2);

        if (width <= 2) {
            path.moveto(x, yHigh)
            path.lineto(x, yLow)

        } else {
            path.moveto(x, yHigh)
            path.lineto(x, yLow)

            path.moveto(x - r, yOpen)
            path.lineto(x, yOpen)

            path.moveto(x, yClose)
            path.lineto(x + r, yClose)
        }

    }

    function plotLineChart(posPath: Path, negPath: Path) {
        let y1: number = undefined as number // for prev
        let y2: number = undefined as number // for curr
        let bar = 1
        while (bar <= xc.nBars) {
            // use `undefiend` to test if value has been set at least one time
            let open: number = undefined as number
            let close: number = undefined as number
            let max = Number.NEGATIVE_INFINITY;
            let min = Number.POSITIVE_INFINITY;
            let i = 0;
            while (i < xc.nBarsCompressed) {
                const time = xc.tb(bar + i)
                if (kvar.occurred(time)) {
                    const kline = kvar.getByTime(time);
                    if (kline && kline.close !== 0) {
                        if (open === undefined) {
                            /** only get the first open as compressing period's open */
                            open = kline.open;
                        }
                        close = kline.close;
                        max = Math.max(max, close);
                        min = Math.min(min, close);
                    }
                }

                i++;
            }

            if (close !== undefined && close !== 0) {
                const path = close >= open ? posPath : negPath || posPath;

                y2 = yc.yv(close)
                if (xc.nBarsCompressed > 1) {
                    // draw a vertical line to cover the min to max
                    const x = xc.xb(bar)
                    path.moveto(x, yc.yv(min));
                    path.lineto(x, yc.yv(max));

                } else {
                    if (y1 !== undefined) {
                        // x1 shoud be decided here, it may not equal prev x2:
                        // think about the case of on calendar day mode
                        const x1 = xc.xb(bar - xc.nBarsCompressed)
                        const x2 = xc.xb(bar)
                        path.moveto(x1, y1);
                        path.lineto(x2, y2);
                    }
                }
                y1 = y2;

            }

            bar++;
        }
    }

    const { posPath, negPath } = plot();

    return (
        <g className="klinechart" >
            {posPath.render({ className: 'positive' })}
            {negPath.render({ className: 'negative' })}
        </g>
    )
}

export default PlotKline;