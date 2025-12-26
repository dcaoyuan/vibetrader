import KlineViewContainer from '../charting/view/KlineViewContainer';

type HomePageProps = {
    toggleColorTheme?: () => void
    colorTheme?: 'light' | 'dark'
}

const HomePage = (props: HomePageProps) => {
    const width = 900;

    return (
        <KlineViewContainer
            width={width}
            toggleColorTheme={props.toggleColorTheme}
            colorTheme={props.colorTheme}
        />
    )
};

export default HomePage;

