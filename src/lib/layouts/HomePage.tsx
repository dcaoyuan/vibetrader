import { style } from '@react-spectrum/s2/style' with {type: 'macro'};
import KlineViewContainer from '../charting/view/KlineViewContainer';

type HomePageProps = {
    toggleColorTheme?: () => void
    colorTheme?: 'light' | 'dark'
}

const HomePage = (props: HomePageProps) => {
    return (
        <div className={style({ display: "flex" })}>
            <KlineViewContainer
                toggleColorTheme={props.toggleColorTheme}
                colorTheme={props.colorTheme}
            />
        </div>)
};

export default HomePage;

