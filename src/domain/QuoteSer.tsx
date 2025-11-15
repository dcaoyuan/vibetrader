import { DefaultBaseTSer } from "../timeseris/DefaultBaseTSer";
import quotesJson from "../quotes.json"
import { Quote } from "./Quote";
import { TFreq } from "../timeseris/TFreq";
import { TVar } from "../timeseris/TVar";
import { Class, createInstance } from "../Class";
import { ChartControl } from "../charting/view/ChartControl";
import { QuoteChartView } from "../charting/view/QuoteChartView";
import { ChartViewContainer } from "../charting/view/ChartViewContainer";

class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class Rect {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
function createInstance1(TheClass: typeof Point, x: number, y: number) { // (A)
  return new TheClass(x, y);
}

class Tv { }
class Var<V extends Tv> {
  clazz: Class<V>;
}

class TestContain {
  vars = new Map<string, Var<Tv>>();
  addVar<V extends Tv>(name: string, clazz: Class<V>) {
    this.vars.set(name, new Var<V>());
  }
  varOf(name: string) {

  }
}
const point: Point = createInstance1(Point, 3, 6);

const rect = createInstance(Rect, 3, 6);

export namespace QuoteSer {
  //const timeZone = "America/Los_Angeles";
  const timeZone = "America/Vancouver";
  const varName = "ETH";

  function loadSer() {
    const quoteSer = new DefaultBaseTSer(TFreq.DAILY, timeZone, 1000);

    const qs = quotesJson //.reverse();
    //console.log(qs)


    for (let q of qs) {
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

    for (let q of qvar) {
      console.log(q);
    }

    console.log(qvar.size())
  }

  export function testChart() {
    const width = 1600;
    const height = 1200;
    const quoteSer = loadSer();
    const chartControl = new ChartControl(quoteSer);
    const qvar = quoteSer.varOf(varName) as TVar<Quote>;
    const chartView = new QuoteChartView(chartControl, qvar);
    chartView.width = width;
    chartView.height = height;
    chartView.mainChartPane.width = width;
    chartView.mainChartPane.height = height;
    const viewContainer = new ChartViewContainer(undefined, chartControl, chartView);
    chartControl.setViewContainer(viewContainer);
    const paths = chartView.paths();
    paths[0].opacity = 0.7
    paths[1].opacity = 0.7

    console.log(paths)
    return (
      <svg width={width} height={height}>
        <rect x={0} y={0} width={width} height={height} stroke="#333333" fill='#333333' />
        {paths[0].render()}
        {paths[1].render()}
      </svg>
    )

  }
}