const ind = (context) => {
    const { ta } = context.pine;
    const { close } = context.data;

    const [macd, signal, histo] = ta.macd(close, 12, 16, 9)

    plot(histo, 'Histogram', { style: plot.style_columns, color: "#1f77b4" });
    plot(signal, 'Signal', { style: 'line', color: "#aec7e8" })
    plot(macd, 'MACD', { style: 'line', color: "#ff7f0e" })
}