#!/usr/bin/env node
'use strict';

/**
 * candleDivergenceCheck — compares the last H1 close from Kraken/Yahoo against
 * the live mid price from Upscale for each Trading Mode symbol.
 *
 * Usage:
 *   node -r dotenv/config server/scripts/candleDivergenceCheck.js
 *
 * Requires UPSCALE_API_KEY in env (from .env).
 * Outputs a table: symbol | last H1 close | live price | ratio | status
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { TRADING_CANDLE_MAP } = require('../utils/tradingCandles');
const { fetchKrakenCandles } = require('../providers/kraken');
const { fetchYahooCandles }  = require('../providers/yahoo');
const { TICKER_MAP }         = require('../trading/upscaleProvider');

const UPSCALE_API_KEY  = process.env.UPSCALE_API_KEY;
const UPSCALE_API_BASE = 'https://api.upscale.trade';
const MAX_RATIO_DEVIATION = 0.015;

async function getLivePricesFromUpscale() {
  if (!UPSCALE_API_KEY) throw new Error('UPSCALE_API_KEY not set');

  // Resolve accountId
  const accRes = await fetch(`${UPSCALE_API_BASE}/accounts/with-risk-status`, {
    headers: { Authorization: `Bearer ${UPSCALE_API_KEY}`, Accept: 'application/json' },
  });
  if (!accRes.ok) throw new Error(`/accounts failed: HTTP ${accRes.status}`);
  const accounts = await accRes.json();
  const list   = Array.isArray(accounts) ? accounts : (accounts?.accounts ?? []);
  const active = list.find(a => a.status === 'active');
  if (!active) throw new Error('No active account found');

  const marketsRes = await fetch(
    `${UPSCALE_API_BASE}/v2/markets?accountId=${active.accountId}`,
    { headers: { Authorization: `Bearer ${UPSCALE_API_KEY}`, Accept: 'application/json' } }
  );
  if (!marketsRes.ok) throw new Error(`/v2/markets failed: HTTP ${marketsRes.status}`);
  const body    = await marketsRes.json();
  const markets = Array.isArray(body) ? body : (body?.markets ?? []);

  const prices = {};
  for (const market of markets) {
    const ticker = market?.config?.ticker;
    const fp9Str = market?.state?.indexPrice;
    if (!ticker || !fp9Str) continue;
    const symbol = TICKER_MAP[ticker];
    if (!symbol) continue;
    const raw   = BigInt(fp9Str);
    const whole = Number(raw / 1_000_000_000n);
    const frac  = Number(raw % 1_000_000_000n) / 1_000_000_000;
    prices[symbol] = whole + frac;
  }
  return prices;
}

async function getLastH1Close(tradingSymbol) {
  const entry = TRADING_CANDLE_MAP.get(tradingSymbol);
  if (!entry) return null;
  try {
    const candles = entry.source === 'kraken'
      ? await fetchKrakenCandles(entry.symbol, '1h')
      : await fetchYahooCandles(entry.symbol, '1h');
    if (!candles.length) return null;
    return candles[candles.length - 1].close;
  } catch {
    return null;
  }
}

async function main() {
  console.log('\nFetching live prices from Upscale…');
  let livePrices;
  try {
    livePrices = await getLivePricesFromUpscale();
  } catch (err) {
    console.error('Failed to fetch Upscale prices:', err.message);
    console.log('Continuing without live prices (ratio column will be N/A).\n');
    livePrices = {};
  }

  const symbols = Array.from(TRADING_CANDLE_MAP.keys());
  const rows    = [];

  console.log(`Fetching last H1 close for ${symbols.length} symbols…\n`);

  await Promise.allSettled(symbols.map(async sym => {
    const lastClose = await getLastH1Close(sym);
    const livePrice = livePrices[sym];
    let ratio  = null;
    let status = '—';

    if (lastClose != null && livePrice != null) {
      ratio  = livePrice / lastClose;
      const deviation = Math.abs(ratio - 1);
      if      (deviation <= MAX_RATIO_DEVIATION) status = '✓';
      else if (deviation <= 0.05)                status = '⚠';
      else                                        status = '✖';
    } else if (lastClose == null) {
      status = 'NO DATA';
    } else {
      status = 'NO LIVE';
    }

    rows.push({ sym, lastClose, livePrice, ratio, status });
  }));

  rows.sort((a, b) => a.sym.localeCompare(b.sym));

  const col = (s, w) => String(s ?? 'N/A').padEnd(w);
  const header = col('Symbol', 14) + col('H1 Close', 14) + col('Live Price', 14) + col('Ratio', 10) + 'Status';
  const sep    = '-'.repeat(header.length);

  console.log(sep);
  console.log(header);
  console.log(sep);

  for (const { sym, lastClose, livePrice, ratio, status } of rows) {
    const ratioStr = ratio != null ? ratio.toFixed(5) : 'N/A';
    const closeStr = lastClose != null ? lastClose.toFixed(4) : 'N/A';
    const liveStr  = livePrice != null ? livePrice.toFixed(4) : 'N/A';
    console.log(col(sym, 14) + col(closeStr, 14) + col(liveStr, 14) + col(ratioStr, 10) + status);
  }

  console.log(sep);
  console.log('\n✓ = within 1.5%  ⚠ = 1.5–5%  ✖ = >5%  deviation from last H1 close\n');
}

main().catch(err => { console.error(err); process.exit(1); });
