import { style } from '@react-spectrum/s2/style' with {type: 'macro'};
import KlineViewContainer from '../charting/view/KlineViewContainer';

type HomePageProps = {
    toggleColorTheme?: () => void
    colorTheme?: 'light' | 'dark'
}

const HomePage = (props: HomePageProps) => {
    const width = 800;

    return (
        <div className={style({ display: "flex" })}>
            <KlineViewContainer
                width={width}
                toggleColorTheme={props.toggleColorTheme}
                colorTheme={props.colorTheme}
            />
        </div>)
};

export default HomePage;

