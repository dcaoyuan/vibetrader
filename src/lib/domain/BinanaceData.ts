
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

    console.log(`Fetching batch: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);

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
    endTime: number
): Promise<Kline[]> {

    const allKlines: Kline[] = [];

    let currentStartTime = startTime;
    let batchNumber = 1;

    while (currentStartTime < endTime) {
        console.log(`\nFetching batch ${batchNumber}...`);

        const batch = await fetchKlinesBatch(symbol, interval, currentStartTime, endTime, MAX_LIMIT);

        if (batch.length === 0) {
            console.log('No more data available');
            break;
        }

        allKlines.push(...batch);
        console.log(`Batch ${batchNumber}: Fetched ${batch.length} candles. Total: ${allKlines.length}`);

        // If we got less than the max limit, we've reached the end
        if (batch.length < MAX_LIMIT) {
            console.log('Reached end of data');
            break;
        }

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

