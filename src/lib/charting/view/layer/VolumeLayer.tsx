import { memo } from "react";
import PlotVolmue, { type VolumeProps } from "../../plot/PlotVolume";

type VolumeLayerProps = VolumeProps & {
    chartUpdateTicker: number;
}

export const VolumeLayer = memo(function Layer({
    kvar, xc, yc, colorScheme
}: VolumeLayerProps) {

    return (
        <PlotVolmue
            kvar={kvar}
            xc={xc}
            yc={yc}
            colorScheme={colorScheme}
        />
    );
})
