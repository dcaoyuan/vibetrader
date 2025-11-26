import { DefaultBaseTSer } from "../timeseris/DefaultBaseTSer";
import { TFrame } from "../timeseris/TFrame";
import { Quote } from "./Quote";
import quotesJson from "../quotes.json"
import type { TVar } from "../timeseris/TVar";

//const tzone = "America/Los_Angeles";
const tzone = "America/Vancouver";
const varName = "ETH";

export function loadSer(varName: string) {
  const qs = quotesJson //.reverse();

  const quoteSer = new DefaultBaseTSer(TFrame.DAILY, tzone, 1000);

  //console.log(qs)

  for (const q of qs) {
    const quote = new Quote(Date.parse(q.Date), q.Open, q.High, q.Low, q.Close, q.Volume, true);
    quoteSer.addToVar(varName, quote);
  }

  return quoteSer;
}

export function testSer() {
  const quoteSer = loadSer(varName);

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



