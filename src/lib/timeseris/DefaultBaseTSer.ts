import type { BaseTSer } from "./BaseTSer";
import { DefaultTSer } from "./DefaultTSer";
import { TFrame } from "./TFrame";
import { TStamps } from "./TStamps";
import { TVal } from "./TVal";

export class DefaultBaseTSer extends DefaultTSer implements BaseTSer {

  constructor(tframe: TFrame, tzone: string, valuesCapacity: number) {
    super(tframe, tzone, TStamps.of(tframe, tzone, valuesCapacity), valuesCapacity);
  }

  isOnCalendarMode = false;

  // private _lazy_idToFunction: Map<Id<Function>, Function> = undefined as any;

  // private idToFunction(): Map<Id<Function>, Function> {
  //   if (this._lazy_idToFunction == undefined) {
  //     this._lazy_idToFunction = new Map<>();
  //   }
  //   return this._lazy_idToFunction;
  // }

  // private _lazy_idToIndicator: Map<Id<Indicator>, Indicator> = undefined as any;

  // private idToIndicator(): Map<Id<Indicator>, Indicator> {
  //   if (this._lazy_idToIndicator == undefined) {
  //     this._lazy_idToIndicator = new ConcurrentHashMap<>(8, 0.9f, 1);
  //   }
  //   return this._lazy_idToIndicator;
  // }


  // func<T extends Function>(functionClass: Class<T>, ...args: any[]): T {
  //   const id = Id.of(functionClass, this, args);
  //   let func = this.idToFunction().get(id);
  //   if (func === undefined) {
  //     /** if got none from idToFunction, try to create new one */
  //     try {
  //       func = Reflect.instantiate(functionClass, args);
  //       this.idToFunction().putIfAbsent(id, func);
  //       return func;

  //     } catch (ex) {
  //       console.error(ex);
  //       return undefined as T;
  //     }

  //   } else {
  //     return func;
  //   }
  // }

  // indicator<T extends Indicator>(indicatorClass: Class<T>, ...factors: Factor[]): T {
  //   const id = Id.of(indicatorClass, this, (Object[]) factors);
  //   let indicator = this.idToIndicator().get(id);
  //   if (indicator === undefined) {
  //     /** if got none from idToFunction, try to create new one */
  //     try {
  //       indicator = Reflect.instantiate(indicatorClass, (Object[]) factors);
  //       // indicator.factors = factors.toArray // set factors first to avoid multiple computeFrom(0)
  //       /** don't forget to call set(baseSer) immediately */
  //       this.idToIndicator().putIfAbsent(id, indicator);
  //       indicator.computeFrom(0);

  //       return indicator;

  //     } catch (ex) {
  //       console.error(ex);
  //       return undefined as T;
  //     }

  //   } else {
  //     return indicator;
  //   }
  // }

  /*-
   * !NOTE
   * This should be the only place to create an Item from outside, because it's
   * a bit complex to finish an item creating procedure, the procedure contains
   * at least 3 steps:
   * 1. create a clear holder, which with clear = true, and idx to be set
   *    later by holders;
   * 2. add the time to timestamps properly.
   * @see #internal_addClearItemAndNullVarValuesToList_And_Filltimestamps__InTimeOrder(long, SerItem)
   * 3. add null value to vars at the proper idx.
   * @see #internal_addTime_addClearItem_addNullVarValues()
   *
   * So we do not try to provide other public methods such as addItem() that can
   * add item from outside, you should use this method to create a new (a clear)
   * item and return it, or just clear it, if it has be there.
   * And that why define some motheds signature begin with internal_, becuase
   * you'd better never think to open these methods to protected or public.
   * @return Returns the index of time.
   */
  createOrReset(time: number) {
    /**
     * @NOTE: Should only get index from timestamps which has the proper position <-> time <->
     * item mapping
     */
    const idx = this._timestamps.indexOfOccurredTime(time);
    if (idx >= 0 && idx < this._holders.size()) {
      // existed, reset it
      this._vars.forEach((v, _) => v.resetByIndex(idx));
      this._holders.set(idx, false);

    } else {
      // append at the end: create a new one, add placeholder
      this.#internal_addItem_fillTimestamps_inTimeOrder(time, true);
    }
  }

  createWhenNonExist(time: number) {
    /**
     * @NOTE: Should only get index from timestamps which has the proper position <-> time <->
     * item mapping
     */
    const idx = this._timestamps.indexOfOccurredTime(time);
    if (idx >= 0 && idx < this._holders.size()) {
      // noop
    } else {
      // append at the end: create a new one, add placeholder
      this.#internal_addItem_fillTimestamps_inTimeOrder(time, true);
    }
  }

  /**
   * Add a Null item and corresponding time in time order, should process time position (add time to
   * timestamps orderly). Support inserting time/clearItem pair in random order
   *
   * @param time
   * @param clearItem
   */
  #internal_addItem_fillTimestamps_inTimeOrder(time: number, holder: boolean): number {
    // @Note: writeLock timestamps only when insert/append it
    const lastOccurredTime = this._timestamps.lastOccurredTime();
    if (time < lastOccurredTime) {
      const existIdx = this._timestamps.indexOfOccurredTime(time);
      if (existIdx >= 0) {
        this._vars.forEach((v, _) => v.putNullByTime(time));
        // as timestamps includes this time, we just always put in a none-null item
        this._holders.insert(existIdx, holder);

        return existIdx;

      } else {
        const idx = this._timestamps.indexOrNextIndexOfOccurredTime(time);
        //assert idx >= 0 : "Since itemTime < lastOccurredTime, the idx=" + idx + " should be >= 0";

        // (time at idx) > itemTime, insert this new item at the same idx, so the followed elems
        // will be pushed behind

        // should add timestamps first
        this._timestamps.insert(idx, time);

        this._vars.forEach((v, _) => v.putNullByTime(time));
        this._holders.insert(idx, holder);

        return idx;

        // TODO Don't remove it currently.
        // if (timestamps.size > MAX_DATA_SIZE){
        //   val length = timestamps.size - MAX_DATA_SIZE
        //   clearUntilIndex(length)
        // }
      }

    } else if (time > lastOccurredTime) {
      // time > lastOccurredTime, just append it behind the last:

      // should append timestamps first
      this._timestamps.add(time);

      this._vars.forEach((v, _) => v.addNull());
      this._holders.add(holder);

      return this.size() - 1;

      // TODO Don't remove it currently.
      // if (timestamps.size > MAX_DATA_SIZE){
      //   val length = timestamps.size - MAX_DATA_SIZE
      //   clearUntilIndex(length)
      // }

    } else {
      // time == lastOccurredTime, keep same time and append vars and holders.
      const existIdx = this._timestamps.indexOfOccurredTime(time);
      if (existIdx >= 0) {
        this._vars.forEach((v, _) => v.putNullByTime(time));
        this._holders.add(holder);

        return this.size() - 1;

      } else {
        console.error(
          "As it's an adding action, we should not reach here! "
          + "Check your code, you are probably from createOrReset(long), "
          + "Does timestamps.indexOfOccurredTime(itemTime) = "
          + this._timestamps.indexOfOccurredTime(time)
          + " return -1 ?");
        return -1;
        // to avoid concurrent conflict, just do nothing here.
      }
    }
  }

  clearUntilIndex(idx: number) {
    this._timestamps.removeMultiple(0, idx);
    this._holders.removeMultiple(0, idx);
  }

  /**
   * Append TVal to var in ser. 
   *
   * @param var name
   * @param values
   * @return self
   */
  addToVar(name: string, value: TVal): BaseTSer {
    const theVar = this.varOf(name);
    const time = this.timeframe.trunc(value.time, this.timezone);
    if (!this.occurred(time)) {
      this.createOrReset(time);
    }
    theVar.setByTime(time, value);

    return this;
  }

  /**
   * Append TVals to var in ser. 
   *
   * @param var name
   * @param values
   * @return self
   */
  addAllToVar(name: string, values: TVal[]): BaseTSer {
    if (values.length === 0) {
      return this;
    }

    const theVar = this.varOf(name);

    let frTime = Number.MAX_SAFE_INTEGER;
    let toTime = Number.MIN_SAFE_INTEGER;

    const lenth = values.length;
    const shouldReverse = !this.isAscending(values);
    let i = shouldReverse ? lenth - 1 : 0;
    while (i >= 0 && i < lenth) {
      const value = values[i];
      if (value !== undefined) {
        const time = this.timeframe.trunc(value.time, this.timezone);
        this.createOrReset(time);
        theVar.setByTime(time, value);

        frTime = Math.min(frTime, time);
        toTime = Math.max(toTime, time);
      }

      // shoudReverse: the recent quote's index is more in quotes, thus the order in
      // timePositions[] is opposed to quotes
      // otherwise:    the recent quote's index is less in quotes, thus the order in
      // timePositions[] is the same as quotes
      if (shouldReverse) {
        i--;

      } else {
        i++;
      }
    }

    return this;
  }

  toOnCalendarMode() {
    this.isOnCalendarMode = true;
  }

  toOnOccurredMode() {
    this.isOnCalendarMode = false;
  }

  indexOfTime(time: number): number {
    return this.#activeTimestamps().indexOfOccurredTime(time);
  }

  timeOfIndex(idx: number): number {
    return this.#activeTimestamps().get(idx);
  }

  rowOfTime(time: number): number {
    return this.#activeTimestamps().rowOfTime(time);
  }

  timeOfRow(row: number): number {
    return this.#activeTimestamps().timeOfRow(row);
  }

  lastOccurredRow(): number {
    return this.#activeTimestamps().lastRow();
  }

  size(): number {
    return this.#activeTimestamps().size();
  }

  #activeTimestamps(): TStamps {
    return this.isOnCalendarMode ? this._timestamps.asOnCalendar() : this._timestamps;
  }
}
