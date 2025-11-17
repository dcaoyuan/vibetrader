import { DefaultBaseTSer } from "../timeseris/DefaultBaseTSer";
import quotesJson from "../quotes.json"
import { Quote } from "./Quote";
import { TFreq } from "../timeseris/TFreq";
import { TVar } from "../timeseris/TVar";
import { ChartControl } from "../charting/view/ChartControl";
import { QuoteChartView } from "../charting/view/QuoteChartView";
import { ChartViewContainer } from "../charting/view/ChartViewContainer";
import { AxisXPane } from "../charting/pane/AxisXPane";
import { AxisYPane } from "../charting/pane/AxisYPane";
import { ChartView } from "../charting/view/ChartView";

export namespace QuoteSer {
  //const timeZone = "America/Los_Angeles";
  const timeZone = "America/Vancouver";
  const varName = "ETH";

  function loadSer() {
    const quoteSer = new DefaultBaseTSer(TFreq.DAILY, timeZone, 1000);

    const qs = quotesJson //.reverse();
    //console.log(qs)

    for (const q of qs) {
      const quote = new Quote(Date.parse(q.Date), q.Open, q.High, q.Low, q.Close, q.Volume, true);
      quoteSer.addToVar(varName, quote);
    }

    return quoteSer;
  }

  export function testSer() {
    const quoteSer = loadSer();

    const qvar = quoteSer.varOf(varName) as TVar<Quote>;
    console.log(qvar.values());

    const itrT = qvar.timesIterator()
    while (itrT.hasNext()) {
      const time = itrT.next();
      const q = qvar.getByTime(time);
      console.log(q.time);
    }

    const itrV = qvar.valuesIterator();
    while (itrV.hasNext()) {
      const q = itrV.next();
      console.log(q);
    }

    for (const q of qvar) {
      console.log(q);
    }

    console.log(qvar.size())
  }

  export function testChart() {
    const width = 800;
    const height = 400;
    const quoteSer = loadSer();
    const chartControl = new ChartControl(quoteSer);
    const qvar = quoteSer.varOf(varName) as TVar<Quote>;

    const chartView = new QuoteChartView(chartControl, qvar);
    chartView.isQuote = true;
    chartView.width = width;
    chartView.height = height;
    chartView.mainChartPane.width = width;
    chartView.mainChartPane.height = height;

    const viewContainer = new ChartViewContainer(undefined, chartControl, chartView);
    chartControl.setViewContainer(viewContainer);

    const axisxPane = new AxisXPane(chartView);
    axisxPane.width = width;
    axisxPane.height = ChartView.AXISX_HEIGHT;

    const axisyPane = new AxisYPane(chartView, qvar);
    axisyPane.width = ChartView.AXISY_WIDTH;
    axisyPane.height = height + ChartView.AXISX_HEIGHT;

    return (
      <div>
        {chartView.render()}
      </div>
    )
  }
}