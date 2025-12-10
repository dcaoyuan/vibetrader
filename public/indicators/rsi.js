const ind = (context) => {
    const { ta } = context.pine;
    const { close } = context.data;

    const rsi = ta.rsi(close, 14);

    plot(rsi, "RSI-14", { color: "white", style: "line", linewidth: 1 })
}