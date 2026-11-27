'use strict';

// Tests for src/trading/liveCandles.js (ESM module loaded via dynamic import).

let addTick, getCandles, reset, INTERVALS_SEC, MAX_CANDLES;

beforeAll(async () => {
  const m = await import('../../src/trading/liveCandles.js');
  addTick      = m.addTick;
  getCandles   = m.getCandles;
  reset        = m.reset;
  INTERVALS_SEC = m.INTERVALS_SEC;
  MAX_CANDLES  = m.MAX_CANDLES;
});

beforeEach(() => reset());

describe('liveCandles', () => {
  describe('first tick', () => {
    test('creates candle with open=high=low=close for all timeframes', () => {
      addTick('BTC/USD', 50000, 0);
      for (const tf of ['M1', 'M5', 'M15']) {
        const candles = getCandles('BTC/USD', tf);
        expect(candles).toHaveLength(1);
        expect(candles[0]).toMatchObject({ open: 50000, high: 50000, low: 50000, close: 50000 });
      }
    });

    test('ignores invalid prices', () => {
      addTick('BTC/USD', 0, 0);
      addTick('BTC/USD', -1, 0);
      addTick('BTC/USD', NaN, 0);
      expect(getCandles('BTC/USD', 'M1')).toHaveLength(0);
    });
  });

  describe('tick within same interval', () => {
    test('updates high, low, close but preserves open', () => {
      addTick('BTC/USD', 100,  0);
      addTick('BTC/USD', 110, 10000);
      addTick('BTC/USD',  90, 20000);
      addTick('BTC/USD', 105, 30000);
      const c = getCandles('BTC/USD', 'M1')[0];
      expect(c.open).toBe(100);
      expect(c.high).toBe(110);
      expect(c.low).toBe(90);
      expect(c.close).toBe(105);
    });
  });

  describe('interval boundary', () => {
    test('opens a new M1 candle exactly at the 60 s mark', () => {
      addTick('BTC/USD', 100,     0);
      addTick('BTC/USD', 110, 60000);
      const candles = getCandles('BTC/USD', 'M1');
      expect(candles).toHaveLength(2);
      expect(candles[0].close).toBe(100);
      expect(candles[1]).toMatchObject({ time: 60, open: 110, high: 110, low: 110, close: 110 });
    });

    test('five M1 ticks land in one M5 candle', () => {
      for (let i = 0; i < 5; i++) addTick('BTC/USD', 100 + i, i * 60000);
      expect(getCandles('BTC/USD', 'M1')).toHaveLength(5);
      expect(getCandles('BTC/USD', 'M5')).toHaveLength(1);
    });
  });

  describe('MAX_CANDLES limit', () => {
    test('evicts oldest candle once the cap is exceeded', () => {
      for (let i = 0; i <= MAX_CANDLES; i++) {
        addTick('BTC/USD', 100 + i, i * 60000);
      }
      const candles = getCandles('BTC/USD', 'M1');
      expect(candles).toHaveLength(MAX_CANDLES);
      expect(candles[0].time).toBe(60);
    });
  });

  describe('multiple symbols', () => {
    test('symbols accumulate independently', () => {
      addTick('BTC/USD', 50000, 0);
      addTick('ETH/USD',  3000, 0);
      addTick('SOL/USD',   150, 0);
      expect(getCandles('BTC/USD', 'M1')[0].close).toBe(50000);
      expect(getCandles('ETH/USD', 'M1')[0].close).toBe(3000);
      expect(getCandles('SOL/USD', 'M1')[0].close).toBe(150);
    });

    test('ticks for one symbol do not affect another', () => {
      addTick('BTC/USD', 100, 0);
      addTick('BTC/USD', 200, 0);
      expect(getCandles('ETH/USD', 'M1')).toHaveLength(0);
    });
  });

  describe('INTERVALS_SEC constant', () => {
    test('exports expected intervals', () => {
      expect(INTERVALS_SEC).toMatchObject({ M1: 60, M5: 300, M15: 900 });
    });
  });
});
