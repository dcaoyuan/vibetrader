import { DefaultTSer } from "../../src/lib/timeseris/DefaultTSer";
import { TFrame } from "../../src/lib/timeseris/TFrame";
import { Kline } from "../../src/lib/domain/Kline";
import type { TVar } from "../../src/lib/timeseris/TVar";
import klinesJson from "./klines.json"

//const tzone = "America/Los_Angeles";
const tzone = "America/Vancouver";
const varName = "ETH";

function loadSer(varName: string) {
	const ks = klinesJson //.reverse();

	const kser = new DefaultTSer(TFrame.DAILY, tzone, 1000);

	for (const k of ks) {
		const time = Date.parse(k.Date);
		const kline = new Kline(time, k.Open, k.High, k.Low, k.Close, k.Volume, time, true);
		kser.addToVar(varName, kline);
	}

	return kser;
}

export function testSer() {
	const tser = loadSer(varName);

	const kvar = tser.varOf(varName) as TVar<Kline>;
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



