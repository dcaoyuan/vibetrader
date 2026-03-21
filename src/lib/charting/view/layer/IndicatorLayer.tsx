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

const IndicatorLayer = ({
    outputs, tvar, xc, yc
}: IndicatorLayerProps) => {

    // console.log("IndicatorLayer render")

    return plotLines(outputs, tvar, xc, yc).map((plotLine, n) =>
        <Fragment key={`plot-${n}`} >
            {plotLine}
        </Fragment >);
}

export default memo(IndicatorLayer)