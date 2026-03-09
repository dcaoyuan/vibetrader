import { style } from '@react-spectrum/s2/style' with {type: 'macro'};
import KlineViewContainer from '../charting/view/KlineViewContainer';
import type { ColorScheme } from '../../App';
import { useParams } from 'react-router';
import { useEffect } from 'react';

type HomePageProps = {
    toggleColorScheme: () => void
    colorScheme: ColorScheme
}

const HomePage = (props: HomePageProps) => {
    const { ticker, timeframe } = useParams();

    // 2. Trigger side effects (like data fetching) when the URL changes
    useEffect(() => {
        // Only fetch if both parameters exist (ignores the base "/vibetrader" route)
        if (ticker && timeframe) {
            console.log(`URL changed! Now analyzing ${ticker} on the ${timeframe} chart.`);

        }
    }, [ticker, timeframe]); 

    return (
        <div className={style({ display: "flex" })}>
            <KlineViewContainer
                toggleColorScheme={props.toggleColorScheme}
                colorScheme={props.colorScheme}
                chartOnly={false}
                ticker={ticker}
                timeframe={timeframe}
            />
        </div>
    )
};

export default HomePage;