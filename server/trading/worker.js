'use strict';

// ── Trading Mode background worker ────────────────────────────────────────────
//
// Runs in-process on a setInterval. Every INTERVAL_MS it:
//   1. Fetches the distinct set of userIds with open positions (one query).
//   2. For each user, runs checkStopLossTakeProfit → checkMarginLevel in order
//      (closing SL/TP first can avoid a liquidation cascade).
//   3. Wraps each user in an individual try/catch so one failure doesn't kill
//      the worker or affect other users.
//   4. Logs every triggered action (liquidation, SL, TP) with enough detail to
//      audit what the worker did.
//
// 5 s interval rationale: at 1:100 leverage a 0.5% price move can push margin
// level from 100% to 50% (stop-out). The stub ticks every 2 s, so with a 5 s
// window we catch most moves within 1-2 ticks of them happening.
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const INTERVAL_MS = 5_000;

const Position = () => mongoose.model('TradingPosition');

function runTradingWorker(checkStopLossTakeProfit, checkMarginLevel) {
  const timer = setInterval(async () => {
    let userIds;
    try {
      // Single aggregation to get distinct userIds with open positions
      const rows = await Position().distinct('userId');
      userIds = rows;
    } catch (err) {
      console.error('[trading-worker] failed to fetch userIds:', err.message);
      return;
    }

    if (userIds.length === 0) return;

    await Promise.all(userIds.map(async userId => {
      try {
        // ── SL/TP first — may remove positions and avoid margin cascade ──────
        const triggered = await checkStopLossTakeProfit(userId);
        for (const t of triggered) {
          console.log(
            `[trading-worker] SL/TP  userId=${userId} symbol=${t.symbol}` +
            ` direction=${t.direction} reason=${t.reason}` +
            ` pnl=${t.pnl.toFixed(2)} closePrice=${t.closePrice}`
          );
        }

        // ── Margin / liquidation check ────────────────────────────────────────
        const liquidated = await checkMarginLevel(userId);
        for (const l of liquidated) {
          console.log(
            `[trading-worker] LIQDT  userId=${userId} symbol=${l.symbol}` +
            ` direction=${l.direction} reason=liquidation` +
            ` pnl=${l.pnl.toFixed(2)} newBalance=${l.newBalance.toFixed(2)}`
          );
        }
      } catch (err) {
        // Per-user error: log and continue — one bad user never blocks others.
        console.error(`[trading-worker] error for userId=${userId}:`, err.message);
      }
    }));
  }, INTERVAL_MS);

  // Allow the process to exit cleanly even if this timer is still pending
  if (timer.unref) timer.unref();

  console.log(`[trading-worker] started — interval=${INTERVAL_MS}ms`);
  return timer;
}

module.exports = { runTradingWorker, INTERVAL_MS };
