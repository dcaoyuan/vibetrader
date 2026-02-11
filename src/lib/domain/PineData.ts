import type { TFrame } from "../timeseris/TFrame";

// Data type from Pine
export type PineData = {
    title?: string,
    time: number,
    value: number | boolean,
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