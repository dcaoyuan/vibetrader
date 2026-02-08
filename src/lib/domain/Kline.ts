
import { TVal } from "../timeseris/TVal";

export const KVAR_NAME = "kline";

export class Kline extends TVal {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    openTime: number;
    closeTime: number;
    isClosed: boolean;

    get value() {
        return this.close;
    }

    constructor(
        time: number,
        open: number,
        high: number,
        low: number,
        close: number,
        volume: number,
        openTime: number,
        closeTime: number,
        isClosed: boolean,
    ) {
        super();
        this.time = time;
        this.open = open;
        this.high = high;
        this.low = low;
        this.close = close;
        this.volume = volume;
        this.openTime = openTime;
        this.closeTime = closeTime;
        this.isClosed = isClosed;
    }

    update(value: number, amount: number) {
        this.high = Math.max(this.high, value);
        this.low = Math.min(this.low, value);
        this.close = value;
        this.volume += amount;

        return this;
    }

    closeIt() {
        this.isClosed = true;

        return this;
    }

    toJson() {
        return {
            time: this.time,
            open: this.open,
            high: this.high,
            low: this.low,
            close: this.close,
            volume: this.volume,
            isClosed: this.isClosed
        }
    }

}