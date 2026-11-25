'use strict';
/**
 * repair-l30-completion.js
 *
 * One-shot repair for the bp_s1_l30_free / bp_s1_l30_pro miss.
 *
 * Root cause: snapshotNewlyUnlockedMissions passed [] to tryAwardAtomic in its
 * catch-up loops, so missions awarded there never re-triggered checkLevel30Atomic.
 * Users who reached their last prerequisite free/pro mission via the catch-up
 * path ended up with all prerequisites done but bp_s1_l30_free or bp_s1_l30_pro
 * absent from completedMissions.
 *
 * This script finds those users and awards the missing completion mission
 * atomically (same $addToSet + $inc mechanism as tryAwardAtomic in battlepass.js).
 *
 * Modes:
 *   node scripts/repair-l30-completion.js              → dry-run (read-only)
 *   node scripts/repair-l30-completion.js --apply      → write changes
 *
 * Usage from server/:
 *   node --env-file=.env scripts/repair-l30-completion.js
 *   node --env-file=.env scripts/repair-l30-completion.js --apply
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const BP_POINTS_PER_LEVEL = 300;
const SEASON_ID = 1;

// ── Mission ID lists (mirrors ENABLED_FREE/PRO_MISSION_IDS in battlepass.js) ──
const ENABLED_FREE_MISSION_IDS = [
  'bp_s1_l2_free',  'bp_s1_l4_free',  'bp_s1_l6_free',  'bp_s1_l8_free',
  'bp_s1_l10_free', 'bp_s1_l12_free', 'bp_s1_l14_free', 'bp_s1_l16_free',
  'bp_s1_l18_free', 'bp_s1_l20_free', 'bp_s1_l22_free', 'bp_s1_l24_free',
  'bp_s1_l26_free', 'bp_s1_l28_free',
];

const ENABLED_PRO_MISSION_IDS = [
  'bp_s1_l1_pro',  'bp_s1_l2_pro',  'bp_s1_l3_pro',  'bp_s1_l4_pro',
  'bp_s1_l5_pro',  'bp_s1_l6_pro',  'bp_s1_l7_pro',  'bp_s1_l8_pro',
  'bp_s1_l9_pro',  'bp_s1_l10_pro', 'bp_s1_l11_pro', 'bp_s1_l12_pro',
  'bp_s1_l13_pro', 'bp_s1_l14_pro', 'bp_s1_l15_pro', 'bp_s1_l16_pro',
  'bp_s1_l17_pro', 'bp_s1_l18_pro', 'bp_s1_l19_pro', 'bp_s1_l20_pro',
  'bp_s1_l21_pro', 'bp_s1_l22_pro', 'bp_s1_l23_pro', 'bp_s1_l24_pro',
  'bp_s1_l25_pro', 'bp_s1_l26_pro', 'bp_s1_l27_pro', 'bp_s1_l28_pro',
  'bp_s1_l29_pro',
];

// ── Minimal schema (read-only fields only needed for the query) ───────────────
const userSchema = new mongoose.Schema({
  username: String,
  email:    String,
  isPro:    Boolean,
  battlePass: mongoose.Schema.Types.Mixed,
}, { strict: false });

// ── Atomic award — mirrors tryAwardAtomic in battlepass.js ────────────────────
async function tryAwardAtomic(col, userId, missionId) {
  const r = await col.findOneAndUpdate(
    { _id: userId, 'battlePass.completedMissions': { $ne: missionId } },
    {
      $addToSet: { 'battlePass.completedMissions': missionId },
      $inc:      { 'battlePass.bpPoints': BP_POINTS_PER_LEVEL },
    },
    { returnDocument: 'after' }
  );
  return !!r;
}

// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB  [${APPLY ? 'APPLY' : 'DRY-RUN'}]\n`);

  let User;
  try { User = mongoose.model('User'); }
  catch { User = mongoose.model('User', userSchema); }

  const col = mongoose.connection.collection('users');

  // ── Find users missing l30_free ───────────────────────────────────────────
  const missingFree = await User.find({
    'battlePass.seasonId': SEASON_ID,
    'battlePass.completedMissions': {
      $all:  ENABLED_FREE_MISSION_IDS,
      $nin:  ['bp_s1_l30_free'],
    },
  }).lean();

  // ── Find users missing l30_pro ────────────────────────────────────────────
  const missingPro = await User.find({
    'battlePass.seasonId': SEASON_ID,
    'battlePass.completedMissions': {
      $all:  ENABLED_PRO_MISSION_IDS,
      $nin:  ['bp_s1_l30_pro'],
    },
  }).lean();

  // ── Report ────────────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`Users missing bp_s1_l30_free : ${missingFree.length}`);
  for (const u of missingFree) {
    const bp = u.battlePass;
    console.log(`  userId=${u._id}  username=${u.username ?? '(none)'}  email=${u.email ?? '(none)'}`);
    console.log(`    bpPoints=${bp.bpPoints}  completedMissions.length=${(bp.completedMissions || []).length}`);
    console.log(`    → would award: bp_s1_l30_free  (+${BP_POINTS_PER_LEVEL} bpPoints)`);
  }

  console.log('');
  console.log(`Users missing bp_s1_l30_pro  : ${missingPro.length}`);
  for (const u of missingPro) {
    const bp = u.battlePass;
    console.log(`  userId=${u._id}  username=${u.username ?? '(none)'}  email=${u.email ?? '(none)'}`);
    console.log(`    bpPoints=${bp.bpPoints}  completedMissions.length=${(bp.completedMissions || []).length}`);
    console.log(`    → would award: bp_s1_l30_pro  (+${BP_POINTS_PER_LEVEL} bpPoints)`);
  }
  console.log('══════════════════════════════════════════════════════════════');

  if (!APPLY) {
    console.log('\nDry-run complete — nothing written.');
    console.log('Re-run with --apply to commit changes.\n');
    await mongoose.disconnect();
    return;
  }

  // ── Apply ─────────────────────────────────────────────────────────────────
  let freeAwarded = 0;
  for (const u of missingFree) {
    const awarded = await tryAwardAtomic(col, u._id, 'bp_s1_l30_free');
    if (awarded) {
      freeAwarded++;
      console.log(`  ✓ Awarded bp_s1_l30_free to ${u.username ?? u._id}`);
    } else {
      console.log(`  ⚠ bp_s1_l30_free already present for ${u.username ?? u._id} (concurrent write?)`);
    }
  }

  let proAwarded = 0;
  for (const u of missingPro) {
    const awarded = await tryAwardAtomic(col, u._id, 'bp_s1_l30_pro');
    if (awarded) {
      proAwarded++;
      console.log(`  ✓ Awarded bp_s1_l30_pro to ${u.username ?? u._id}`);
    } else {
      console.log(`  ⚠ bp_s1_l30_pro already present for ${u.username ?? u._id} (concurrent write?)`);
    }
  }

  console.log('');
  console.log(`bp_s1_l30_free awarded: ${freeAwarded}`);
  console.log(`bp_s1_l30_pro  awarded: ${proAwarded}`);
  console.log('\nDone.');

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
