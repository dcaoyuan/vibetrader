
export interface YahooPriceData {
    timestamp: number[];
    indicators: {
        quote: Array<{
            open: number[];
            high: number[];
            low: number[];
            close: number[];
            volume: number[];
        }>;
    };
}

export interface YahooSearchResult {
    quotes: Array<{
        exchange: string // "NYQ",
        shortname: string // "Alibaba Group Holding Limited",
        quoteType: string // "EQUITY",
        symbol: string // "BABA",
        index: string // "quotes",
        score: number // 1.02635E7,
        typeDisp: string // "Equity",
        longname: string // "Alibaba Group Holding Limited",
        exchDisp: string // "NYSE",
        sector: string // "Consumer Cyclical",
        sectorDisp: string // "Consumer Cyclical",
        industry: string // "Internet Retail",
        industryDisp: string // "Internet Retail",
        dispSecIndFlag: boolean //true,
        isYahooFinance: boolean // true
    }>;
}

export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

const validTFrames = [
    '1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '4h', '1d', '5d', '1wk', '1mo', '3mo'
]

const timeframe_to_yfinance = {
    '1m': '1m', // 1 minute
    '2m': '2m', // 3 minutes
    '5m': '5m', // 5 minutes
    '15m': '15m', // 15 minutes
    '30m': '30m', // 30 minutes
    '1h': '1h', // 1 hour
    '4h': '4h', // 4 hours
    '1D': '1d', // 1 day
    '5D': '5d', // 5 day
    '1wk': '1wk', // 1 week
    '1W': '1wk', // 1 week
    '1w': '1wk', // 1 week
    '1M': '1mo', // 1 month
    '1mo': '1mo', // 1 month
};

export async function fetchYahooData(ticker: string, tframe: string, startTime: number, endTime: number): Promise<Candle[]> {
    tframe = timeframe_to_yfinance[tframe] || tframe

    //const url = ` https://mmmmmm.io/yfinance/v8/finance/chart/${ticker}?interval=${tframe}&range=${range}`;
    const url = `https://mmmmmm.io/yfinance/v8/finance/chart/${ticker}?interval=${tframe}&period1=${startTime}&period2=${endTime}`;

    return fetch(url)
        .catch(error => {
            console.error("Failed to get Yahoo data:", error);
            return undefined as Response;
        })
        .then(resp => resp.json()
            .catch(error => {
                console.error("Failed parse json:", error);
                return undefined;
            })
            .then(data => {
                const result = data.chart.result[0];
                const timestamps = result.timestamp;
                const quotes = result.indicators.quote[0];

                // convert Yahoo 'row' data to Candle
                return timestamps.map((ts: number, i: number) => ({
                    time: ts * 1000, // to ms 
                    open: quotes.open[i],
                    high: quotes.high[i],
                    low: quotes.low[i],
                    close: quotes.close[i],
                    volume: quotes.volume[i]
                }));
            })
        )
}


const defaultSymbols = [
    { ticker: '^GSPC' },
    { ticker: '^DJI' },
    { ticker: '^IXIC' },
    { ticker: '^HSI' },
    { ticker: 'GC=F' },
    { ticker: 'BTC-USD' },
]

// const baseUrl = "https://query2.finance.yahoo.com/v1/finance/search";

export async function fetchSymbolList(filterText: string, init: RequestInit): Promise<{ ticker: string }[]> {
    if (filterText && filterText.trim().length >= 2) {
        const baseUrl = "https://mmmmmm.io/yfinance/v1/finance/search";
        const url = `${baseUrl}?q=${filterText}&quotesCount=100&newsCount=0`;

        return fetch(url, init)
            .then(r => {
                console.log(r)
                return r.json()
            })
            .then(data => {
                const tickers = data.quotes.map(({ symbol }) => ({ ticker: symbol }))
                let items = tickers
                if (items.length > 100) {
                    items = items.slice(0, 100);
                    return [...items, { ticker: '...' }]

                } else {
                    return items;
                }

            })
            .catch(e => {
                console.error(`Error fetching symbols batch:`, e)
                return defaultSymbols
            });

    } else {
        return defaultSymbols
    }
}

