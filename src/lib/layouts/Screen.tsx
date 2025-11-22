import { ChartView } from '../charting/view/ChartView';
import { ChartXControl } from '../charting/view/ChartXControl';
import { loadSer } from '../domain/QuoteSer';
import QuoteSerView from '../domain/QuoteSerView';

const Screen = () => {
  const width = 800;
  const varName = "ETC";
  const { quoteSer, qvar } = loadSer(varName);
  const xc = new ChartXControl(quoteSer, width - ChartView.AXISY_WIDTH);
  return (
    <div>
      <QuoteSerView varName='ETC' xc={xc} />
    </div>
  )
};

export default Screen;

