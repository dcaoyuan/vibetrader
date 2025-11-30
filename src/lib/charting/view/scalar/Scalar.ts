export interface Scalar {
    kind: string;
    doScale(v: number): number;
    unScale(v: number): number;
}

