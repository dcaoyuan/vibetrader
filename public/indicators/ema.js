const ind = (context) => {
    const { ta } = context.pine;
    const { close } = context.data;
    const { plot, plotchar, nz, color } = context.core;

    const ma1 = ta.ema(close, 9);
    const ma2 = ta.ema(close, 18);
    const ma3 = ta.ema(close, 36);

    plot(ma1, "EMA-9", { style: "line", color: "#1f77b4", linewidth: 1, force_overlay: true })
    plot(ma2, "EMA-18", { style: "line", color: "#aec7e8", linewidth: 1, force_overlay: true })
    plot(ma3, "EMA-36", { style: "line", color: "#ff7f0e", linewidth: 1, force_overlay: true })
}
