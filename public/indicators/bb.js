const ind = (context) => {
    const { ta } = context.pine;
    const { close } = context.data;
    const { plot, plotchar, nz, color } = context.core;

    const [middle, upper, lower] = ta.bb(close, 5, 4);
    plot(upper, 'Upper', { style: "line", color: "yellow", linewidth: 1, force_overlay: true });
    // plot(middle, 'Middle', { style: "line", color: "yellow", linewidth: 1, force_overlay: true });
    // plot(lower, 'Lower', { style: "line", color: "yellow", linewidth: 1, force_overlay: true });
}