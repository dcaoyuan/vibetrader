import { useRef, useState } from "react";
import { QuoteChartView } from "../charting/view/QuoteChartView";
import { VolumeView } from "../charting/view/VolumeView";
import { loadSer } from "./QuoteSer";
import { ChartXControl } from "../charting/view/ChartXControl";
import { ChartView, RefreshEvent } from "../charting/view/ChartView";

const QuoteSerView = () => {
  const { quoteSer, qvar } = loadSer();

  const width = 800;
  const hMasterView = 400;
  const hSlaveView = 100;

  const height = hMasterView + hSlaveView

  const xc = new ChartXControl(quoteSer, width - ChartView.AXISY_WIDTH);

  const [refreshChart, setRefreshChart] = useState(0);
  const [refreshCursors, setRefreshCursors] = useState(0);

  const masterViewRef = useRef(null);

  const onNotify = (event: RefreshEvent) => {
    switch (event) {
      case RefreshEvent.Chart:
        setRefreshChart(refreshChart + 1);
        break;

      case RefreshEvent.Cursors:
        setRefreshCursors(refreshCursors + 1)
        break;

      default:
    }
  };

  return (
    <div className="container" style={{ width: width + 'px', height: height + 'px' }} >
      <div ref={masterViewRef}>
        <QuoteChartView
          name="ETH"
          xc={xc}
          baseSer={quoteSer}
          tvar={qvar}
          isQuote={true}
          isMasterView={true}
          width={width}
          height={hMasterView}
          notify={onNotify}
          refreshChart={refreshChart}
          refreshCursors={refreshCursors}
        />
      </div>
      <div>
        <VolumeView
          name="Vol"
          xc={xc}
          baseSer={quoteSer}
          tvar={qvar}
          isQuote={false}
          isMasterView={false}
          width={width}
          height={hSlaveView}
          notify={onNotify}
          refreshChart={refreshChart}
          refreshCursors={refreshCursors}
        />
      </div>
    </div>
  )
}

export default QuoteSerView 