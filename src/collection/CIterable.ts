import { CIterator } from "./CIterator";

export interface CIterable<T> {
  iterator(): CIterator<T>;
}