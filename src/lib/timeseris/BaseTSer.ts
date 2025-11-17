import type { TSer } from "./TSer";
import { TVal } from "./TVal";

export interface BaseTSer extends TSer {

  // Only BaseTSer can have methods that explictly add value
  createOrReset(time: number): void;
  addToVar(name: string, value: TVal): BaseTSer
  addAllToVar(name: string, values: TVal[]): BaseTSer

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