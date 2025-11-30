import { describe, expect, it } from 'vitest';
import PineTS from '../../src/PineTS.class';
import type Context from '../../src/Context.class';
import { Provider } from '../../src/marketData/Provider.class';


describe('Indicators', () => {
    it('Institutional Bias', async () => {
        const pineTS = new PineTS(Provider.Binance, 'BTCUSDT', '1d', 100, 0, new Date('Dec 25 2024').getTime() - 1);

        const { result } = await pineTS.run((context: Context) => {
            const ta = context.ta;
            const { close } = context.data;

            const ema9 = ta.ema(close, 9);
            const ema18 = ta.ema(close, 18);

            const bull_bias = ema9 > ema18;
            const bear_bias = ema9 < ema18;

            return {
                bull_bias,
                bear_bias,
            };
        });

        const part_bull_bias = result.bull_bias.reverse().slice(0, 10);
        const part_bear_bias = result.bear_bias.reverse().slice(0, 10);

        const expected_bull_bias = [false, false, true, true, true, true, true, true, true, true];
        const expected_bear_bias = [true, true, false, false, false, false, false, false, false, false];

        expect(part_bull_bias).toEqual(expected_bull_bias);
        expect(part_bear_bias).toEqual(expected_bear_bias);
    });
});
