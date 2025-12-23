const ind = (context) => {
    const { ta } = context.pine;
    const { close } = context.data;

    const rsi = ta.rsi(close, 14);

    plot(rsi, "RSI-14", { color: "#ff7f0e", style: "line", linewidth: 1 })
}