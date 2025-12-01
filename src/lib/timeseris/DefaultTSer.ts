import { TFrame } from "./TFrame";
import { TVal } from "./TVal";
import { TVar } from "./TVar";
import { ValueList } from "../collection/ValueList";
import { TStamps } from "./TStamps";
import type { TSer } from "./TSer";

/**
 * This is the default data container, which is a time sorted data contianer.
 *
 * <p>This container has one copy of 'vars' (without null value) for both compact and natural, and
 * with two time positions: 'timestamps', and 'calendarTimes' the 'timestamps' is actaully with the
 * same idx corresponding to 'vars'
 *
 * <p>This class implements all interface of ser and partly TBaseSer. So you can use it as full
 * series, but don't use those methods of TBaseSer except you sub class this.
 *
 * <p>The max capacity of ONE_MIN for trading is 15000 / 240 = 62.5 days, about 3 months The max
 * capacity of ONE_MIN for calendar is 20160 / 1440 = 14 days, 2 weeks The max capacity of DAILY for
 * trading is 15000/ 250 = 60 years. The max capacity of DAILY for calendar is 20160/ 365 = 55
 * years.
 *
 */
export class DefaultTSer implements TSer {
    timeframe: TFrame;
    timezone: string;
    valuesCapacity: number;

    /**
     * we implement occurred timestamps and items in density mode instead of spare mode, to avoid
     * itemOf(time) return null even in case of timestamps has been filled. DefaultItem is a
     * lightweight virtual class, don't worry about the memory occupied.
     *
     * <p>Should only get index from timestamps which has the proper mapping of : position <-> time
     * <-> item
     */
    protected _timestamps: TStamps;


    /** Each var element of array is a Var that contains a sequence of values for one field of Ser. */
    protected _vars: Map<string, TVar<unknown>>

    protected _holders: ValueList<boolean>; // a place holder plus flag

    protected _lname = ""; // Long description 
    protected _sname = ""; // Short description

    isOverlapping = false;

    #isInLoading = false;
    #isLoaded = false;

    constructor(tframe: TFrame, tzone: string, valuesCapacity: number) {
        this.timeframe = tframe;
        this.timezone = tzone;
        this.valuesCapacity = valuesCapacity;
        //assert valuesCapacity >= 2 : "valuesCapacity must >= 2, so as to record and get prev one";

        this._vars = new Map<string, TVar<unknown>>();
        this._timestamps = TStamps.of(tframe, tzone, valuesCapacity);
        this._holders = new ValueList(valuesCapacity);
    }

    timestamps() {
        return this._timestamps;
    }

    vars() {
        return this._vars;
    }

    /**
     *  
     * @param name 
     * @returns var of name, will create one if non exist yet.
     */
    varOf(name: string): TVar<unknown> {
        let tvar = this._vars.get(name);
        if (tvar === undefined) {
            tvar = this.TVar(name, TVar.Kind.Accumlate);
        }

        return tvar;
    }

    /**
     * Used only by InnerVar's constructor and AbstractIndicator's functions
     *
     * @param v
     */
    addVar(name: string, v: TVar<unknown>) {
        // v could be added afterwards, should catch up and keep same size as this TSer
        for (let i = 0; i < this.size(); i++) {
            v.addNull();
        }
        this._vars.set(name, v);
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
        return !this.occurred(time);
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

    occurred(time: number): boolean {
        /**
         * @NOTE: 
         * Should only get index from timestamps which has the proper position <-> time <-> item mapping
         */
        const idx = this._timestamps.indexOfOccurredTime(time);
        return idx >= 0 && idx < this._holders.size();
    }

    longName = this._lname
    shortName = this._sname
    displayName = this.shortName + " - (" + this.longName + ")";

    /**
     * @Note: This function is not thread safe, since tsLogCheckedCursor and tsLogCheckedSize should
     * be atomic accessed/modified during function's running scope so. Should avoid to enter here by
     * multiple actors concurrent
     */
    // validate() {
    //   if (!DefaultTBaseSer.isSupportTStampsLog) {
    //     throw new UnsupportedOperationException(
    //       "Not supported yet until resolve TStampsLog on capacity limited ValueList.");
    //   }
    //   try {
    //     // timestamps.readLock.lock

    //     const tlog = timestamps.log;
    //     const tlogCursor = tlog.logCursor();
    //     var checkingCursor = tsLogCheckedCursor;
    //     while (tlogCursor > -1 && checkingCursor <= tlogCursor) {
    //       boolean cursorMoved;
    //       if (checkingCursor != tsLogCheckedCursor) {
    //         // is checking a new log, should reset tsLogCheckedSize
    //         tsLogCheckedSize = 0;
    //         cursorMoved = true;
    //       } else {
    //         cursorMoved = false;
    //       }

    //       const tlogFlag = tlog.get(checkingCursor);
    //       const tlogCurrSize = tlog.checkSize(tlogFlag);
    //       if (!cursorMoved && tlogCurrSize == tsLogCheckedSize) {
    //         // same log with same size, actually nothing changed
    //       } else {
    //         const logKind = tlog.checkKind(tlogFlag);
    //         switch (logKind) {
    //           case TStampsLog.INSERT: {
    //             const begIdx = tlog.insertIndexOfLog(checkingCursor);

    //             const begIdx1 =
    //               !cursorMoved
    //                 ? // if insert log is a merged one, means the inserts were continually
    //                 // happening one behind one
    //                 begIdx + tsLogCheckedSize
    //                 : begIdx;

    //             const insertSize = !cursorMoved ? tlogCurrSize - tsLogCheckedSize : tlogCurrSize;

    //             const newHolders = new boolean[insertSize];
    //             var i = 0;
    //             while (i < insertSize) {
    //               const time = timestamps.get(begIdx1 + i);
    //               vars().forEach((v) -> v.putNullByTime(time));
    //               newHolders[i] = true; // true
    //               i++;
    //             }
    //             holders.addAll(begIdx1, newHolders, newHolders.length);
    //           }

    //           case TStampsLog.APPEND: {
    //             const begIdx = holders.size();

    //             const appendSize = !cursorMoved ? tlogCurrSize - tsLogCheckedSize : tlogCurrSize;

    //             const newHolders = new boolean[appendSize];
    //             var i = 0;
    //             while (i < appendSize) {
    //               const time = timestamps.get(begIdx + i);
    //               vars().forEach((v) -> v.putNullByTime(time));
    //               newHolders[i] = true; // true
    //               i++;
    //             }
    //             holders.addAll(newHolders, newHolders.length);

    //           }
    //           default: {
    //             assert false : "Unknown log type: " + logKind;
    //           }
    //         }
    //       }

    //       tsLogCheckedCursor = checkingCursor;
    //       tsLogCheckedSize = tlogCurrSize;
    //       checkingCursor = tlog.nextCursor(checkingCursor);
    //     }

    //     // assert timestamps.size() == holders.size()
    //     //     : "Timestamps size="
    //     //         + timestamps.size()
    //     //         + " vs items size="
    //     //         + holders.size()
    //     //         + ", checkedCursor="
    //     //         + tsLogCheckedCursor
    //     //         + ", log="
    //     //         + tlog;

    //   } catch (Throwable ex) {

    //   }
    // }

    clear(fromTime: number) {
        const fromIdx = this._timestamps.indexOrNextIndexOfOccurredTime(fromTime);
        if (fromIdx < 0) {
            return;
        }

        this._vars.forEach((v, _) => v.clearFromIndex(fromIdx));

        const count = this._holders.size() - fromIdx;
        this._holders.removeMultiple(fromIdx, count);

    }

    indexOfOccurredTime(time: number): number {
        return this._timestamps.indexOfOccurredTime(time);
    }

    firstOccurredTime(): number {
        return this._timestamps.firstOccurredTime();
    }

    lastOccurredTime(): number {
        return this._timestamps.lastOccurredTime();
    }

    // toString(): string {
    //   let sb = "";
    //   "${this.shortName}(${this.timeframe}): size={$this.size()},";

    //   sb = sb + this.shortName + "(" + this.timeframe + "): size=" + this.size() + ", ";
    //   if (this.timestamps !== undefined && !this.timestamps().isEmpty()) {
    //     const length = this.timestamps().size();

    //     const fst = this.timestamps().get(0);
    //     const lst = this.timestamps().get(length - 1);
    //     const cal = Util.calendarOf();
    //     cal.setTimeInMillis(fst);
    //     sb.append(cal.getTime());
    //     sb.append(" - ");
    //     cal.setTimeInMillis(lst);
    //     sb.append(cal.getTime());
    //     sb.append(", data=(\n");
    //     for (const v: vars()) {
    //       sb.append("  ").append(v).append(", \n");
    //     }
    //   }
    //   sb.append(")");

    //   return sb.toString();
    // }

    /**
     * Ser may be used as the HashMap key, for efficient reason, we define equals and hashCode method
     * as it:
     *
     * @param o
     */
    // equals(o: any): boolean {
    //   if (this == o) {
    //     return true;

    //   } else {
    //     if (o instanceof TSer that) {
    //       return this.getClass() == that.getClass() && this.hashCode() == that.hashCode();

    //     } else {
    //       return false;
    //     }
    //   }
    // }

    // private _hashCode = System.identityHashCode(this);

    // hashCode(): number {
    //   return _hashCode;
    // }

    TVar<V>(name: string, kind: TVar.Kind): TVar<V> {
        return new TVar<V>(this, name, kind);
    }

    // @todo SparseTVar
    /* protected class SparseTVar[V: ClassTag](
    name: String, val kind: TVar.Kind, val plot: Plot
    ) extends TVar[V] {
     
       addVar(this)
     
     def timestamps = DefaultTSer.this.timestamps
     
     var layer = -1 // -1 means not set
     // @todo: timestamps may be null when go here, use lazy val as a quick fix now, shoule review it
     private lazy val colors = new TStampedMapBasedList[Color](timestamps)
     def getColor(idx: Int) = colors(idx)
     def setColor(idx: Int, color: Color) {
       colors(idx) = color
     }
     
    // @todo: timestamps may be null when go here, use lazy val as a quick fix now, shoule review it
    lazy val values = new TStampedMapBasedList[V](timestamps)
     
    def put(time: Long, value: V): Boolean = {
    val idx = timestamps.indexOfOccurredTime(time)
    if (idx >= 0) {
    values.add(time, value)
    true
    } else {
    assert(false, "Add timestamps first before add an element! " + ": " + "idx=" + idx + ", time=" + time)
    false
    }
    }
     
    def apply(time: Long): V = values(time)
     
    def update(time: Long, value: V) {
    values(time) = value
    }
     
    // @Note, see https://lampsvn.epfl.ch/trac/scala/ticket/2599
    override
    def apply(idx: Int): V = {
    super.apply(idx)
    }
     
    // @Note, see https://lampsvn.epfl.ch/trac/scala/ticket/2599
    override
    def update(idx: Int, value: V) {
    super.update(idx, value)
    }
    } */

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
    addToVar(name: string, value: TVal): TSer {
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
    addAllToVar(name: string, values: TVal[]): TSer {
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

            // shoudReverse: the recent klines's index is more in klines, thus the order in
            // timePositions[] is opposed to klines
            // otherwise:    the recent kline's index is less in klines, thus the order in
            // timePositions[] is the same as klines
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

    // TODO, holder.size or timestamps.size ?
    size(): number {
        return this.#activeTimestamps().size();
    }

    #activeTimestamps(): TStamps {
        return this.isOnCalendarMode ? this._timestamps.asOnCalendar() : this._timestamps;
    }

}

