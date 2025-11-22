import { ChartView } from '../charting/view/ChartView';
import { ChartXControl } from '../charting/view/ChartXControl';
import { loadSer } from '../domain/QuoteSer';
import QuoteSerView from '../domain/QuoteSerView';

const Screen = () => {
  const width = 900;
  const varName = "ETC";
  const { quoteSer } = loadSer(varName);
  const xc = new ChartXControl(quoteSer, width - ChartView.AXISY_WIDTH);
  return (
    <div>
      <QuoteSerView varName='ETC' xc={xc} width={width} />
    </div>
  )
};

export default Screen;

