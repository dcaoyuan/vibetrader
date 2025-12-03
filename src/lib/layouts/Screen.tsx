import { ChartView } from '../charting/view/ChartView';
import { ChartXControl } from '../charting/view/ChartXControl';
import { loadSer } from '../domain/KlineSer';
import KlineViewContainer from '../charting/view/KlineViewContainer';

const Screen = () => {
    const width = 900;
    const varName = "ETC";
    const klineSer = loadSer(varName);

    // passing a xc instance to ViewContainer to avoid xc being re-created in each render.
    const xc = new ChartXControl(klineSer, width - ChartView.AXISY_WIDTH);

    return (
        <div>
            <KlineViewContainer varName={varName} xc={xc} width={width} />
        </div>
    )
};

export default Screen;

