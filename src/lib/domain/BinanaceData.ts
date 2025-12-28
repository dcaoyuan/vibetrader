
const BINANCE_API_URL = 'https://api.binance.com/api/v3';
const MAX_LIMIT = 1000; // Binance API max limit per request

interface Kline {
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;
    quoteAssetVolume: number;
    numberOfTrades: number;
    takerBuyBaseAssetVolume: number;
    takerBuyQuoteAssetVolume: number;
    ignore: number;
}

const timeframe_to_binance = {
    '1': '1m', // 1 minute
    '3': '3m', // 3 minutes
    '5': '5m', // 5 minutes
    '15': '15m', // 15 minutes
    '30': '30m', // 30 minutes
    '45': null, // 45 minutes (not directly supported by Binance, needs custom handling)
    '60': '1h', // 1 hour
    '120': '2h', // 2 hours
    '180': null, // 3 hours (not directly supported by Binance, needs custom handling)
    '240': '4h', // 4 hours
    '4H': '4h', // 4 hours
    '1D': '1d', // 1 day
    D: '1d', // 1 day
    '1W': '1w', // 1 week
    W: '1w', // 1 week
    '1M': '1M', // 1 month
    M: '1M', // 1 month
};

/**
 * Fetches a batch of klines from Binance API
 */
export async function fetchKlinesBatch(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
    limit: number = MAX_LIMIT
): Promise<Kline[]> {

    const url = `${BINANCE_API_URL}/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`;

    // console.log(`Fetching batch: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);

    return fetch(url)
        .then(r => r.json())
        .then(data =>
            data.map((item: unknown[]) => ({
                openTime: item[0],
                open: parseFloat(item[1] as string),
                high: parseFloat(item[2] as string),
                low: parseFloat(item[3] as string),
                close: parseFloat(item[4] as string),
                volume: parseFloat(item[5] as string),
                closeTime: item[6],
                quoteAssetVolume: parseFloat(item[7] as string),
                numberOfTrades: parseInt(item[8] as string),
                takerBuyBaseAssetVolume: parseFloat(item[9] as string),
                takerBuyQuoteAssetVolume: parseFloat(item[10] as string),
                ignore: item[11],
            })))
        .catch(e => console.error(`Error fetching klines batch:`, e));
}


/**
 * Fetches all klines with pagination
 */
export async function fetchAllKlines(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
    limit: number,
): Promise<Kline[]> {

    const allKlines: Kline[] = [];

    let currentStartTime = startTime;
    let batchNumber = 1;
    let count = 0;

    while (currentStartTime < endTime && count < limit) {
        console.log(`\nFetching ${symbol} batch ${batchNumber}...`);

        const batch = await fetchKlinesBatch(symbol, interval, currentStartTime, endTime, limit);

        if (batch.length === 0) {
            // console.log('No more data available');
            break;
        }

        allKlines.push(...batch);
        console.log(`Batch ${batchNumber}: Fetched ${batch.length} candles. Total: ${allKlines.length}`);

        // If we got less than the max limit, we've reached the end
        if (batch.length < limit) {
            // console.log('Reached end of data');
            break;
        }

        count += batch.length

        // Set next startTime to the openTime of the last candle + 1ms
        // This ensures we don't duplicate the last candle
        const lastCandle = batch[batch.length - 1];
        currentStartTime = lastCandle.openTime + 1;
        batchNumber++;

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return allKlines;
}

const defaultSymbols = [
    { symbol: 'BTCUSDT' },
    { symbol: 'ETHUSDT' },
    { symbol: 'BNBUSDT' },
    { symbol: 'SOLUSDT' },
    { symbol: 'XRPUSDT' },
]

let symbolLoaded = false
let symbols: { symbol: string }[]
export async function fetchSymbolList(filterText: string, init: RequestInit): Promise<{ symbol: string }[]> {
    if (!symbolLoaded) {
        const url = `${BINANCE_API_URL}/exchangeInfo`;

        return fetch(url, init)
            .then(r => r.json())
            .then(data => {
                symbols = data.symbols.filter(({ status }) => status === 'TRADING')

                symbolLoaded = true;

                return defaultSymbols
            })
            .catch(e => {
                console.error(`Error fetching klines batch:`, e)
                return defaultSymbols
            });

    } else {
        if (filterText) {
            filterText = filterText.toUpperCase()
            let items = symbols.filter(({ symbol }) => symbol.toLocaleUpperCase().startsWith(filterText))
            if (items.length > 100) {
                items = items.slice(0, 100);
                return [...items, { symbol: '...' }]

            } else {
                return items;
            }

        } else {
            return defaultSymbols
        }
    }
}

