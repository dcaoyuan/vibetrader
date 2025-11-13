import { TSer } from "./TSer";
import { TVal } from "./TVal";

export interface BaseTSer extends TSer {

  // Only BaseTSer can have methods that explictly add value
  createOrReset(time: number): void;
  addAll<V extends TVal>(values: V[]): TSer

  // Should only trust BaseTSer to translate row <-> time properly.
  indexOfTime(time: number): number
  timeOfIndex(idx: number): number

  timeOfRow(row: number): number
  rowOfTime(time: number): number
  lastOccurredRow(): number

  isOnCalendarMode: boolean
  toOnCalendarMode(): void
  toOnOccurredMode(): void

}