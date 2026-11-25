/**
 * migrate-bp-baselines.js
 *
 * One-shot migration: for every user who has an active BP (seasonId = 1),
 * populate missionBaselines and missionStreakCounters for all missions that
 * are currently accessible (level <= user's current level) but not yet
 * snapshotted.  This is equivalent to calling snapshotNewlyUnlockedMissions
 * for each user as if they had just reached their current level today.
 *
 * Dry-run (default): prints a report without writing anything.
 * Apply mode:        add the --apply flag to write changes to MongoDB.
 *
 * Usage:
 *   node --env-file=.env scripts/migrate-bp-baselines.js
 *   node --env-file=.env scripts/migrate-bp-baselines.js --apply
 */

'use strict';

const mongoose = require('mongoose');
const season1  = require('../config/season1');
const {
  computeUserLevel,
  BASELINE_TYPES,
  mapGet,
  rawCounterFor,
} = require('../routes/battlepass');

const APPLY = process.argv.includes('--apply');

// Minimal inline schema — only the battlePass fields needed for this migration.
const userSchema = new mongoose.Schema({
  isPro:       { type: Boolean, default: false },
  battlePass: {
    seasonId:                  Number,
    completedMissions:         { type: [String], default: [] },
    survivalRoundsTotal:       { type: Number,   default: 0 },
    classicWinsTotal:          { type: Number,   default: 0 },
    historicalEventsCompleted: { type: Number,   default: 0 },
    completedEventIds:         { type: [String], default: [] },
    arenaWinsTotal:            { type: Number,   default: 0 },
    missionBaselines:          { type: Map, of: Number, default: new Map() },
    missionStreakCounters:     { type: Map, of: Number, default: new Map() },
  },
}, { strict: false });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  let User;
  try { User = mongoose.model('User'); }
  catch { User = mongoose.model('User', userSchema); }

  const users = await User.find({ 'battlePass.seasonId': 1 }).lean();
  console.log(`Found ${users.length} users with seasonId=1`);

  let usersToUpdate  = 0;
  let totalSnapshots = 0;
  const bulkOps      = [];

  for (const user of users) {
    const bp        = user.battlePass;
    const userLevel = computeUserLevel(bp.completedMissions || [], user.isPro || false);
    const setOps    = {};

    for (let i = 0; i < userLevel && i < season1.LEVELS.length; i++) {
      const lvlCfg = season1.LEVELS[i];
      for (const m of [lvlCfg.freeMission, lvlCfg.proMission].filter(Boolean)) {
        if (!BASELINE_TYPES.has(m.type) && m.type !== 'classic_streak') continue;
        if ((bp.completedMissions || []).includes(m.id)) continue;

        if (m.type === 'classic_streak') {
          if (mapGet(bp.missionStreakCounters, m.id) !== undefined) continue;
          setOps[`battlePass.missionStreakCounters.${m.id}`] = 0;
        } else {
          if (mapGet(bp.missionBaselines, m.id) !== undefined) continue;
          setOps[`battlePass.missionBaselines.${m.id}`] = rawCounterFor(m.type, bp);
        }
      }
    }

    if (Object.keys(setOps).length === 0) continue;

    usersToUpdate  += 1;
    totalSnapshots += Object.keys(setOps).length;

    if (APPLY) {
      bulkOps.push({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: setOps },
        },
      });
    }
  }

  console.log('');
  console.log('──────────────────────────────────────────');
  console.log(`Users to update:       ${usersToUpdate}`);
  console.log(`Mission snapshots:     ${totalSnapshots}`);
  console.log('──────────────────────────────────────────');

  if (!APPLY) {
    console.log('\nDry run — no changes written.');
    console.log('Re-run with --apply to commit changes.');
  } else if (bulkOps.length > 0) {
    const result = await User.bulkWrite(bulkOps, { ordered: false });
    console.log(`\nApplied.  Modified: ${result.modifiedCount}`);
  } else {
    console.log('\nNothing to apply.');
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
