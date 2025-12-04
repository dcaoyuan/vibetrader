import { TVar } from "../../timeseris/TVar";
import { Theme } from "../theme/Theme";
import { Kline } from "../../domain/Kline";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";
import { KlineChartKind } from "./Kinds";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    klineVar: TVar<Kline>,
    kind: KlineChartKind,
    depth: number;
}

const KlineChart = (props: Props) => {
    const { xc, yc, klineVar, kind, depth } = props;

    /** depth !== 0 is for comparing klines charts */
    const posColor = depth === 0 ? Theme.now().getPositiveColor() : Theme.now().getChartColor(depth);
    const negColor = depth === 0 ? Theme.now().getNegativeColor() : posColor;

    const isFill = kind === KlineChartKind.Candle && Theme.now().isFillBar;

    function plotChart() {

        const posPath = new Path;
        const negPath = posColor === negColor ? undefined : new Path;

        switch (kind) {
            case KlineChartKind.Candle:
            case KlineChartKind.Bar:
                plotCandleOrBarChart(kind, posPath, negPath);
                break

            case KlineChartKind.Line:
                plotLineChart(posPath, negPath);
                break;

            default:
                plotCandleOrBarChart(kind, posPath, negPath);
        }

        return { posPath, negPath }
    }

    function plotCandleOrBarChart(kind: KlineChartKind, posPath: Path, negPath: Path) {
        let bar = 1
        while (bar <= xc.nBars) {
            /**
             * use `undefiend` to test if value has been set at least one time
             */
            let open: number = undefined as number
            let close: number = undefined as number
            let high = Number.NEGATIVE_INFINITY;
            let low = Number.POSITIVE_INFINITY
            let i = 0
            while (i < xc.nBarsCompressed) {
                const time = xc.tb(bar + i)
                if (xc.occurred(time)) {
                    const kline = klineVar.getByTime(time);
                    if (kline && kline.open != 0) {
                        if (open === undefined) {
                            /** only get the first open as compressing period's open */
                            open = kline.open;
                        }
                        high = Math.max(high, kline.high)
                        low = Math.min(low, kline.low)
                        close = kline.close;
                    }
                }

                i++;
            }

            if (close !== undefined && close != 0) {
                const path = close >= open ? posPath : negPath || posPath;

                const xCenter = xc.xb(bar);

                const yOpen = yc.yv(open)
                const yHigh = yc.yv(high)
                const yLow = yc.yv(low)
                const yClose = yc.yv(close)

                switch (kind) {
                    case KlineChartKind.Candle:
                        plotCandle(yOpen, yHigh, yLow, yClose, xCenter, path);
                        break;

                    case KlineChartKind.Bar:
                        plotBar(yOpen, yHigh, yLow, yClose, xCenter, path);
                        break

                    default:
                }
            }

            bar += xc.nBarsCompressed
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
    function plotCandle(yOpen: number, yHigh: number, yLow: number, yClose: number, xCenter: number, path: Path) {
        /** why - 2 ? 1 for centre, 1 for space */
        const xRadius = xc.wBar < 2 ? 0 : Math.floor((xc.wBar - 2) / 2);
        /** upper and lower of candle's rectangle */
        const yUpper = Math.min(yOpen, yClose)
        const yLower = Math.max(yOpen, yClose)

        if (xc.wBar <= 2) {
            path.moveto(xCenter, yHigh)
            path.lineto(xCenter, yLow)

        } else {
            path.moveto(xCenter - xRadius, yUpper)
            path.lineto(xCenter + xRadius, yUpper)
            path.lineto(xCenter + xRadius, yLower)
            path.lineto(xCenter - xRadius, yLower)
            path.closepath()

            path.moveto(xCenter, yUpper)
            path.lineto(xCenter, yHigh)

            path.moveto(xCenter, yLower)
            path.lineto(xCenter, yLow)
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
    function plotBar(yOpen: number, yHigh: number, yLow: number, yClose: number, xCenter: number, path: Path) {
        const width = xc.wBar;

        /** why - 2 ? 1 for centre, 1 for space */
        const xRadius = width < 2 ? 0 : Math.floor((width - 2) / 2);

        if (width <= 2) {
            path.moveto(xCenter, yHigh)
            path.lineto(xCenter, yLow)

        } else {
            path.moveto(xCenter, yHigh)
            path.lineto(xCenter, yLow)

            path.moveto(xCenter - xRadius, yOpen)
            path.lineto(xCenter, yOpen)

            path.moveto(xCenter, yClose)
            path.lineto(xCenter + xRadius, yClose)
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
                if (klineVar.occurred(time)) {
                    const kline = klineVar.getByTime(time);
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

    const { posPath, negPath } = plotChart();

    return (
        <>
            {posPath && posPath.render('kline-pos-' + depth, { stroke: posColor, fill: isFill && posColor })}
            {negPath && negPath.render('kline-neg-' + depth, { stroke: negColor, fill: isFill && negColor })}
        </>
    )
}

export default KlineChart;