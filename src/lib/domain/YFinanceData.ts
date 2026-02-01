
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

export async function fetchYahooData(ticker: string, tframe: string, startTime: number, endTime: number): Promise<Candle[]> {
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

