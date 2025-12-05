import type { Kline } from "./Kline";
import type { TVar } from "../timeseris/TVar";

export class TSerProvider {
    data: Kline[];

    constructor(klineVar: TVar<Kline>) {
        this.data = klineVar.toArray();
    }

    async getMarketData(tickerId: string, timeframe: string, limit?: number, sDate?: number, eDate?: number): Promise<any> {
        return this.data;
    }
}