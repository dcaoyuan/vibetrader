
const MAX_LIMIT = 1000; // Binance API max limit per request

const BINANCE_API_URL_DEFAULT = 'https://api.binance.com/api/v3';
const BINANCE_API_URL_US = 'https://api.binance.us/api/v3';
const BINANCE_API_URL = BINANCE_API_URL_US

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
    '1m': '1m', // 1 minute
    '3m': '3m', // 3 minutes
    '5m': '5m', // 5 minutes
    '15m': '15m', // 15 minutes
    '30m': '30m', // 30 minutes
    '1h': '1h', // 1 hour
    '2h': '2h', // 2 hours
    '4h': '4h', // 4 hours
    '1D': '1d', // 1 day
    '1W': '1w', // 1 week
    '1M': '1M', // 1 month
};


export const timeframe_to_pinetsProvider = {
    '1m': '1',
    '3m': '3',
    '5m': '5', // 5 minutes
    '15m': '15', // 15 minutes
    '30m': '30', // 30 minutes
    '1h': '60', // 1 hour
    '2h': '120', // 2 hours
    '4h': '240', // 4 hours
    '1d': '1D', // 1 day
    '1w': '1W', // 1 week
    '1M': '1M', // 1 month
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
    interval = timeframe_to_binance[interval] || interval

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
    interval = timeframe_to_binance[interval] || interval

    const allKlines: Kline[] = [];

    let currentStartTime = startTime;
    let batchNumber = 1;
    let count = 0;

    while (currentStartTime < endTime && count < limit) {
        console.log(`\nFetching ${symbol}, ${interval}, batch ${batchNumber}...`);

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

let activeApiUrl: string | null = null; // Persist the working endpoint

/**
  * Resolves the working Binance API endpoint.
  * Tries default first, then falls back to US endpoint.
  * Caches the working endpoint for future calls.
  */
async function getBaseUrl(): Promise<string> {
    if (activeApiUrl) {
        return activeApiUrl;
    }

    // Try default endpoint
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        const response = await fetch(`${BINANCE_API_URL_DEFAULT}/ping`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
            activeApiUrl = BINANCE_API_URL_DEFAULT;
            return activeApiUrl;
        }
    } catch (e) {
        // Default failed, try US endpoint
        // console.warn('Binance default API unreachable, trying US endpoint...');
    }

    // Try US endpoint
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${BINANCE_API_URL_US}/ping`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
            this.activeApiUrl = BINANCE_API_URL_US;
            return this.activeApiUrl;
        }
    } catch (e) {
        // Both failed
    }

    // Fallback to default if check fails entirely (let actual request fail)
    return BINANCE_API_URL_DEFAULT;
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
        const baseUrl = await getBaseUrl();
        const url = `${baseUrl}/exchangeInfo`;

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

