// In-memory OHLC accumulator fed by /api/trading/prices poll ticks.
// Lives at module scope — data persists for the session, resets on page reload.
// No server requests; no external providers.

const INTERVALS_SEC = { M1: 60, M5: 300, M15: 900 };
const MAX_CANDLES = 300;

// symbol → { M1: Candle[], M5: Candle[], M15: Candle[] }
const _store = new Map();

/**
 * Feed a price tick into the store. Called for every symbol on every poll cycle.
 * @param {string} symbol   e.g. 'BTC/USD'
 * @param {number} price    mid price (the same value shown in the price list)
 * @param {number} [nowMs]  timestamp in ms (default: Date.now())
 */
export function addTick(symbol, price, nowMs = Date.now()) {
  if (!symbol || !isFinite(price) || price <= 0) return;
  const nowSec = Math.floor(nowMs / 1000);

  if (!_store.has(symbol)) _store.set(symbol, { M1: [], M5: [], M15: [] });
  const sym = _store.get(symbol);

  for (const [tf, ivs] of Object.entries(INTERVALS_SEC)) {
    const time = Math.floor(nowSec / ivs) * ivs;
    const candles = sym[tf];
    const last = candles.length ? candles[candles.length - 1] : null;

    if (!last || last.time !== time) {
      candles.push({ time, open: price, high: price, low: price, close: price });
      if (candles.length > MAX_CANDLES) candles.shift();
    } else {
      if (price > last.high) last.high = price;
      if (price < last.low) last.low = price;
      last.close = price;
    }
  }
}

/**
 * Returns the accumulated candles for a symbol/timeframe.
 * Returns the live array reference — caller reads, never mutates.
 * @param {string} symbol
 * @param {'M1'|'M5'|'M15'} tf
 * @returns {Array<{time:number,open:number,high:number,low:number,close:number}>}
 */
export function getCandles(symbol, tf) {
  const sym = _store.get(symbol);
  if (!sym) return [];
  return sym[tf] ?? [];
}

/** Clears all stored candles (used in tests). */
export function reset() {
  _store.clear();
}

export { INTERVALS_SEC, MAX_CANDLES };
