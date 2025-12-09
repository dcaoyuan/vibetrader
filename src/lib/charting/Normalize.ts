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

export function normMinTick(tick: number) {
    const sign = Math.sign(tick);
    tick = Math.abs(tick)
    if (tick === 0) {
        return tick
    }

    // which pow will bring tick between >= 1 & < 10
    const normPow = Math.ceil(Math.log10(1 / tick))
    const normScale = Math.pow(10, normPow)

    tick = Math.round(tick * normScale)
    tick = tick / normScale

    return sign * tick;
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
