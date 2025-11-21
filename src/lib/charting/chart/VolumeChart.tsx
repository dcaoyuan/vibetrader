import type { Quote } from "../../domain/Quote";
import { Path } from "../../svg/Path";
import type { TVar } from "../../timeseris/TVar";
import { Theme } from "../theme/Theme"
import type { ChartXControl } from "../view/ChartXControl";
import type { ChartYControl } from "../view/ChartYControl";

type Props = {
  xcontrol: ChartXControl,
  ycontrol: ChartYControl,
  quoteVar: TVar<Quote>,
  depth: number;
}

const VolmueChart = (props: Props) => {
  const { xcontrol, ycontrol, quoteVar } = props;

  function plotChart() {

    const posColor = Theme.now().getPositiveColor();
    const negColor = Theme.now().getNegativeColor();

    const isFill = Theme.now().isFillBar;

    const thin = Theme.now().isThinVolumeBar //|| m.thin

    const posPath = new Path(0, 0, posColor, isFill ? posColor : "none");
    const negPath = posColor === negColor
      ? undefined
      : new Path(0, 0, negColor, isFill ? negColor : "none");


    const xRadius = xcontrol.wBar < 2 ? 0 : Math.floor((xcontrol.nBars - 2) / 2);

    const y1 = ycontrol.yv(0)
    let bar = 1
    while (bar <= xcontrol.nBars) {

      let open = undefined as number;
      let close = undefined as number;
      let high = Number.NEGATIVE_INFINITY;
      let low = Number.POSITIVE_INFINITY;
      let volume = Number.NEGATIVE_INFINITY; // we are going to get max of volume during nBarsCompressed
      let i = 0;
      while (i < xcontrol.nBarsCompressed) {
        const time = xcontrol.tb(bar + i)
        if (xcontrol.exists(time)) {
          const quote = quoteVar.getByTime(time);
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
        const path = close >= open ? posPath : negPath || posPath;

        const xCenter = xcontrol.xb(bar)
        const y2 = ycontrol.yv(volume)
        if (thin || xcontrol.wBar <= 2) {
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

      bar += xcontrol.nBarsCompressed
    }

    return negPath ? [posPath, negPath] : [posPath]
  }


  const segs = plotChart();

  return (
    <>{segs.map(seg => seg.render())}</>
  )
}

export default VolmueChart;