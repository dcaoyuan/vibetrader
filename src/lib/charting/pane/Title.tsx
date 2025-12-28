import { ChartXControl } from "../view/ChartXControl";
import { Component, useState } from "react";
import type { UpdateEvent } from "../view/ChartView";
import type { TVar } from "../../timeseris/TVar";
import type { Kline } from "../../domain/Kline";
import { Button, useFilter } from 'react-aria-components';
import { ActionButtonGroup, Autocomplete, useAsyncList, Menu, MenuItem, MenuTrigger, Popover, SearchField } from "@react-spectrum/s2";
import { style } from '@react-spectrum/s2/style' with {type: 'macro'};
import { TFrame } from "../../timeseris/TFrame";
import { fetchSymbolList } from "../../domain/BinanaceData";

type Props = {
    xc: ChartXControl,
    width: number,
    height: number,
    updateEvent: UpdateEvent,
    tvar: TVar<Kline>,
    symbol: string,

    handleSymbolTimeframeChanged: (symbol: string, timeframe?: string) => void
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

export function ChooseSymbol(props: { symbol: string, handleSymbolTimeframeChanged: (symbol: string, timeframe?: string) => void }) {
    const { startsWith } = useFilter({ sensitivity: 'base' });

    const list = useAsyncList<{ symbol: string }>({
        async load({ signal, filterText }) {
            const items = await fetchSymbolList(filterText, { signal });
            return { items };
        }
    });

    return (
        <MenuTrigger>
            <Button style={{ fontFamily: 'monospace', fontSize: 12, padding: 0, border: 'none', background: 'transparent' }}>
                {props.symbol}
            </Button>
            <Popover>
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 'inherit' }}>
                    <Autocomplete
                        inputValue={list.filterText}
                        onInputChange={list.setFilterText}
                    >
                        <SearchField
                            label="Symbol"
                            autoFocus
                            placeholder="Search for more ..."
                        />
                        <Menu items={list.items} selectionMode="single" onSelectionChange={(keys) => props.handleSymbolTimeframeChanged((keys as Set<string>).values().next().value)}>
                            {(item) => <MenuItem id={item.symbol}>{item.symbol}</MenuItem>}
                        </Menu>
                    </Autocomplete>
                </div>
            </Popover>
        </MenuTrigger>
    );
}

export function ChooseTimeframe(props: { timeframe: TFrame }) {
    const { contains } = useFilter({ sensitivity: 'base' });

    const list = TFrame.PREDEFINED;

    return (
        <MenuTrigger>
            <Button style={{ fontFamily: 'monospace', fontSize: 12, padding: 0, border: 'none', background: 'transparent' }}>
                {props.timeframe.shortName}
            </Button>
            <Popover>
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 'inherit' }}>
                    <Autocomplete filter={contains}>
                        <SearchField
                            label="Timeframe"
                            autoFocus
                            placeholder=""
                        />
                        <Menu items={list} selectionMode="single" >
                            {(item) => <MenuItem id={item.shortName}>{item.shortName}</MenuItem>}
                        </Menu>
                    </Autocomplete>
                </div>
            </Popover>
        </MenuTrigger>
    );
}

class Title extends Component<Props, State> {
    tframeShowName: string;
    tzone: string;
    tzoneShort: string;
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
        this.tzoneShort = dateStringWithTZ.split(' ').pop();

        this.dtFormatL = new Intl.DateTimeFormat("en-US", {
            timeZone: this.tzone,
            year: "2-digit",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });

        this.dtFormatS = new Intl.DateTimeFormat("en-US", {
            timeZone: this.tzone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });

        console.log("Title render");
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
        let referKline: Kline
        let pointKline: Kline

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

        let delta: { period?: number, percent?: number, volumeSum?: number }
        if (xc.isMouseCursorEnabled && xc.isReferCursorEnabled) {
            delta = this.calcDelta()

        } else {
            // will show latest occured change
            if (pointKline !== undefined) {
                const prevRow = xc.rt(time) - 1
                const prevOccurredTime = xc.tr(prevRow)
                if (xc.occurred(prevOccurredTime)) {
                    const prevKline = this.props.tvar.getByTime(prevOccurredTime);
                    delta = { percent: 100 * (pointKline.close - prevKline.close) / prevKline.close }

                    let latestUpdateTime = new Date().getTime();
                    latestUpdateTime = latestUpdateTime > pointKline.closeTime
                        ? pointKline.closeTime
                        : latestUpdateTime;

                    pointKline.closeTime = latestUpdateTime;
                }
            }
        }

        // calculate snapshots
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

        this.setState({ ...state, referKline, pointKline, delta, snapshots, newSnapshot })
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
        const rKline = this.state.referKline
        const pKline = this.state.pointKline
        const delta = this.state.delta;

        return (
            <>
                <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '0px 8px', fontFamily: 'monospace', fontSize: '12px' }}>
                    <ActionButtonGroup>
                        <ChooseSymbol symbol={this.props.symbol} handleSymbolTimeframeChanged={this.props.handleSymbolTimeframeChanged} />
                        &nbsp;&middot;&nbsp;
                        <ChooseTimeframe timeframe={this.props.xc.baseSer.timeframe} />
                        &nbsp;&middot;&nbsp;
                        <Button style={{ fontFamily: 'monospace', fontSize: 12, padding: 0, border: 'none', background: 'transparent' }}>
                            {this.tzoneShort}
                        </Button>
                    </ActionButtonGroup>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0px 8px 0px 8px', fontFamily: 'monospace', fontSize: '12px' }}>

                    <div style={{ flex: 1, justifyContent: "flex-start", padding: '0px 0px' }}>
                        <div style={{ textAlign: 'left' }}>
                            <div>
                                {pKline && <>
                                    <span className="label-title">T </span>
                                    <span className="label-mouse">
                                        {this.dtFormatL.format(new Date(pKline.closeTime))}
                                    </span>
                                </>}
                            </div>
                            <div>
                                {pKline && <>
                                    <span className="label-title">V </span>
                                    <span className="label-mouse">
                                        {pKline.volume}
                                    </span>
                                </>}
                            </div>
                            <div>
                                {pKline && <>
                                    <span className="label-title">O </span>
                                    <span className="label-mouse">
                                        {pKline.open.toPrecision(8)}
                                    </span>
                                </>}
                            </div>
                            <div>
                                {pKline && <>
                                    <span className="label-title">H </span>
                                    <span className="label-mouse">
                                        {pKline.high.toPrecision(8)}
                                    </span>
                                </>}
                            </div>
                            <div>
                                {pKline && <>
                                    <span className="label-title">L </span>
                                    <span className="label-mouse">
                                        {pKline.low.toPrecision(8)}
                                    </span>
                                </>}
                            </div>
                            <div
                                className={this.props.xc.isMouseCursorEnabled ? "" : "blinking-label"}
                                key={pKline ? 'close-' + pKline.close.toPrecision(8) : 'close-'} // tell react to retrigger blinking when key i.e. the close price changes
                            >
                                {pKline && <>
                                    <span className="label-title">C </span>
                                    <span className="label-mouse">
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
                                    </span>
                                </>}
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, padding: '0px 0px' }}>
                        <div style={{ textAlign: 'left' }}>
                            {this.state.snapshots.map(({ time, price, volume }, n) =>
                                <div
                                    className="blinking-label"
                                    key={n === L_SNAPSHOTS - 1
                                        ? "snapshot-" + n + time // tell react to retrigger blinking when the key i.e. the time changes 
                                        : "snapshot-" + n
                                    }
                                >
                                    <>
                                        <span className="label-title">{this.dtFormatS.format(new Date(time))} </span>
                                        <span className="label-mouse">{price.toPrecision(8)} </span>
                                        <span className="label-refer">{parseFloat(volume.toPrecision(8))}</span>
                                    </>
                                </div>
                            )
                            }
                        </div>
                    </div>

                    <div style={{ justifyContent: "flex-end", padding: '0px 0px' }}>
                        <div style={{ textAlign: 'left' }}>
                            <div>
                                {rKline
                                    ? <>
                                        <span className="label-title">T </span>
                                        <span className="label-refer">
                                            {this.dtFormatL.format(new Date(rKline.closeTime))}
                                        </span>
                                    </>
                                    : <div style={{ visibility: "hidden" }}>
                                        <span className="label-title">T </span>
                                        <span className="label-refer">
                                            {this.dtFormatL.format(new Date())}
                                        </span>
                                    </div>
                                }
                            </div>
                            <div>
                                {rKline && <>
                                    <span className="label-title">V </span>
                                    <span className="label-refer">
                                        {rKline.volume}
                                    </span>
                                </>}
                            </div>
                            <div>
                                {rKline && <>
                                    <span className="label-title">O </span>
                                    <span className="label-refer">
                                        {rKline.open.toPrecision(8)}
                                    </span>
                                </>}
                            </div>
                            <div>
                                {rKline && <>
                                    <span className="label-title">H </span>
                                    <span className="label-refer">
                                        {rKline.high.toPrecision(8)}
                                    </span>
                                </>}
                            </div>
                            <div>
                                {rKline && <>
                                    <span className="label-title">L </span>
                                    <span className="label-refer">
                                        {rKline.low.toPrecision(8)}
                                    </span>
                                </>}
                            </div>
                            <div>
                                {rKline && <>
                                    <span className="label-title">C </span>
                                    <span className="label-refer">
                                        {rKline.close.toPrecision(8)}
                                    </span>
                                </>}
                            </div>
                        </div>
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

export default Title;
