'use strict';

const { fetchKrakenCandles } = require('../providers/kraken');
const { fetchYahooCandles }  = require('../providers/yahoo');

// ── Redis injection ───────────────────────────────────────────────────────────
let _redis = null;
function setRedis(r) { _redis = r; }

async function _cachedFetch(key, ttlSeconds, fetchFn) {
  if (_redis) {
    try {
      const cached = await _redis.get(key);
      if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
    } catch (_) {}
  }
  const data = await fetchFn();
  if (_redis) {
    try { await _redis.set(key, JSON.stringify(data), { ex: ttlSeconds }); } catch (_) {}
  }
  return data;
}

// ── Interval helpers ──────────────────────────────────────────────────────────
const TF_TO_PROVIDER_INTERVAL = {
  M1: '1m', M5: '5m', M15: '15m', H1: '1h', H4: '1h', D1: '1d',
};

const CACHE_TTL_SEC = {
  M1: 60, M5: 120, M15: 300, H1: 600, H4: 1200, D1: 3600,
};

const INTERVAL_SECS = {
  M1: 60, M5: 300, M15: 900, H1: 3600, H4: 14400, D1: 86400,
};

// ── Trading Mode symbol → Kraken / Yahoo ─────────────────────────────────────
const TRADING_CANDLE_MAP = new Map([
  // Crypto → Kraken
  ['BTC/USD',  { source: 'kraken', symbol: 'XBTUSD'  }],
  ['ETH/USD',  { source: 'kraken', symbol: 'ETHUSD'  }],
  ['SOL/USD',  { source: 'kraken', symbol: 'SOLUSD'  }],
  ['XRP/USD',  { source: 'kraken', symbol: 'XRPUSD'  }],
  ['BNB/USD',  { source: 'kraken', symbol: 'BNBUSD'  }],
  ['DOGE/USD', { source: 'kraken', symbol: 'DOGEUSD' }],
  ['LINK/USD', { source: 'kraken', symbol: 'LINKUSD' }],
  ['AVAX/USD', { source: 'kraken', symbol: 'AVAXUSD' }],
  ['ADA/USD',  { source: 'kraken', symbol: 'ADAUSD'  }],
  ['DOT/USD',  { source: 'kraken', symbol: 'DOTUSD'  }],
  // Forex → Yahoo
  ['EUR/USD',  { source: 'yahoo', symbol: 'EURUSD=X' }],
  ['GBP/USD',  { source: 'yahoo', symbol: 'GBPUSD=X' }],
  ['USD/JPY',  { source: 'yahoo', symbol: 'JPY=X'    }],
  ['USD/CHF',  { source: 'yahoo', symbol: 'CHF=X'    }],
  ['AUD/USD',  { source: 'yahoo', symbol: 'AUDUSD=X' }],
  ['USD/CAD',  { source: 'yahoo', symbol: 'CAD=X'    }],
  // Indices → Yahoo
  ['S&P 500',  { source: 'yahoo', symbol: '^GSPC'  }],
  ['NASDAQ',   { source: 'yahoo', symbol: '^IXIC'  }],
  ['DOW',      { source: 'yahoo', symbol: '^DJI'   }],
  ['GER40',    { source: 'yahoo', symbol: '^GDAXI' }],
  ['UK100',    { source: 'yahoo', symbol: '^FTSE'  }],
  ['JPN225',   { source: 'yahoo', symbol: '^N225'  }],
  // Commodities → Yahoo
  ['GOLD',     { source: 'yahoo', symbol: 'GC=F'  }],
  ['SILVER',   { source: 'yahoo', symbol: 'SI=F'  }],
  ['OIL/USD',  { source: 'yahoo', symbol: 'CL=F'  }],
  ['NGAS',     { source: 'yahoo', symbol: 'NG=F'  }],
  ['COPPER',   { source: 'yahoo', symbol: 'HG=F'  }],
  // Stocks → Yahoo
  ['AAPL',     { source: 'yahoo', symbol: 'AAPL'  }],
  ['TSLA',     { source: 'yahoo', symbol: 'TSLA'  }],
  ['MSFT',     { source: 'yahoo', symbol: 'MSFT'  }],
  ['AMZN',     { source: 'yahoo', symbol: 'AMZN'  }],
  ['GOOGL',    { source: 'yahoo', symbol: 'GOOGL' }],
  ['META',     { source: 'yahoo', symbol: 'META'  }],
  ['NVDA',     { source: 'yahoo', symbol: 'NVDA'  }],
]);

// ── H4 aggregation ────────────────────────────────────────────────────────────
function aggregateH4(h1Candles) {
  const buckets = new Map();
  for (const c of h1Candles) {
    const bucketTime = Math.floor(c.time / (4 * 3600)) * (4 * 3600);
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, { time: bucketTime, open: c.open, high: c.high, low: c.low, close: c.close });
    } else {
      const b = buckets.get(bucketTime);
      if (c.high > b.high) b.high = c.high;
      if (c.low  < b.low)  b.low  = c.low;
      b.close = c.close;
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

// ── Clip anomalous wicks (same logic as game mode) ────────────────────────────
function clipAnomalousWicks(candles) {
  if (candles.length < 10) return candles;
  const ranges = candles.map(c => c.high - c.low).sort((a, b) => a - b);
  const medianRange = ranges[Math.floor(ranges.length / 2)];
  const maxRange = medianRange * 6;
  return candles.map(c => {
    const body  = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    const mid   = (c.high + c.low) / 2;
    if (mid <= 0 || range <= maxRange || range <= mid * 0.008) return c;
    const allowedRange = Math.max(maxRange, body * 1.1);
    const upper = c.high - Math.max(c.open, c.close);
    const lower = Math.min(c.open, c.close) - c.low;
    const totalWicks = upper + lower;
    if (totalWicks <= 0) return c;
    const wickBudget = Math.max(0, allowedRange - body);
    const scale = wickBudget / totalWicks;
    return {
      time:  c.time,
      open:  c.open,
      high:  Math.max(c.open, c.close) + upper * scale,
      low:   Math.min(c.open, c.close) - lower * scale,
      close: c.close,
    };
  });
}

// ── Drop the current unclosed candle ─────────────────────────────────────────
function dropUnclosedCandle(candles, intervalSecs) {
  if (!candles.length) return candles;
  const last = candles[candles.length - 1];
  if (last.time + intervalSecs > Math.floor(Date.now() / 1000)) return candles.slice(0, -1);
  return candles;
}

// ── Main fetch ────────────────────────────────────────────────────────────────
/**
 * Fetches historical candles for a Trading Mode symbol/timeframe.
 * Uses tc2: prefix to avoid colliding with game-mode cv2: cache.
 */
async function fetchTradingCandles(tradingSymbol, tf) {
  const entry = TRADING_CANDLE_MAP.get(tradingSymbol);
  if (!entry) throw new Error('Unknown trading symbol: ' + tradingSymbol);

  const ivSecs   = INTERVAL_SECS[tf];
  const cacheKey = `tc2:${tradingSymbol}:${tf}`;
  const ttl      = CACHE_TTL_SEC[tf];

  return _cachedFetch(cacheKey, ttl, async () => {
    if (tf === 'H4') {
      // Fetch H1 candles then aggregate to 4h buckets
      const providerInterval = '1h';
      const raw = entry.source === 'kraken'
        ? await fetchKrakenCandles(entry.symbol, providerInterval)
        : await fetchYahooCandles(entry.symbol, providerInterval);
      const clipped   = clipAnomalousWicks(raw);
      const dropped   = dropUnclosedCandle(clipped, 3600); // drop unclosed H1 before aggregation
      const h4Candles = aggregateH4(dropped);
      return dropUnclosedCandle(h4Candles, ivSecs);
    }

    const providerInterval = TF_TO_PROVIDER_INTERVAL[tf];
    const raw = entry.source === 'kraken'
      ? await fetchKrakenCandles(entry.symbol, providerInterval)
      : await fetchYahooCandles(entry.symbol, providerInterval);
    const clipped = clipAnomalousWicks(raw);
    return dropUnclosedCandle(clipped, ivSecs);
  });
}

module.exports = {
  setRedis,
  fetchTradingCandles,
  TRADING_CANDLE_MAP,
  aggregateH4,
};
