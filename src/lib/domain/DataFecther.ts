import { Provider } from "pinets";
import type { TFrame } from "../timeseris/TFrame";
import type { TSer } from "../timeseris/TSer";
import { Kline, KVAR_NAME } from "./Kline";
import * as Binance from "./BinanaceData";

export const fetchData = (baseSer: TSer, symbol: string, tframe: TFrame, tzone: string, startTime?: number, limit?: number) =>
    fetchDataBinance(baseSer, symbol, tframe, tzone, startTime, limit)
        .catch(ex => {
            console.error(ex);
            return fetchDataLocal(baseSer)

        }).then(lastKline => {
            console.log(lastKline)
            return lastKline === undefined
                ? fetchDataLocal(baseSer)
                : lastKline
        })

const fetchDataLocal = (baseSer: TSer) => fetch("./klines.json")
    .then(r => r.json())
    .then(json => {
        for (const k of json) {
            const time = Date.parse(k.Date);
            const kline = new Kline(time, k.Open, k.High, k.Low, k.Close, k.Volume, time, true);
            baseSer.addToVar(KVAR_NAME, kline);
        }

        return undefined; // latestTime
    })

const fetchDataBinance = async (baseSer: TSer, symbol: string, tframe: TFrame, tzone: string, startTime?: number, limit?: number) => {
    const endTime = new Date().getTime();
    const backLimitTime = tframe.timeBeforeNTimeframes(endTime, limit, tzone)
    startTime = startTime
        ? startTime
        : backLimitTime //endTime - 300 * 3600 * 1000 * 24; // back 300 days

    const provider = Provider.Binance
    const pinets_tframe = Binance.timeframe_to_pinetsProvider[tframe.shortName] || tframe.shortName

    return provider.getMarketData(symbol, pinets_tframe, limit, startTime, endTime)
        //return Binance.fetchAllKlines(symbol, timeframe, startTime, endTime, limit)
        .then(binanceKline => {
            // console.log(`\nSuccessfully fetched ${binanceKline.length} klines`);

            // Sort by openTime to ensure chronological order
            binanceKline.sort((a, b) => a.openTime - b.openTime);

            // Remove duplicates (in case of any overlap)
            const uniqueKlines = binanceKline//.filter((kline, index, self) => index === self.findIndex((k) => k.openTime === kline.openTime));

            // console.log(`After deduplication: ${uniqueKlines.length} klines`);

            const latestKline = uniqueKlines.length > 0 ? uniqueKlines[uniqueKlines.length - 1] : undefined;
            // console.log(`latestKline: ${new Date(latestKline.openTime)}, ${latestKline.close}`)

            for (const k of uniqueKlines) {
                if (k) {
                    const kline = new Kline(k.openTime, k.open, k.high, k.low, k.close, k.volume, k.closeTime, true);
                    baseSer.addToVar(KVAR_NAME, kline);
                }
            }

            return latestKline ? latestKline.openTime : undefined;
        })
}

