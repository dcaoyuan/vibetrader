import { ChartXControl } from "../view/ChartXControl";
import { memo, useState } from "react";
import { Button } from 'react-aria-components';
import { ActionButtonGroup, useAsyncList, Popover, TooltipTrigger, Tooltip, ComboBox, ComboBoxItem, MenuTrigger } from "@react-spectrum/s2";
import { TFrame } from "../../timeseris/TFrame";
import { fetchSymbolList } from "../../domain/DataFecther";
import { source } from "../../../Env";
import { getTimezoneAbbr } from "../../utils";

type Props = {
    xc: ChartXControl,
    ticker: string,
    handleSymbolTimeframeChanged: (ticker: string, timeframe?: string) => void
}

const FONT_STYLE = { fontFamily: 'monospace', fontSize: '12px' }

export function ChooseSymbol(props: { ticker: string, handleSymbolTimeframeChanged: (ticker: string, timeframe?: string) => void }) {
    const list = useAsyncList<{ ticker: string }>({
        async load({ signal, filterText }) {
            const items = await fetchSymbolList(source, filterText, { signal });
            return { items };
        }
    });

    return (
        <MenuTrigger>
            <TooltipTrigger placement="top">
                <Button style={{ padding: 0, border: 'none', background: 'transparent', ...FONT_STYLE }}>
                    {props.ticker}
                </Button>
                <Tooltip>
                    Change ticker
                </Tooltip>
            </TooltipTrigger>

            <Popover>
                <ComboBox
                    aria-label="Search Symbols"
                    placeholder="Type for more ..."
                    items={list.items}
                    inputValue={list.filterText}
                    onInputChange={list.setFilterText}
                    loadingState={list.loadingState}
                    menuTrigger="focus"
                    autoFocus
                    onSelectionChange={key => {
                        if (key) {
                            props.handleSymbolTimeframeChanged(key as string);
                        }
                    }}>
                    {(item) => (
                        <ComboBoxItem id={item.ticker}>{item.ticker}</ComboBoxItem>
                    )}
                </ComboBox>
            </Popover>
        </MenuTrigger>
    );
}

export function ChooseTimeframe(props: { ticker: string, timeframe: TFrame, handleSymbolTimeframeChanged: (ticker: string, timeframe?: string) => void }) {
    const list = [
        TFrame.DAILY,
        TFrame.ONE_HOUR,
        TFrame.ONE_MIN,
        TFrame.THREE_MINS,
        TFrame.FIVE_MINS,
        TFrame.FIFTEEN_MINS,
        TFrame.THIRTY_MINS,
        TFrame.FOUR_HOUR,
        TFrame.WEEKLY,
        TFrame.MONTHLY,
    ];

    const [filterText, setFilterText] = useState('');

    // Manually filter the list based on input
    const filteredItems = list.filter(item =>
        item.shortName.toLowerCase().includes(filterText.toLowerCase())
    );

    return (
        <MenuTrigger>
            <TooltipTrigger placement="top">
                <Button style={{ padding: 0, border: 'none', background: 'transparent', ...FONT_STYLE }}>
                    {props.timeframe.shortName}
                </Button>
                <Tooltip>
                    Change timeframe
                </Tooltip>
            </TooltipTrigger>

            <Popover>
                <ComboBox
                    aria-label="Search timeframe"
                    placeholder="Timeframe..."
                    inputValue={filterText}
                    onInputChange={setFilterText}
                    items={filteredItems}
                    menuTrigger="focus"
                    autoFocus
                    onSelectionChange={(key) => {
                        if (key) {
                            props.handleSymbolTimeframeChanged(props.ticker, key as string);
                        }
                    }} >
                    {(item) => (
                        <ComboBoxItem id={item.shortName}>
                            {item.shortName}
                        </ComboBoxItem>
                    )}
                </ComboBox>
            </Popover>
        </MenuTrigger>
    );
}

function Title({ xc, ticker, handleSymbolTimeframeChanged }: Props) {
    const tframe = xc.baseSer.timeframe;
    const tzone = xc.baseSer.timezone;

    let tframeName = tframe.compactName.toLowerCase();
    const matchLeadingNumbers = tframeName.match(/^\d+/);
    const leadingNumbers = matchLeadingNumbers ? matchLeadingNumbers[0] : '';
    tframeName = leadingNumbers === '1' ? tframeName.slice(1) : '(' + tframeName + ')'

    const tzoneShort = getTimezoneAbbr(tzone);

    console.log("Title render");

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '0px 1px', ...FONT_STYLE }}>
            <div style={{ flex: 1, justifyContent: 'flex-start' }}>
                <ActionButtonGroup>
                    <ChooseSymbol
                        ticker={ticker}
                        handleSymbolTimeframeChanged={handleSymbolTimeframeChanged} />
                    &middot;
                    <ChooseTimeframe
                        ticker={ticker}
                        timeframe={xc.baseSer.timeframe}
                        handleSymbolTimeframeChanged={handleSymbolTimeframeChanged} />
                    &middot;
                    <Button style={{ fontFamily: 'monospace', fontSize: 12, padding: 0, border: 'none', background: 'transparent' }}>
                        {tzoneShort}
                    </Button>
                </ActionButtonGroup>
            </div>
        </div>
    );
}

export default memo(Title);