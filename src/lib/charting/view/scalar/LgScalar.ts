import type { Scalar } from "./Scalar"

class LgScalar implements Scalar {
	readonly kind = "lg";

	doScale(v: number): number {
		return Math.log10(v);
	}

	unScale(v: number): number {
		return Math.pow(10, v);
	}
}

export const LG_SCALAR = new LgScalar();