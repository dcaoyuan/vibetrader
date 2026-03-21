import { memo } from "react";
import PlotVolmue, { type VolumeProps } from "../../plot/PlotVolume";

type VolumeLayerProps = VolumeProps & {
    chartUpdateTicker: number;
}

const VolumeLayer = ({
    kvar, xc, yc, colorScheme
}: VolumeLayerProps) => {

    // console.log("VolumeLayer render")

    return (
        <PlotVolmue
            kvar={kvar}
            xc={xc}
            yc={yc}
            colorScheme={colorScheme}
        />
    );
}

export default memo(VolumeLayer)
