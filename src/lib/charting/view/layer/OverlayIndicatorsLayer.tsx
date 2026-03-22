import { Fragment, memo, type JSX } from "react";
import type { Indicator } from "../chartviews";
import { plotLines } from "../../plot/plots";
import type { ChartXControl } from "../ChartXControl";
import type { ChartYControl } from "../ChartYControl";


type OverlayIndicatorsLayerProps = {
    xc: ChartXControl;
    yc: ChartYControl;
    indicators: Indicator[],
    chartUpdateTicker: number;
}

const arePropsEqual = (prevProps: OverlayIndicatorsLayerProps, nextProps: OverlayIndicatorsLayerProps) =>
    areOverlayIndicatorsEqual(prevProps.indicators, nextProps.indicators) &&
    prevProps.chartUpdateTicker === nextProps.chartUpdateTicker


const areOverlayIndicatorsEqual = (prevInds: Indicator[], nextInds: Indicator[]) => {
    if (nextInds === undefined && prevInds === undefined) {
        return true;

    } else if (nextInds === undefined || prevInds === undefined) {
        return false;
    }

    if (nextInds.length !== prevInds.length) {
        return false;
    }

    for (let i = 0; i < nextInds.length; i++) {
        const newInd = nextInds[i];
        const oldInd = prevInds[i];

        if (newInd.scriptName !== oldInd.scriptName) {
            return false
        }
    }

    return true;
}

const OverlayIndicatorsLayer = ({
    xc, yc, indicators
}: OverlayIndicatorsLayerProps) => {

    const overlayIndicatorLines: JSX.Element[] = []
    if (indicators) {
        indicators.map((indicator) => {
            const tvar = indicator.tvar;

            const plots = plotLines(indicator.outputs, tvar, xc, yc)
            overlayIndicatorLines.push(...plots);
        })
    }

    return overlayIndicatorLines.map((plotLine, n) =>
        <Fragment key={`plot-${n}`} >
            {plotLine}
        </Fragment >);
}

export default memo(OverlayIndicatorsLayer, arePropsEqual)