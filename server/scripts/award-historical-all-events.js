/**
 * award-historical-all-events.js
 *
 * 1. Prints the user's current completedEventIds vs the canonical 50 IDs.
 * 2. Awards bp_s1_l12_pro atomically via $addToSet + $ne (idempotent — safe to re-run).
 * 3. Prints before / after battlePass document.
 *
 * Usage:
 *   MONGODB_URI=<uri> node scripts/award-historical-all-events.js
 */

'use strict';

const mongoose = require('mongoose');
const VALID_IDS = require('../config/historicalEvents'); // Set of 50 canonical IDs

const MISSION_ID = 'bp_s1_l12_pro';
const USER_ID    = '69e50b1d14eb53add1505fe3';
const BP_POINTS  = 300; // season1.BP_POINTS_PER_LEVEL

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected.\n');

  // ── Before ──────────────────────────────────────────────────────────────────
  const before = await User.findById(USER_ID).lean();
  if (!before) { console.error('User not found:', USER_ID); process.exit(1); }

  const bp     = before.battlePass || {};
  const stored = new Set(bp.completedEventIds || []);
  const missing = [...VALID_IDS].filter(id => !stored.has(id));

  console.log('── BEFORE ─────────────────────────────────────────────────────');
  console.log('completedMissions includes bp_s1_l12_pro:', (bp.completedMissions || []).includes(MISSION_ID));
  console.log('completedEventIds count:', stored.size);
  console.log('valid IDs in completedEventIds:', [...stored].filter(id => VALID_IDS.has(id)).length, '/ 50');
  if (missing.length) {
    console.log('missing from completedEventIds (' + missing.length + '):');
    missing.forEach(id => console.log('  -', id));
  } else {
    console.log('All 50 canonical IDs are present.');
  }
  console.log();

  // ── Atomic award ────────────────────────────────────────────────────────────
  const result = await User.findOneAndUpdate(
    { _id: USER_ID, 'battlePass.completedMissions': { $ne: MISSION_ID } },
    {
      $addToSet: { 'battlePass.completedMissions': MISSION_ID },
      $inc:      { 'battlePass.bpPoints': BP_POINTS },
    },
    { new: true }
  );

  if (!result) {
    console.log('Mission already in completedMissions — no change made (idempotent).');
  } else {
    console.log('Award applied.');
  }
  console.log();

  // ── After ───────────────────────────────────────────────────────────────────
  const after = await User.findById(USER_ID).lean();
  const bpAfter = after.battlePass || {};
  console.log('── AFTER ──────────────────────────────────────────────────────');
  console.log('completedMissions includes bp_s1_l12_pro:', (bpAfter.completedMissions || []).includes(MISSION_ID));
  console.log('bpPoints:', bpAfter.bpPoints);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
