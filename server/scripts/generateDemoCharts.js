#!/usr/bin/env node
/**
 * Generates synthetic demo candlestick fixtures for the landing mini-game.
 * Run once: node server/scripts/generateDemoCharts.js > src/landing/demoCharts.json
 *
 * No network calls. Data is deterministic via seeded LCG.
 */

// Simple seeded LCG
function makeLCG(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateCandles(opts) {
  const { startPrice, volatility, drift, totalCount, seed, decimals = 2 } = opts;
  const rng = makeLCG(seed);
  const BASE_TIME = 1704067200000; // 2024-01-01 UTC
  const candles = [];
  let prev = startPrice;

  for (let i = 0; i < totalCount; i++) {
    const open = prev;
    const pct = drift + (rng() - 0.5) * volatility * 2;
    let close = open * (1 + pct);
    // prevent collapse
    if (close < open * 0.85) close = open * 0.85;
    if (close > open * 1.15) close = open * 1.15;

    const bodyHigh = Math.max(open, close);
    const bodyLow  = Math.min(open, close);
    const wickUp   = bodyHigh * (1 + rng() * 0.004);
    const wickDown = bodyLow  * (1 - rng() * 0.004);

    const fmt = (n) => parseFloat(n.toFixed(decimals));
    candles.push({ t: BASE_TIME + i * 86400000, o: fmt(open), h: fmt(wickUp), l: fmt(wickDown), c: fmt(close) });
    prev = close;
  }
  return candles;
}

const TOTAL = 72; // 60 visible + 12 hidden
const VISIBLE = 60;

const FIXTURES = [
  {
    id: 'btc-up',
    asset: 'BTC/USD',
    type: 'crypto',
    // synthetic data, direction forced UP in hidden segment
    visibleSeed: 42,
    visibleDrift: 0.0005,
    hiddenDrift: 0.0025,     // clear uptrend in reveal
    startPrice: 42000,
    volatility: 0.018,
    decimals: 0,
  },
  {
    id: 'eurusd-down',
    asset: 'EUR/USD',
    type: 'forex',
    visibleSeed: 137,
    visibleDrift: -0.0001,
    hiddenDrift: -0.0018,    // clear downtrend in reveal
    startPrice: 1.0850,
    volatility: 0.004,
    decimals: 4,
  },
  {
    id: 'spx-up',
    asset: 'S&P 500',
    type: 'index',
    visibleSeed: 7,
    visibleDrift: 0.0004,
    hiddenDrift: 0.002,      // clear uptrend
    startPrice: 4800,
    volatility: 0.009,
    decimals: 0,
  },
  {
    id: 'gold-down',
    asset: 'XAU/USD',
    type: 'commodity',
    visibleSeed: 999,
    visibleDrift: 0.0002,
    hiddenDrift: -0.002,     // clear downtrend
    startPrice: 2050,
    volatility: 0.007,
    decimals: 1,
  },
];

const result = FIXTURES.map(fx => {
  // Generate visible segment with neutral drift
  const visible = generateCandles({
    startPrice: fx.startPrice,
    volatility: fx.volatility,
    drift: fx.visibleDrift,
    totalCount: VISIBLE,
    seed: fx.visibleSeed,
    decimals: fx.decimals,
  });

  // Hidden segment starts where visible ends
  const lastClose = visible[visible.length - 1].c;
  const hidden = generateCandles({
    startPrice: lastClose,
    volatility: fx.volatility * 0.6,  // less noise, clearer trend
    drift: fx.hiddenDrift,
    totalCount: TOTAL - VISIBLE,
    seed: fx.visibleSeed + 1000,
    decimals: fx.decimals,
  });

  // Determine actual direction from hidden segment
  const direction = hidden[hidden.length - 1].c > visible[visible.length - 1].c ? 'up' : 'down';

  return {
    id: fx.id,
    asset: fx.asset,
    type: fx.type,
    synthetic: true,
    direction,
    visibleCandles: visible,
    hiddenCandles: hidden,
  };
});

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
