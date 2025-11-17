import type { Scalar } from "./Scalar"

class LnScalar implements Scalar {
  readonly kind = "ln";

  doScale(v: number): number {
    return Math.log(v);
  }

  unScale(v: number): number {
    return Math.pow(Math.E, v);
  }
}

export const LN_SCALAR = new LnScalar();