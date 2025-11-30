export const CURRENCY_DECIMAL_FORMAT = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
}); // DecimalFormat("0.###")

export const COMMON_DECIMAL_FORMAT = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
}); // DecimalFormat("0.###")


let canvas: HTMLCanvasElement;

export const textMetrics = (str: string, font: string) => {
    if (canvas === undefined) {
        canvas = document.createElement('canvas');
    }

    const ctx = canvas.getContext('2d');
    ctx.font = font;

    return ctx.measureText(str);
}