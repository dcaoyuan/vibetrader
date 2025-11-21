import { DefaultBaseTSer } from "../timeseris/DefaultBaseTSer";
import { TFreq } from "../timeseris/TFreq";
import { Quote } from "./Quote";
import quotesJson from "../quotes.json"
import type { TVar } from "../timeseris/TVar";

//const timeZone = "America/Los_Angeles";
const timeZone = "America/Vancouver";
const varName = "ETH";

export function loadSer() {
  const qs = quotesJson //.reverse();

  const quoteSer = new DefaultBaseTSer(TFreq.DAILY, timeZone, 1000);
  const qvar = quoteSer.varOf(varName) as TVar<Quote>;

  //console.log(qs)

  for (const q of qs) {
    const quote = new Quote(Date.parse(q.Date), q.Open, q.High, q.Low, q.Close, q.Volume, true);
    quoteSer.addToVar(varName, quote);
  }

  return { quoteSer, qvar };
}

export function testSer() {
  const { quoteSer } = loadSer();

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



