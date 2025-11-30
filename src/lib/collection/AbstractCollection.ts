import type { Collection } from "./Collection";
import type { CIterator } from "./CIterator";

export abstract class AbstractCollection<E> implements Collection<E> {
    static readonly SOFT_MAX_ARRAY_LENGTH = 2147483647 - 8;

    static newLength(oldLength: number, minGrowth: number, prefGrowth: number): number {
        // preconditions not checked because of inlining
        // assert oldLength >= 0
        // assert minGrowth > 0

        const prefLength = oldLength + Math.max(minGrowth, prefGrowth); // might overflow
        if (0 < prefLength && prefLength <= AbstractCollection.SOFT_MAX_ARRAY_LENGTH) {
            return prefLength;
        } else {
            // put code cold in a separate method
            return AbstractCollection.hugeLength(oldLength, minGrowth);
        }
    }

    static hugeLength(oldLength: number, minGrowth: number): number {
        const minLength = oldLength + minGrowth;
        if (minLength < 0) { // overflow
            console.error("Required array length " + oldLength + " + " + minGrowth + " is too large");
            return oldLength;
        } else if (minLength <= AbstractCollection.SOFT_MAX_ARRAY_LENGTH) {
            return AbstractCollection.SOFT_MAX_ARRAY_LENGTH;
        } else {
            return minLength;
        }
    }


    [Symbol.iterator](): Iterator<E> {
        const it = this.iterator();

        return {
            next(): IteratorResult<E> {
                return it.hasNext() ?
                    { value: it.next(), done: false } :
                    { value: undefined, done: true };
            }
        };
    }

    abstract iterator(): CIterator<E>;

    abstract size(): number;

    isEmpty(): boolean {
        return this.size() === 0;
    }

    contains(o: unknown): boolean {
        const it = this.iterator();
        if (o === undefined) {
            while (it.hasNext()) {
                if (it.next() === undefined) {
                    return true;
                }
            }
        } else {
            while (it.hasNext()) {
                if (o === it.next()) {
                    return true;
                }
            }
        }
        return false;
    }

    toArray(): E[] {
        // Estimate size of array; be prepared to see more or fewer elements
        const r = Array(this.size());
        const it = this.iterator();
        for (let i = 0; i < r.length; i++) {
            if (!it.hasNext()) {// fewer elements than expected
                return r.slice(0, i);
            }
            r[i] = it.next();
        }

        return it.hasNext() ? this.#finishToArray(r, it) : r;
    }

    #finishToArray(r: E[], it: CIterator<E>) {
        let len = r.length;
        let i = len;
        while (it.hasNext()) {
            if (i === len) {
                len = AbstractCollection.newLength(len,
                    1,             /* minimum growth */
                    (len >> 1) + 1 /* preferred growth */);
                r = r.slice(0, len);
            }
            r[i++] = it.next();
        }
        // trim if overallocated
        return (i === len) ? r : r.slice(0, i);
    }

    abstract add(e: E): boolean;

    remove(o: unknown): boolean {
        const it = this.iterator();
        if (o === undefined) {
            while (it.hasNext()) {
                if (it.next() === undefined) {
                    it.remove();
                    return true;
                }
            }
        } else {
            while (it.hasNext()) {
                if (o === it.next()) {
                    it.remove();
                    return true;
                }
            }
        }
        return false;
    }


    containsAll(c: Collection<unknown>): boolean {
        for (const e of c) {
            if (!this.contains(e)) {
                return false;
            }
        }
        return true;
    }

    addAll(c: Collection<E>): boolean {
        let modified = false;
        for (const e of c) {
            if (this.add(e)) {
                modified = true;
            }
        }
        return modified;
    }

    removeAll(c: Collection<unknown>): boolean {
        let modified = false;
        const it = this.iterator();
        while (it.hasNext()) {
            if (c.contains(it.next())) {
                it.remove();
                modified = true;
            }
        }
        return modified;
    }

    retainAll(c: Collection<unknown>): boolean {
        let modified = false;
        const it = this.iterator();
        while (it.hasNext()) {
            if (!c.contains(it.next())) {
                it.remove();
                modified = true;
            }
        }
        return modified;
    }

    clear() {
        const it = this.iterator();
        while (it.hasNext()) {
            it.next();
            it.remove();
        }
    }


    // toString(): string {
    //   const it = this.iterator();
    //   if (!it.hasNext()) {
    //     return "[]";
    //   }

    //   let sb = new StringBuilder();
    //   sb.append('[');
    //   while (true) {
    //     const e = it.next();
    //     sb.append(e == this ? "(this Collection)" : e);
    //     if (!it.hasNext()) {
    //       return sb.append(']').toString();
    //     }
    //     sb.append(',').append(' ');
    //   }
    // }

}
