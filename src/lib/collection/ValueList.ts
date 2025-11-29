import { AbstractCollection } from "./AbstractCollection";
import type { CIterator } from "./CIterator";
import type { Collection } from "./Collection";

/**
 * An implementation of the <code>List</code> class using an array to represent the assembled
 * sequence internally. Append, update and random access take constant time (amortized time).
 * Prepends and removes are linear in the buffer size.
 */
export class ValueList<T> extends AbstractCollection<T> {

  private initialSize: number;
  protected readonly maxCapacity: number;
  array: Array<T>;

  constructor(maxCapacity: number = Number.MAX_SAFE_INTEGER, initialSize: number = 16) {
    super();
    this.initialSize = (maxCapacity < initialSize) ? maxCapacity : initialSize;
    this.maxCapacity = maxCapacity;
    this.array = Array(initialSize);
  }

  private cursor0 = 0;
  private size0 = 0;

  modCount = 0;

  /**
   * Translate index to true index of underlying array according to cursor0. if <code>index >= size0
   * </code>, will return -1
   */
  trueIndex(index: number): number {
    const index1 = this.cursor0 + index;
    if (index1 < this.size0) {
      return index1;
    } else {
      return index1 - this.size0;
    }
  }

  private shiftCursor(n: number) {
    this.cursor0 += n;
    while (this.cursor0 >= this.maxCapacity) {
      this.cursor0 -= this.maxCapacity;
    }
  }

  subList(fromIndex: number, toIndex: number): ValueList<T> {
    const len = toIndex - fromIndex;
    const res = new ValueList<T>(this.maxCapacity, len);
    const arr = this.toSlice(fromIndex, len);
    res.addAllArray(arr);
    return res;
  }

  clear() {
    this.reduceToSize(0);
  }

  private arraycopy<A>(src: A[], srcPos: number, dest: A[], destPos: number, length: number) {
    dest.splice(destPos, length, ...src.slice(srcPos, srcPos + length));
  }

  //  private void sizeHint(int len) {
  //    if (len > size() && len >= 1) {
  //      const newarray = makeArray(len);
  //      System.arraycopy(array, 0, newarray, 0, size0);
  //      array = newarray;
  //    }
  //  }

  /**
   * Appends a single element to this buffer and returns the identity of the buffer. It takes
   * constant time.
   *
   * @param elem the element to append.
   */

  add(elem: T): boolean {
    this.modCount++;
    this.ensureSize(this.size0 + 1);

    if (this.size0 + 1 <= this.maxCapacity) {
      this.array[this.size0] = elem;
      this.size0++;

    } else {
      this.shiftCursor(1);
      if (this.cursor0 === 0) {
        this.array[this.maxCapacity - 1] = elem;

      } else {
        this.array[this.cursor0 - 1] = elem;
      }
      this.size0 = this.maxCapacity;
    }

    return true;
  }


  addAll(xs: Collection<T>): boolean {
    const elems = xs.toArray();
    return this.addAllArray(elems);
  }

  /**
   * Appends a number of elements provided by an iterable object via its <code>iterator</code>
   * method.The identity of the buffer is returned.
   *
   * @param arr should be array type, primitive array or Object[]
   * @param length we force this parameter to make sure it's apply on array type 'arr' only
   * @return
   */
  addAllArray(arr: T[]): boolean {
    const length = arr.length;
    this.modCount++;

    // const len = elems.length;
    this.ensureSize(this.size0 + length);

    if (this.size0 + length <= this.maxCapacity) {
      this.arraycopy(arr, 0, this.array, this.size0, length);
      this.size0 += length;

    } else {
      const nOverride = length - (this.maxCapacity - this.size0);
      // move cursor to final position first
      this.shiftCursor(nOverride);
      if (this.cursor0 > 0) {
        const nFillBeforeCursor = Math.min(length, this.cursor0);
        this.arraycopy(arr, length - nFillBeforeCursor, this.array, 0, nFillBeforeCursor);
        const nLeft = length - nFillBeforeCursor;
        if (nLeft > 0) {
          const nFillBehindCursor =
            nLeft > this.maxCapacity - this.cursor0 ? this.maxCapacity - this.cursor0 : nLeft;
          this.arraycopy(
            arr,
            length - nFillBeforeCursor - nFillBehindCursor,
            this.array,
            this.maxCapacity - nFillBehindCursor,
            nFillBehindCursor);
        }

      } else {
        const nFillAfterCursor = length > this.maxCapacity ? this.maxCapacity : length;
        this.arraycopy(
          arr,
          length - nFillAfterCursor,
          this.array,
          this.maxCapacity - nFillAfterCursor,
          nFillAfterCursor);
      }
      this.size0 = this.maxCapacity;
    }

    return true;
  }

  insert(offset: number, elem: T) {
    if ((offset < 0) || (offset > this.size0)) {
      throw new Error("IndexOutOfBoundsException: " + offset);
    }

    if (offset === this.size0) { // insert at position 'size0', it behaves like appending at the end
      this.add(elem);

    } else {
      this.modCount++;
      this.ensureSize(this.size0 + 1);
      if (this.size0 + 1 <= this.maxCapacity) {
        this.arraycopy(this.array, offset, this.array, offset + 1, this.size0 - offset);
        this.array[offset] = elem;
        this.size0++;

      } else {
        // for 1 spare space, we need to drop the very first elem, ie. the one at cursor0.
        const trueOffset = this.trueIndex(offset);
        if (trueOffset === this.cursor0) {
          // do nothing. we just drop this inserting elem since it will be the very first one.
        } else if (trueOffset > this.cursor0) {
          // trueOffset is behind cursor0
          // do not need to forward-shift elems before cursor0
          // since elemet cursor0 will be dropped, we'll finally put insering elem at trueOffset - 1
          if (trueOffset === this.cursor0 + 1) {
            // it's extractly the post-insert very least one, put it at cursor0, all-done.
            this.array[trueOffset - 1] = elem;

          } else {
            // 1. forward-shift elems between cursor0 and trueOffset
            this.arraycopy(this.array, this.cursor0 + 1, this.array, this.cursor0, trueOffset - this.cursor0 - 1);
            // 2. put inserting elem at trueOffset - 1
            this.array[trueOffset - 1] = elem;
          }

        } else {
          // trueOffset < cursor0, trueOffset is before cursor0
          // 1. drop elem at cursor0, forward-shift all elems behind cursor0
          if (this.cursor0 !== this.size0 - 1) {
            this.arraycopy(this.array, this.cursor0 + 1, this.array, this.cursor0, this.size0 - this.cursor0 - 1);
          }
          if (trueOffset === 0) {
            // 2. move head to tail
            // it's extractly the head one, put it at tail
            this.array[this.size0 - 1] = elem;

          } else {
            // 2. move head to tail
            this.array[this.size0 - 1] = this.array[0];
            // 3. forward-shift elems between 0 and trueOffset if there were.
            this.arraycopy(this.array, 1, this.array, 0, trueOffset - 1);
            this.array[trueOffset - 1] = elem;
          }
        }
        this.size0 = this.maxCapacity;
      }
    }
  }


  insertAll(offset: number, xs: Collection<T>): boolean {
    const elems = xs.toArray();
    return this.insertAllArray(offset, elems);
  }

  /**
   * Inserts new elements at the index <code>n</code>.Opposed to method <code>update</code>, this
   * method will not replace an element with a one.Instead, it will insert a new element at index
   * <code>n</code>.
   *
   * @param offset
   * @param arr should be array type, primitive array or Object[]
   * @return
   */
  insertAllArray(offset: number, arr: T[]): boolean {
    const length = arr.length;

    if ((offset < 0) || (offset > this.size0)) {
      throw new Error("IndexOutOfBoundsException: " + offset);
    }

    this.modCount++;
    if (offset === this.size0) { // insert at position 'size', it behaves like appending at the end
      this.addAllArray(arr);

    } else {
      this.ensureSize(this.size0 + length);
      if (this.size0 + length <= this.maxCapacity) {
        this.arraycopy(this.array, offset, this.array, offset + length, this.size0 - offset);
        this.arraycopy(arr, 0, this.array, offset, length);
        this.size0 += length;

      } else {
        const trueOffset = this.trueIndex(offset);

        const nVacancy = this.maxCapacity - this.size0;
        const nForwardShiftable =
          trueOffset >= this.cursor0 ? trueOffset - this.cursor0 : trueOffset + (this.size0 - this.cursor0);
        const nInsertable = Math.min(nVacancy + nForwardShiftable, length);
        if (nInsertable > 0) {
          if (nVacancy > 0) {
            // and cursor0 should be 0 too, since we'll always keep cursor0 is at 0 in this case
            if (this.cursor0 === 0) {
              throw "When there are vacancy still available, cursor0 should keep to 0";
            }

            // backward shift all elems after n1 by nVacancy steps
            this.arraycopy(this.array, trueOffset, this.array, trueOffset + nVacancy, this.size0 - trueOffset);
            // fill 'nInsertable' elems at 'n1 + nVacancy - nInsertable'
            this.arraycopy(
              arr, length - nInsertable, this.array, trueOffset + nVacancy - nInsertable, nInsertable);

          } else {
            if (trueOffset === this.cursor0) {
              // do thing, we'll just drop this inserting elem
            } else if (trueOffset > this.cursor0) {
              // trueOffset is behind cursor0, do not need to forward-shift elems before cursor
              // forward-shift elems between cursor and n1
              const nFilled = Math.min(length, trueOffset - this.cursor0);
              this.arraycopy(this.array, this.cursor0 + nFilled, this.array, this.cursor0, nFilled);
              this.arraycopy(arr, length - nFilled, this.array, trueOffset - nFilled, nFilled);

            } else { // trueOffset < cursor0, trueOffset is before cursor0
              if (this.cursor0 !== this.size0 - 1) {
                // 1. forward-shift all elems after cursor0
                this.arraycopy(this.array, this.cursor0 + 1, this.array, this.cursor0, this.size0 - this.cursor0 - 1);
                // 2. move first to last
                this.array[this.size0 - 1] = this.array[0];
              } // else there is no elem after cursor0
              // 3. forward-shift elems between 0 and trueOffset if there were
              if (trueOffset > 1) {
                this.arraycopy(this.array, 0, this.array, 1, trueOffset - 1);
              }
            }
          }
        } // else nInsertable is 0, do thing, we'll just drop all inserting elems

        this.size0 = this.maxCapacity;
      }
    }

    return true;
  }

  /**
   * Removes the element on a given index position. It takes time linear in the buffer size.
   *
   * @param index the index which refers to the first element to delete.
   * @param count the number of elemenets to delete
   * @throws Predef.IndexOutOfBoundsException if <code>n</code> is out of bounds.
   */
  removeMultiple(index: number, count: number) {
    if (index < 0 || index > this.size0 - count) {
      throw new Error("IndexOutOfBoundsException:" + index);
    }

    this.modCount++;
    if (this.cursor0 === 0) {
      this.arraycopy(this.array, index + count, this.array, index, this.size0 - (index + count));

    } else {
      // we'll remove count elems and get cursor0 to 0 again
      const n1 = this.trueIndex(index);
      if (n1 < this.cursor0) {
        this.arraycopy(this.array, n1 + count, this.array, n1, this.cursor0 - (n1 + count));

      } else {
        const nBehindCursor = Math.min(count, this.size0 - n1);
        // move elems behind cursor first
        this.arraycopy(this.array, n1 + nBehindCursor, this.array, n1, this.size0 - (n1 + nBehindCursor));
        const nBeforeCursor = Math.max(0, count - nBehindCursor);
        if (nBehindCursor > 0) {
          // there is nBehindCursor cells left behind cursor, should fill them with elems before
          // cursor
          const nMoveToBehind = Math.min(nBehindCursor, this.cursor0 - nBeforeCursor);
          if (nMoveToBehind > 0) {
            // copy to behind
            this.arraycopy(this.array, nBeforeCursor, this.array, this.size0 - nBehindCursor, nMoveToBehind);
            // before cursor, shift left elems
            const stepShift = nBeforeCursor + nMoveToBehind;
            this.arraycopy(this.array, stepShift, this.array, 0, this.cursor0 - stepShift);
          }
        } else {
          if (nBeforeCursor > 0) {
            this.arraycopy(this.array, nBeforeCursor, this.array, 0, this.cursor0 - nBeforeCursor);
          }
        }
      }
    }

    this.reduceToSize(this.size0 - count);
  }

  /**
   * Removes the element on a given index position
   *
   * @param index the index which refers to the element to delete.
   * @return The element that was formerly at position `n`
   */

  removeByIndex(index: number): T {
    const res = this.get(this.trueIndex(index));
    this.removeMultiple(index, 1);
    return res;
  }

  /**
   * We need this toArray to export an array with the original type element instead of
   * scala.collection.TraversableOnce#toArray[B >: A : ClassTag]: Array[B]: def toArray[B >: A :
   * ClassTag]: Array[B] = { if (isTraversableAgain) { const result = new Array[B](size)
   * copyToArray(result, 0) result } else toBuffer.toArray }
   */

  toArray(): T[] {
    const res = Array(this.size0);

    const nBehindCursor = this.size0 - this.cursor0;
    this.arraycopy(this.array, this.cursor0, res, 0, nBehindCursor);
    const nBeforeCursor = this.size0 - nBehindCursor;
    if (nBeforeCursor > 0) {
      this.arraycopy(this.array, 0, res, nBehindCursor, nBeforeCursor);
    }

    return res;
  }

  /**
   * fill 'len' elements from 'start' to array.fill (this.length - start) if 'len' is less than
   * (this.length - start).
   *
   * @param start start index to be copied
   * @param len len of elements to be copied
   * @return
   */
  toSlice(start: number, len: number): T[] {
    const len1 = Math.min(len, this.size0 - start);
    if (len1 > 0) {
      const xs = Array(len);
      const srcStart1 = this.trueIndex(start);
      const nBehindCursor = this.size0 - srcStart1;
      if (nBehindCursor >= len1) {
        this.arraycopy(this.array, srcStart1, xs, 0, len1);

      } else {
        this.arraycopy(this.array, srcStart1, xs, 0, nBehindCursor);
        this.arraycopy(this.array, 0, xs, nBehindCursor, len1 - nBehindCursor);
      }

      return xs;
    } else {
      return [];
    }
  }

  // --- overrided methods for performance

  head(): T {
    if (this.isEmpty()) {
      return undefined as T;

    } else {
      return this.get(0);
    }
  }

  last(): T {
    if (this.isEmpty()) {
      return undefined as T;

    } else {
      return this.get(this.size0 - 1);
    }
  }

  // --- ResizableArray

  // ##########################################################################
  // implement/override methods of IndexedSeq[A]


  size(): number {
    return this.size0;
  }


  get(idx: number): T {
    if (idx < 0 || idx >= this.size0) {
      console.error("ValueList: Index " + idx + " out of range, size is " + this.size0);

      return undefined as T;

    } else {
      return this.array[this.trueIndex(idx)];
    }
  }


  set(idx: number, elem: T): T {
    if (idx < 0 || idx >= this.size0) {
      console.error("ValueList: Index " + idx + " out of range, size is " + this.size0);

      return undefined as T;

    } else {
      this.modCount++;
      const oldValue = this.get(idx);
      this.array[this.trueIndex(idx)] = elem;

      return oldValue;
    }
  }


  isEmpty(): boolean {
    return this.size0 === 0;
  }

  /**
   * Fills the given array <code>xs</code> with at most `len` elements of this traversable starting
   * at position `start`. Copying will stop once either the end of the current traversable is
   * reached or `len` elements have been copied or the end of the array is reached.
   *
   * @param xs the array to fill.
   * @param start starting index.
   * @param len number of elements to copy
   */
  copyToArray(xs: T[], start: number, len: number) {
    const len1 = Math.min(Math.min(len, xs.length - start), this.size0);
    if (len1 > 0) {
      const srcStart1 = this.trueIndex(0);
      const nBehindCursor = this.size0 - srcStart1;
      if (nBehindCursor >= len1) {
        this.arraycopy(this.array, srcStart1, xs, start, len1);
      } else {
        this.arraycopy(this.array, srcStart1, xs, start, nBehindCursor);
        this.arraycopy(this.array, 0, xs, start + nBehindCursor, len1 - nBehindCursor);
      }
    }
  }

  // ##########################################################################

  /**
   * remove elements which index is after <code>sz</code>
   *
   * @param sz
   */
  reduceToSize(sz: number) {
    if (sz <= this.size0) {
      throw "sz ${sz} <= this.size0 ${this.size}";
    }

    if (this.cursor0 === 0) {
      while (this.size0 > sz) {
        this.size0--;
        this.array[this.size0] = undefined as T;
      }

    } else {
      const newArray = Array(this.array.length);

      const nBehindCursor = Math.min(sz, this.size0 - this.cursor0);
      if (nBehindCursor > 0) {
        this.arraycopy(this.array, this.cursor0, newArray, 0, nBehindCursor);
      }

      const nBeforeCursor = sz - nBehindCursor;
      if (nBeforeCursor > 0) {
        this.arraycopy(this.array, 0, newArray, nBehindCursor, nBeforeCursor);
      }

      this.array = newArray;
      this.cursor0 = 0;
      this.size0 = sz;
    }
  }

  /** Ensure that the internal array has at least `n` cells. */
  private ensureSize(n: number) {
    // Use a Long to prevent overflows
    const arrayLength = this.array.length;
    if (n > arrayLength) {
      let newSize = arrayLength + this.initialSize;
      while (newSize <= n) {
        newSize += this.initialSize;
      }
      // Clamp newSize to maxCapacity
      if (newSize > this.maxCapacity) {
        newSize = this.maxCapacity;
      }

      const newArray = Array(newSize);
      this.arraycopy(this.array, 0, newArray, 0, this.size0);
      this.array = newArray;
    }
  }

  /** Swap two elements of this array. */
  swap(a: number, b: number) {
    const a1 = this.trueIndex(a);
    const b1 = this.trueIndex(b);
    const h = this.array[a1];
    this.array[a1] = this.array[b1];
    this.array[b1] = h;
  }

  reverse(): ValueList<T> {
    const reversed = new ValueList<T>(this.maxCapacity, this.initialSize);
    let i = 0;
    while (i < this.size0) {
      reversed.add(this.get(this.size0 - 1 - i));
      i++;
    }
    return reversed;
  }


  iterator(): CIterator<T> {
    return new ValueList.Itr(this);
  }


  indexOf(o: T): number {
    if (o === undefined) {
      for (let i = 0; i < this.size0; i++) {
        if (this.get(i) === undefined) {
          return i;
        }
      }

    } else {
      for (let i = 0; i < this.size0; i++) {
        if (this.get(i) === o) {
          return i;
        }
      }
    }

    return -1;
  }


  lastIndexOf(o: T): number {
    if (o === undefined) {
      for (let i = this.size0 - 1; i >= 0; i--) {
        if (this.get(i) === undefined) {
          return i;
        }
      }

    } else {
      for (let i = this.size0 - 1; i >= 0; i--) {
        if (this.get(i) === o) {
          return i;
        }
      }
    }

    return -1;
  }

  protected underlyingArrayString(): string {
    return "underlying array(cursor0=${this.cursor0},size0=${this.size0})";
    // + ","
    // + "cursor0="
    // + cursor0
    // + ","
    // + "size0="
    // + size0
    // + "): "
    // + array_to_string(array);
  }

  // private array_to_string(arr: Object): string {
  //   switch (arr) {
  //     case boolean[] xs -> {
  //       return Arrays.toString(xs);
  //     }
  //     case byte[] xs -> {
  //       return Arrays.toString(xs);
  //     }
  //     case char[] xs -> {
  //       return Arrays.toString(xs);
  //     }
  //     case short[] xs -> {
  //       return Arrays.toString(xs);
  //     }
  //     case int[] xs -> {
  //       return Arrays.toString(xs);
  //     }
  //     case long[] xs -> {
  //       return Arrays.toString(xs);
  //     }
  //     case float[] xs -> {
  //       return Arrays.toString(xs);
  //     }
  //     case double[] xs -> {
  //       return Arrays.toString(xs);
  //     }
  //     default -> {
  //       return Arrays.toString((Object[]) arr);
  //     }
  //   }
  // }

  private static Itr = class <T> implements CIterator<T> {
    readonly outer: ValueList<T>;
    private cursor = 0; // index of next element to return
    private lastRet = -1; // index of last element returned; -1 if no such
    private expectedModCount: number;

    // prevent creating a synthetic constructor
    constructor(outer: ValueList<T>) {
      this.outer = outer;
      this.expectedModCount = this.outer.modCount;
    }


    hasNext(): boolean {
      return this.cursor !== this.outer.size();
    }


    next(): T {
      this.checkForComodification();
      const i = this.cursor;
      if (i >= this.outer.size()) {
        throw new Error("NoSuchElementException: " + i + " >= " + this.outer.size());
      }
      if (i >= this.outer.array.length) {
        throw new Error("ConcurrentModificationException");
      }
      this.cursor = i + 1;
      this.lastRet = i;
      return this.outer.array[this.outer.trueIndex(i)];
    }


    remove() {
      if (this.lastRet < 0) {
        throw new Error("IllegalStateException");
      }
      this.checkForComodification();

      try {
        this.outer.remove(this.lastRet);
        this.cursor = this.lastRet;
        this.lastRet = -1;
        this.expectedModCount = this.outer.modCount;
      } catch (ex) {
        throw new Error("ConcurrentModificationException");
      }
    }

    checkForComodification() {
      if (this.outer.modCount !== this.expectedModCount) {
        throw new Error("ConcurrentModificationException");
      }
    }
  }

}

export namespace ValueList {

  // --- simple test

  function println(xs: ValueList<unknown>) {
    let str = "["
    for (const x of xs) { // 2,4,5
      str += x + ",";
    }
    str += "]"
    console.log(str);
  }

  export function test() {

    {
      console.log("=============== limited max capacity");
      const xs = new ValueList<number>(3, 10);
      xs.add(1); // 1
      xs.add(2); // 1,2
      xs.insert(1, -1);
      println(xs); // 1,-1,2
      xs.add(4);
      println(xs); // -1,2,4
      xs.insert(1, -2);
      println(xs); // -2,2,4
      xs.add(5);
      println(xs); // 2,4,5
      console.log(xs.array); // [4,5,2, empty x 7]
      console.log(xs.get(0)); // 2

      for (const x of xs) { // 2,4,5
        console.log(x);
      }
    }

    {
      console.log("=============== limited max capacity");
      const xs = new ValueList<number>(4, 10);
      xs.add(1);
      xs.add(2);
      xs.insert(1, -1);
      println(xs); // 1,-1,2
      xs.add(4);
      xs.add(5);
      println(xs); // -1,2,4,5
      console.log(xs.array);
      xs.insert(1, -2);
      println(xs); // -2,2,4,5
      console.log(xs.array);
      xs.insert(2, -3);
      println(xs); // 2,-3,4,5

      xs.add(6);
      println(xs); // -3,4,5,6
      console.log(xs.array);
      xs.insert(3, 7);
      println(xs); // 4,5,7,6
      xs.insert(2, 8);
      println(xs); // 5,8,7,6
    }

    // {
    //   System.out.println("=============== no limit capacity");
    //   final var xs = new ValueList<Object>(Object.class);
    //   xs.add(0, -1);
    //   xs.add(0, -2);
    //   xs.add(1);
    //   System.out.println(xs.underlyingArrayString());
    //   xs.add(2);
    //   xs.add(1, 3);
    //   System.out.println(xs.underlyingArrayString());
    //   System.out.println(xs.get(0));
    //   System.out.println(xs.get(1).getClass());
    //   System.out.println(xs.toArray().getClass());
    //   System.out.println(xs.toArray(0, xs.size()).getClass());

    //   for (var x : xs) {
    //     System.out.println(x);
    //   }
    // }
  }
}
