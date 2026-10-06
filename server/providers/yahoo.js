'use strict';

const YahooFinance = require('yahoo-finance2').default;
const yf = new YahooFinance();

// Cap cached candles for high-frequency 24h assets (forex, commodities) at 1h
// to avoid oversized Redis entries (~17k candles at 730d).
const FOREX_COMMODITY_1H_CAP = 1000;

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function getPeriod1(interval) {
  if (interval === '1d')  return daysAgo(1000); // ~700+ daily candles (intraday limit doesn't apply)
  if (interval === '1h')  return daysAgo(120);  // 120d: ~830 for stocks, ~2800 for forex/commodities
  if (interval === '15m') return daysAgo(58);   // Yahoo max is 60d; 58d gives buffer vs midnight boundary
  if (interval === '5m')  return daysAgo(58);   // same boundary buffer
  if (interval === '1m')  return daysAgo(7);    // Yahoo max for 1m;  ~2400+ candles
  throw new Error('Unsupported Yahoo interval: ' + interval);
}

async function fetchYahooCandles(symbol, interval, opts) {
  const from = opts && opts.from;
  const to   = opts && opts.to;
  const period1 = from || getPeriod1(interval);
  const chartOpts = { interval: interval, period1: period1 };
  if (to) chartOpts.period2 = to;

  const result = await yf.chart(symbol, chartOpts);
  if (!result || !result.quotes || result.quotes.length === 0) {
    throw new Error('Yahoo Finance: no data for ' + symbol);
  }

  let candles = result.quotes
    .filter(q => q.open != null && q.high != null && q.low != null && q.close != null)
    .map(q => ({
      time:  Math.floor(new Date(q.date).getTime() / 1000),
      open:  q.open,
      high:  q.high,
      low:   q.low,
      close: q.close,
    }));

  // Cap 1h candles before caching to keep Redis entries small.
  // At 120d, forex/commodities can return ~2800 candles; cap to 1000.
  // Stocks (~830) and indices (~540) are already under the cap.
  if (interval === '1h' && !from) {
    candles = candles.slice(-FOREX_COMMODITY_1H_CAP);
  }

  return candles;
}

module.exports = { fetchYahooCandles };
