export interface CIterator<E> {
  hasNext(): boolean;

  next(): E;

  remove(): void;
}
