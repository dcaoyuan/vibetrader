import { DefaultBaseTSer } from "../timeseris/DefaultBaseTSer";
import quotesJson from "../quotes.json"
import { Quote } from "./Quote";
import { TFreq } from "../timeseris/TFreq";
import { TVar } from "../timeseris/TVar";
import { QuoteChartView } from "../charting/view/QuoteChartView";
import { VolumeView } from "../charting/view/VolumeView";

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
    const quoteSer = loadSer();
    const qvar = quoteSer.varOf(varName) as TVar<Quote>;

    const width = 800;
    const hMasterView = 400;
    const hSlaveView = 100;

    const height = hMasterView + hSlaveView

    return (
      <div className="container" style={{ width: width + 'px', height: height + 'px' }} >
        <QuoteChartView baseSer={quoteSer} tvar={qvar} isQuote={true} isMasterView={true} width={width} height={hMasterView} />
        <VolumeView baseSer={quoteSer} tvar={qvar} isQuote={false} isMasterView={false} width={width} height={hSlaveView} />
      </div>
    )
  }
}