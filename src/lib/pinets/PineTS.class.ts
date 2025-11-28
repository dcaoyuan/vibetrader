// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025 Ala-eddine KADDOURI
import { transpile } from './transpiler/index';
import { Context } from './index';
import { type Bar } from './marketData/Binance/BinanceProvider.class';

import { type IProvider } from './marketData/IProvider';

/**
 * This class is a wrapper for the Pine Script language, it allows to run Pine Script code in a JavaScript environment
 */
const MAX_PERIODS = 5000;
export class PineTS {
    public data: Bar[] = [];

    //#region [Pine Script built-in variables]
    public open: unknown = [];
    public high: unknown = [];
    public low: unknown = [];
    public close: unknown = [];
    public volume: unknown = [];
    public hl2: unknown = [];
    public hlc3: unknown = [];
    public ohlc4: unknown = [];
    public openTime: unknown = [];
    public closeTime: unknown = [];
    //#endregion

    //#region run context
    private _periods: number = undefined;
    public get periods() {
        return this._periods;
    }
    //#endregion

    //public fn: Function;

    private _readyPromise: Promise<unknown> = null;

    private _ready = false;

    constructor(
        private source: IProvider | unknown[],
        private tickerId?: string,
        private timeframe?: string,
        private limit?: number,
        private sDate?: number,
        private eDate?: number
    ) {
        this._readyPromise = new Promise((resolve) => {
            this.loadMarketData(source, tickerId, timeframe, limit, sDate, eDate).then((data) => {
                const marketData = data.slice(0, MAX_PERIODS);

                this._periods = marketData.length;
                this.data = marketData;

                const _open = marketData.map((d) => d.open);
                const _close = marketData.map((d) => d.close);
                const _high = marketData.map((d) => d.high);
                const _low = marketData.map((d) => d.low);
                const _volume = marketData.map((d) => d.volume);
                const _hlc3 = marketData.map((d) => (d.high + d.low + d.close) / 3);
                const _hl2 = marketData.map((d) => (d.high + d.low) / 2);
                const _ohlc4 = marketData.map((d) => (d.high + d.low + d.open + d.close) / 4);
                const _openTime = marketData.map((d) => d.openTime);
                const _closeTime = marketData.map((d) => d.closeTime);

                this.open = _open;
                this.close = _close;
                this.high = _high;
                this.low = _low;
                this.volume = _volume;
                this.hl2 = _hl2;
                this.hlc3 = _hlc3;
                this.ohlc4 = _ohlc4;
                this.openTime = _openTime;
                this.closeTime = _closeTime;

                this._ready = true;
                resolve(true);
            });
        });
    }

    private async loadMarketData(source: IProvider | unknown[], tickerId: string, timeframe: string, limit?: number, sDate?: number, eDate?: number) {
        if (Array.isArray(source)) {
            return source;
        } else {
            return (source as IProvider).getMarketData(tickerId, timeframe, limit, sDate, eDate);
        }
    }

    public async ready() {
        if (this._ready) return true;
        if (!this._readyPromise) throw new Error('PineTS is not ready');
        return this._readyPromise;
    }

    public async run(pineTSCode: Function | string, n?: number, useTACache?: boolean): Promise<Context> {
        await this.ready();
        if (!n) n = this._periods;

        const context = new Context({
            marketData: this.data,
            source: this.source,
            tickerId: this.tickerId,
            timeframe: this.timeframe,
            limit: this.limit,
            sDate: this.sDate,
            eDate: this.eDate,
        });

        context.pineTSCode = pineTSCode;
        context.useTACache = useTACache;
        const transformer = transpile.bind(this);
        const transpiledFn = transformer(pineTSCode);

        console.log('>>> transformedFn: ', transpiledFn.toString());

        context.data.close = [];
        context.data.open = [];
        context.data.high = [];
        context.data.low = [];
        context.data.volume = [];
        context.data.hl2 = [];
        context.data.hlc3 = [];
        context.data.ohlc4 = [];
        context.data.openTime = [];
        context.data.closeTime = [];
        const contextVarNames = ['const', 'var', 'let', 'params'];
        for (let i = this._periods - n; i < this._periods; i++) {
            context.idx = i;

            context.data.close.unshift(this.close[i]);
            context.data.open.unshift(this.open[i]);
            context.data.high.unshift(this.high[i]);
            context.data.low.unshift(this.low[i]);
            context.data.volume.unshift(this.volume[i]);
            context.data.hl2.unshift(this.hl2[i]);
            context.data.hlc3.unshift(this.hlc3[i]);
            context.data.ohlc4.unshift(this.ohlc4[i]);
            context.data.openTime.unshift(this.openTime[i]);

            const result = await transpiledFn(context);

            //collect results
            if (typeof result === 'object') {
                if (typeof context.result !== 'object') {
                    context.result = {};
                }
                for (const key in result) {
                    if (context.result[key] === undefined) {
                        context.result[key] = [];
                    }

                    const val = Array.isArray(result[key]) ? result[key][0] : result[key];
                    context.result[key].push(val);
                }
            } else {
                if (!Array.isArray(context.result)) {
                    context.result = [];
                }

                (context.result as unknown[]).push(result);
            }

            //shift context
            for (const ctxVarName of contextVarNames) {
                for (const key in context[ctxVarName]) {
                    if (Array.isArray(context[ctxVarName][key])) {
                        const val = context[ctxVarName][key][0];

                        context[ctxVarName][key].unshift(val);
                    } else {
                        //console.error('>>> invalid entry format, should be an array: ', ctxVarName, key);
                    }
                }
            }
        }

        return context;
    }
}

export default PineTS;
