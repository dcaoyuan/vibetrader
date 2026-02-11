import type { Kline } from "./Kline";
import type { TVar } from "../timeseris/TVar";
//import type { IProvider, ISymbolInfo } from "../../../../PineTS/src/marketData/IProvider";

export class TSerProvider {
    data: Kline[];

    constructor(kvar: TVar<Kline>) {
        this.data = kvar.toArray();
    }

    getSymbolInfo(tickerId: string) {
        const syminfo = {
            current_contract: "",
            description: "",
            isin: "",
            main_tickerid: "",
            prefix: "",
            root: "",
            ticker: tickerId,
            tickerid: tickerId,
            type: "",
            basecurrency: "",
            country: "",
            currency: "",
            timezone: "",
            employees: 0,
            industry: "",
            sector: "",
            shareholders: 0,
            shares_outstanding_float: 0,
            shares_outstanding_total: 0,
            expiration_date: 0,
            session: "",
            volumetype: "",
            mincontract: 0,
            minmove: 0,
            mintick: 0,
            pointvalue: 0,
            pricescale: 0,
            recommendations_buy: 0,
            recommendations_buy_strong: 0,
            recommendations_date: 0,
            recommendations_hold: 0,
            recommendations_sell: 0,
            recommendations_sell_strong: 0,
            recommendations_total: 0,
            target_price_average: 0,
            target_price_date: 0,
            target_price_estimates: 0,
            target_price_high: 0,
            target_price_low: 0,
            target_price_median: 0
        }

        return Promise.resolve(syminfo)
    }

    async getMarketData(tickerId: string, timeframe: string, limit?: number, sDate?: number, eDate?: number): Promise<unknown> {
        return this.data;
    }
}