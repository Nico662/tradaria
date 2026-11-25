'use strict';
/**
 * repair-weekly-snapshots.js
 *
 * Detects PortfolioHistory snapshots whose totalValue is suspiciously low
 * (< MIN_VALID_BASELINE = $100), which indicates a corrupt weekly baseline
 * caused by the "all-in pending orders" bug.
 *
 * Run modes:
 *   node repair-weekly-snapshots.js              → dry-run (read-only, shows what would change)
 *   node repair-weekly-snapshots.js --fix        → deletes corrupt snapshots so the leaderboard
 *                                                   falls back to the $50k default
 *   node repair-weekly-snapshots.js --audit-dupes → read-only: finds portfolios with possible
 *                                                   double-executed orders (same symbol+qty within 10s)
 *
 * NEVER run --fix against production without reviewing the dry-run output first.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MIN_VALID_BASELINE = 100;
const DRY_RUN = !process.argv.includes('--fix');
const AUDIT_DUPES = process.argv.includes('--audit-dupes');

// ── Minimal schemas (read-only; we don't need the full app) ──────────────────
const PortfolioHistorySchema = new mongoose.Schema({
  userId:     mongoose.Schema.Types.ObjectId,
  slot:       Number,
  date:       String,
  totalValue: Number,
});
const PortfolioHistory = mongoose.model('PortfolioHistory', PortfolioHistorySchema);

const PortfolioSchema = new mongoose.Schema({
  userId:       mongoose.Schema.Types.ObjectId,
  slot:         Number,
  cash:         Number,
  positions:    Array,
  transactions: Array,
});
const Portfolio = mongoose.model('Portfolio', PortfolioSchema);

const UserSchema = new mongoose.Schema({ username: String });
const User = mongoose.model('User', UserSchema);

// ─────────────────────────────────────────────────────────────────────────────

async function auditCorruptSnapshots() {
  const corrupt = await PortfolioHistory.find({ totalValue: { $lt: MIN_VALID_BASELINE } }).lean();

  if (!corrupt.length) {
    console.log('✅ No corrupt snapshots found (all totalValue >= $100).');
    return;
  }

  console.log(`\n⚠️  Found ${corrupt.length} corrupt snapshot(s) with totalValue < $${MIN_VALID_BASELINE}:\n`);

  const userIds = [...new Set(corrupt.map(s => String(s.userId)))];
  const users   = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = Object.fromEntries(users.map(u => [String(u._id), u.username]));

  for (const s of corrupt) {
    const username = userMap[String(s.userId)] || '(unknown)';
    console.log(
      `  id=${s._id}  userId=${s.userId}  username=${username}  ` +
      `slot=${s.slot ?? 0}  date=${s.date}  totalValue=$${s.totalValue}`
    );
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would delete ${corrupt.length} snapshot(s). Re-run with --fix to apply.`);
    return;
  }

  // --fix mode: remove corrupt snapshots so leaderboard falls back to $50k default
  const ids = corrupt.map(s => s._id);
  const result = await PortfolioHistory.deleteMany({ _id: { $in: ids } });
  console.log(`\n✅ Deleted ${result.deletedCount} corrupt snapshot(s).`);
}

// ─────────────────────────────────────────────────────────────────────────────

async function auditDoubleBuys() {
  console.log('\n🔍 Auditing portfolios for possible double-executed orders (same symbol+qty within 10s)...\n');

  const portfolios = await Portfolio.find({}).lean();
  let flaggedCount = 0;

  for (const p of portfolios) {
    const buys = (p.transactions || [])
      .filter(t => t.action === 'buy' && t.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    for (let i = 0; i < buys.length - 1; i++) {
      const a = buys[i];
      const b = buys[i + 1];
      if (
        a.symbol === b.symbol &&
        Math.abs(a.qty - b.qty) < 0.0001 &&
        Math.abs(new Date(b.date) - new Date(a.date)) < 10000 // 10 seconds
      ) {
        const user = await User.findById(p.userId).select('username').lean();
        console.log(
          `  ⚠️  Possible double-buy: userId=${p.userId} username=${user?.username}  ` +
          `symbol=${a.symbol}  qty=${a.qty}  ` +
          `t1=${a.date}  t2=${b.date}  ` +
          `delta=${Math.abs(new Date(b.date) - new Date(a.date))}ms`
        );
        flaggedCount++;
      }
    }
  }

  if (!flaggedCount) {
    console.log('✅ No double-buy patterns found.');
  } else {
    console.log(`\n⚠️  ${flaggedCount} suspect pair(s) found. Review manually before any action.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set. Add it to server/.env or export it.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  if (AUDIT_DUPES) {
    await auditDoubleBuys();
  } else {
    if (DRY_RUN) {
      console.log('Mode: DRY-RUN (pass --fix to actually delete corrupt snapshots)\n');
    } else {
      console.log('Mode: FIX — will DELETE corrupt snapshots\n');
    }
    await auditCorruptSnapshots();
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
