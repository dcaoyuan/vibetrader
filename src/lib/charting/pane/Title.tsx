import { ChartXControl } from "../view/ChartXControl";
import { Component, Fragment, useState } from "react";
import type { UpdateEvent } from "../view/ChartView";
import type { TVar } from "../../timeseris/TVar";
import type { Kline } from "../../domain/Kline";
import { Autocomplete, Button, Label, ListBox, ListBoxItem, Menu, MenuItem, useAsyncList, useFilter } from 'react-aria-components';
import { Text } from 'react-aria-components';
import { MenuTrigger } from "../../components/Menu";
import { SearchField } from "../../components/SearchField";

type Props = {
    xc: ChartXControl,
    width: number,
    height: number,
    updateEvent: UpdateEvent,
    tvar: TVar<Kline>,
    symbol: string,
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

export function ChooseSymbol() {
    const [isOpen, setOpen] = useState(false);

    const { contains } = useFilter({ sensitivity: 'base' });

    const list = useAsyncList<{ name: string }>({
        async load({ signal, filterText }) {
            const res = await fetch(
                `https://swapi.py4e.com/api/people/?search=${filterText}`,
                { signal }
            );

            const json = await res.json();
            return {
                items: json.results
            };
        }
    });

    return (
        <MenuTrigger isOpen={isOpen} onOpenChange={setOpen}>
            <Button style={{ fontSize: 12, padding: 0, border: 'none' }} >BTCUSDT</Button>
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 'inherit' }}>
                <Autocomplete
                    inputValue={list.filterText}
                    onInputChange={list.setFilterText}
                    filter={contains}
                >
                    <SearchField
                        autoFocus
                        aria-label="Search symbols"
                        placeholder="Search symbols..."
                        style={{ margin: 4 }}
                    />
                    <Menu
                        items={list.items}
                        selectionMode="single"
                        renderEmptyState={() => 'No results found.'}
                        style={{ flex: 1 }}
                    >
                        {(item) => <MenuItem id={item.name}>{item.name}</MenuItem>}
                    </Menu>
                </Autocomplete>
            </div>
        </MenuTrigger>
    );
}

class Title extends Component<Props, State> {
    tframeShowName: string;
    tframeShortName: string;
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

        this.tframeShortName = tframe.shortName;

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
                    <ChooseSymbol />
                    &nbsp;&middot;&nbsp;
                    <Text style={{ cursor: 'pointer' }}>{this.tframeShortName}</Text>
                    &nbsp;&middot;&nbsp;{this.tzoneShort}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0px 8px', fontFamily: 'monospace', fontSize: '12px' }}>

                    <div style={{ flex: 1, justifyContent: "flex-start", padding: '0px 0px' }}>
                        <ListBox aria-label="Mouse kline" style={{ textAlign: 'left' }}>
                            <ListBoxItem textValue="O">
                                {pKline && <>
                                    <Text className="label-title">T </Text>
                                    <Text className="label-mouse">
                                        {this.dtFormatL.format(new Date(pKline.closeTime))}
                                    </Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="V">
                                {pKline && <>
                                    <Text className="label-title">V </Text>
                                    <Text className="label-mouse">
                                        {pKline.volume}
                                    </Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="O">
                                {pKline && <>
                                    <Text className="label-title">O </Text>
                                    <Text className="label-mouse">
                                        {pKline.open.toPrecision(8)}
                                    </Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="H">
                                {pKline && <>
                                    <Text className="label-title">H </Text>
                                    <Text className="label-mouse">
                                        {pKline.high.toPrecision(8)}
                                    </Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="L">
                                {pKline && <>
                                    <Text className="label-title">L </Text>
                                    <Text className="label-mouse">
                                        {pKline.low.toPrecision(8)}
                                    </Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem
                                className={this.props.xc.isMouseCursorEnabled ? "" : "blinking-label"}
                                key={pKline ? 'close-' + pKline.close.toPrecision(8) : 'close-'} // tell react to retrigger blinking when key i.e. the close price changes
                                textValue="C">
                                {pKline && <>
                                    <Text className="label-title">C </Text>
                                    <Text className="label-mouse">
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

                    <div style={{ flex: 1, padding: '0px 0px' }}>
                        <ListBox aria-label="snapshots" style={{ textAlign: 'left' }}>
                            {this.state.snapshots.map(({ time, price, volume }, n) =>
                                <ListBoxItem
                                    className="blinking-label"
                                    key={n === L_SNAPSHOTS - 1
                                        ? "snapshot-" + n + time // tell react to retrigger blinking when the key i.e. the time changes 
                                        : "snapshot-" + n
                                    }
                                    textValue="S">
                                    <>
                                        <Text className="label-title">{this.dtFormatS.format(new Date(time))} </Text>
                                        <Text className="label-mouse">{price.toPrecision(8)} </Text>
                                        <Text className="label-refer">{parseFloat(volume.toPrecision(8))}</Text>
                                    </>
                                </ListBoxItem>
                            )
                            }
                        </ListBox>
                    </div>

                    <div style={{ justifyContent: "flex-end", padding: '0px 0px' }}>
                        <ListBox aria-label="Refer kline" style={{ textAlign: 'left' }}>
                            <ListBoxItem textValue="T">
                                {rKline
                                    ? <>
                                        <Text className="label-title">T </Text>
                                        <Text className="label-refer">
                                            {this.dtFormatL.format(new Date(rKline.closeTime))}
                                        </Text>
                                    </>
                                    : <div style={{ visibility: "hidden" }}>
                                        <Text className="label-title">T </Text>
                                        <Text className="label-refer">
                                            {this.dtFormatL.format(new Date())}
                                        </Text>
                                    </div>
                                }
                            </ListBoxItem>
                            <ListBoxItem textValue="V">
                                {rKline && <>
                                    <Text className="label-title">V </Text>
                                    <Text className="label-refer">
                                        {rKline.volume}
                                    </Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="O">
                                {rKline && <>
                                    <Text className="label-title">O </Text>
                                    <Text className="label-refer">
                                        {rKline.open.toPrecision(8)}
                                    </Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="H">
                                {rKline && <>
                                    <Text className="label-title">H </Text>
                                    <Text className="label-refer">
                                        {rKline.high.toPrecision(8)}
                                    </Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="L">
                                {rKline && <>
                                    <Text className="label-title">L </Text>
                                    <Text className="label-refer">
                                        {rKline.low.toPrecision(8)}
                                    </Text>
                                </>}
                            </ListBoxItem>
                            <ListBoxItem textValue="C">
                                {rKline && <>
                                    <Text className="label-title">C </Text>
                                    <Text className="label-refer">
                                        {rKline.close.toPrecision(8)}
                                    </Text>
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
