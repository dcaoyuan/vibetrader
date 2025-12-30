import type { Scalar } from "./Scalar"

class LnScalar implements Scalar {
    readonly kind = "Ln";

    doScale(v: number): number {
        return v <= 0 ? v : Math.log(v);
    }

    unScale(v: number): number {
        return v <= 0 ? v : Math.pow(Math.E, v);
    }
}

export const LN_SCALAR = new LnScalar();