import { Fragment, memo } from "react";
import type { Output } from "../ChartView";
import type { ChartXControl } from "../ChartXControl";
import type { ChartYControl } from "../ChartYControl";
import type { PineData } from "../../../domain/PineData";
import type { TVar } from "../../../timeseris/TVar";
import { plotLines } from "../../plot/plots";

type IndicatorLayerProps = {
    xc: ChartXControl;
    yc: ChartYControl;
    tvar: TVar<PineData[]>;
    outputs: Output[],
    chartUpdateTicker: number;
}

export const IndicatorLayer = memo(function Layer({
    outputs, tvar, xc, yc
}: IndicatorLayerProps) {

    return plotLines(outputs, tvar, xc, yc).map((plotLine, n) =>
        <Fragment key={`plot-${n}`} >
            {plotLine}
        </Fragment >);
})