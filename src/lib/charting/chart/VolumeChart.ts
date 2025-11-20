import type { Quote } from "../../domain/Quote";
import { Path } from "../../svg/Path";
import type { TVar } from "../../timeseris/TVar";
import { Theme } from "../theme/Theme"
import type { ChartYControl } from "../view/ChartYControl";
import { AbstractChart } from "./AbstractChart"

export class VolumeChart extends AbstractChart {
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
    //assert(baseSer.isInstanceOf[QuoteSer], "VolumeChart's baseSer should be QuoteSer!")
    this.#posColor = Theme.now().getPositiveColor()
    this.#negColor = Theme.now().getNegativeColor()


    const isFill = Theme.now().isFillBar;

    const thin = Theme.now().isThinVolumeBar //|| m.thin

    this.#posPath = new Path(0, 0, this.#posColor, isFill ? this.#posColor : "none");
    if (this.#posColor !== this.#negColor) {
      this.#negPath = new Path(0, 0, this.#negColor, isFill ? this.#negColor : "none");
    }

    const xRadius = this.wBar < 2 ? 0 : Math.floor((this.nBars - 2) / 2);

    const y1 = this.yv(0)
    let bar = 1
    while (bar <= this.nBars) {

      let open = undefined as number;
      let close = undefined as number;
      let high = Number.NEGATIVE_INFINITY;
      let low = Number.POSITIVE_INFINITY;
      let volume = Number.NEGATIVE_INFINITY; // we are going to get max of volume during nBarsCompressed
      let i = 0;
      while (i < this.nBarsCompressed) {
        const time = this.tb(bar + i)
        if (this.exists(time)) {
          const quote = this.#quoteVar.getByTime(time);
          if (quote.close !== 0) {
            if (open === undefined) {
              /** only get the first open as compressing period's open */
              open = quote.open;
            }
            close = quote.close
            high = Math.max(high, quote.high)
            low = Math.min(low, quote.low)
            volume = Math.max(volume, quote.volume)
          }
        }

        i++;
      }

      if (volume >= 0 /* means we've got volume value */) {
        const path = close >= open ? this.#posPath : this.#negPath || this.#posPath;

        const xCenter = this.xb(bar)
        const y2 = this.yv(volume)
        if (thin || this.wBar <= 2) {
          path.moveto(xCenter, y1);
          path.lineto(xCenter, y2);

        } else {
          path.moveto(xCenter - xRadius, y1)
          path.lineto(xCenter - xRadius, y2)
          path.lineto(xCenter + xRadius, y2)
          path.lineto(xCenter + xRadius, y1)
          path.closepath();
        }
      }

      bar += this.nBarsCompressed
    }

    return this.#negPath ? [this.#posPath, this.#negPath] : [this.#posPath]
  }
}
