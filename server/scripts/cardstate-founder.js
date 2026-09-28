'use strict';
/**
 * READ-ONLY: card state audit for nico_founder on levels 2, 3, 4.
 * Uses the exact same logic as the new server-side computeCardState + inferClaimedTracks.
 */
const mongoose = require('mongoose');
const season1  = require('../config/season1');
const {
  inferClaimedTracks,
  computeUserLevel,
} = require('../routes/battlepass');

const userSchema = new mongoose.Schema({}, { strict: false });

// Mirror of progressFor (read-only, no bp needed for basics)
function progressSummary(m, bp) {
  if (!m || !bp) return null;
  if (bp.completedMissions.includes(m.id)) return `DONE (${m.target}/${m.target})`;
  switch (m.type) {
    case 'complete_daily': return `${bp.dailiesCompleted || 0}/${m.target}`;
    default: return `incomplete (type=${m.type})`;
  }
}

// Mirror of computeCardState
function computeCardState(lvlCfg, track, userLevel, claimedForTrack, isPro, bp) {
  const reward  = track === 'free' ? lvlCfg.freeReward  : lvlCfg.proReward;
  const mission = track === 'free' ? lvlCfg.freeMission : lvlCfg.proMission;
  const levelNum = lvlCfg.level;

  if (!reward && !mission) return 'empty';
  if (claimedForTrack.includes(levelNum)) return 'claimed';
  if (track === 'pro' && !isPro) return 'pro_locked';
  if (userLevel < levelNum) return 'locked';
  if (mission && mission.enabled !== false && bp) {
    const done = bp.completedMissions.includes(mission.id);
    if (!done) return 'mission_pending';
  }
  return 'claimable';
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  let User;
  try { User = mongoose.model('User'); } catch { User = mongoose.model('User', userSchema); }

  const u = await User.findById('69e50b1d14eb53add1505fe3').lean();
  if (!u) { console.error('User not found'); process.exit(1); }

  const bp = u.battlePass;
  const userLevel = computeUserLevel(bp.completedMissions, u.isPro);
  const { claimedFreeRewards, claimedProRewards } = inferClaimedTracks(bp, u);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  nico_founder read-only card state audit');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  isPro:              ${u.isPro}`);
  console.log(`  userLevel (new):    ${userLevel}`);
  console.log(`  completedMissions:  ${JSON.stringify(bp.completedMissions)}`);
  console.log(`  claimedRewards:     ${JSON.stringify(bp.claimedRewards)}`);
  console.log(`  claimedFreeRewards: ${JSON.stringify(claimedFreeRewards)}`);
  console.log(`  claimedProRewards:  ${JSON.stringify(claimedProRewards)}`);
  console.log(`  badges:             ${JSON.stringify(u.badges)}`);
  console.log(`  purchases:          ${JSON.stringify(u.purchases)}`);
  console.log(`  dailiesCompleted:   ${bp.dailiesCompleted}`);
  console.log('');

  for (const levelNum of [2, 3, 4]) {
    const lvl = season1.LEVELS[levelNum - 1];
    const freeState = computeCardState(lvl, 'free', userLevel, claimedFreeRewards, u.isPro, bp);
    const proState  = computeCardState(lvl, 'pro',  userLevel, claimedProRewards,  u.isPro, bp);

    console.log(`  ── Level ${levelNum} ──────────────────────────────`);
    if (lvl.freeReward) {
      console.log(`    FREE  state: ${freeState.padEnd(16)} reward: ${JSON.stringify(lvl.freeReward)}`);
      if (lvl.freeMission) console.log(`           mission: ${progressSummary(lvl.freeMission, bp)} (${lvl.freeMission.id})`);
    } else {
      console.log(`    FREE  state: empty`);
    }
    console.log(`    PRO   state: ${proState.padEnd(16)} reward: ${JSON.stringify(lvl.proReward)}`);
    if (lvl.proMission) console.log(`           mission: ${progressSummary(lvl.proMission, bp)} (${lvl.proMission.id})`);
    console.log('');
  }

  console.log('NOTE: Read-only. No data modified.');
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
