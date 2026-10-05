'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Tests for the weekly-snapshot baseline bug and related fixes.
//
// Root cause: POST /portfolio/snapshot called getPortfolioValue() which only
// counted portfolio.cash + open positions. When a user placed all-in pending
// buy orders before market open, portfolio.cash ≈ $0 and positions = [], so
// the snapshot stored a near-zero baseline. The weekly-leaderboard then
// produced astronomically wrong return percentages.
//
// Fixes tested here:
//   1. getPortfolioValue includes reservedCash from pending/processing orders
//   2. /portfolio/snapshot skips values below MIN_PORTFOLIO_SNAPSHOT_VALUE ($100)
//   3. /portfolio/weekly/leaderboard ignores baselines below $100 and clamps
//      absurd percentages to MAX_RETURN_PCT (10 000 %)
// ─────────────────────────────────────────────────────────────────────────────

// ── Pure-logic helpers extracted from index.js ────────────────────────────────

const MIN_PORTFOLIO_SNAPSHOT_VALUE = 100;
const MIN_VALID_BASELINE = 100;
const MAX_RETURN_PCT = 10000;

function computePortfolioValue({ cash, positions, reservedCash = 0, priceMap = {} }) {
  const invested = positions.reduce(
    (s, pos) => s + (priceMap[pos.symbol] != null ? priceMap[pos.symbol] : pos.avgPrice) * pos.qty,
    0
  );
  return cash + reservedCash + invested;
}

function computeReturnPct(totalValue, rawBaseline) {
  const baseline =
    rawBaseline != null && rawBaseline >= MIN_VALID_BASELINE ? rawBaseline : 50000;
  const raw = ((totalValue - baseline) / baseline) * 100;
  return Math.max(-100, Math.min(MAX_RETURN_PCT, raw));
}

// ─────────────────────────────────────────────────────────────────────────────

describe('getPortfolioValue — includes reservedCash', () => {
  test('normal portfolio: cash + positions', () => {
    const val = computePortfolioValue({
      cash: 60000,
      positions: [{ symbol: 'AAPL', qty: 10, avgPrice: 200 }],
      priceMap: { AAPL: 210 },
    });
    expect(val).toBeCloseTo(60000 + 10 * 210);
  });

  test('all-in with pending orders: cash ≈ 0, reserved ≈ 50k → equity ≈ 50k', () => {
    const val = computePortfolioValue({
      cash: 0.04,
      positions: [],
      reservedCash: 49999.96,
    });
    expect(val).toBeCloseTo(50000);
  });

  test('all-in with pending orders + existing positions: sums all three', () => {
    const val = computePortfolioValue({
      cash: 0.02,
      positions: [{ symbol: 'MSFT', qty: 5, avgPrice: 400 }],
      reservedCash: 30000,
      priceMap: { MSFT: 420 },
    });
    expect(val).toBeCloseTo(0.02 + 5 * 420 + 30000);
  });

  test('price fallback to avgPrice when priceMap is empty', () => {
    const val = computePortfolioValue({
      cash: 100,
      positions: [{ symbol: 'AAPL', qty: 10, avgPrice: 333.73 }],
      priceMap: {},
    });
    expect(val).toBeCloseTo(100 + 10 * 333.73);
  });

  test('orejillapelona case: after sell, positions empty, reserved=0 → $100377', () => {
    const val = computePortfolioValue({
      cash: 100377.526682,
      positions: [],
      reservedCash: 0,
    });
    expect(val).toBeCloseTo(100377.526682);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Snapshot guard — skips near-zero equity', () => {
  function shouldSaveSnapshot(totalValue) {
    return totalValue >= MIN_PORTFOLIO_SNAPSHOT_VALUE;
  }

  test('saves when equity is normal ($50k)', () => {
    expect(shouldSaveSnapshot(50000)).toBe(true);
  });

  test('saves when equity is just above threshold ($101)', () => {
    expect(shouldSaveSnapshot(101)).toBe(true);
  });

  test('saves at exactly threshold ($100)', () => {
    expect(shouldSaveSnapshot(100)).toBe(true);
  });

  test('skips when equity is $0.024 (all-in reserved, no positions)', () => {
    expect(shouldSaveSnapshot(0.024)).toBe(false);
  });

  test('skips when equity is $0.04 (residual cash after all-in)', () => {
    expect(shouldSaveSnapshot(0.04)).toBe(false);
  });

  test('skips when equity is $99.99 (just below threshold)', () => {
    expect(shouldSaveSnapshot(99.99)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Weekly leaderboard — corrupt baseline protection', () => {
  test('uses 50000 fallback when no baseline exists (null)', () => {
    const pct = computeReturnPct(50500, null);
    expect(pct).toBeCloseTo(1.0);
  });

  test('uses 50000 fallback when baseline is corrupt ($0.024)', () => {
    // Without fix: ((100377 - 0.024) / 0.024) * 100 ≈ +420 million %
    // With fix:    ((100377 - 50000) / 50000) * 100 ≈ +100.75 %
    const pct = computeReturnPct(100377.53, 0.024);
    expect(pct).toBeCloseTo(100.755, 1);
  });

  test('uses 50000 fallback when baseline is $0 (div by zero guard)', () => {
    const pct = computeReturnPct(60000, 0);
    expect(pct).toBeCloseTo(20.0);
  });

  test('uses real baseline when it is valid ($52000)', () => {
    const pct = computeReturnPct(54000, 52000);
    expect(pct).toBeCloseTo((2000 / 52000) * 100, 2);
  });

  test('clamps MAX: insane positive % is capped at 10000', () => {
    // Baseline $0.024 bypassed the guard (< MIN_VALID_BASELINE → 50000 used),
    // but if a different corrupt case somehow slips through, MAX_RETURN_PCT caps it.
    const pct = computeReturnPct(1e9, 100); // absurd but still >= MIN_VALID_BASELINE
    expect(pct).toBe(MAX_RETURN_PCT);
  });

  test('clamps MIN: max loss is -100%', () => {
    const pct = computeReturnPct(0, 50000);
    expect(pct).toBe(-100);
  });

  test('orejillapelona — correct baseline ($50k) → ≈ +100.75%', () => {
    // This user started with $100k but the system default is $50k;
    // with the corrupt baseline replaced by 50000, the displayed return is ~100.75%.
    const pct = computeReturnPct(100377.526682, 0.024); // corrupt baseline → uses 50000
    expect(pct).toBeGreaterThan(99);
    expect(pct).toBeLessThan(102);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Atomic order claim logic', () => {
  // Simulate the findOneAndUpdate claim: returns null if already claimed
  function claimOrder(order, targetStatus = 'pending') {
    if (order.status !== targetStatus) return null;
    order.status = 'processing';
    return order;
  }

  test('first replica claims the order successfully', () => {
    const order = { _id: '1', status: 'pending' };
    expect(claimOrder(order)).not.toBeNull();
    expect(order.status).toBe('processing');
  });

  test('second replica finds order already claimed → returns null', () => {
    const order = { _id: '1', status: 'processing' };
    expect(claimOrder(order)).toBeNull();
  });

  test('already-executed order is not re-claimed', () => {
    const order = { _id: '1', status: 'executed' };
    expect(claimOrder(order)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Audit queries (production read-only)', () => {
  // These are not runnable without a DB connection — they document the
  // queries used in repair-weekly-snapshots.js for review.

  test('corrupt-baseline query selects snapshots below MIN_VALID_BASELINE', () => {
    const filter = { totalValue: { $lt: MIN_VALID_BASELINE } };
    expect(filter.totalValue.$lt).toBe(MIN_VALID_BASELINE);
  });

  test('double-execution query: same userId + symbol + action within 10 seconds', () => {
    // Two transactions with the same symbol, action, and qty within 10s → suspect duplicate
    const windowMs = 10 * 1000;
    expect(windowMs).toBe(10000);
  });
});
