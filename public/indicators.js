// const fakeContext = {};

// const source = (context) => {
//     const ta = context.pine.ta;
//     const close = context.data.ta;

//     const ma1 = context.pine.ta.sma(close, 9);
//     const ma2 = context.pine.ta.sma(close, 18);
//     const ma3 = context.pine.ta.sma(close, 36);

//     return {
//         ma1,
//         ma2,
//         ma3,
//     };
// }

// const transpiled = transpile.bind(fakeContext)(source);

// const result = transpiled.toString().trim();

// console.log(result);

const indi1 = pinets.run((context) => {
    const { ta } = context.pine;
    const { close } = context.data;

    const ma1 = ta.sma(close, 9);
    const ma2 = ta.sma(close, 18);
    const ma3 = ta.sma(close, 36);

    return {
        ma1,
        ma2,
        ma3,
    };
})

const indi2 = pinets.run((context) => {
    const { ta } = context.pine;
    const { close } = context.data;

    const rsi = ta.rsi(close, 14);

    return {
        rsi,
    };
})

const indi3 = pinets.run((context) => {
    const { ta } = context.pine;
    const { close } = context.data;

    const [macd, signal, histo] = ta.macd(close, 12, 16, 9)
    // const ma1 = ta.ema(close, 12);
    // const ma2 = ta.ema(close, 26);
    // const macd = ma1 - ma2;
    // const signal = ta.ema(macd, 9);
    // console.log(close, histo)

    return {
        macd,
        signal,
        histo
    };
})

return [indi1, indi2, indi3]

