import { CIterable } from "./CIterable";
import { CIterator } from "./CIterator";

export interface Collection<E> extends CIterable<E>, Iterable<E> {
  size(): number;

  isEmpty(): boolean;

  contains(o: any): boolean;

  iterator(): CIterator<E>;

  toArray(): E[];

  add(e: E): boolean;

  remove(o: any): boolean;

  containsAll(c: Collection<unknown>): boolean;

  addAll<M extends E>(c: Collection<M>): boolean;

  removeAll(c: Collection<unknown>): boolean;

  retainAll(c: Collection<unknown>): boolean;

  clear(): void;

  // equals(o: any): boolean;

  // hashCode(): number;
}
