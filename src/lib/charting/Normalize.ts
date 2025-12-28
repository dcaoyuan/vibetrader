
/**
 * Clean up JS floating point errors
 */
function cleanup(v: number): number {
    return parseFloat(v.toPrecision(12));
}

/**
 * Find the unit that is the nearest to potentialUnit from [1, 2, 5, 10] x 10^n
*/
export function normTickUnit(potentialUnit: number, range: number, nTicksMax: number) {
    // which exponent will bring tick between [1, 10)
    const exp = Math.ceil(Math.log10(1 / potentialUnit))
    const scale = Math.pow(10, exp)

    // determine which N is the best N in [1, 2, 5, 10]
    const candicateUnits = [1, 2, 5, 10]
    let i = 0;
    while (i < candicateUnits.length) {
        const candicate = candicateUnits[i];
        const unit = candicate / scale;

        const nTicks = Math.round(range / unit)
        if (nTicks <= nTicksMax) {
            return cleanup(unit);
        }

        i++;
    }
}

/**
 * Find the number with the fewest significant digits (most trailing zeros) in range [x, x + unit).
 * Prioritizes powers of 10, then half-powers (multiples of 5).
 */
export function normMinTick(minValue: number, unit: number): number {
    const tillValue = minValue + unit;

    // Start at a power of 10 higher than the till value
    const exp = Math.floor(Math.log10(tillValue)) + 1;
    let scale = Math.pow(10, exp);

    let candicate = tillValue
    while (candicate >= minValue) {
        // The number divisible by the full magnitude (e.g., 100, 10, 1) ?
        candicate = Math.ceil(minValue / scale) * scale;
        if (candicate <= tillValue) {
            return cleanup(candicate) - unit;
        }

        // The number divisible by the half magnitude (e.g., 50, 5, 0.5) ?
        const halfScale = scale / 2;
        candicate = Math.ceil(minValue / halfScale) * halfScale;
        if (candicate <= tillValue) {
            return cleanup(candicate) - unit;
        }

        scale /= 10;
    }

    return minValue;
}

export function getNormPow(maxValue: number): number {
    maxValue = Math.abs(maxValue)
    if (maxValue === 0) {
        return 0;
    }

    const pow = Math.log10(maxValue)

    const sign = Math.sign(pow)

    return sign * Math.floor(Math.abs(pow) / 3) * 3;
}
