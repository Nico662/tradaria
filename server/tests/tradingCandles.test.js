'use strict';

// Tests for server/utils/tradingCandles.js and src/trading/chartHistory.js.
// All external I/O is mocked — no network calls, no Redis.

jest.mock('../providers/kraken');
jest.mock('../providers/yahoo');

const { fetchKrakenCandles } = require('../providers/kraken');
const { fetchYahooCandles }  = require('../providers/yahoo');

const { fetchTradingCandles, TRADING_CANDLE_MAP, aggregateH4, setRedis } = require('../utils/tradingCandles');
const { scaleCandles, computeRatio, combineCandles, MAX_RATIO_DEVIATION } = require('../../src/trading/chartHistory');

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeCandles(n, { startTime = 0, intervalSec = 3600, startPrice = 100 } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    time:  startTime + i * intervalSec,
    open:  startPrice + i,
    high:  startPrice + i + 2,
    low:   startPrice + i - 1,
    close: startPrice + i + 1,
  }));
}

// ── tradingCandles — endpoint validation ──────────────────────────────────────
describe('fetchTradingCandles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setRedis(null); // no Redis in tests
  });

  test('throws on unknown symbol', async () => {
    await expect(fetchTradingCandles('FAKE/SYM', 'H1')).rejects.toThrow('Unknown trading symbol');
  });

  test('fetches kraken candles for BTC/USD H1', async () => {
    const candles = makeCandles(5, { intervalSec: 3600 });
    fetchKrakenCandles.mockResolvedValue(candles);
    const result = await fetchTradingCandles('BTC/USD', 'H1');
    expect(fetchKrakenCandles).toHaveBeenCalledWith('XBTUSD', '1h');
    expect(result.length).toBeGreaterThan(0);
  });

  test('fetches yahoo candles for EUR/USD H1', async () => {
    const candles = makeCandles(5, { intervalSec: 3600 });
    fetchYahooCandles.mockResolvedValue(candles);
    const result = await fetchTradingCandles('EUR/USD', 'H1');
    expect(fetchYahooCandles).toHaveBeenCalledWith('EURUSD=X', '1h');
    expect(result.length).toBeGreaterThan(0);
  });

  test('propagates provider error', async () => {
    fetchKrakenCandles.mockRejectedValue(new Error('Kraken HTTP 500'));
    await expect(fetchTradingCandles('BTC/USD', 'D1')).rejects.toThrow('Kraken HTTP 500');
  });

  test('H4 fetches 1h data and aggregates', async () => {
    // 8 H1 candles → 2 H4 buckets
    const h1 = makeCandles(8, { startTime: 0, intervalSec: 3600, startPrice: 200 });
    fetchKrakenCandles.mockResolvedValue(h1);
    const result = await fetchTradingCandles('BTC/USD', 'H4');
    expect(fetchKrakenCandles).toHaveBeenCalledWith('XBTUSD', '1h');
    expect(result.length).toBeLessThanOrEqual(2);
  });

  test('TRADING_CANDLE_MAP covers all expected symbols', () => {
    const expected = [
      'BTC/USD', 'ETH/USD', 'EUR/USD', 'S&P 500', 'GOLD', 'AAPL', 'UK100',
    ];
    for (const sym of expected) {
      expect(TRADING_CANDLE_MAP.has(sym)).toBe(true);
    }
  });
});

// ── aggregateH4 ───────────────────────────────────────────────────────────────
describe('aggregateH4', () => {
  test('groups four 1h candles into one 4h candle', () => {
    const h1 = [
      { time: 0,    open: 100, high: 110, low:  95, close: 105 },
      { time: 3600, open: 105, high: 115, low: 100, close: 108 },
      { time: 7200, open: 108, high: 120, low: 104, close: 112 },
      { time: 10800, open: 112, high: 118, low: 108, close: 115 },
    ];
    const h4 = aggregateH4(h1);
    expect(h4).toHaveLength(1);
    expect(h4[0]).toMatchObject({ time: 0, open: 100, high: 120, low: 95, close: 115 });
  });

  test('produces two buckets from eight consecutive hours', () => {
    const h1 = makeCandles(8, { startTime: 0, intervalSec: 3600, startPrice: 50 });
    const h4 = aggregateH4(h1);
    expect(h4).toHaveLength(2);
    expect(h4[0].time).toBe(0);
    expect(h4[1].time).toBe(4 * 3600);
  });

  test('returns empty array from empty input', () => {
    expect(aggregateH4([])).toEqual([]);
  });
});

// ── chartHistory — pure logic ─────────────────────────────────────────────────
describe('chartHistory', () => {
  describe('computeRatio', () => {
    test('returns refPrice / lastHistClose', () => {
      expect(computeRatio(100, 101)).toBeCloseTo(1.01);
    });

    test('returns null for invalid inputs', () => {
      expect(computeRatio(0,   100)).toBeNull();
      expect(computeRatio(100,  0 )).toBeNull();
      expect(computeRatio(NaN, 100)).toBeNull();
      expect(computeRatio(-1,  100)).toBeNull();
    });
  });

  describe('scaleCandles', () => {
    test('scales all OHLC by ratio', () => {
      const candles = [{ time: 0, open: 100, high: 110, low: 90, close: 105 }];
      const scaled  = scaleCandles(candles, 2);
      expect(scaled[0]).toMatchObject({ open: 200, high: 220, low: 180, close: 210 });
    });

    test('returns same array reference when ratio is 1', () => {
      const candles = makeCandles(3);
      expect(scaleCandles(candles, 1)).toBe(candles);
    });
  });

  describe('combineCandles', () => {
    test('returns live only when hist is empty', () => {
      const live = makeCandles(2, { startTime: 7200 });
      expect(combineCandles([], live)).toBe(live);
    });

    test('returns hist only when live is empty', () => {
      const hist = makeCandles(3);
      expect(combineCandles(hist, [])).toBe(hist);
    });

    test('splices with scaled hist when ratio is within tolerance', () => {
      // hist closes at 100, live opens at 100.5 → ratio 1.005 (within 1.5%)
      const hist = [{ time: 0, open: 95, high: 105, low: 90, close: 100 }];
      const live = [
        { time: 3600, open: 100.5, high: 102, low: 99, close: 101 },
        { time: 7200, open: 101,   high: 103, low: 100, close: 102 },
      ];
      const combined = combineCandles(hist, live);
      expect(combined.length).toBe(3);
      expect(combined[combined.length - 1]).toBe(live[live.length - 1]);
    });

    test('returns live only when ratio exceeds MAX_RATIO_DEVIATION', () => {
      // hist closes at 100, live opens at 103 → ratio 1.03 > 1.5%
      const hist = [{ time: 0, open: 95, high: 105, low: 90, close: 100 }];
      const live = [
        { time: 3600, open: 103, high: 105, low: 101, close: 104 },
      ];
      const result = combineCandles(hist, live);
      expect(result).toBe(live);
    });

    test('removes overlapping hist candles before splicing', () => {
      const hist = [
        { time: 0,    open: 100, high: 105, low: 95, close: 100 },
        { time: 3600, open: 100, high: 106, low: 96, close: 101 }, // overlaps live
      ];
      const live = [
        { time: 3600, open: 101.5, high: 107, low: 97, close: 102 },
      ];
      const combined = combineCandles(hist, live);
      // only 1 hist candle should remain (time < 3600)
      expect(combined.length).toBe(2);
      expect(combined[0].time).toBe(0);
      expect(combined[1]).toBe(live[0]);
    });

    test('MAX_RATIO_DEVIATION is 0.015', () => {
      expect(MAX_RATIO_DEVIATION).toBe(0.015);
    });
  });
});
