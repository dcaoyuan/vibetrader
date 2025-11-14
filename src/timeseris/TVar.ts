import { CIterator } from "../collection/CIterator";
import { ValueList } from "../collection/ValueList";
import { TSer } from "./TSer";
import { TStamps } from "./TStamps";
import { TVal } from "./TVal";

/**
 * A horizontal view of Ser.It's a reference of one of the field vars. V is the type of value
 * 
 */
export abstract class TVar<V extends TVal> {
  belongsTo: TSer;
  #values: ValueList<V>;

  protected readonly nullVal: V = undefined

  readonly name?: string;
  readonly kind?: TVar.Kind;

  constructor(belongsTo: TSer, name: string, kind: TVar.Kind) {
    this.belongsTo = belongsTo;
    this.kind = kind;
    this.name = name;
    this.#values = new ValueList<V>(this.belongsTo.valuesCapacity);
    belongsTo.addVar(this);
  }


  values(): ValueList<V> {
    return this.#values;
  }

  timestamps(): TStamps {
    return this.belongsTo.timestamps();
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

  /**
   * Append or insert value at time
   *
   * @param time
   * @param value
   * @return
   */
  abstract putByTime(time: number, value: V): boolean;
  abstract putByIndex(idx: number, value: V): boolean;
  abstract add(value: V): boolean;

  /**
   * Update value at time
   *
   * @param time
   * @param value
   */
  abstract setByTime(time: number, value: V): void;
  abstract getByTime(time: number): V;

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
        return this.nullVal;

      } else {
        return value;
      }

    } else {
      return this.nullVal;
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

  castingSetByIndex(idx: number, value: any) {
    this.setByIndex(idx, value as V);
  }

  castingSetByTime(time: number, value: any) {
    this.setByTime(time, value as V);
  }

  addNull(): boolean {
    return this.add(this.nullVal);
  }

  putNullByTime(time: number): boolean {
    return this.putByTime(time, this.nullVal);
  }

  putNullByIndex(idx: number): boolean {
    return this.putByIndex(idx, this.nullVal);
  }

  /**
   * resetByTime to nullValue
   *
   * @param time
   */
  resetByTime(time: number) {
    this.setByTime(time, this.nullVal);
  }

  /**
   * resetByIndex to nullValue
   *
   * @param idx
   */
  resetByIndex(idx: number) {
    this.setByIndex(idx, this.nullVal);
  }

  toArray(fromTime: number, toTime: number): V[] {

    const frIdx = this.timestamps().indexOrNextIndexOfOccurredTime(fromTime);
    const toIdx = this.timestamps().indexOrPrevIndexOfOccurredTime(toTime);

    const values1 = this.values().subList(frIdx, toIdx).toArray();

    return values1;
  }

  toArrayWithTime(fromTime: number, toTime: number): TVar.ValuesWithTime<V> {

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
      i += 1;
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
  //     i += 1;
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

