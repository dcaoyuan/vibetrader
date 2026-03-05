import type { TFrame } from "../timeseris/TFrame";

export type LineObject = {
    id: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    xloc: string;
    extend: string;
    color: string;
    style: string;
    width: number;
    force_overlay: boolean;
    _deleted: boolean;
}

export type LinefillObject = {
    id: number;
    line1: LineObject;
    line2: LineObject;
    color: string;
    _deleted: boolean;
}

// Data type from Pine
export type PineData = {
    title?: string,
    time: number,
    value: number | boolean | LineObject[] | LinefillObject[],
    options?: { color: string }
}

// TODO 
// see PineTS src/namespace/request/utils/TIMESTAMPS
// see https://www.tradingview.com/pine-script-docs/concepts/timeframes/#timeframe-string-specifications
export const TIMEFRAMES = ['1', '3', '5', '15', '30', '45', '60', '120', '180', '240', 'D', 'W', 'M'];

export function tframeToPineTimeframe(tframe: TFrame) {
    const shortName = tframe.shortName
    if (shortName.endsWith('D')) {
        return 'D'

    } else if (shortName.endsWith('W')) {
        return 'W'

    } else if (shortName.endsWith('M')) {
        return 'M'

    } else if (shortName.endsWith('h') || shortName.endsWith('H')) {
        return shortName.slice(0, shortName.length)
    }

}