export abstract class TVal {
    time: number;

    /**
     * default value
     */
    abstract get value(): number

    compareTo(that: TVal) {
        if (this.time > that.time) {
            return 1;
        } else if (this.time < that.time) {
            return -1;
        } else {
            return 0;
        }
    }
}