import type { Scalar } from "./Scalar"

class LinearScalar implements Scalar {
    readonly kind = "linear";

    doScale(v: number): number {
        return v;
    }

    unScale(v: number): number {
        return v;
    }
}

export const LINEAR_SCALAR = new LinearScalar(); 