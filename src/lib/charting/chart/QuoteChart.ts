import { TVar } from "../../timeseris/TVar";
import { AbstractChart } from "./AbstractChart";
import { Theme } from "../theme/Theme";
import { Quote } from "../../domain/Quote";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";

export class QuoteChart extends AbstractChart {
  kind: QuoteChart.Kind = QuoteChart.Kind.Candle;

  #quoteVar: TVar<Quote>;

  #posColor?: string
  #negColor?: string

  #posPath: Path;
  #negPath?: Path;

  constructor(quoteVar: TVar<Quote>, ycontrol: ChartYControl, depth = 0) {
    super(ycontrol, depth);
    this.#quoteVar = quoteVar;
  }

  protected plotChart() {
    if (this.depth == 0) {
      this.#posColor = Theme.now().getPositiveColor()
      this.#negColor = Theme.now().getNegativeColor()

    } else {
      /** for comparing quotes charts */
      this.#posColor = Theme.now().getChartColor(this.depth)
      this.#negColor = this.#posColor
    }

    const isFill = this.kind === QuoteChart.Kind.Candle && Theme.now().isFillBar;

    this.#posPath = new Path(this.#posColor, isFill ? this.#posColor : "none");
    if (this.#posColor !== this.#negColor) {
      this.#negPath = new Path(this.#negColor, isFill ? this.#negColor : "none");
    }

    //const kind: QuoteChart.Kind = QuoteChart.Kind.Candle; // this.datumPlane.view.asInstanceOf<WithQuoteChart>.quoteChartType
    switch (this.kind) {
      case QuoteChart.Kind.Candle:
      case QuoteChart.Kind.Ohlc:
        this.#plotCandleOrOhlcChart(this.kind);
        break

      case QuoteChart.Kind.Line:
        this.#plotLineChart();
        break;

      default:
        this.#plotCandleOrOhlcChart(this.kind);
    }
  }

  #plotCandleOrOhlcChart(kind: QuoteChart.Kind) {
    let bar = 1
    while (bar <= this.nBars) {
      /**
       * use `undefiend` to test if value has been set at least one time
       */
      let open: number = undefined as number
      let close: number = undefined as number
      let high = Number.NEGATIVE_INFINITY;
      let low = Number.POSITIVE_INFINITY
      let i = 0
      while (i < this.nBarsCompressed) {
        const time = this.tb(bar + i)
        if (this.#quoteVar.exists(time)) {
          const quote = this.#quoteVar.getByTime(time);
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
        const path = close >= open ? this.#posPath : this.#negPath || this.#posPath;

        const x = this.xb(bar);

        const yOpen = this.yv(open)
        const yHigh = this.yv(high)
        const yLow = this.yv(low)
        const yClose = this.yv(close)

        switch (kind) {
          case QuoteChart.Kind.Candle:
            this.#plotCandleBar(yOpen, yHigh, yLow, yClose, x, path);
            break;

          case QuoteChart.Kind.Ohlc:
            this.#plotOHLCBar(yOpen, yHigh, yLow, yClose, x, path);
            break

          default:
        }
      }

      bar += this.nBarsCompressed
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
  #plotCandleBar(yOpen: number, yHigh: number, yLow: number, yClose: number, xCenter: number, path: Path) {
    const width = this.wBar;

    /** why - 2 ? 1 for centre, 1 for space */
    const xRadius = width < 2 ? 0 : Math.floor((width - 2) / 2);
    /** upper and lower of candle's rectangle */
    const yUpper = Math.min(yOpen, yClose)
    const yLower = Math.max(yOpen, yClose)

    if (width <= 2) {
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
  #plotOHLCBar(yOpen: number, yHigh: number, yLow: number, yClose: number, xCenter: number, path: Path) {
    const width = this.wBar;

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

  #plotLineChart() {
    let y1: number = undefined as any // for prev
    let y2: number = undefined as any // for curr
    let bar = 1
    while (bar <= this.nBars) {
      // use `undefiend` to test if value has been set at least one time
      let open: number = undefined as any
      let close: number = undefined as any
      let max = Number.NEGATIVE_INFINITY;
      let min = Number.POSITIVE_INFINITY;
      let i = 0;
      while (i < this.nBarsCompressed) {
        const time = this.tb(bar + i)
        if (this.#quoteVar.exists(time)) {
          const quote = this.#quoteVar.getByTime(time);
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
        const path = close >= open ? this.#posPath : this.#negPath || this.#posPath;

        y2 = this.yv(close)
        if (this.nBarsCompressed > 1) {
          // draw a vertical line to cover the min to max
          const x = this.xb(bar)
          path.moveto(x, this.yv(min));
          path.lineto(x, this.yv(max));

        } else {
          if (y1 !== undefined) {
            // x1 shoud be decided here, it may not equal prev x2:
            // think about the case of on calendar day mode
            const x1 = this.xb(bar - this.nBarsCompressed)
            const x2 = this.xb(bar)
            path.moveto(x1, y1);
            path.lineto(x2, y2);
            // <path d="M 70 70 L 70 70" stroke="blue" stroke-width="2" stroke-linecap="round" />
          }
        }
        y1 = y2;

      }

      bar++;
    }
  }

  paths() {
    this.plot();
    return this.#negPath ? [this.#posPath, this.#negPath] : [this.#posPath]
  }
}

export namespace QuoteChart {
  export enum Kind {
    Candle,
    Ohlc,
    Line,
  }
}