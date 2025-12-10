import { ChartXControl } from "../view/ChartXControl";
import { Component, Fragment } from "react";
import type { UpdateCursor } from "../view/ChartView";
import type { TVar } from "../../timeseris/TVar";
import type { Kline } from "../../domain/Kline";
import '../view/chartview.css';
import { ListBox, ListBoxItem } from 'react-aria-components';
import { Text } from 'react-aria-components';

type Props = {
    xc: ChartXControl,
    width: number,
    height: number,
    shouldUpdateChart: number,
    shouldUpadteCursors: UpdateCursor,
    tvar: TVar<Kline>,
    symbol: string,
}

type State = {
    referKline: Kline,
    pointKline: Kline,
    delta: { period: number, percent: number, volumeSum: number }
    snapshots: Snapshot[]
}

type Snapshot = {
    time: number,
    price: number,
    volume: number
}

class Title extends Component<Props, State> {
    tframeShowName: string;
    tframeShortName: string;
    dtFormatL: Intl.DateTimeFormat
    dtFormatS: Intl.DateTimeFormat

    prevVolume: number

    constructor(props: Props) {
        super(props);

        this.state = {
            pointKline: undefined,
            referKline: undefined,
            delta: undefined,
            snapshots: [],
        };

        const tframe = this.props.xc.baseSer.timeframe;

        this.tframeShortName = tframe.shortName;

        let tframeName = tframe.compactName.toLowerCase();
        const matchLeadingNumbers = tframeName.match(/^\d+/);
        const leadingNumbers = matchLeadingNumbers ? matchLeadingNumbers[0] : '';
        tframeName = leadingNumbers === '1' ? tframeName.slice(1) : '(' + tframeName + ')'

        this.tframeShowName = tframeName;

        const tzone = props.xc.baseSer.timezone;

        this.dtFormatL = new Intl.DateTimeFormat("en-US", {
            timeZone: tzone,
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: false,
        });

        this.dtFormatS = new Intl.DateTimeFormat("en-US", {
            timeZone: tzone,
            minute: "numeric",
            second: "numeric",
            hour12: false,
        });

        console.log("Title render");
    }

    protected updateChart_Cursor(willUpdateChart: boolean, willUpdateCursor: boolean) {
        if (willUpdateChart) {
            // clear mouse cursor and prev value
            this.props.xc.isMouseCuroseVisible = false;
        }

        if (willUpdateChart || willUpdateCursor) {
            this.updateState({});
        }
    }

    protected updateCursors() {
        this.updateState({});
    }

    protected updateState(state: object) {
        let referKline = undefined
        let pointKline = undefined

        const xc = this.props.xc;

        const latestOccurredTime = xc.lastOccurredTime();

        if (xc.isReferCuroseVisible) {
            const time = xc.tr(xc.referCursorRow)
            if (xc.occurred(time)) {
                referKline = this.props.tvar.getByTime(time);
            }
        }

        const time = xc.isMouseCuroseVisible
            ? xc.tr(xc.mouseCursorRow)
            : latestOccurredTime

        if (time !== undefined && time > 0 && xc.occurred(time)) {
            pointKline = this.props.tvar.getByTime(time);
        }

        let delta = undefined
        if (xc.isMouseCuroseVisible && xc.isReferCuroseVisible) {
            delta = this.calcDelta()

        } else {
            // will show latest occured's change
            if (pointKline !== undefined) {
                const prevRow = xc.rt(time) - 1
                const prevOccurredTime = xc.tr(prevRow)
                if (xc.occurred(prevOccurredTime)) {
                    const prevKline = this.props.tvar.getByTime(prevOccurredTime);
                    delta = { percent: 100 * (pointKline.close - prevKline.close) / prevKline.close }

                    let latestUpdateTime = new Date();
                    latestUpdateTime = latestUpdateTime.getTime() > pointKline.closeTime
                        ? pointKline.closeTime
                        : latestUpdateTime;

                    pointKline.closeTime = latestUpdateTime;
                }
            }
        }

        // calculate snapshots
        const snapshots = this.state.snapshots;
        if (latestOccurredTime !== undefined && latestOccurredTime > 0) {
            const latestKline = this.props.tvar.getByTime(latestOccurredTime);
            if (latestKline !== undefined) {
                if (this.prevVolume) {
                    const volume = latestKline.volume - this.prevVolume;
                    if (volume > 0) {
                        const price = latestKline.close
                        const time = new Date().getTime()
                        snapshots.push({ time, price, volume })
                        if (snapshots.length > 6) {
                            snapshots.shift()
                        }
                    }
                }

                this.prevVolume = latestKline.volume
            }
        }

        this.setState({ ...state, referKline, pointKline, delta, snapshots })
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
        const pColor = '#00F000'; // Theme.now().axisColor 
        const rKline = this.state.referKline
        const pKline = this.state.pointKline
        const delta = this.state.delta;

        return (
            <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0px 8px', fontFamily: 'monospace', fontSize: '12px' }}>
                    <Text style={{ color: "white" }}>{this.props.symbol} &middot; {this.tframeShortName}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0px 8px', fontFamily: 'monospace', fontSize: '12px' }}>

                    <div style={{ flex: 1, padding: '0px 0px', fontFamily: 'monospace', fontSize: '12px' }}>
                        <ListBox aria-label="Mouse kline" style={{ textAlign: 'left', fontFamily: 'monospace' }}>
                            <ListBoxItem textValue="O">
                                {pKline && <>
                                    <Text style={{ color: lColor }}>T </Text>
                                    <Text style={{ color: pColor }}>{this.dtFormatL.format(new Date(pKline.closeTime))}</Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="V">
                                {pKline && <>
                                    <Text style={{ color: lColor }}>V </Text>
                                    <Text style={{ color: pColor }}>{pKline.volume}</Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="O">
                                {pKline && <>
                                    <Text style={{ color: lColor }}>O </Text>
                                    <Text style={{ color: pColor }}>{pKline.open.toPrecision(8)}</Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="H">
                                {pKline && <>
                                    <Text style={{ color: lColor }}>H </Text>
                                    <Text style={{ color: pColor }}>{pKline.high.toPrecision(8)}</Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="L">
                                {pKline && <>
                                    <Text style={{ color: lColor }}>L </Text>
                                    <Text style={{ color: pColor }}>{pKline.low.toPrecision(8)}</Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="C">
                                {pKline && <>
                                    <Text style={{ color: lColor }}>C </Text>
                                    <Text style={{ color: pColor }}>
                                        {delta
                                            ? pKline.close.toPrecision(8) + ` (${delta.percent >= 0 ? '+' : ''}${delta.percent.toFixed(2)}%` + (
                                                delta.period
                                                    ? ` in ${delta.period} ${delta.period === 1
                                                        ? this.tframeShowName
                                                        : this.tframeShowName + 's'})`
                                                    : ')'
                                            )
                                            : pKline.close
                                        }
                                    </Text>
                                </>}
                            </ListBoxItem>
                        </ListBox>
                    </div>

                    <div style={{ flex: 1, padding: '0px 0px', fontFamily: 'monospace', fontSize: '12px' }}>
                        <ListBox aria-label="snapshots" style={{ textAlign: 'left', fontFamily: 'monospace' }}>
                            {
                                this.state.snapshots.map(({ time, price, volume }, n) =>
                                    <ListBoxItem key={"snapshot-" + n} textValue="S">
                                        <>
                                            <Text style={{ color: lColor }}>{this.dtFormatS.format(new Date(time))} </Text>
                                            <Text style={{ color: pColor }}>{price.toPrecision(8)} </Text>
                                            <Text style={{ color: rColor }}>{parseFloat(volume.toPrecision(8))}</Text>
                                        </>
                                    </ListBoxItem>
                                )
                            }
                        </ListBox>
                    </div>

                    <div style={{ justifyContent: "flex-end", padding: '0px 0px', fontFamily: 'monospace', fontSize: '12px' }}>
                        <ListBox aria-label="Refer kline" style={{ textAlign: 'left' }}>
                            <ListBoxItem textValue="T">
                                {rKline
                                    ? <>
                                        <Text style={{ color: lColor }}>T </Text>
                                        <Text style={{ color: rColor }}>{this.dtFormatL.format(new Date(rKline.closeTime))}</Text>
                                    </>
                                    : <div style={{ visibility: "hidden" }}>
                                        <Text style={{ color: lColor }}>T </Text>
                                        <Text style={{ color: rColor }}>{this.dtFormatL.format(new Date())}</Text>
                                    </div>
                                }
                            </ListBoxItem>
                            <ListBoxItem textValue="V">
                                {rKline && <>
                                    <Text style={{ color: lColor }}>V </Text>
                                    <Text style={{ color: rColor }}>{rKline.volume}</Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="O">
                                {rKline && <>
                                    <Text style={{ color: lColor }}>O </Text>
                                    <Text style={{ color: rColor }}>{rKline.open.toPrecision(8)}</Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="H">
                                {rKline && <>
                                    <Text style={{ color: lColor }}>H </Text>
                                    <Text style={{ color: rColor }}>{rKline.high.toPrecision(8)}</Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="L">
                                {rKline && <>
                                    <Text style={{ color: lColor }}>L </Text>
                                    <Text style={{ color: rColor }}>{rKline.low.toPrecision(8)}</Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="C">
                                {rKline && <>
                                    <Text style={{ color: lColor }}>C </Text>
                                    <Text style={{ color: rColor }}>{rKline.close.toPrecision(8)}</Text>
                                </>}
                            </ListBoxItem>
                        </ListBox>
                    </div>
                </div >
            </>
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
        let willUpdateChart = false;
        let willUpdateCursor = false;

        if (this.props.shouldUpdateChart !== prevProps.shouldUpdateChart) {
            willUpdateChart = true;
        }

        if (this.props.shouldUpadteCursors.changed !== prevProps.shouldUpadteCursors.changed) {
            willUpdateCursor = true;
        }

        if (willUpdateChart || willUpdateCursor) {
            this.updateChart_Cursor(willUpdateChart, willUpdateCursor)
        }
    }
}

export default Title;
