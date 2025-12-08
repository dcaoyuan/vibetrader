import { ChartXControl } from "../view/ChartXControl";
import { Component, type JSX, } from "react";
import type { UpdateCursor } from "../view/ChartView";
import type { TVar } from "../../timeseris/TVar";
import type { Kline } from "../../domain/Kline";
import '../view/chartview.css';
import { Theme } from "../theme/Theme";
import { ListBox, ListBoxItem } from 'react-aria-components';
import { Text } from 'react-aria-components';

type Props = {
    xc: ChartXControl,
    width: number,
    height: number,
    shouldUpdateChart: number,
    shouldUpadteCursors: UpdateCursor,
    tvar: TVar<Kline>;
}

type State = {

    referKline: Kline,
    mouseKline: Kline,
    delta: { period: number, percent: number, volumeSum: number }
}

class Title extends Component<Props, State> {
    tframeName: string;

    constructor(props: Props) {
        super(props);

        this.state = { mouseKline: undefined, referKline: undefined, delta: undefined };

        let tframeName = this.props.xc.baseSer.timeframe.compactName.toLowerCase();
        const matchLeadingNumbers = tframeName.match(/^\d+/);
        const leadingNumbers = matchLeadingNumbers ? matchLeadingNumbers[0] : '';
        tframeName = leadingNumbers === '1' ? tframeName.slice(1) : '(' + tframeName + ')'

        this.tframeName = tframeName;

        console.log("Title render");
    }

    protected updateChart() {
        // clear mouse cursor and prev value
        this.props.xc.isMouseCuroseVisible = false;

        this.updateState({});
    }

    protected updateCursors() {
        this.updateState({});
    }

    protected updateState(state: object) {
        let referKline = undefined
        let mouseKline = undefined

        const xc = this.props.xc;

        if (xc.isReferCuroseVisible) {
            const time = xc.tr(xc.referCursorRow)
            if (xc.occurred(time)) {
                referKline = this.props.tvar.getByTime(time);
            }
        }

        const time = xc.isMouseCuroseVisible
            ? xc.tr(xc.mouseCursorRow)
            : xc.lastOccurredTime()

        if (time && time > 0 && xc.occurred(time)) {
            mouseKline = this.props.tvar.getByTime(time);
        }

        let delta = undefined
        if (xc.isMouseCuroseVisible && xc.isCursorCrossVisible) {
            delta = this.calcDelta()

        } else {
            // will show last occured's change
            const prevRow = xc.rt(time) - 1
            const prevOccurredTime = xc.tr(prevRow)
            const prevKline = this.props.tvar.getByTime(prevOccurredTime);
            delta = prevKline !== undefined
                ? { percent: (mouseKline.close - prevKline.close) / prevKline.close }
                : undefined
        }

        this.setState({ ...state, referKline, mouseKline, delta })
    }

    calcDelta() {
        const xc = this.props.xc;

        const isAutoReferCursorValue = true; // TODO

        const rRow = xc.referCursorRow;
        const mRow = xc.mouseCursorRow;
        if (isAutoReferCursorValue) { // normal KlineChartView
            const rTime = xc.tr(rRow)
            const mTime = xc.tr(mRow)
            if (xc.occurred(rTime) && xc.occurred(mTime)) {
                const rKline = this.props.tvar.getByTime(rTime);
                const rValue = rKline.close;

                const period = Math.abs(xc.br(mRow) - xc.br(rRow))
                const mValue = this.props.tvar.getByTime(mTime).close
                const percent = mRow > rRow
                    ? 100 * (mValue - rValue) / rValue
                    : 100 * (rValue - mValue) / mValue

                let volumeSum = 0.0
                const rowBeg = Math.min(rRow, mRow)
                const rowEnd = Math.max(rRow, mRow)
                for (let i = rowBeg + 1; i <= rowEnd; i++) {
                    const time = xc.tr(i)
                    if (xc.occurred(time)) {
                        const mKline = this.props.tvar.getByTime(time);
                        volumeSum += mKline.volume;
                    }
                }

                return { period, percent, volumeSum }
            }

        } else { // else, usually RealtimeKlineChartView
            // const vRefer = GlassPane.this.referCursorValue
            // const vYMouse = datumPlane.vy(y)
            // const percent = vRefer === 0 ? 0.0 : 100 * (vYMouse - vRefer) / vRefer

            //new StringBuilder(20).append(MONEY_DECIMAL_FORMAT.format(vYMouse)).append("  ").append("%+3.2f".format(percent)).append("%").toString
        }

        return undefined;
    }

    render() {
        const lColor = '#F00000'; // Theme.now().axisColor
        const rColor = '#00F0F0'; // 'orange'
        const mColor = '#00F000'; // Theme.now().axisColor 
        const rKline = this.state.referKline
        const mKline = this.state.mouseKline
        const delta = this.state.delta;

        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontFamily: 'monospace', fontSize: '12px' }}>
                <ListBox aria-label="Mouse kline" style={{ textAlign: 'left', fontFamily: 'monospace' }}>
                    <ListBoxItem textValue="O">
                        {mKline && <>
                            <Text style={{ color: lColor }}>O </Text>
                            <Text style={{ color: mColor }}>{mKline.open}</Text>
                        </>}
                    </ListBoxItem>
                    <ListBoxItem textValue="H">
                        {mKline && <>
                            <Text style={{ color: lColor }}>H </Text>
                            <Text style={{ color: mColor }}>{mKline.high}</Text>
                        </>}
                    </ListBoxItem>
                    <ListBoxItem textValue="L">
                        {mKline && <>
                            <Text style={{ color: lColor }}>L </Text>
                            <Text style={{ color: mColor }}>{mKline.low}</Text>
                        </>}
                    </ListBoxItem>
                    <ListBoxItem textValue="C">
                        {mKline && <>
                            <Text style={{ color: lColor }}>C </Text>
                            <Text style={{ color: mColor }}>
                                {delta
                                    ? mKline.close + ` (${delta.percent >= 0 ? '+' : ''}${delta.percent.toFixed(2)}%` + (
                                        delta.period
                                            ? ` in ${delta.period} ${delta.period === 1
                                                ? this.tframeName
                                                : this.tframeName + 's'})`
                                            : ')'
                                    )
                                    : mKline.close
                                }
                            </Text>
                        </>}
                    </ListBoxItem>
                    <ListBoxItem textValue="V">
                        {mKline && <>
                            <Text style={{ color: lColor }}>V </Text>
                            <Text style={{ color: mColor }}>{mKline.volume}</Text>
                        </>}
                    </ListBoxItem>
                </ListBox>

                <ListBox aria-label="Refer kline" style={{ textAlign: 'left' }}>
                    <ListBoxItem textValue="O">
                        {rKline && <>
                            <Text style={{ color: lColor }}>O </Text>
                            <Text style={{ color: rColor }}>{rKline.open}</Text>
                        </>}
                    </ListBoxItem>
                    <ListBoxItem textValue="H">
                        {rKline && <>
                            <Text style={{ color: lColor }}>H </Text>
                            <Text style={{ color: rColor }}>{rKline.high}</Text>
                        </>}
                    </ListBoxItem>
                    <ListBoxItem textValue="L">
                        {rKline && <>
                            <Text style={{ color: lColor }}>L </Text>
                            <Text style={{ color: rColor }}>{rKline.low}</Text>
                        </>}
                    </ListBoxItem>
                    <ListBoxItem textValue="C">
                        {rKline && <>
                            <Text style={{ color: lColor }}>C </Text>
                            <Text style={{ color: rColor }}>{rKline.close}</Text>
                        </>}
                    </ListBoxItem>
                    <ListBoxItem textValue="V">
                        {rKline && <>
                            <Text style={{ color: lColor }}>V </Text>
                            <Text style={{ color: rColor }}>{rKline.volume}</Text>
                        </>}
                    </ListBoxItem>
                </ListBox>
            </div>
        )
    }

    override componentDidMount(): void {
        // call to update labels;
        this.updateCursors();
    }

    // Important: Be careful when calling setState within componentDidUpdate
    // Ensure you have a conditional check to prevent infinite re-renders.
    // If setState is called unconditionally, it will trigger another update,
    // potentially leading to a loop.
    override componentDidUpdate(prevProps: Props, prevState: State) {
        if (this.props.shouldUpdateChart !== prevProps.shouldUpdateChart) {
            this.updateChart();
        }

        if (this.props.shouldUpadteCursors.changed !== prevProps.shouldUpadteCursors.changed) {
            this.updateCursors();
        }
    }
}

export default Title;
