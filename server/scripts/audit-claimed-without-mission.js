/**
 * audit-claimed-without-mission.js
 *
 * Audit: find every user who has a level marked as claimed (Free or Pro track)
 * where the corresponding BP mission is NOT in their completedMissions.
 *
 * Each violation is classified into one of three categories:
 *
 *   reward_delivered   — the physical reward IS in the user's inventory
 *                        (badge in user.badges, cosmetic in user.purchases,
 *                        mechanic in battlePassMechanics, ticket in battlePassItems).
 *                        Claim marker exists + reward exists, but mission not recorded.
 *                        → Same pattern as the Aitana case. No corrective action needed:
 *                          the user has what they were supposed to get.
 *
 *   reward_missing     — the physical reward is NOT in the user's inventory.
 *                        Claim marker exists + mission not done + reward absent.
 *                        → Potentially problematic: the level was stamped as claimed
 *                          but nothing was actually delivered.
 *
 *   xp_unverifiable    — the reward is pure XP. There is no audit log for XP credits,
 *                        so we cannot tell whether the XP was added or not.
 *                        → Cannot classify further without a manual review.
 *
 * NO data is modified — read-only diagnostic.
 *
 * NOTE — phantom completedMissions (separate issue, not covered here):
 *   This script audits claimed rewards without completed missions.
 *   There is a related but distinct issue: missions marked as completed in
 *   completedMissions BEFORE the user's sequential level reached them.
 *   Root cause: processDailyBpProgress was awarding daily_streak / streak_days /
 *   complete_daily missions based on global counters (dailyStreak, dailiesCompleted)
 *   without checking whether the user had sequentially reached the mission's level.
 *
 *   Production state as of 2025-10-01 (read-only audit run):
 *     nico_founder   (tradara.nvidalc@gmail.com)   — level 5, phantom missions at
 *       levels 10 (daily_streak ×2), 15, 18, 23, 24, 28 (streak_days/daily_streak)
 *     nicolassss     (enchantedprints99@gmail.com) — level 6, phantom missions at
 *       levels 10 (daily_streak ×2), 15, 18, 23, 24, 28 (streak_days/daily_streak)
 *
 *   Current user-facing impact: NONE. The level guard in computeCardState
 *   (userLevel < levelNum → 'locked') prevents any phantom mission from generating
 *   a false 'claimable' state. The award-loop fix was deployed to prevent new
 *   phantom completions going forward (see processDailyBpProgress in battlepass.js).
 *   Existing phantom entries in completedMissions do not need correction:
 *   tryAwardAtomic will not re-award them, and when the user eventually reaches
 *   those levels (after TM missions enable), the rewards will be instantly claimable.
 *
 * Usage:
 *   MONGODB_URI=<uri> node server/scripts/audit-claimed-without-mission.js
 *
 * Output:
 *   stdout  — JSON array of affected users (pipe to a file for review)
 *   stderr  — human-readable summary with counts per category
 */

'use strict';

const mongoose = require('mongoose');
const season1  = require('../config/season1');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI env var required');
  process.exit(1);
}

// ── Schema — all inventory fields needed to check reward delivery ──────────────
const userSchema = new mongoose.Schema({
  email:               String,
  username:            String,
  isPro:               Boolean,
  badges:              [String],
  purchases:           [String],
  battlePassMechanics: [String],
  battlePassItems:     { type: Array, default: [] },
  battlePass:          mongoose.Schema.Types.Mixed,
}, { strict: false });

// ── classifyRewardDelivery ─────────────────────────────────────────────────────
// Returns one of:
//   { status: 'reward_delivered',  evidence: <string describing where it was found> }
//   { status: 'reward_missing',    evidence: null }
//   { status: 'xp_unverifiable',   evidence: null }
function classifyRewardDelivery(reward, user) {
  if (!reward) return { status: 'reward_missing', evidence: null };

  switch (reward.type) {
    case 'xp':
      return { status: 'xp_unverifiable', evidence: null };

    case 'badge':
      return (user.badges || []).includes(reward.itemId)
        ? { status: 'reward_delivered', evidence: `badge "${reward.itemId}" found in user.badges` }
        : { status: 'reward_missing',   evidence: null };

    case 'title':
    case 'frame':
    case 'avatar':
    case 'theme':
    case 'effect':
    case 'username_color':
      return (user.purchases || []).includes(reward.itemId)
        ? { status: 'reward_delivered', evidence: `${reward.type} "${reward.itemId}" found in user.purchases` }
        : { status: 'reward_missing',   evidence: null };

    case 'mechanic':
      return (user.battlePassMechanics || []).includes(reward.itemId)
        ? { status: 'reward_delivered', evidence: `mechanic "${reward.itemId}" found in user.battlePassMechanics` }
        : { status: 'reward_missing',   evidence: null };

    case 'ticket':
      return (user.battlePassItems || []).some(i => i.itemId === reward.itemId)
        ? { status: 'reward_delivered', evidence: `ticket "${reward.itemId}" found in user.battlePassItems` }
        : { status: 'reward_missing',   evidence: null };

    default:
      return { status: 'reward_missing', evidence: null };
  }
}

// ── inferClaimedTracks (inline copy — keeps this script self-contained) ───────
function isProRewardDelivered(proReward, user) {
  const { status } = classifyRewardDelivery(proReward, user);
  return status === 'reward_delivered';
}

function inferClaimedTracks(bp, user) {
  if (!bp) return { claimedFreeRewards: [], claimedProRewards: [] };

  const claimedFree = new Set(bp.claimedFreeRewards || []);
  const claimedPro  = new Set(bp.claimedProRewards  || []);

  for (const levelNum of (bp.claimedRewards || [])) {
    if (claimedFree.has(levelNum) || claimedPro.has(levelNum)) continue;
    const lvlCfg = season1.LEVELS[levelNum - 1];
    if (!lvlCfg) continue;
    const hasFree = !!lvlCfg.freeReward;
    const hasPro  = !!lvlCfg.proReward;
    if (hasFree && !hasPro) {
      claimedFree.add(levelNum);
    } else if (!hasFree && hasPro) {
      claimedPro.add(levelNum);
    } else if (hasFree && hasPro) {
      claimedFree.add(levelNum);
      if (isProRewardDelivered(lvlCfg.proReward, user)) claimedPro.add(levelNum);
    }
  }

  return { claimedFreeRewards: [...claimedFree], claimedProRewards: [...claimedPro] };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGODB_URI);
  const User = mongoose.model('User', userSchema);

  const candidates = await User.find({
    $or: [
      { 'battlePass.claimedFreeRewards.0': { $exists: true } },
      { 'battlePass.claimedProRewards.0':  { $exists: true } },
      { 'battlePass.claimedRewards.0':     { $exists: true } },
    ],
  }).lean();

  const affected = [];
  const totals   = { reward_delivered: 0, reward_missing: 0, xp_unverifiable: 0 };

  for (const user of candidates) {
    const bp = user.battlePass;
    if (!bp) continue;

    const { claimedFreeRewards, claimedProRewards } = inferClaimedTracks(bp, user);
    const completedSet = new Set(bp.completedMissions || []);
    const violations   = [];

    for (const levelNum of claimedFreeRewards) {
      const lvlCfg = season1.LEVELS[levelNum - 1];
      if (!lvlCfg) continue;
      const m = lvlCfg.freeMission;
      if (!m || m.enabled === false) continue; // disabled missions never completable — skip
      if (!completedSet.has(m.id)) {
        const classification = classifyRewardDelivery(lvlCfg.freeReward, user);
        violations.push({
          track:              'free',
          level:              levelNum,
          missionId:          m.id,
          reward:             lvlCfg.freeReward,
          ...classification,
        });
        totals[classification.status]++;
      }
    }

    for (const levelNum of claimedProRewards) {
      const lvlCfg = season1.LEVELS[levelNum - 1];
      if (!lvlCfg) continue;
      const m = lvlCfg.proMission;
      if (!m || m.enabled === false) continue;
      if (!completedSet.has(m.id)) {
        const classification = classifyRewardDelivery(lvlCfg.proReward, user);
        violations.push({
          track:              'pro',
          level:              levelNum,
          missionId:          m.id,
          reward:             lvlCfg.proReward,
          ...classification,
        });
        totals[classification.status]++;
      }
    }

    if (violations.length > 0) {
      affected.push({
        userId:            String(user._id),
        email:             user.email    ?? '(no email)',
        username:          user.username ?? '(no username)',
        isPro:             !!user.isPro,
        completedMissions: [...completedSet],
        claimedFreeRewards,
        claimedProRewards,
        violations,
      });
    }
  }

  // ── stdout: full JSON for file capture ─────────────────────────────────────
  console.log(JSON.stringify(affected, null, 2));

  // ── stderr: human-readable summary ─────────────────────────────────────────
  const totalViolations = totals.reward_delivered + totals.reward_missing + totals.xp_unverifiable;
  console.error('');
  console.error('── Summary ──────────────────────────────────────────────────────');
  console.error(`Candidates scanned           : ${candidates.length}`);
  console.error(`Affected users               : ${affected.length}`);
  console.error(`Total violations             : ${totalViolations}`);
  console.error('');
  console.error('By classification:');
  console.error(`  reward_delivered    : ${totals.reward_delivered}`);
  console.error(`    (claim marker + reward in inventory, no mission recorded — no action needed)`);
  console.error(`  reward_missing      : ${totals.reward_missing}`);
  console.error(`    (claim marker stamped, mission absent, reward NOT in inventory — review needed)`);
  console.error(`  xp_unverifiable     : ${totals.xp_unverifiable}`);
  console.error(`    (XP reward — no audit log, delivery cannot be confirmed or denied)`);
  console.error('─────────────────────────────────────────────────────────────────');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
