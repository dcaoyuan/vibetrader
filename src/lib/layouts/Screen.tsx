import { ChartView } from '../charting/view/ChartView';
import { ChartXControl } from '../charting/view/ChartXControl';
import KlineViewContainer from '../charting/view/KlineViewContainer';

const Screen = () => {
    const width = 900;

    return (
        <div>
            <KlineViewContainer width={width} />
        </div>
    )
};

export default Screen;

