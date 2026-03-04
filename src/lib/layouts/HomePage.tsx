import { style } from '@react-spectrum/s2/style' with {type: 'macro'};
import KlineViewContainer from '../charting/view/KlineViewContainer';
import type { ColorScheme } from '../../App';

type HomePageProps = {
    toggleColorScheme: () => void
    colorScheme: ColorScheme
}

const HomePage = (props: HomePageProps) => {
    return (
        <div className={style({ display: "flex" })}>
            <KlineViewContainer
                toggleColorScheme={props.toggleColorScheme}
                colorScheme={props.colorScheme}
                chartOnly={false}
            />
        </div>)
};

export default HomePage;

