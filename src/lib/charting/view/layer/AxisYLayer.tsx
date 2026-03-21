import { memo } from "react";
import type { AxisYProps } from "../../pane/AxisY";
import AxisY from "../../pane/AxisY";

type AxisYLayerProps = AxisYProps & {
    chartUpdateTicker: number;
}

export const AxisYLayer = memo(function Layer({
    x, y, height, tvar, xc, yc, colorScheme, latestValue
}: AxisYLayerProps) {

    return (
        <AxisY
            x={x}
            y={y}
            height={height}
            tvar={tvar}
            xc={xc}
            yc={yc}
            colorScheme={colorScheme}
            latestValue={latestValue}
        />
    );
})
