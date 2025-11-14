import { TFreq } from "./TFreq";
import { TStamps } from "./TStamps";
import { TVal } from "./TVal";
import { TVar } from "./TVar";

export interface TSer {
  freq: TFreq;
  timeZone: string;
  vars(): Map<string, TVar<TVal>>;
  timestamps(): TStamps;

  valuesCapacity: number;

  isLoaded: boolean;
  isInLoading: boolean;

  isAscending<V extends TVal>(values: V[]): boolean

  addVar(v: TVar<TVal>): void

  // --- for charting

  // horizonal grids of this indicator used to draw grid
  grids: number[]

  isOverlapping: boolean;

  exists(time: number): boolean;

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
}
