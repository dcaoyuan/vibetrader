import { TFreq } from "./TFreq";
import { TSer } from "./TSer";
import { TStamps } from "./TStamps";
import { TVal } from "./TVal";
import { TVar } from "./TVar";

export abstract class AbstractTSer implements TSer {
  freq: TFreq;
  timeZone: string;

  /** Each var element of array is a Var that contains a sequence of values for one field of Ser. */
  protected _vars: Map<string, TVar<unknown>>
  vars() {
    return this._vars;
  }

  /**
   * we implement occurred timestamps and items in density mode instead of spare mode, to avoid
   * itemOf(time) return null even in case of timestamps has been filled. DefaultItem is a
   * lightweight virtual class, don't worry about the memory occupied.
   *
   * <p>Should only get index from timestamps which has the proper mapping of : position <-> time
   * <-> item
   */
  protected _timestamps: TStamps;
  timestamps() {
    return this._timestamps;
  }

  constructor(freq: TFreq, timeZone: string, timestamps: TStamps) {
    this.freq = freq;
    this.timeZone = timeZone;
    this._vars = new Map<string, TVar<unknown>>();
    this._timestamps = timestamps;
  }

  isOverlapping = false;

  #isInLoading = false;
  #isLoaded = false;

  /**
   * Used only by InnerVar's constructor and AbstractIndicator's functions
   *
   * @param v
   */
  addVar(v: TVar<unknown>) {

    // v could be added afterwards, should catch up and keep same size as this TSer
    for (let i = 0; i < this.size(); i++) {
      v.addNull();
    }
    this._vars.set("v.name()", v);

  }

  /** --- for charting horizontal grids of this indicator used to draw grid */
  grids: number[] = [];

  get isLoaded() {
    return this.#isLoaded;
  }
  set isLoaded(b: boolean) {
    if (b) {
      this.#isInLoading = false;
    }
    this.isLoaded = b;
  }

  get isInLoading() {
    return this.#isInLoading;
  }
  set isInLoading(b: boolean) {
    if (b) {
      this.isLoaded = false;
    }
    this.#isInLoading = b;
  }

  nonExists(time: number): boolean {
    return !this.exists(time);
  }

  isAscending<V extends TVal>(values: V[]): boolean {
    const size = values.length;
    if (size <= 1) {
      return true;

    } else {
      let i = 0;
      while (i < size - 1) {
        if (values[i].time < values[i + 1].time) {
          return true;

        } else if (values[i].time > values[i + 1].time) {
          return false;
        }

        i++;
      }

      return false;
    }
  }

  abstract exists(time: number): boolean;

  abstract firstOccurredTime(): number;
  abstract lastOccurredTime(): number;
  abstract indexOfOccurredTime(time: number): number;

  /** clear(long fromTime) instead of clear(int fromIndex) to avoid bad usage */
  abstract clear(fromTime: number): void;

  abstract size(): number;

  abstract shortName: string;
  abstract longName: string;
  abstract displayName: string;
}
