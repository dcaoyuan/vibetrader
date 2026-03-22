import { ChartXControl } from "../view/ChartXControl";
import { Component, type RefObject } from "react";
import type { UpdateEvent } from "../view/chartviews";
import type { TVar } from "../../timeseris/TVar";
import { Kline } from "../../domain/Kline";
import React from "react";
import { styleOfLabel } from "../../colors";
import type { ColorScheme } from "../../../App";

type Props = {
    x: number,
    y: number,
    width: number,
    height: number,
    xc: ChartXControl,
    updateEvent: UpdateEvent,
    tvar: TVar<Kline>,
    ticker: string,
    colorScheme: ColorScheme,

    handleSymbolTimeframeChanged: (ticker: string, timeframe?: string) => void
}

type State = {
    nothing?: boolean
}

type Delta = {
    period?: number,
    percent?: number,
    volumeSum?: number
}


type Snapshot = {
    time: number,
    price: number,
    volume: number
}

const L_SNAPSHOTS = 6;

class Header extends Component<Props, State> {
    referKline: Kline
    pointKline: Kline
    delta: Delta
    snapshots: Snapshot[] = []
    newSnapshot: boolean

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

        this.state = {}

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

    protected updateHeader() {
        const xc = this.props.xc;

        const latestOccurredTime = xc.lastOccurredTime();

        if (xc.isReferCrosshairEnabled) {
            const time = xc.tr(xc.referCrosshairRow)
            this.referKline = xc.occurred(time)
                ? this.props.tvar.getByTime(time)
                : undefined;

        } else {
            this.referKline = undefined;
        }

        const time = xc.isMouseCrosshairEnabled
            ? xc.tr(xc.mouseCrosshairRow)
            : latestOccurredTime

        if (time !== undefined && time > 0 && xc.occurred(time)) {
            this.pointKline = this.props.tvar.getByTime(time);
        }

        if (xc.isMouseCrosshairEnabled && xc.isReferCrosshairEnabled) {
            this.delta = this.calcDelta()

        } else {
            if (this.pointKline !== undefined) {
                const prevRow = xc.rt(time) - 1
                const prevOccurredTime = xc.tr(prevRow)
                if (xc.occurred(prevOccurredTime)) {
                    const prevKline = this.props.tvar.getByTime(prevOccurredTime);
                    this.delta = prevKline.close
                        ? { percent: 100 * (this.pointKline.close - prevKline.close) / prevKline.close }
                        : undefined

                    let latestUpdateTime = new Date().getTime();
                    latestUpdateTime = latestUpdateTime > this.pointKline.closeTime
                        ? this.pointKline.closeTime
                        : latestUpdateTime;

                    this.pointKline.closeTime = latestUpdateTime;
                }
            }
        }

        if (latestOccurredTime !== undefined && latestOccurredTime > 0) {
            const latestKline = this.props.tvar.getByTime(latestOccurredTime);
            if (latestKline !== undefined) {
                if (this.prevVolume) {
                    const volume = latestKline.volume - this.prevVolume;
                    if (volume > 0) {
                        const price = latestKline.close
                        const time = new Date().getTime()
                        this.snapshots.push({ time, price, volume })
                        if (this.snapshots.length > L_SNAPSHOTS) {
                            this.snapshots.shift()
                        }
                        this.newSnapshot = !this.newSnapshot;
                    }
                }

                this.prevVolume = latestKline.volume
            }
        }
    }

    calcDelta() {
        const xc = this.props.xc;
        const rRow = xc.referCrosshairRow;
        const mRow = xc.mouseCrosshairRow;
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
        const hText = 13

        const leftPadding = 1;
        const yMouseLabel = this.props.height - 8;
        const yReferLabel = yMouseLabel - hText - 6;

        const gap = 8;

        const styleOfTitle = styleOfLabel('label-title', this.props.colorScheme);
        const styleOfMouse = styleOfLabel('label-mouse', this.props.colorScheme);
        const styleOfRefer = styleOfLabel('label-refer', this.props.colorScheme);

        // Need the non-state lastestKline for mKline to get it put in svg without js code running.
        const xc = this.props.xc;
        let latestKline: Kline;
        let latestDelta: Delta;
        const latestTime = xc.lastOccurredTime();
        if (latestTime !== undefined && latestTime > 0) {
            const kline = this.props.tvar.getByTime(latestTime)

            if (kline !== undefined && kline instanceof Kline) {
                latestKline = kline;

                const prevRow = xc.rt(latestTime) - 1
                const prevOccurredTime = xc.tr(prevRow)
                if (xc.occurred(prevOccurredTime)) {
                    const prevKline = this.props.tvar.getByTime(prevOccurredTime);
                    latestDelta = prevKline.close
                        ? { percent: 100 * (latestKline.close - prevKline.close) / prevKline.close }
                        : undefined
                }
            }
        }

        this.updateHeader();

        const rKline = this.referKline;
        const mKline = this.pointKline || latestKline;
        const delta = this.delta || latestDelta;

        const transform = `translate(${this.props.x} ${this.props.y})`;

        return (
            <g transform={transform} ref={this.ref} style={{ fontFamily: 'monospace', fontSize: '12px' }}>

                {/* Refer Kline row */}
                <text x={leftPadding} y={yReferLabel} fill="currentColor">
                    {rKline && rKline.closeTime ? (
                        <>
                            <tspan style={styleOfRefer}>{this.dtFormatL.format(new Date(rKline.closeTime))}</tspan>
                            <tspan style={styleOfTitle} dx={gap}>O </tspan>
                            <tspan style={styleOfRefer}>{rKline.open?.toPrecision(8)}</tspan>
                            <tspan style={styleOfTitle} dx={gap}>H </tspan>
                            <tspan style={styleOfRefer}>{rKline.high?.toPrecision(8)}</tspan>
                            <tspan style={styleOfTitle} dx={gap}>L </tspan>
                            <tspan style={styleOfRefer}>{rKline.low?.toPrecision(8)}</tspan>
                            <tspan style={styleOfTitle} dx={gap}>C </tspan>
                            <tspan style={styleOfRefer}>{rKline.close?.toPrecision(8)}</tspan>
                            <tspan style={styleOfTitle} dx={gap}>V </tspan>
                            <tspan style={styleOfRefer}>{rKline.volume}</tspan>
                        </>
                    ) : (
                        <tspan visibility="hidden" className="label-refer">{this.dtFormatL.format(new Date())}</tspan>
                    )}
                </text>

                {/* Mouse Kline row */}
                <text x={leftPadding} y={yMouseLabel} fill="currentColor">
                    {mKline && mKline.closeTime && (
                        <>
                            <tspan style={styleOfMouse}>{this.dtFormatL.format(new Date(mKline.closeTime))}</tspan>
                            <tspan style={styleOfTitle} dx={gap}>O </tspan>
                            <tspan style={styleOfMouse}>{mKline.open?.toPrecision(8)}</tspan>
                            <tspan style={styleOfTitle} dx={gap}>H </tspan>
                            <tspan style={styleOfMouse}>{mKline.high?.toPrecision(8)}</tspan>
                            <tspan style={styleOfTitle} dx={gap}>L </tspan>
                            <tspan style={styleOfMouse}>{mKline.low?.toPrecision(8)}</tspan>
                            <tspan style={styleOfTitle} dx={gap}>C </tspan>
                            <tspan style={styleOfMouse}>{mKline.close?.toPrecision(8)}</tspan>
                            <tspan style={styleOfTitle} dx={gap}>V </tspan>
                            <tspan style={styleOfMouse}>{mKline.volume}</tspan>
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
                        className={this.props.xc.isMouseCrosshairEnabled ? "" : "blinking-label"}
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
    }

}

export default Header;