import { ChartView } from '../charting/view/ChartView';
import { ChartXControl } from '../charting/view/ChartXControl';
import { loadSer } from '../domain/KlineSer';
import KlineSerView from '../domain/KlineSerView';

const Screen = () => {
  const width = 900;
  const varName = "ETC";
  const klineSer = loadSer(varName);

  // passing a xc instance to KlineSerView to avoid xc being re-created in each render.
  const xc = new ChartXControl(klineSer, width - ChartView.AXISY_WIDTH);

  return (
    <div>
      <KlineSerView varName={varName} xc={xc} width={width} />
    </div>
  )
};

export default Screen;

