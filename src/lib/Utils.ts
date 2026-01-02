export function toFixedIfPrecise(num: number, fixedDecimals: number, precisionThreshold: number) {
    // 1. Get the original value represented accurately up to the threshold
    const preciseRepresentation = num.toPrecision(precisionThreshold);

    // 2. Format the number using the desired fixed decimal places
    const fixedRepresentation = num.toFixed(fixedDecimals);

    // 3. Convert both back to numbers for comparison
    const preciseValue = parseFloat(preciseRepresentation);
    const fixedValue = parseFloat(fixedRepresentation);

    // 4. Compare if the 'fixed' format accurately represents the 'precise' value
    // Due to floating point issues, we use a small epsilon for reliable comparison
    const epsilon = Number.EPSILON * 10;

    if (Math.abs(preciseValue - fixedValue) < epsilon) {
        // If they are approximately equal, we can use the cleaner fixed format
        return fixedRepresentation;
    } else {
        // Otherwise, return the more detailed precise representation
        return preciseRepresentation;
    }
}

export function arrayDeeplyEquals(arr1: unknown, arr2: unknown) {
    // Check if both inputs are arrays
    if (arr1 === undefined && arr2 === undefined) {
        return true;

    } else if (arr1 === undefined || arr2 !== undefined) {
        return false;

    } else if (arr1 !== undefined && arr2 === undefined) {
        return false;
    }

    if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
        return false;
    }

    // Check if lengths are equal
    if (arr1.length !== arr2.length) {
        return false;
    }

    // Iterate and recursively compare elements
    for (let i = 0; i < arr1.length; i++) {
        const elem1 = arr1[i];
        const elem2 = arr2[i];

        // If elements are not primitive and are arrays/objects, recurse
        if (typeof elem1 === 'object' && elem1 !== null &&
            typeof elem2 === 'object' && elem2 !== null) {
            if (!arrayDeeplyEquals(elem1, elem2)) { // Assuming a general deep equal function handles objects as well
                return false;
            }

        } else if (elem1 !== elem2) { // Primitive comparison
            return false;
        }
    }

    return true;
}


let canvas: HTMLCanvasElement;

export const stringMetrics = (str: string, font: string) => {
    if (canvas === undefined) {
        canvas = document.createElement('canvas');
    }

    const ctx = canvas.getContext('2d');
    ctx.font = font;

    return ctx.measureText(str);
}