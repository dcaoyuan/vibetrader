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

const indi1 = (context) => {
    const { ta } = context.pine;
    const { close } = context.data;
    const { plot, plotchar, nz, color } = context.core;

    const ma1 = ta.sma(close, 9);
    const ma2 = ta.sma(close, 18);
    const ma3 = ta.sma(close, 36);

    plot(ma1, "SMA-9", { style: "line", color: "#1f77b4", linewidth: 1, force_overlay: true })
    plot(ma2, "SMA-18", { style: "line", color: "#aec7e8", linewidth: 1, force_overlay: true })
    plot(ma3, "SMA-36", { style: "line", color: "#ff7f0e", linewidth: 1, force_overlay: true })
}

const indi2 = (context) => {
    const { ta } = context.pine;
    const { close } = context.data;

    const rsi = ta.rsi(close, 14);

    plot(rsi, "RSI-14", { color: "white", style: "line", linewidth: 1 })
}

const indi3 = (context) => {
    const { ta } = context.pine;
    const { close } = context.data;

    const [macd, signal, histo] = ta.macd(close, 12, 16, 9)

    plot(histo, 'Histogram', { style: 'histogram', color: "#1f77b4" });
    plot(signal, 'Signal', { style: 'line', color: "#aec7e8" })
    plot(macd, 'MACD', { style: 'line', color: "#ff7f0e" })
}

// const indi4 = (context) => {
//     const { ta } = context.pine;
//     const { close } = context.data;

//     // const [macd, signal, histo] = ta.macd(close, 12, 16, 9)
//     const ma1 = ta.ema(close, 12);
//     const ma2 = ta.ema(close, 26);
//     const macd = ma1 - ma2;
//     const signal = ta.ema(macd, 9);
//     // console.log(close)
//     // console.log(macd)
//     console.log(signal)
//     // console.log(close, histo)
//     // plot(histo, 'Histogram', { style: 'histogram', color: "#1f77b4" });
//     plot(signal, 'Signal', { style: 'line', color: "#aec7e8" })
//     plot(macd, 'MACD', { style: 'line', color: "#ff7f0e" })
// }

// const indi4 = (context) => {
//     const { close, volume } = context.data;
//     const { ta, plotchar } = context.pine;
//     function f_pvt() {
//         return ta.cum((ta.change(close) / close[1]) * volume);
//     }
//     const res = f_pvt();
//     plotchar(res, 'plot');
//     plot(res, 'PVT', { style: 'line', color: "#ff7f0e" })

//     return { res };
// }


return [indi1, indi2, indi3]

