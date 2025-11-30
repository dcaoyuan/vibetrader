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

  // --- for charting

  // horizonal grids of this indicator used to draw grid
  grids: number[]

  isOverlapping: boolean;

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
}
