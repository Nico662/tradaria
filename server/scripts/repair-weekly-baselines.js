'use strict';
/**
 * repair-weekly-baselines.js
 *
 * One-time idempotent repair for the week starting WEEK_START.
 *
 * Problem: the startup migration and lazy-create used PortfolioHistory with
 * date = monday (which POST /portfolio/snapshot overwrites intraday), so every
 * baseline ended up equalling the user's current portfolio value → returnPct = 0.
 *
 * Fix: the correct baseline is the LAST PortfolioHistory snapshot with
 * date < monday (i.e. Friday/Sunday close), not the Monday intraday value.
 *
 * Modes:
 *   node repair-weekly-baselines.js              → dry-run
 *   node repair-weekly-baselines.js --fix        → apply changes
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const WEEK_START = process.argv.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a)) || '2026-10-12';
const DRY_RUN   = !process.argv.includes('--fix');

const PortfolioHistorySchema = new mongoose.Schema({
  userId:     mongoose.Schema.Types.ObjectId,
  slot:       Number,
  date:       String,
  totalValue: Number,
});
const PortfolioHistory = mongoose.model('PortfolioHistory', PortfolioHistorySchema);

const PortfolioSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  slot:   Number,
  cash:   Number,
});
const Portfolio = mongoose.model('Portfolio', PortfolioSchema);

const WeeklyBaselineSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId },
  slot:      Number,
  weekStart: String,
  value:     Number,
}, { strict: false });
WeeklyBaselineSchema.index({ userId: 1, slot: 1, weekStart: 1 }, { unique: true });
const WeeklyBaseline = mongoose.model('WeeklyBaseline', WeeklyBaselineSchema);

const UserSchema = new mongoose.Schema({ username: String });
const User = mongoose.model('User', UserSchema);

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌  MONGODB_URI not set.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected. weekStart=${WEEK_START} mode=${DRY_RUN ? 'DRY-RUN' : 'FIX'}\n`);

  // ── 1. Latest pre-Monday snapshot per (userId, slot) ────────────────────────
  const prevSnapsRaw = await PortfolioHistory.aggregate([
    { $match: { date: { $lt: WEEK_START }, totalValue: { $gte: 100 } } },
    { $sort:  { date: -1 } },
    { $group: {
      _id:         { userId: '$userId', slot: { $ifNull: ['$slot', 0] } },
      latestDate:  { $first: '$date' },
      latestValue: { $first: '$totalValue' },
    }},
  ]);
  const prevMap = {};   // key=`${userId}:${slot}` → { value, date }
  prevSnapsRaw.forEach(s => {
    prevMap[`${s._id.userId}:${s._id.slot}`] = { value: s.latestValue, date: s.latestDate };
  });
  console.log(`Pre-Monday snapshots found: ${prevSnapsRaw.length}`);

  // ── 2. All portfolios ────────────────────────────────────────────────────────
  const portfolios = await Portfolio.find({}).lean();
  console.log(`Portfolios: ${portfolios.length}`);

  // ── 3. Existing baselines this week ─────────────────────────────────────────
  const existingBL = await WeeklyBaseline.find({ weekStart: WEEK_START }).lean();
  const existingMap = {};  // key → doc
  existingBL.forEach(b => { existingMap[`${b.userId}:${b.slot ?? 0}`] = b; });
  console.log(`Existing WeeklyBaseline docs: ${existingBL.length}\n`);

  let repaired = 0, leftAlone = 0, created = 0, skipped = 0;

  for (const p of portfolios) {
    const slotNum = p.slot ?? 0;
    const key     = `${p.userId}:${slotNum}`;
    const prev    = prevMap[key];
    const existing = existingMap[key];

    if (prev) {
      if (existing) {
        if (existing.value === prev.value) {
          leftAlone++;
          continue; // already correct, idempotent
        }
        // Repair: replace wrong baseline with pre-Monday value
        if (!DRY_RUN) {
          await WeeklyBaseline.updateOne({ _id: existing._id }, { $set: { value: prev.value } });
        }
        console.log(`  REPAIR  userId=${p.userId} slot=${slotNum} old=${existing.value.toFixed(2)} → ${prev.value.toFixed(2)} (date=${prev.date})`);
        repaired++;
      } else {
        // Create new baseline with pre-Monday value
        if (!DRY_RUN) {
          await WeeklyBaseline.updateOne(
            { userId: p.userId, slot: slotNum, weekStart: WEEK_START },
            { $set: { value: prev.value }, $setOnInsert: { userId: p.userId, slot: slotNum, weekStart: WEEK_START } },
            { upsert: true }
          );
        }
        console.log(`  CREATE  userId=${p.userId} slot=${slotNum} value=${prev.value.toFixed(2)} (date=${prev.date})`);
        created++;
      }
    } else {
      // No pre-Monday history → leave existing baseline alone (new account this week)
      if (existing) leftAlone++;
      else skipped++;
    }
  }

  console.log(`\nSummary:`);
  console.log(`  repaired (wrong baseline → correct):  ${repaired}`);
  console.log(`  created  (missing → pre-Monday val):  ${created}`);
  console.log(`  left alone (already correct / new):   ${leftAlone}`);
  console.log(`  skipped  (no prior history + no BL):  ${skipped}`);
  if (DRY_RUN) console.log('\n[DRY-RUN] No changes written. Re-run with --fix to apply.');

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
