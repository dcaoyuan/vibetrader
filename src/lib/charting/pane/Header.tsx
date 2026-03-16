import { ChartXControl } from "../view/ChartXControl";
import { Component, type RefObject } from "react";
import type { UpdateEvent } from "../view/ChartView";
import type { TVar } from "../../timeseris/TVar";
import type { Kline } from "../../domain/Kline";
import React from "react";

type Props = {
    x: number,
    y: number,
    width: number,
    height: number,
    xc: ChartXControl,
    updateEvent: UpdateEvent,
    tvar: TVar<Kline>,
    ticker: string,

    handleSymbolTimeframeChanged: (ticker: string, timeframe?: string) => void
}

type State = {
    referKline: Kline,
    pointKline: Kline,
    delta: { period?: number, percent?: number, volumeSum?: number }
    snapshots: Snapshot[]
    newSnapshot: boolean
}

type Snapshot = {
    time: number,
    price: number,
    volume: number
}

const L_SNAPSHOTS = 6;

class Header extends Component<Props, State> {
    ref: RefObject<SVGAElement>;
    font: string;

    tframeShowName: string;
    tzone: string;
    tzoneShort: string;
    dtFormatL: Intl.DateTimeFormat
    dtFormatS: Intl.DateTimeFormat

    prevVolume: number

    constructor(props: Props) {
        super(props);

        this.ref = React.createRef();


        this.state = {
            pointKline: undefined as unknown as Kline,
            referKline: undefined as unknown as Kline,
            delta: undefined,
            snapshots: [],
            newSnapshot: false
        };

        const tframe = this.props.xc.baseSer.timeframe;

        let tframeName = tframe.compactName.toLowerCase();
        const matchLeadingNumbers = tframeName.match(/^\d+/);
        const leadingNumbers = matchLeadingNumbers ? matchLeadingNumbers[0] : '';
        tframeName = leadingNumbers === '1' ? tframeName.slice(1) : '(' + tframeName + ')'

        this.tframeShowName = tframeName;

        this.tzone = props.xc.baseSer.timezone;

        const dateStringWithTZ = new Date().toLocaleString('en-US', { timeZoneName: 'short' });
        this.tzoneShort = dateStringWithTZ.split(' ').pop() || '';

        this.dtFormatL = new Intl.DateTimeFormat("en-US", {
            timeZone: this.tzone,
            year: "2-digit",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });

        this.dtFormatS = new Intl.DateTimeFormat("en-US", {
            timeZone: this.tzone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
    }

    protected updateChart_Cursor(willUpdateChart: boolean, willUpdateCursor: boolean) {
        if (willUpdateChart || willUpdateCursor) {
            this.updateState({});
        }
    }

    protected updateCursors() {
        this.updateState({});
    }

    protected updateState(state: object) {
        let referKline: Kline | undefined;
        let pointKline: Kline | undefined;

        const xc = this.props.xc;

        const latestOccurredTime = xc.lastOccurredTime();

        if (xc.isReferCursorEnabled) {
            const time = xc.tr(xc.referCursorRow)
            if (xc.occurred(time)) {
                referKline = this.props.tvar.getByTime(time);
            }
        }

        const time = xc.isMouseCursorEnabled
            ? xc.tr(xc.mouseCursorRow)
            : latestOccurredTime

        if (time !== undefined && time > 0 && xc.occurred(time)) {
            pointKline = this.props.tvar.getByTime(time);
        }

        let delta: { period?: number, percent?: number, volumeSum?: number } | undefined;
        if (xc.isMouseCursorEnabled && xc.isReferCursorEnabled) {
            delta = this.calcDelta()
        } else {
            if (pointKline !== undefined) {
                const prevRow = xc.rt(time) - 1
                const prevOccurredTime = xc.tr(prevRow)
                if (xc.occurred(prevOccurredTime)) {
                    const prevKline = this.props.tvar.getByTime(prevOccurredTime);
                    delta = prevKline.close
                        ? { percent: 100 * (pointKline.close - prevKline.close) / prevKline.close }
                        : undefined

                    let latestUpdateTime = new Date().getTime();
                    latestUpdateTime = latestUpdateTime > pointKline.closeTime
                        ? pointKline.closeTime
                        : latestUpdateTime;

                    pointKline.closeTime = latestUpdateTime;
                }
            }
        }

        const snapshots = this.state.snapshots;
        let newSnapshot = this.state.newSnapshot;
        if (latestOccurredTime !== undefined && latestOccurredTime > 0) {
            const latestKline = this.props.tvar.getByTime(latestOccurredTime);
            if (latestKline !== undefined) {
                if (this.prevVolume) {
                    const volume = latestKline.volume - this.prevVolume;
                    if (volume > 0) {
                        const price = latestKline.close
                        const time = new Date().getTime()
                        snapshots.push({ time, price, volume })
                        if (snapshots.length > L_SNAPSHOTS) {
                            snapshots.shift()
                        }
                        newSnapshot = !newSnapshot;
                    }
                }

                this.prevVolume = latestKline.volume
            }
        }

        this.setState({ ...state, referKline: referKline as Kline, pointKline: pointKline as Kline, delta, snapshots, newSnapshot })
    }

    calcDelta() {
        const xc = this.props.xc;
        const rRow = xc.referCursorRow;
        const mRow = xc.mouseCursorRow;
        const rTime = xc.tr(rRow)
        const mTime = xc.tr(mRow)

        if (xc.occurred(rTime) && xc.occurred(mTime)) {
            const rKline = this.props.tvar.getByTime(rTime);
            const rValue = rKline.close;

            const period = Math.abs(xc.br(mRow) - xc.br(rRow))
            const mValue = this.props.tvar.getByTime(mTime).close
            const percent = rValue && mValue
                ? mRow > rRow
                    ? 100 * (mValue - rValue) / rValue
                    : 100 * (rValue - mValue) / mValue
                : undefined

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

        return undefined;
    }

    render() {
        const rKline = this.state.referKline;
        const mKline = this.state.pointKline;
        const delta = this.state.delta;

        const transform = `translate(${this.props.x} ${this.props.y})`;

        const hText = 13

        const leftPadding = 1;
        const yMouseLabel = this.props.height - 8;
        const yReferLabel = yMouseLabel - hText - 6;

        return (
            <g transform={transform} ref={this.ref} style={{ fontFamily: 'monospace', fontSize: '12px' }}>

                {/* Refer Kline row */}
                <text x={leftPadding} y={yReferLabel} fill="currentColor">
                    {rKline && rKline.closeTime ? (
                        <>
                            <tspan className="label-refer">{this.dtFormatL.format(new Date(rKline.closeTime))}</tspan>
                            <tspan dx="12" className="label-title">O </tspan>
                            <tspan className="label-refer">{rKline.open?.toPrecision(8)}</tspan>
                            <tspan dx="12" className="label-title">H </tspan>
                            <tspan className="label-refer">{rKline.high?.toPrecision(8)}</tspan>
                            <tspan dx="12" className="label-title">L </tspan>
                            <tspan className="label-refer">{rKline.low?.toPrecision(8)}</tspan>
                            <tspan dx="12" className="label-title">C </tspan>
                            <tspan className="label-refer">{rKline.close?.toPrecision(8)}</tspan>
                            <tspan dx="12" className="label-title">V </tspan>
                            <tspan className="label-refer">{rKline.volume}</tspan>
                        </>
                    ) : (
                        <tspan visibility="hidden" className="label-refer">{this.dtFormatL.format(new Date())}</tspan>
                    )}
                </text>

                {/* Mouse Kline row */}
                <text x={leftPadding} y={yMouseLabel} fill="currentColor">
                    {mKline && mKline.closeTime && (
                        <>
                            <tspan className="label-mouse">{this.dtFormatL.format(new Date(mKline.closeTime))}</tspan>
                            <tspan dx="12" className="label-title">O </tspan>
                            <tspan className="label-mouse">{mKline.open?.toPrecision(8)}</tspan>
                            <tspan dx="12" className="label-title">H </tspan>
                            <tspan className="label-mouse">{mKline.high?.toPrecision(8)}</tspan>
                            <tspan dx="12" className="label-title">L </tspan>
                            <tspan className="label-mouse">{mKline.low?.toPrecision(8)}</tspan>
                            <tspan dx="12" className="label-title">C </tspan>
                            <tspan className="label-mouse">{mKline.close?.toPrecision(8)}</tspan>
                            <tspan dx="12" className="label-title">V </tspan>
                            <tspan className="label-mouse">{mKline.volume}</tspan>
                        </>
                    )}
                </text>

                {/* Delta Output aligned to the right edge */}
                {mKline && mKline.close && !isNaN(mKline.close) && (
                    <text
                        x="100%"
                        y={yMouseLabel}
                        textAnchor="end"
                        dx="-8"
                        fill="currentColor"
                        className={this.props.xc.isMouseCursorEnabled ? "" : "blinking-label"}
                        key={'close-' + mKline.close?.toPrecision(8)}
                    >
                        {mKline.close?.toPrecision(8)}
                        {delta && delta.percent && !isNaN(delta.percent)
                            ? ` (${delta.percent >= 0 ? '+' : ''}${delta.percent?.toFixed(2)}%${delta.period ? ` in ${delta.period} ${this.tframeShowName}${delta.period === 1 ? '' : 's'}` : ''})`
                            : ''
                        }
                    </text>
                )}

                <line x1={0} y1={this.props.height - 1} x2={this.props.width} y2={this.props.height}
                    stroke='#393939' fill='#393939' strokeWidth='0.5px'
                />
            </g>
        );
    }

    override componentDidMount(): void {
        if (this.ref.current) {
            const computedStyle = window.getComputedStyle(this.ref.current);
            const fontSize = computedStyle.getPropertyValue('font-size');
            const fontFamily = computedStyle.getPropertyValue('font-family');

            this.font = fontSize + ' ' + fontFamily;
        }

        this.updateCursors();
    }

    override componentDidUpdate(prevProps: Props, prevState: State) {
        let willUpdateChart = false;
        let willUpdateCursor = false;

        if (this.props.updateEvent.changed !== prevProps.updateEvent.changed) {
            switch (this.props.updateEvent.type) {
                case 'chart':
                    willUpdateChart = true;
                    break;
                case 'cursors':
                    willUpdateCursor = true;
                    break;
                default:
            }
        }

        if (willUpdateChart || willUpdateCursor) {
            this.updateChart_Cursor(willUpdateChart, willUpdateCursor)
        }
    }
}

export default Header;