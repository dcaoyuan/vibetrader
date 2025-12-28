
export function normTickUnit(potentialUnit: number, range: number, nTicksMax: number) {
    // which pow will bring tick between >= 1 & < 10
    const normPow = Math.ceil(Math.log10(1 / potentialUnit))
    const normScale = Math.pow(10, normPow)

    // determine which N is the best N in [1, 2, 5, 10]
    const normUnits = [1, 2, 5, 10]
    let i = 0;
    while (i < normUnits.length) {
        const normUnit = normUnits[i];
        const unit = normUnit / normScale;

        const nTicks = Math.round(range / unit)
        if (nTicks <= nTicksMax) {
            return unit;
        }

        i++;
    }
}


/**
 * Finds the number with the fewest significant digits (most trailing zeros)
 * within the range [x, x + unit].
 * @param {number} minValue - The starting value.
 * @param {number} unit - The maximum amount you can increase x.
 * @returns {number} - The "roundest" number in the range.
 */
export function normMinTick(minValue: number, unit: number): number {
    const tillValue = minValue + unit;

    // Determine the starting power of 10 (the scale)
    // We start one order of magnitude larger than the range to check 
    // if a very round number (like 100) sits just above x.
    const exp = Math.floor(Math.log10(tillValue)) + 1;

    let step = Math.pow(10, exp);
    while (step > 0) {
        // Calculate the smallest multiple of 'step' that is >= x
        const candidate = Math.ceil(minValue / step) * step;

        // If that multiple is within our allowed increase, it's our winner
        if (candidate < tillValue) {
            // Fix floating point precision issues (e.g., 0.30000000000000004)
            return parseFloat(candidate.toPrecision(12)) / 1 - unit;
        }

        // Otherwise, move to a smaller power of 10 (e.g., from 100s to 10s)
        step /= 10;

        // Safety break for extremely small units to prevent infinite loops
        if (step < 0.0000000001) {
            break;
        }
    }

    return minValue; // Fallback to x if no cleaner number is found
}

export function getNormPow(maxValue: number) {
    maxValue = Math.abs(maxValue)
    if (maxValue === 0) {
        return 0;
    }

    const pow = Math.log10(maxValue)

    const sign = Math.sign(pow)

    return sign * Math.floor(Math.abs(pow) / 3) * 3;
}
