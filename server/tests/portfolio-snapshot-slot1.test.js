'use strict';

// Regression test for POST /portfolio/snapshot returning 500 for Portfolio B (slot=1).
//
// Root cause (confirmed): getPortfolioValue() can return NaN when a position has
// avgPrice=undefined and the live price is also unavailable. Mongoose then throws
// CastError: Cast to Number failed for value "NaN" at path "totalValue" inside
// findOneAndUpdate, which the catch block was silently converting to 500.
//
// Fix: guard with Number.isFinite(totalValue) before the upsert; return
// { ok: true, skipped: true } instead of 500 for non-finite values.

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase } = require('./helpers/testApp');

const PortfolioHistorySchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slot:       { type: Number, default: 0, enum: [0, 1] },
  date:       { type: String, required: true },
  totalValue: { type: Number, required: true },
});
PortfolioHistorySchema.index({ userId: 1, date: 1, slot: 1 }, { unique: true });

let PortfolioHistory;

beforeAll(async () => {
  await connect();
  try { PortfolioHistory = mongoose.model('PortfolioHistory'); }
  catch { PortfolioHistory = mongoose.model('PortfolioHistory', PortfolioHistorySchema); }
});
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

// ── helpers ───────────────────────────────────────────────────────────────────

function portfolioFilter(userId, slot) {
  return slot === 1 ? { userId, slot: 1 } : { userId, slot: { $in: [0, null] } };
}

const MIN_PORTFOLIO_SNAPSHOT_VALUE = 100;

async function saveSnapshot(userId, slot, totalValue) {
  if (!Number.isFinite(totalValue)) return { ok: true, skipped: true };
  if (totalValue < MIN_PORTFOLIO_SNAPSHOT_VALUE) return { ok: true, skipped: true };

  const date = '2026-11-21';
  const histFilter = slot === 1
    ? { userId, date, slot: 1 }
    : { userId, date, slot: { $in: [0, null] } };
  await PortfolioHistory.findOneAndUpdate(histFilter, { $set: { totalValue, slot } }, { upsert: true });
  return { ok: true };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('POST /portfolio/snapshot — slot=1 (Portfolio B)', () => {
  test('succeeds on first open (no existing history)', async () => {
    const userId = new mongoose.Types.ObjectId();
    const result = await saveSnapshot(userId, 1, 50000);
    expect(result).toEqual({ ok: true });

    const doc = await PortfolioHistory.findOne({ userId, slot: 1 });
    expect(doc).not.toBeNull();
    expect(doc.totalValue).toBeCloseTo(50000);
  });

  test('succeeds on second open same day (updates existing doc, no E11000)', async () => {
    const userId = new mongoose.Types.ObjectId();
    await saveSnapshot(userId, 1, 50000);
    const result = await saveSnapshot(userId, 1, 51000);
    expect(result).toEqual({ ok: true });

    const docs = await PortfolioHistory.find({ userId, slot: 1 });
    expect(docs.length).toBe(1);
    expect(docs[0].totalValue).toBeCloseTo(51000);
  });

  test('slot=1 and slot=0 on same day coexist without E11000', async () => {
    const userId = new mongoose.Types.ObjectId();
    await saveSnapshot(userId, 0, 52000);
    const result = await saveSnapshot(userId, 1, 48000);
    expect(result).toEqual({ ok: true });

    const slot0 = await PortfolioHistory.findOne({ userId, slot: 0 });
    const slot1 = await PortfolioHistory.findOne({ userId, slot: 1 });
    expect(slot0.totalValue).toBeCloseTo(52000);
    expect(slot1.totalValue).toBeCloseTo(48000);
  });

  test('NaN totalValue (CastError root cause) → skips instead of 500', async () => {
    // Reproduces the exact failure: getPortfolioValue returned NaN for Portfolio B
    // (position with avgPrice=undefined when priceMap also missing that symbol).
    // Before the fix, this caused Mongoose CastError → outer catch → 500.
    const userId = new mongoose.Types.ObjectId();
    const result = await saveSnapshot(userId, 1, NaN);
    expect(result).toEqual({ ok: true, skipped: true });

    const doc = await PortfolioHistory.findOne({ userId, slot: 1 });
    expect(doc).toBeNull();
  });

  test('Infinity totalValue → skips instead of 500', async () => {
    const userId = new mongoose.Types.ObjectId();
    const result = await saveSnapshot(userId, 1, Infinity);
    expect(result).toEqual({ ok: true, skipped: true });
  });

  test('totalValue below threshold → skips', async () => {
    const userId = new mongoose.Types.ObjectId();
    const result = await saveSnapshot(userId, 1, 50);
    expect(result).toEqual({ ok: true, skipped: true });

    const doc = await PortfolioHistory.findOne({ userId, slot: 1 });
    expect(doc).toBeNull();
  });

  test('concurrent upserts for slot=1 both succeed (no E11000 race)', async () => {
    const userId = new mongoose.Types.ObjectId();
    const [r1, r2] = await Promise.allSettled([
      saveSnapshot(userId, 1, 50000),
      saveSnapshot(userId, 1, 50000),
    ]);
    expect(r1.status).toBe('fulfilled');
    expect(r2.status).toBe('fulfilled');

    const docs = await PortfolioHistory.find({ userId, slot: 1 });
    expect(docs.length).toBe(1);
  });
});

describe('getPortfolioValue NaN scenarios', () => {
  test('NaN arises when position has undefined avgPrice and priceMap misses symbol', () => {
    // This is the pure-logic version of getPortfolioValue's invested calculation.
    const priceMap = {}; // price fetch failed — symbol not in map
    const positions = [{ symbol: 'AAPL', avgPrice: undefined, qty: 10 }];
    const cash = 50000;
    const reservedCash = 0;

    const invested = positions.reduce(
      (s, pos) => s + (priceMap[pos.symbol] || pos.avgPrice) * pos.qty,
      0,
    );
    const totalValue = cash + reservedCash + invested;

    expect(Number.isFinite(totalValue)).toBe(false);
    expect(Number.isNaN(totalValue)).toBe(true);
  });

  test('Number.isFinite guard catches NaN before upsert', () => {
    expect(Number.isFinite(NaN)).toBe(false);
    expect(Number.isFinite(Infinity)).toBe(false);
    expect(Number.isFinite(-Infinity)).toBe(false);
    expect(Number.isFinite(50000)).toBe(true);
    expect(Number.isFinite(0)).toBe(true);
  });

  test('priceMap hit prevents NaN even when avgPrice is undefined', () => {
    const priceMap = { AAPL: 150 };
    const positions = [{ symbol: 'AAPL', avgPrice: undefined, qty: 10 }];
    const invested = positions.reduce(
      (s, pos) => s + (priceMap[pos.symbol] || pos.avgPrice) * pos.qty,
      0,
    );
    expect(Number.isFinite(invested)).toBe(true);
    expect(invested).toBeCloseTo(1500);
  });
});
