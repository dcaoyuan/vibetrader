import { TVar } from "../../timeseris/TVar";
import { Theme } from "../theme/Theme";
import { Quote } from "../../domain/Quote";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";
import { QuoteChartKind } from "./Kinds";

type Props = {
  xc: ChartXControl,
  yc: ChartYControl,
  quoteVar: TVar<Quote>,
  kind: QuoteChartKind,
  depth: number;
}

const QuoteChart = (props: Props) => {
  const { xc, yc, quoteVar, kind, depth } = props;

  /** depth !== 0 is for comparing quotes charts */
  const posColor = depth === 0 ? Theme.now().getPositiveColor() : Theme.now().getChartColor(depth);
  const negColor = depth === 0 ? Theme.now().getNegativeColor() : posColor;

  function plotChart() {
    const isFill = kind === QuoteChartKind.Candle && Theme.now().isFillBar;

    const posPath = new Path(posColor, isFill ? posColor : "none");
    const negPath = posColor === negColor
      ? undefined
      : new Path(negColor, isFill ? negColor : "none");

    switch (kind) {
      case QuoteChartKind.Candle:
      case QuoteChartKind.Ohlc:
        plotCandleOrOhlcChart(kind, posPath, negPath);
        break

      case QuoteChartKind.Line:
        plotLineChart(posPath, negPath);
        break;

      default:
        plotCandleOrOhlcChart(kind, posPath, negPath);
    }

    return { posPath, negPath }
  }

  function plotCandleOrOhlcChart(kind: QuoteChartKind, posPath: Path, negPath: Path) {
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
        if (xc.exists(time)) {
          const quote = quoteVar.getByTime(time);
          if (quote && quote.open != 0) {
            if (open === undefined) {
              /** only get the first open as compressing period's open */
              open = quote.open;
            }
            high = Math.max(high, quote.high)
            low = Math.min(low, quote.low)
            close = quote.close;
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
          case QuoteChartKind.Candle:
            plotCandleBar(yOpen, yHigh, yLow, yClose, xCenter, path);
            break;

          case QuoteChartKind.Ohlc:
            plotOHLCBar(yOpen, yHigh, yLow, yClose, xCenter, path);
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
  function plotCandleBar(yOpen: number, yHigh: number, yLow: number, yClose: number, xCenter: number, path: Path) {
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
  function plotOHLCBar(yOpen: number, yHigh: number, yLow: number, yClose: number, xCenter: number, path: Path) {
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
        if (quoteVar.exists(time)) {
          const quote = quoteVar.getByTime(time);
          if (quote && quote.close !== 0) {
            if (open === undefined) {
              /** only get the first open as compressing period's open */
              open = quote.open;
            }
            close = quote.close;
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
      {posPath && posPath.render('quote-pos')}
      {negPath && negPath.render('quote-neg')}
    </>
  )
}

export default QuoteChart;