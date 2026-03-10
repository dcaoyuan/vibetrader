import { style } from '@react-spectrum/s2/style' with {type: 'macro'};
import KlineViewContainer from '../charting/view/KlineViewContainer';
import type { ColorScheme } from '../../App';
import { useParams, useSearchParams } from 'react-router';
import { useEffect } from 'react';

type HomePageProps = {
    toggleColorScheme: () => void
    colorScheme: ColorScheme
}

const HomePage = ({ colorScheme, toggleColorScheme }: HomePageProps) => {
    const { ticker, timeframe } = useParams();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (ticker && timeframe) {
            console.log(`URL changed! Now analyzing ${ticker} on the ${timeframe} chart.`);

        }
    }, [ticker, timeframe]);

    const widthParam = searchParams.get('width');
    const chartWidth = widthParam ? parseInt(widthParam, 10) : 800;

    const schemeParam = searchParams.get('scheme') as ColorScheme;
    if (schemeParam && schemeParam !== colorScheme) {
        toggleColorScheme()
    }

    return (
        <div className={style({ display: "flex" })}>
            <KlineViewContainer
                toggleColorScheme={toggleColorScheme}
                colorScheme={colorScheme}
                chartOnly={ticker !== undefined}
                width={chartWidth}
                ticker={ticker}
                timeframe={timeframe}
            />
        </div>
    )
};

export default HomePage;