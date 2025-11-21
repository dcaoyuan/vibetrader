import type { Quote } from "../../domain/Quote";
import { Path } from "../../svg/Path";
import type { TVar } from "../../timeseris/TVar";
import { Theme } from "../theme/Theme"
import type { ChartXControl } from "../view/ChartXControl";
import type { ChartYControl } from "../view/ChartYControl";

type Props = {
  xc: ChartXControl,
  yc: ChartYControl,
  quoteVar: TVar<Quote>,
  depth: number;
}

const VolmueChart = (props: Props) => {
  const { xc, yc, quoteVar } = props;

  function plotChart() {

    const posColor = Theme.now().getPositiveColor();
    const negColor = Theme.now().getNegativeColor();

    const isFill = false// Theme.now().isFillBar;

    const thin = false //Theme.now().isThinVolumeBar //|| m.thin

    const posPath = new Path(0, 0, posColor, isFill ? posColor : "none");
    const negPath = posColor === negColor
      ? undefined
      : new Path(0, 0, negColor, isFill ? negColor : "none");


    const xRadius = xc.wBar < 2 ? 0 : Math.floor((xc.wBar - 2) / 2);

    const y1 = yc.yv(0)
    let bar = 1
    while (bar <= xc.nBars) {
      let open = undefined as number;
      let close = undefined as number;
      let volume = Number.NEGATIVE_INFINITY; // we are going to get max of volume during nBarsCompressed
      let i = 0;
      while (i < xc.nBarsCompressed) {
        const time = xc.tb(bar + i)
        if (xc.exists(time)) {
          const quote = quoteVar.getByTime(time);
          if (quote.close !== 0) {
            if (open === undefined) {
              /** only get the first open as compressing period's open */
              open = quote.open;
            }
            close = quote.close
            volume = Math.max(volume, quote.volume)
          }
        }

        i++;
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

    return negPath ? [posPath, negPath] : [posPath]
  }

  const segs = plotChart();

  return (
    <>{segs.map(seg => seg.render())}</>
  )
}

export default VolmueChart;