import type { CIterator } from "../collection/CIterator";
import type { Collection } from "../collection/Collection";
import { ValueList } from "../collection/ValueList";
import { TFrame } from "./TFrame";

export abstract class TStamps extends ValueList<number> {
    static readonly LONG_LONG_AGO = new Date(Date.UTC(1900, 0, 0, 0, 0, 0)).getTime();

    static of(tframe: TFrame, tzone: string, capacity: number): TStamps {
        return new TStampsOnOccurred(tframe, tzone, capacity);
    }

    timeframe: TFrame;
    timezone: string;

    constructor(tframe: TFrame, tzone: string, capacity: number) {
        super(capacity);
        this.timeframe = tframe;
        this.timezone = tzone;
    }

    // private final ReentrantReadWriteLock readWriteLock = new ReentrantReadWriteLock();

    // final ReadLock readLock = readWriteLock.readLock();
    // final WriteLock writeLock = readWriteLock.writeLock();

    // final TStampsLog log;

    abstract isOnCalendar(): boolean;

    abstract asOnCalendar(): TStamps;

    /**
     * Get nearest row that can also properly extends before firstOccurredTime or after
     * lastOccurredTime
     *
     * @param time
     * @return
     */
    abstract rowOfTime(time: number): number;

    abstract timeOfRow(row: number): number;

    abstract lastRow(): number;

    abstract indexOfOccurredTime(time: number): number;

    /**
     * Search the nearest index between '1' to 'lastIndex - 1' We only need to use this computing in
     * case of onOccurred.
     *
     * @param time
     * @return
     */
    abstract nearestIndexOfOccurredTime(time: number): number;

    /**
     * @param time the time, inclusive
     * @return index of nearest behind time (include this time (if exist)),
     */
    abstract indexOrNextIndexOfOccurredTime(time: number): number;

    /**
     * @param time the time, inclusive
     * @return index of nearest before or equal(if exist) time
     */
    abstract indexOrPrevIndexOfOccurredTime(time: number): number;

    abstract firstOccurredTime(): number;

    abstract lastOccurredTime(): number;

    abstract timeIterator(): TStampsIterator;

    abstract timeIterator(fromTime: number, toTime: number): TStampsIterator;

    abstract reversedOne(): TStamps;
}


export interface TStampsIterator {

    hasNext(): boolean;

    next(): number;

    hasPrev(): boolean;

    prev(): number;

    nextOccurredIndex(): number;

    prevOccurredIndex(): number;

    nextRow(): number;

    prevRow(): number;
}

export class TStampsOnOccurred extends TStamps {

    constructor(tframe: TFrame, tzone: string, capacity: number) {
        super(tframe, tzone, capacity);
    }

    #onCalendarShadow = new TStampsOnCalendar(this);

    isOnCalendar(): boolean {
        return false;
    }

    asOnCalendar(): TStamps {
        return this.#onCalendarShadow;
    }

    /**
     * Get nearest row that can also properly extends before firstOccurredTime or after
     * lastOccurredTime
     */
    rowOfTime(time: number): number {
        const lastOccurredIdx = this.size() - 1;
        if (lastOccurredIdx === -1) {
            return -1;
        }

        const firstOccurredTime = this.get(0);
        const lastOccurredTime = this.get(lastOccurredIdx);
        if (time <= firstOccurredTime) {
            return this.timeframe.nTimeframesBetween(firstOccurredTime, time, this.timezone);
        } else if (time >= lastOccurredTime) {
            /**
             * @NOTICE The number of bars of onOccurred between first-last is different than onCalendar,
             * so we should count from lastOccurredIdx in case of onOccurred. so, NEVER try: <code>
             * return timeframe.nTimeframsBetween(firstOccurredTime, time);</code> in case of onOccurred
             */
            return lastOccurredIdx + this.timeframe.nTimeframesBetween(lastOccurredTime, time, this.timezone);
        } else {
            return this.nearestIndexOfOccurredTime(time);
        }
    }

    /** This is an efficient method */

    timeOfRow(row: number): number {
        const lastOccurredIdx = this.size() - 1;
        if (lastOccurredIdx < 0) {
            return 0;
        }

        const firstOccurredTime = this.get(0);
        const lastOccurredTime = this.get(lastOccurredIdx);
        if (row < 0) {
            return this.timeframe.timeAfterNTimeframes(firstOccurredTime, row, this.timezone);
        } else if (row > lastOccurredIdx) {
            return this.timeframe.timeAfterNTimeframes(lastOccurredTime, row - lastOccurredIdx, this.timezone);
        } else {
            return this.get(row);
        }
    }


    lastRow(): number {
        const lastOccurredIdx = this.size() - 1;
        return lastOccurredIdx;
    }

    indexOfOccurredTime(time: number): number {
        const size1 = this.size();
        if (size1 === 0) {
            return -1;
        } else if (size1 === 1) {
            if (this.get(0) === time) {
                return 0;
            } else {
                return -1;
            }
        }

        let from = 0;
        let to = size1 - 1;
        let length = to - from;
        while (length > 1) {
            length = Math.floor(length / 2);
            const midTime = this.get(from + length);
            if (time > midTime) {
                from += length;
            } else if (time < midTime) {
                to -= length;
            } else {
                /** time == midTime */
                return from + length;
            }
            length = to - from;
        }

        /**
         * if we reach here, that means the time should between (start) and (start + 1), and the
         * length should be 1 (end - start). So, just do following checking, if can't get exact index,
         * just return -1.
         */
        if (time === this.get(from)) {
            return from;
        } else if (time === this.get(from + 1)) {
            return from + 1;
        } else {
            return -1;
        }
    }

    /**
     * Search the nearest index between '1' to 'lastIndex - 1' We only need to use this computing in
     * case of onOccurred.
     */

    nearestIndexOfOccurredTime(time: number): number {
        let from = 0;
        let to = this.size() - 1;
        let length = to - from;
        while (length > 1) {
            length = Math.floor(length / 2);
            const midTime = this.get(from + length);
            if (time > midTime) {
                from += length;
            } else if (time < midTime) {
                to -= length;
            } else {
                /** time == midTime */
                return from + length;
            }
            length = to - from;
        }

        /**
         * if we reach here, that means the time should between (start) and (start + 1), and the
         * length should be 1 (end - start). So, just do following checking, if can't get exact index,
         * just return nearest one: 'start'
         */
        if (time === this.get(from)) {
            return from;
        } else if (time === this.get(from + 1)) {
            return from + 1;
        } else {
            return from;
        }
    }

    /**
     * return index of nearest behind time (include this time (if exist)),
     *
     * @param time the time, inclusive
     */

    indexOrNextIndexOfOccurredTime(time: number): number {
        const size1 = this.size();
        if (size1 === 0) {
            return -1;
        } else if (size1 === 1) {
            if (this.get(0) >= time) {
                return 0;
            } else {
                return -1;
            }
        }

        let from = 0;
        let to = size1 - 1;
        let length = to - from;
        while (length > 1) {
            length = Math.floor(length / 2);
            const midTime = this.get(from + length);
            if (time > midTime) {
                from += length;
            } else if (time < midTime) {
                to -= length;
            } else {
                /** time == midTime */
                return from + length;
            }
            length = to - from;
        }

        /**
         * if we reach here, that means the time should between (from) and (from + 1), and the
         * 'length' should be 1 (end - start). So, just do following checking. If can't get exact
         * index, just return invalid value -1
         */
        if (this.get(from) >= time) {
            return from;
        } else if (this.get(from + 1) >= time) {
            return from + 1;
        } else {
            return -1;
        }
    }

    /** return index of nearest before or equal(if exist) time */

    indexOrPrevIndexOfOccurredTime(time: number): number {
        const size1 = this.size();
        if (size1 === 0) {
            return -1;
        } else if (size1 === 1) {
            if (this.get(0) <= time) {
                return 0;
            } else {
                return -1;
            }
        }

        let from = 0;
        let to = size1 - 1;
        let length = to - from;
        while (length > 1) {
            length = Math.floor(length / 2);
            const midTime = this.get(from + length);
            if (time > midTime) {
                from += length;
            } else if (time < midTime) {
                to -= length;
            } else {
                /** time == midTime */
                return from + length;
            }
            length = to - from;
        }

        /**
         * if we reach here, that means the time should between (from) and (from + 1), and the
         * 'length' should be 1 (end - start). So, just do following checking. If can't get exact
         * index, just return invalid -1.
         */
        if (this.get(from + 1) <= time) {
            return from + 1;
        } else if (this.get(from) <= time) {
            return from;
        } else {
            return -1;
        }
    }


    firstOccurredTime(): number {
        const size1 = this.size();
        return size1 > 0 ? this.get(0) : 0;
    }


    lastOccurredTime(): number {
        const size1 = this.size();
        return size1 > 0 ? this.get(size1 - 1) : 0;
    }


    timeIterator(): TStampsIterator {
        return new ItrOnOccurred(this);
    }


    timeIterator2(fromTime: number, toTime: number): TStampsIterator {
        return new ItrOnOccurred(this, fromTime, toTime);
    }

    // --- methods inherited from traits
    result(): TStampsOnOccurred {
        return this;
    }


    reversedOne(): TStampsOnOccurred {
        const n = this.size();
        const reversed = new TStampsOnOccurred(this.timeframe, this.timezone, n);
        for (let i = 0; i < n; i++) {
            reversed.add(this.get(n - 1 - i));
        }

        return reversed;
    }

    // TStamps clone() {
    //   const newOne = new TStampsOnOccurred(size());
    //   newOne.addAll(this);
    //   return newOne;
    // }

}

class ItrOnOccurred implements TStampsIterator {
    #outer: TStampsOnOccurred;

    #timeframe: TFrame;
    #cursorTime: number;
    #expectedModCount: number

    fromTime: number;
    toTime: number;

    /** Reset to LONG_LONG_AGO if this element is deleted by a call to remove. */
    #lastReturnTime: number = TStamps.LONG_LONG_AGO;

    /** Row of element to be returned by subsequent call to next. */
    #cursorRow = 0;

    /**
     * Index of element returned by most recent call to next or previous. Reset to -1 if this
     * element is deleted by a call to remove.
     */
    #lastRet = -1;

    constructor(outer: TStampsOnOccurred, fromTime?: number, toTime?: number) {
        this.#outer = outer;
        this.#timeframe = outer.timeframe;
        this.fromTime = fromTime === undefined
            ? outer.firstOccurredTime()
            : outer.timeframe.trunc(fromTime, this.#outer.timezone);
        this.toTime = toTime === undefined
            ? outer.lastOccurredTime()
            : toTime;
        this.#cursorTime = this.fromTime;
        this.#expectedModCount = this.#outer.modCount;
    }

    hasNext(): boolean {
        return this.#cursorTime <= this.toTime;
    }

    next(): number {
        this.#checkForComodification();
        try {
            this.#cursorRow++;
            const next = (this.#cursorRow >= this.#outer.size())
                ? this.#timeframe.nextTime(this.#cursorTime, this.#outer.timezone)
                : this.#outer.get(this.#cursorRow);
            this.#cursorTime = next;
            this.#lastReturnTime = this.#cursorTime;
            return next;

        } catch (e) {
            this.#checkForComodification();
            throw new Error("NoSuchElementException");
        }
    }

    #checkForComodification() {
        if (this.#outer.modCount !== this.#expectedModCount) {
            throw new Error("ConcurrentModificationException");
        }
    }

    hasPrev(): boolean {
        return this.#cursorTime >= this.fromTime;
    }

    prev(): number {
        this.#checkForComodification();
        try {
            this.#cursorRow--;
            const prev1 = this.#cursorRow < 0
                ? this.#timeframe.prevTime(this.#cursorTime, this.#outer.timezone)
                : this.#outer.get(this.#cursorRow);
            this.#cursorTime = prev1;
            this.#lastReturnTime = this.#cursorTime;
            return prev1;
        } catch (e) {
            this.#checkForComodification();
            throw new Error("NoSuchElementException");
        }
    }

    nextOccurredIndex(): number {
        return this.#outer.indexOrNextIndexOfOccurredTime(this.#cursorTime);
    }

    prevOccurredIndex(): number {
        return this.#outer.indexOrPrevIndexOfOccurredTime(this.#cursorTime);
    }

    nextRow(): number {
        return this.#cursorRow;
    }

    prevRow(): number {
        return this.#cursorRow - 1;
    }
}


/**
 * A shadow and extra lightweight class for Timestamps, it will be almost the same instance as
 * delegateTimestamps, especially shares the elements data. Except its isOnCalendar() always
 * return true. Why not to use Proxy.class ? for performance reason.
 */
export class TStampsOnCalendar extends TStamps {

    #delegateTimestamps: TStamps;

    constructor(delegateTimestamps: TStamps) {
        super(delegateTimestamps.timeframe, delegateTimestamps.timezone, 1024);
        this.#delegateTimestamps = delegateTimestamps;
    }

    /**
     * the timestamps to be wrapped, it not necessary to be a TimestampsOnOccurred, any class
     * implemented Timestamps is ok.
     */

    isOnCalendar(): boolean {
        return true;
    }

    asOnCalendar(): TStamps {
        return this.#delegateTimestamps.asOnCalendar();
    }

    /**
     * Get nearest row that can also properly extends before firstOccurredTime or after
     * lastOccurredTime
     */

    rowOfTime(time: number): number {
        const lastOccurredIdx = this.size() - 1;
        if (lastOccurredIdx === -1) {
            return -1;
        } else {
            const firstOccurredTime = this.get(0);
            return this.timeframe.nTimeframesBetween(firstOccurredTime, time, this.timezone);
        }
    }

    /** This is an efficient method */

    timeOfRow(row: number): number {
        const lastOccurredIdx = this.size() - 1;
        if (lastOccurredIdx < 0) {
            return 0;
        } else {
            const firstOccurredTime = this.get(0);
            return this.timeframe.timeAfterNTimeframes(firstOccurredTime, row, this.timezone);
        }
    }

    lastRow(): number {
        const lastOccurredIdx = this.size() - 1;
        if (lastOccurredIdx < 0) {
            return 0;
        } else {
            const firstOccurredTime = this.get(0);
            const lastOccurredTime = this.get(lastOccurredIdx);
            return this.timeframe.nTimeframesBetween(firstOccurredTime, lastOccurredTime, this.timezone);
        }
    }

    /** -------------------------------------------- */

    indexOfOccurredTime(time: number): number {
        return this.#delegateTimestamps.indexOfOccurredTime(time);
    }

    nearestIndexOfOccurredTime(time: number): number {
        return this.#delegateTimestamps.nearestIndexOfOccurredTime(time);
    }

    indexOrNextIndexOfOccurredTime(time: number): number {
        return this.#delegateTimestamps.indexOrNextIndexOfOccurredTime(time);
    }

    /** return index of nearest before or equal (if exist) time */
    indexOrPrevIndexOfOccurredTime(time: number): number {
        return this.#delegateTimestamps.indexOrPrevIndexOfOccurredTime(time);
    }

    firstOccurredTime(): number {
        return this.#delegateTimestamps.firstOccurredTime();
    }

    lastOccurredTime(): number {
        return this.#delegateTimestamps.lastOccurredTime();
    }

    size(): number {
        return this.#delegateTimestamps.size();
    }

    timeIterator(): TStampsIterator {
        return new ItrOnCalendar(this);
    }

    timeIterator2(fromTime: number, toTime: number): TStampsIterator {
        return new ItrOnCalendar(this, fromTime, toTime);
    }

    isEmpty(): boolean {
        return this.#delegateTimestamps.isEmpty();
    }

    iterator(): CIterator<number> {
        return this.#delegateTimestamps.iterator();
    }

    toArray(): number[] {
        return this.#delegateTimestamps.toArray();
    }

    toSlice(offset: number, len: number): number[] {
        return this.#delegateTimestamps.toSlice(offset, len);
    }

    containsAll(collection: Collection<number>): boolean {
        return this.#delegateTimestamps.containsAll(collection);
    }

    add(value: number): boolean {
        return this.#delegateTimestamps.add(value);
    }

    addAll(collection: Collection<number>): boolean {
        return this.#delegateTimestamps.addAll(collection);
    }

    addAllArray(array: number[]): boolean {
        return this.#delegateTimestamps.addAllArray(array);
    }

    insert(offset: number, value: number) {
        this.#delegateTimestamps.insert(offset, value);
    }

    insertAll(offset: number, values: Collection<number>): boolean {
        return this.#delegateTimestamps.insertAll(offset, values);
    }

    insertAllArray(offset: number, array: number[]): boolean {
        return this.#delegateTimestamps.insertAllArray(offset, array);
    }

    remove(value: number): boolean {
        return this.#delegateTimestamps.remove(value);
    }

    removeMultiple(offset: number, length: number) {
        this.#delegateTimestamps.removeMultiple(offset, length);
    }

    contains(value: number): boolean {
        return this.#delegateTimestamps.contains(value);
    }

    clear() {
        this.#delegateTimestamps.clear();
    }

    // boolean equals(Object o) {
    //   return delegateTimestamps.equals(o);
    // }


    // int hashCode() {
    //   return delegateTimestamps.hashCode();
    // }

    get(offset: number): number {
        return this.#delegateTimestamps.get(offset);
    }

    set(offset: number, value: number): number {
        return this.#delegateTimestamps.set(offset, value);
    }

    subList(fromIndex: number, toIndex: number): ValueList<number> {
        return this.#delegateTimestamps.subList(fromIndex, toIndex);
    }

    indexOf(value: number): number {
        return this.#delegateTimestamps.indexOf(value);
    }

    lastIndexOf(value: number): number {
        return this.#delegateTimestamps.lastIndexOf(value);
    }

    // TStampsOnCalendar clone() {
    //   return new TStampsOnCalendar(delegateTimestamps.clone());
    // }

    reversedOne(): TStamps {
        return new TStampsOnCalendar(this.#delegateTimestamps.reversedOne());
    }

}

class ItrOnCalendar implements TStampsIterator {
    #outer: TStampsOnCalendar;
    #timeframe: TFrame;
    #cursorTime: number;
    fromTime: number;
    toTime: number;

    /** Reset to LONG_LONG_AGO if this element is deleted by a call to remove. */
    #lastReturnTime: number = TStamps.LONG_LONG_AGO;

    /** Row of element to be returned by subsequent call to next. */
    #cursorRow = 0;

    /**
     * Index of element returned by most recent call to next or previous. Reset to -1 if this
     * element is deleted by a call to remove.
     */
    #lastRet = -1;

    /**
     * The modCount value that the iterator believes that the backing List should have. If this
     * expectation is violated, the iterator has detected concurrent modification.
     */
    #expectedModCount: number;

    constructor(outer: TStampsOnCalendar, fromTime?: number, toTime?: number) {
        this.#outer = outer;
        this.#timeframe = outer.timeframe;
        this.fromTime = fromTime === undefined
            ? outer.firstOccurredTime()
            : outer.timeframe.trunc(fromTime, outer.timezone);
        this.toTime = toTime === undefined
            ? outer.lastOccurredTime()
            : toTime;
        this.#cursorTime = this.fromTime;
        this.#expectedModCount = this.#outer.modCount;
    }

    hasNext(): boolean {
        return this.#cursorTime <= this.toTime;
    }

    next(): number {
        this.#checkForComodification();
        try {
            this.#cursorRow++;
            const next = this.#timeframe.nextTime(this.#cursorTime, this.#outer.timezone);
            this.#cursorTime = next;
            this.#lastReturnTime = this.#cursorTime;
            return next;
        } catch (e) {
            this.#checkForComodification();
            throw new Error("NoSuchElementException");
        }
    }

    #checkForComodification() {
        if (this.#outer.modCount != this.#expectedModCount) {
            throw new Error("ConcurrentModificationException");
        }
    }

    hasPrev(): boolean {
        return this.#cursorTime >= this.fromTime;
    }

    prev(): number {
        this.#checkForComodification();
        try {
            this.#cursorRow--;
            const prev1 = this.#timeframe.prevTime(this.#cursorTime, this.#outer.timezone);
            this.#cursorTime = prev1;
            this.#lastReturnTime = this.#cursorTime;
            return prev1;
        } catch (e) {
            this.#checkForComodification();
            throw new Error("NoSuchElementException");
        }
    }

    nextOccurredIndex(): number {
        return this.#outer.indexOrNextIndexOfOccurredTime(this.#cursorTime);
    }

    prevOccurredIndex(): number {
        return this.#outer.indexOrPrevIndexOfOccurredTime(this.#cursorTime);
    }

    nextRow(): number {
        return this.#cursorRow;
    }

    prevRow(): number {
        return this.#cursorRow - 1;
    }
}
