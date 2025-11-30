import type { CIterator } from "../collection/CIterator";
import { ValueList } from "../collection/ValueList";
import type { BaseTSer } from "./BaseTSer";
import { TStamps } from "./TStamps";

/**
 * A horizontal view of Ser.It's a reference of one of the field vars. V is the type of value
 * 
 */
export class TVar<V> {
  belongsTo: BaseTSer;
  #values: ValueList<V>;

  readonly name: string;
  readonly kind?: TVar.Kind;

  constructor(belongsTo: BaseTSer, name: string, kind: TVar.Kind) {
    this.belongsTo = belongsTo;
    this.kind = kind;
    this.name = name;
    this.#values = new ValueList<V>(this.belongsTo.valuesCapacity);
    belongsTo.addVar(name, this);
  }

  values(): ValueList<V> {
    return this.#values;
  }

  timestamps(): TStamps {
    return this.belongsTo.timestamps();
  }

  occurred(time: number) {
    return this.belongsTo.occurred(time);
  }

  /**
   * @return true if it's an instant variable, or false if it's an accumulate variable.
   */
  isInstant(): boolean {
    return !this.isAccumulate();
  }

  isAccumulate(): boolean {
    return this.kind === TVar.Kind.Accumlate;
  }

  putByTime(time: number, value: V): boolean {
    const idx = this.timestamps().indexOfOccurredTime(time);
    if (idx >= 0) {
      // TODO. for limited capacity values, no change idx == values().size()
      if (idx == this.values().size()) {
        this.values().add(value);

      } else {
        this.values().insert(idx, value);
      }

      return true;

    } else {
      // assert false
      //     : "Fill timestamps first before put an element! "
      //         + ": "
      //         + "idx="
      //         + idx
      //         + ", time="
      //         + time;
      return false;
    }
  }

  putByIndex(idx: number, value: V): boolean {
    this.values().insert(idx, value);
    return true;
  }

  add(value: V): boolean {
    return this.values().add(value);
  }

  getByTime(time: number): V {
    const idx = this.timestamps().indexOfOccurredTime(time);
    return this.values().get(idx);
  }

  setByTime(time: number, value: V) {
    const idx = this.timestamps().indexOfOccurredTime(time);
    this.values().set(idx, value);
  }

  // plot = Plot.None;
  // layer = -1; // -1 means not set

  // // @todo: timestamps may be null when go here, use lazy val as a quick fix now, shoule review it
  // private _lazy_colors: TStampedMapBasedList<Color> = undefined as any;

  // private get colors(): TStampedMapBasedList<Color> {
  //   if (this._lazy_colors === undefined) {
  //     _lazy_colors = new TStampedMapBasedList<>(Color.class, timestamps);
  //   }
  //   return _lazy_colors;
  // }

  // getColor(idx: number): Color {
  //   return this.colors.get(idx);
  // }

  // setColor(idx: number, color: Color) {
  //   this.colors.set(idx, color);
  // }

  /**
   * This method will never return null, return a nullValue at least.
   *
   * @param idx
   * @return
   */
  getByIndex(idx: number): V {
    if (idx >= 0 && idx < this.values().size()) {
      const value = this.values().get(idx);
      if (value === undefined) {
        return undefined;

      } else {
        return value;
      }

    } else {
      return undefined;
    }
  }

  setByIndex(idx: number, value: V) {
    if (idx >= 0 && idx < this.values().size()) {
      this.values().set(idx, value);
    } else {
      // assert(false,
      //   "TVar.update(index, value): this index's value of Var has not been holded yet: idx="
      //   + idx
      //   + ", value size="
      //   + this.values.size()
      //   + ", timestamps size="
      //   + this.timestamps().size());
    }
  }

  castingSetByIndex(idx: number, value: unknown) {
    this.setByIndex(idx, value as V);
  }

  castingSetByTime(time: number, value: unknown) {
    this.setByTime(time, value as V);
  }

  addNull(): boolean {
    return this.add(undefined);
  }

  putNullByTime(time: number): boolean {
    return this.putByTime(time, undefined);
  }

  putNullByIndex(idx: number): boolean {
    return this.putByIndex(idx, undefined);
  }

  /**
   * resetByTime to nullValue
   *
   * @param time
   */
  resetByTime(time: number) {
    this.setByTime(time, undefined);
  }

  /**
   * resetByIndex to nullValue
   *
   * @param idx
   */
  resetByIndex(idx: number) {
    this.setByIndex(idx, undefined);
  }

  toArray(): V[] {
    const values1 = this.values().toArray();

    return values1;
  }

  toArrayWithTime(): TVar.ValuesWithTime<V> {
    const values1 = this.values().toArray();
    const times1 = this.timestamps().toArray();

    return { times: times1, values: values1 };
  }

  slice(fromTime: number, toTime: number): V[] {
    const frIdx = this.timestamps().indexOrNextIndexOfOccurredTime(fromTime);
    const toIdx = this.timestamps().indexOrPrevIndexOfOccurredTime(toTime);

    const values1 = this.values().subList(frIdx, toIdx).toArray();

    return values1;
  }

  sliceWithTime(fromTime: number, toTime: number): TVar.ValuesWithTime<V> {
    const frIdx = this.timestamps().indexOrNextIndexOfOccurredTime(fromTime);
    const toIdx = this.timestamps().indexOrPrevIndexOfOccurredTime(toTime);

    const times1 = this.timestamps().subList(frIdx, toIdx).toArray();
    const values1 = this.values().subList(frIdx, toIdx).toArray();

    return { times: times1, values: values1 };
  }

  /**
   * Clear values that >= fromIdx
   *
   * @param fromIdx
   */
  clearFromIndex(fromIdx: number) {
    if (fromIdx < 0) {
      return;
    }

    const data = this.values();
    let i = data.size() - 1;
    while (i >= fromIdx) {
      data.remove(i);
      i++;
    }
  }

  size(): number {
    return this.values().size();
  }

  timesIterator(): CIterator<number> {
    return this.timestamps().iterator();
  }

  valuesIterator(): CIterator<V> {
    return this.values().iterator();
  }

  [Symbol.iterator](): Iterator<V> {
    const it = this.valuesIterator();

    return {
      next(): IteratorResult<V> {
        return it.hasNext() ?
          { value: it.next(), done: false } :
          { value: undefined, done: true };
      }
    };
  }

  // /**
  //  * All instances of TVar or extended classes will be equals if they have the same values, this
  //  * prevent the duplicated manage of values.
  //  *
  //  * @param o
  //  */
  // public boolean equals(Object o) {
  //   if (this == o) {
  //     return true;
  //   }

  //   if (o instanceof TVar <?> that) {
  //     return Objects.equals(this.values(), that.values());
  //   } else {
  //     return false;
  //   }
  // }

  // private final int hashCode = System.identityHashCode(this);

  // /** All instances of TVar or extended classes use identityHashCode as hashCode */
  // @Override
  // public int hashCode() {
  //   return hashCode;
  // }

  // @Override
  // public String toString() {
  //   const sb = new StringBuilder();

  //   const length = size();
  //   sb.append(name()).append(" [").append("size=").append(length).append(" | ");
  //   let i = Math.max(0, length - 6); // print last 6 values
  //   while (i < length) {
  //     sb.append(getByIndex(i));
  //     if (i < length - 1) {
  //       sb.append(", ");
  //     }
  //     i++;
  //   }
  //   sb.append("]");

  //   return sb.toString();
  // }
}

export namespace TVar {
  export type ValuesWithTime<T> = { times: number[], values: T[] }

  export enum Kind {
    Open,
    High,
    Low,
    Close,
    Accumlate,
  }
}

