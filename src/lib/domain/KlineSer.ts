import { DefaultBaseTSer } from "../timeseris/DefaultBaseTSer";
import { TFrame } from "../timeseris/TFrame";
import { Kline } from "./Kline";
import klinesJson from "../klines.json"
import type { TVar } from "../timeseris/TVar";

//const tzone = "America/Los_Angeles";
const tzone = "America/Vancouver";
const varName = "ETH";

export function loadSer(varName: string) {
	const ks = klinesJson //.reverse();

	const klineSer = new DefaultBaseTSer(TFrame.DAILY, tzone, 1000);

	//console.log(qs)

	for (const q of ks) {
		const kline = new Kline(Date.parse(q.Date), q.Open, q.High, q.Low, q.Close, q.Volume, true);
		klineSer.addToVar(varName, kline);
	}

	return klineSer;
}

export function testSer() {
	const klineSer = loadSer(varName);

	const kvar = klineSer.varOf(varName) as TVar<Kline>;
	console.log(kvar.values());

	const itrT = kvar.timesIterator()
	while (itrT.hasNext()) {
		const time = itrT.next();
		const q = kvar.getByTime(time);
		console.log(q.time);
	}

	const itrV = kvar.valuesIterator();
	while (itrV.hasNext()) {
		const q = itrV.next();
		console.log(q);
	}

	for (const q of kvar) {
		console.log(q);
	}

	console.log(kvar.size())
}



