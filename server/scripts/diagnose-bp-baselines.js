'use strict';

const mongoose = require('mongoose');
const season1  = require('../config/season1');
const { computeUserLevel, BASELINE_TYPES, mapGet, rawCounterFor } = require('../routes/battlepass');

const userSchema = new mongoose.Schema({
  isPro:      { type: Boolean, default: false },
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
  await mongoose.connect(process.env.MONGODB_URI);
  let User;
  try { User = mongoose.model('User'); }
  catch { User = mongoose.model('User', userSchema); }

  const users = await User.find({ 'battlePass.seasonId': 1 }).lean();

  // Per-type counters
  const byType  = {};  // type → count of snapshots
  const byLevel = {};  // missionId → { level, type, target, snapshotCount }
  let aboveTarget = 0; // users who have at least 1 "would-complete-immediately" mission

  for (const user of users) {
    const bp        = user.battlePass;
    const userLevel = computeUserLevel(bp.completedMissions || [], user.isPro || false);
    let userHasAboveTarget = false;

    for (let i = 0; i < userLevel && i < season1.LEVELS.length; i++) {
      const lvlCfg = season1.LEVELS[i];
      const lvlNum = lvlCfg.level;

      for (const m of [lvlCfg.freeMission, lvlCfg.proMission].filter(Boolean)) {
        if (!BASELINE_TYPES.has(m.type) && m.type !== 'classic_streak') continue;
        if ((bp.completedMissions || []).includes(m.id)) continue;

        const alreadySnapshotted = m.type === 'classic_streak'
          ? mapGet(bp.missionStreakCounters, m.id) !== undefined
          : mapGet(bp.missionBaselines,      m.id) !== undefined;
        if (alreadySnapshotted) continue;

        // This snapshot WILL be written by the migration
        byType[m.type] = (byType[m.type] || 0) + 1;

        const key = m.id;
        if (!byLevel[key]) byLevel[key] = { level: lvlNum, type: m.type, target: m.target, count: 0 };
        byLevel[key].count += 1;

        // Check: would this user's current counter already be at/above target?
        // For classic_streak the snapshot is always 0, so 0 >= target is impossible.
        if (m.type !== 'classic_streak') {
          const raw = rawCounterFor(m.type, bp);
          if (raw >= m.target) userHasAboveTarget = true;
        }
      }
    }

    if (userHasAboveTarget) aboveTarget++;
  }

  console.log('\n══ Snapshots by mission type ══');
  for (const [type, n] of Object.entries(byType).sort()) {
    console.log(`  ${type.padEnd(24)} ${n}`);
  }

  console.log('\n══ Snapshots by mission (level | id | type | target | users affected) ══');
  const sorted = Object.entries(byLevel).sort((a, b) => a[1].level - b[1].level);
  for (const [id, info] of sorted) {
    console.log(`  L${String(info.level).padEnd(3)} | ${id.padEnd(22)} | ${info.type.padEnd(24)} | target=${String(info.target).padEnd(4)} | ${info.count} user(s)`);
  }

  console.log('\n══ Users with counter already ≥ target (would complete immediately) ══');
  console.log(`  ${aboveTarget} user(s)`);

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
