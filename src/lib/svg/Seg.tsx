import type { JSX } from "react";

export interface Seg {
  render(): JSX.Element
}

export Segs {
  segs: Seg[]

  render()
}