import type { Kline } from "./Kline";
import type { TVar } from "../timeseris/TVar";

export class TSerProvider {
    data: Kline[];

    constructor(kvar: TVar<Kline>) {
        this.data = kvar.toArray();
    }

    async getMarketData(tickerId: string, timeframe: string, limit?: number, sDate?: number, eDate?: number): Promise<unknown> {
        return this.data;
    }
}