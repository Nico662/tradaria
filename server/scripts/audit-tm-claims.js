/**
 * audit-tm-claims.js
 *
 * One-shot read-only audit: find every user who already claimed a reward
 * from a Trading Mode level (enabled:false) before the exemption is removed.
 *
 * TM levels:
 *   5  → proMission  bp_s1_l5_pro   (Stop Loss & TP)
 *   6  → freeMission bp_s1_l6_free  (Primera Posición)
 *   11 → proMission  bp_s1_l11_pro
 *   14 → freeMission bp_s1_l14_free
 *   17 → proMission  bp_s1_l17_pro
 *   26 → proMission  bp_s1_l26_pro
 *
 * Usage:
 *   MONGODB_URI=<uri> node server/scripts/audit-tm-claims.js
 */

'use strict';

const mongoose = require('mongoose');
const season1  = require('../config/season1');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI required'); process.exit(1); }

// TM levels: { levelNum, track }
const TM_LEVELS = season1.LEVELS
  .filter(l => (l.freeMission && l.freeMission.enabled === false) ||
               (l.proMission  && l.proMission.enabled  === false))
  .flatMap(l => {
    const out = [];
    if (l.freeMission && l.freeMission.enabled === false) out.push({ level: l.level, track: 'free', missionId: l.freeMission.id, reward: l.freeReward });
    if (l.proMission  && l.proMission.enabled  === false) out.push({ level: l.level, track: 'pro',  missionId: l.proMission.id,  reward: l.proReward  });
    return out;
  });

const userSchema = new mongoose.Schema({
  email:             String,
  username:          String,
  isPro:             Boolean,
  badges:            [String],
  purchases:         [String],
  battlePass:        mongoose.Schema.Types.Mixed,
}, { strict: false });

async function main() {
  await mongoose.connect(MONGODB_URI);
  const User = mongoose.model('User', userSchema);

  const tmLevelNums = [...new Set(TM_LEVELS.map(t => t.level))];

  // Find users who have any of these levels in any claim field
  const candidates = await User.find({
    $or: [
      { 'battlePass.claimedFreeRewards': { $in: tmLevelNums } },
      { 'battlePass.claimedProRewards':  { $in: tmLevelNums } },
      { 'battlePass.claimedRewards':     { $in: tmLevelNums } },
    ],
  }).lean();

  const found = [];

  for (const user of candidates) {
    const bp = user.battlePass;
    if (!bp) continue;

    const claimedFree = new Set(bp.claimedFreeRewards || []);
    const claimedPro  = new Set(bp.claimedProRewards  || []);
    // Legacy field — infer track from level config
    for (const lvlNum of (bp.claimedRewards || [])) {
      const cfg = season1.LEVELS[lvlNum - 1];
      if (!cfg) continue;
      if (cfg.freeReward && !cfg.proReward) claimedFree.add(lvlNum);
      if (cfg.proReward  && !cfg.freeReward) claimedPro.add(lvlNum);
    }

    const completedSet = new Set(bp.completedMissions || []);

    for (const { level, track, missionId, reward } of TM_LEVELS) {
      const claimed = track === 'free' ? claimedFree.has(level) : claimedPro.has(level);
      if (!claimed) continue;

      // Confirmed claim of a TM level
      const missionCompleted = completedSet.has(missionId);
      found.push({
        email:             user.email || '(no email)',
        username:          user.username || '(no username)',
        level,
        track,
        missionId,
        missionCompleted,  // true = legitimate (somehow), false = used the exemption
        reward:            reward ? `${reward.type}:${reward.itemId ?? reward.amount}` : 'none',
      });
    }
  }

  // Output
  process.stdout.write(JSON.stringify(found, null, 2) + '\n');

  process.stderr.write(`\n=== TM-levels claim audit ===\n`);
  process.stderr.write(`TM levels checked: ${TM_LEVELS.map(t => `${t.level}(${t.track})`).join(', ')}\n`);
  process.stderr.write(`Users with BP claims scanned: ${candidates.length}\n`);
  process.stderr.write(`TM-level claims found: ${found.length}\n`);
  if (found.length > 0) {
    process.stderr.write(`\nDetails:\n`);
    for (const r of found) {
      process.stderr.write(`  ${r.email} (${r.username}) — level ${r.level} ${r.track} | mission done: ${r.missionCompleted} | reward: ${r.reward}\n`);
    }
  } else {
    process.stderr.write(`No TM-level claims found — safe to deploy.\n`);
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
