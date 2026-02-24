import type { TFrame } from "../timeseris/TFrame";
import type { TSer } from "../timeseris/TSer";
import { Kline, KVAR_NAME } from "./Kline";
import * as Binance from "./BinanaceData";
import * as Yahoo from "./YFinanceData";

import { Provider as PinetsProveder, PineTS as PinetsPineTS } from "pinets";
//import { Provider as PinetsProveder } from "../../../../PineTS/src/marketData/Provider.class";
//import { PineTS as PinetsPineTS } from '../../../../PineTS/src/PineTS.class';

export const dev = false

export { PinetsProveder as Provider };
export { PinetsPineTS as PineTS };

export enum Source {
    yfinance,
    binance
}

export const source: Source = dev ? Source.yfinance : Source.binance

export const fetchData = async (source: Source, baseSer: TSer, ticker: string, tframe: TFrame, tzone: string, startTime?: number, limit?: number) => {
    let fetch: (baseSer: TSer, ticker: string, tframe: TFrame, tzone: string, startTime?: number, limit?: number) => Promise<number>

    switch (source) {
        case Source.yfinance:
            fetch = fetchDataYahoo
            break

        case Source.binance:
            fetch = fetchDataBinance
            break

        default:
            fetch = fetchDataYahoo
    }

    return fetch(baseSer, ticker, tframe, tzone, startTime, limit).then(lastKline => {
        //console.log(lastKline)
        return lastKline === undefined
            ? fetchDataLocal(baseSer)
            : Promise.resolve(lastKline as number)
    })
}

const fetchDataLocal = (baseSer: TSer) => fetch("./klines.json")
    .then(r => r.json())
    .then(json => {
        for (const k of json) {
            const time = Date.parse(k.Date);
            const kline = new Kline(time, k.Open, k.High, k.Low, k.Close, k.Volume, time, time, true);
            baseSer.addToVar(KVAR_NAME, kline);
        }

        return undefined as number; // latestTime
    })

const fetchDataBinance = async (baseSer: TSer, ticker: string, tframe: TFrame, tzone: string, startTime?: number, limit?: number) => {
    const endTime = new Date().getTime();

    const backLimitTime = tframe.timeBeforeNTimeframes(endTime, limit, tzone)

    startTime = startTime
        ? startTime
        : backLimitTime //endTime - 300 * 3600 * 1000 * 24; // back 300 days

    const provider = PinetsProveder.Binance
    const pinets_tframe = Binance.timeframe_to_pinetsProvider[tframe.shortName] || tframe.shortName

    return provider.getMarketData(ticker, pinets_tframe, limit, startTime, endTime)
        //return Binance.fetchAllKlines(ticker, timeframe, startTime, endTime, limit)
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
                    const kline = new Kline(k.openTime, k.open, k.high, k.low, k.close, k.volume, k.openTime, k.closeTime, true);
                    baseSer.addToVar(KVAR_NAME, kline);
                }
            }

            return latestKline ? latestKline.openTime as number : undefined as number;
        })
}

const fetchDataYahoo = async (baseSer: TSer, ticker: string, tframe: TFrame, tzone: string, startTime?: number, limit?: number) => {
    let endTime = new Date().getTime();

    const backLimitTime = tframe.timeBeforeNTimeframes(endTime, limit, tzone)

    startTime = startTime
        ? startTime
        : backLimitTime //endTime - 300 * 3600 * 1000 * 24; // back 300 periods

    // convert to Unix Timestamps (seconds)
    startTime = Math.floor(startTime / 1000)
    endTime = Math.floor(Date.now() / 1000)

    const timeframe = tframe.shortName

    return Yahoo.fetchYahooData(ticker, timeframe, startTime, endTime).then((klines) => {
        // console.log(klines);
        const latestKline = klines.length > 0 ? klines[klines.length - 1] : undefined;
        // console.log(`latestKline: ${new Date(latestKline.time)}, ${latestKline.close}`)

        for (const k of klines) {
            if (k && k.time) {
                const kline = new Kline(k.time, k.open, k.high, k.low, k.close, k.volume, k.time, k.time, true);
                baseSer.addToVar(KVAR_NAME, kline);
            }
        }

        return latestKline ? latestKline.time as number : undefined as number;
    });
}


export function fetchSymbolList(filterText: string, init: RequestInit): Promise<{ ticker: string }[]> {
    let fetch: (filterText: string, init: RequestInit) => Promise<{ ticker: string }[]>

    //console.log(`Fetching symbol list for filter: "${filterText}" from source: ${Source[source]}`)

    switch (source) {
        case Source.yfinance:
            fetch = Yahoo.fetchSymbolList
            break

        case Source.binance:
            fetch = Binance.fetchSymbolList
            break

        default:
            fetch = Binance.fetchSymbolList
    }

    return fetch(filterText, init);
}