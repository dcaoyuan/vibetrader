import { memo } from "react";
import PlotKline, { type KlineProps } from "../../plot/PlotKline";

type KlinesLayerProps = KlineProps & {
    // Since xc and yc are mutable class instances, 
    // PureComponent won't detect their internal changes. 
    // We pass this primitive number to force a re-render when the chart updates.
    chartUpdateTicker: number;
}

// This render only fires if kind, colorScheme, or the updateTicker changes.
const KlinesLayer = ({
    kvar, xc, yc, colorScheme
}: KlinesLayerProps) => {

    // console.log("KlineLayer render")

    return (
        <PlotKline
            kvar={kvar}
            xc={xc}
            yc={yc}
            kind={xc.klineKind}
            colorScheme={colorScheme}
        />
    );
}

export default memo(KlinesLayer)
