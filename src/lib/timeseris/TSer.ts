import { TFrame } from "./TFrame";
import { TStamps } from "./TStamps";
import { TVal } from "./TVal";
import { TVar } from "./TVar";

// timeZone string specs: https://www.iana.org/time-zones
export interface TSer {
    timeframe: TFrame;
    timezone: string;
    timestamps(): TStamps;
    vars(): Map<string, TVar<unknown>>;

    /**
     * @param name 
     * @returns var of name, will create one if non exist yet.
     */
    varOf(name: string): TVar<unknown>;

    valuesCapacity: number;

    isLoaded: boolean;
    isInLoading: boolean;

    isAscending<V extends TVal>(values: V[]): boolean

    addVar(name: string, v: TVar<unknown>): void

    occurred(time: number): boolean;

    firstOccurredTime(): number;
    lastOccurredTime(): number;
    indexOfOccurredTime(time: number): number

    // Clear(long fromTime) instead of clear(int fromIndex) to avoid bad usage
    clear(fromTime: number): void;

    size(): number;

    shortName: string;
    longName: string;
    displayName: string;

    //validate(): void;


    createOrReset(time: number): void;
    addToVar(name: string, value: TVal): TSer
    addAllToVar(name: string, values: TVal[]): TSer

    // Should only trust TSer to translate row <-> time properly.
    indexOfTime(time: number): number
    timeOfIndex(idx: number): number

    timeOfRow(row: number): number
    rowOfTime(time: number): number
    lastOccurredRow(): number

    isOnCalendarMode: boolean
    toOnCalendarMode(): void
    toOnOccurredMode(): void
}
