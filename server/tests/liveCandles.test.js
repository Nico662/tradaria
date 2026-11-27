'use strict';

// Tests for the live tick accumulation logic used by TradingMode's liveCandles module.
// Logic is inlined as CJS — no dependency on the ES module (which uses ESM syntax).

const INTERVALS_SEC = { M1: 60, M5: 300, M15: 900 };
const MAX_CANDLES = 300;

function createStore() {
  const _s = new Map();

  function addTick(symbol, price, nowMs = Date.now()) {
    if (!symbol || !isFinite(price) || price <= 0) return;
    const nowSec = Math.floor(nowMs / 1000);
    if (!_s.has(symbol)) _s.set(symbol, { M1: [], M5: [], M15: [] });
    const sym = _s.get(symbol);
    for (const [tf, ivs] of Object.entries(INTERVALS_SEC)) {
      const time = Math.floor(nowSec / ivs) * ivs;
      const candles = sym[tf];
      const last = candles.length ? candles[candles.length - 1] : null;
      if (!last || last.time !== time) {
        candles.push({ time, open: price, high: price, low: price, close: price });
        if (candles.length > MAX_CANDLES) candles.shift();
      } else {
        if (price > last.high) last.high = price;
        if (price < last.low)  last.low  = price;
        last.close = price;
      }
    }
  }

  function getCandles(symbol, tf) {
    const sym = _s.get(symbol);
    if (!sym) return [];
    return sym[tf] ?? [];
  }

  return { addTick, getCandles };
}

describe('liveCandles', () => {
  describe('first tick', () => {
    test('creates candle with open=high=low=close for all timeframes', () => {
      const { addTick, getCandles } = createStore();
      addTick('BTC/USD', 50000, 0);
      for (const tf of ['M1', 'M5', 'M15']) {
        const candles = getCandles('BTC/USD', tf);
        expect(candles).toHaveLength(1);
        expect(candles[0]).toMatchObject({ open: 50000, high: 50000, low: 50000, close: 50000 });
      }
    });

    test('ignores invalid prices', () => {
      const { addTick, getCandles } = createStore();
      addTick('BTC/USD', 0, 0);
      addTick('BTC/USD', -1, 0);
      addTick('BTC/USD', NaN, 0);
      expect(getCandles('BTC/USD', 'M1')).toHaveLength(0);
    });
  });

  describe('tick within same interval', () => {
    test('updates high, low, close but preserves open', () => {
      const { addTick, getCandles } = createStore();
      addTick('BTC/USD', 100,  0);       // open of M1 bucket at t=0
      addTick('BTC/USD', 110, 10000);    // +10 s — still bucket t=0
      addTick('BTC/USD',  90, 20000);    // +20 s — still bucket t=0
      addTick('BTC/USD', 105, 30000);    // +30 s — still bucket t=0
      const c = getCandles('BTC/USD', 'M1')[0];
      expect(c.open).toBe(100);
      expect(c.high).toBe(110);
      expect(c.low).toBe(90);
      expect(c.close).toBe(105);
    });
  });

  describe('interval boundary', () => {
    test('opens a new M1 candle exactly at the 60 s mark', () => {
      const { addTick, getCandles } = createStore();
      addTick('BTC/USD', 100,     0);
      addTick('BTC/USD', 110, 60000);  // new M1 bucket (t=60 s)
      const candles = getCandles('BTC/USD', 'M1');
      expect(candles).toHaveLength(2);
      expect(candles[0].close).toBe(100);
      expect(candles[1]).toMatchObject({ time: 60, open: 110, high: 110, low: 110, close: 110 });
    });

    test('five M1 ticks land in one M5 candle', () => {
      const { addTick, getCandles } = createStore();
      for (let i = 0; i < 5; i++) addTick('BTC/USD', 100 + i, i * 60000);
      expect(getCandles('BTC/USD', 'M1')).toHaveLength(5);
      expect(getCandles('BTC/USD', 'M5')).toHaveLength(1);
    });
  });

  describe('MAX_CANDLES limit', () => {
    test('evicts oldest candle once the cap is exceeded', () => {
      const { addTick, getCandles } = createStore();
      // MAX_CANDLES + 1 unique M1 buckets
      for (let i = 0; i <= MAX_CANDLES; i++) {
        addTick('BTC/USD', 100 + i, i * 60000);
      }
      const candles = getCandles('BTC/USD', 'M1');
      expect(candles).toHaveLength(MAX_CANDLES);
      // bucket i=0 (time=0) was evicted; oldest is now i=1 (time=60)
      expect(candles[0].time).toBe(60);
    });
  });

  describe('multiple symbols', () => {
    test('symbols accumulate independently', () => {
      const { addTick, getCandles } = createStore();
      addTick('BTC/USD', 50000, 0);
      addTick('ETH/USD',  3000, 0);
      addTick('SOL/USD',   150, 0);
      expect(getCandles('BTC/USD', 'M1')[0].close).toBe(50000);
      expect(getCandles('ETH/USD', 'M1')[0].close).toBe(3000);
      expect(getCandles('SOL/USD', 'M1')[0].close).toBe(150);
    });

    test('ticks for one symbol do not affect another', () => {
      const { addTick, getCandles } = createStore();
      addTick('BTC/USD', 100, 0);
      addTick('BTC/USD', 200, 0);  // only updates BTC
      expect(getCandles('ETH/USD', 'M1')).toHaveLength(0);
    });
  });
});
