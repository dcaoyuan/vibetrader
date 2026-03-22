
/**
 * Clean up JS floating point errors
 */
export function cleanup(v: number): number {
    return parseFloat(v.toPrecision(12));
}

/**
 * Mathematically calculate a "nice" tick unit without loops.
 * Prioritizes units of 1, 2, 5, and 10 multiplied by a power of 10.
 */
export function normTickUnit(range: number, nTicksMax: number): number {
    if (range <= 0) return 1; // Fallback guard

    const potentialUnit = range / nTicksMax;

    // Find the base magnitude (e.g., 100, 10, 1, 0.1)
    const magnitude = Math.pow(10, Math.floor(Math.log10(potentialUnit)));
    const residual = potentialUnit / magnitude;

    // Snap the residual to a clean multiplier
    let unitMultiplier;
    if (residual <= 1.5) {
        unitMultiplier = 1;
    } else if (residual <= 3) {
        unitMultiplier = 2;
    } else if (residual <= 7) {
        unitMultiplier = 5;
    } else {
        unitMultiplier = 10;
    }

    return cleanup(unitMultiplier * magnitude);
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
    maxValue = Math.abs(maxValue);
    if (maxValue === 0) {
        return 0;
    }

    const pow = Math.log10(maxValue);
    const sign = Math.sign(pow);

    return sign * Math.floor(Math.abs(pow) / 3) * 3;
}