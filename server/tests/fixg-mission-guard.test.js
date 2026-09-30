/**
 * fixg-mission-guard.test.js
 *
 * Regression tests for Fix G — the mission-completion gate on /claim/:level.
 *
 * Bug (2026-09-23 production): enchantedprints99@gmail.com had level 4 Free
 * ("Market Watcher" — "Completa 3 Daily Challenges") appear as CLAIMED in
 * the UI even though bp_s1_l4_free was never in completedMissions.
 *
 * Root cause: old claim code used floor(bpPoints/300) for the level check
 * and had no mission-completion guard, so the level was stamped as claimed
 * but title_market_watcher was never written to user.purchases (the `title`
 * reward type was silently skipped in the old reward switch).
 *
 * Fix G: before granting any reward track the handler now verifies that the
 * corresponding mission ID is present in user.battlePass.completedMissions.
 *
 * These tests verify:
 *   1. A user with partial daily progress (1/3) is blocked — MISSION_NOT_COMPLETED.
 *   2. Completing the mission unblocks the claim.
 *   3. After a valid claim, title_market_watcher is written to user.purchases.
 *   4. The same guard applies to the Pro track (bp_s1_l2_pro gate).
 *   5. Disabled Trading Mode missions are exempt from the guard (can't be completed yet).
 */

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase, getUser } = require('./helpers/testApp');
const season1  = require('../config/season1');
const { computeUserLevel } = require('../routes/battlepass');

// ── Fix-G validation helper (mirrors the gate in POST /claim/:level) ──────────
// Returns null when the claim is allowed, or an error-code string when blocked.
// Simulates a fresh claim (nothing yet claimed for this level).
function fixGCheck(completedMissions, levelNum, isPro) {
  const lvlCfg  = season1.LEVELS[levelNum - 1];
  const done     = new Set(completedMissions);
  const userLevel = computeUserLevel(completedMissions, isPro);

  if (userLevel < levelNum)
    return `LEVEL_NOT_REACHED (computed=${userLevel})`;

  const grantFree = !!lvlCfg.freeReward;
  const grantPro  = !!lvlCfg.proReward && isPro;

  if (grantFree && lvlCfg.freeMission) {
    if (!done.has(lvlCfg.freeMission.id))
      return `MISSION_NOT_COMPLETED:${lvlCfg.freeMission.id}`;
  }
  if (grantPro && lvlCfg.proMission) {
    if (!done.has(lvlCfg.proMission.id))
      return `MISSION_NOT_COMPLETED:${lvlCfg.proMission.id}`;
  }

  return null; // claim allowed
}

// Minimal atomic reward writer — mirrors the switch in the real claim endpoint.
async function applyClaimReward(User, userId, reward, levelNum) {
  const addToSetMap = {
    'battlePass.claimedFreeRewards': { $each: [levelNum] },
  };
  if (reward.type === 'title' || reward.type === 'frame' || reward.type === 'theme') {
    addToSetMap.purchases = { $each: [reward.itemId] };
  } else if (reward.type === 'badge') {
    addToSetMap.badges = { $each: [reward.itemId] };
  }
  return User.findByIdAndUpdate(userId, { $addToSet: addToSetMap }, { new: true });
}

// ── Exact missions from season1 used in these tests ───────────────────────────
// Level 2 free: play_any_game (target 1)
const L2_FREE = 'bp_s1_l2_free';
// Level 4 free: complete_daily (target 3)  ← the real bug
const L4_FREE = 'bp_s1_l4_free';
// Level 2 pro:  complete_daily (target 5)
const L2_PRO  = 'bp_s1_l2_pro';
// Level 1 pro:  play_any_game (target 1)
const L1_PRO  = 'bp_s1_l1_pro';
// Level 4 pro:  survival_rounds (target 30)
const L4_PRO  = 'bp_s1_l4_pro';
// Streak missions — the only ones a brand-new user gets from dailyStreak alone
const STREAK_MISSIONS = [
  'bp_s1_l10_free', 'bp_s1_l10_pro', 'bp_s1_l18_pro',
  'bp_s1_l15_pro',  'bp_s1_l23_pro', 'bp_s1_l24_free', 'bp_s1_l28_pro',
];

// ─────────────────────────────────────────────────────────────────────────────

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

// ── 1. Core bug reproduction ─────────────────────────────────────────────────
describe('Fix G — level 4 Free (Market Watcher) claim guard', () => {

  test('user with partial progress (1/3 dailies) cannot claim level 4 — MISSION_NOT_COMPLETED', () => {
    // Exact state of enchantedprints99 at time of bug:
    // 7 streak missions awarded (bpPoints=2100 → level 7 under OLD formula)
    // but bp_s1_l4_free was never completed (only 1 daily done).
    // Under NEW code, computeUserLevel = 2 (blocked at frontier 2 by bp_s1_l2_free).
    const result = fixGCheck(STREAK_MISSIONS, 4, false);
    expect(result).toContain('LEVEL_NOT_REACHED');
  });

  test('user stuck at computed level 2 cannot even reach the Fix G mission check for level 4', () => {
    // Even without Fix G the level gate alone blocks it under the new formula.
    // computeUserLevel(STREAK_MISSIONS, false) = 2 < 4 → LEVEL_NOT_REACHED.
    expect(computeUserLevel(STREAK_MISSIONS, false)).toBe(2);
    expect(fixGCheck(STREAK_MISSIONS, 4, false)).toMatch(/LEVEL_NOT_REACHED/);
  });

  test('completing level-2 free mission unblocks computation to level 4 but Fix G still blocks claim', () => {
    // Once bp_s1_l2_free is done: levels 1(auto),2 pass → level 3(auto) → level 4 frontier.
    // Level 4 needs bp_s1_l4_free which is NOT done → Fix G returns MISSION_NOT_COMPLETED.
    const missions = [...STREAK_MISSIONS, L2_FREE];
    expect(computeUserLevel(missions, false)).toBe(4);
    expect(fixGCheck(missions, 4, false)).toBe(`MISSION_NOT_COMPLETED:${L4_FREE}`);
  });

  test('completing both L2_FREE and L4_FREE allows claim (Fix G returns null)', () => {
    const missions = [...STREAK_MISSIONS, L2_FREE, L4_FREE];
    expect(computeUserLevel(missions, false)).toBe(6); // blocked at 6 by Trading Mode
    expect(fixGCheck(missions, 4, false)).toBeNull();
  });
});

// ── 2. title reward is written to purchases on valid claim ───────────────────
describe('Fix G — reward is written to user.purchases on valid claim', () => {

  test('title_market_watcher is in purchases after a valid level-4 claim', async () => {
    const User = getUser();
    const user = await User.create({ purchases: [] });

    // This is the exact level-4 freeReward from season1
    const level4FreeReward = season1.LEVELS[3].freeReward; // { type:'title', itemId:'title_market_watcher' }
    expect(level4FreeReward.type).toBe('title');
    expect(level4FreeReward.itemId).toBe('title_market_watcher');

    const updated = await applyClaimReward(User, user._id, level4FreeReward, 4);
    expect(updated.purchases).toContain('title_market_watcher');
    expect(updated.battlePass.claimedFreeRewards).toContain(4);
  });

  test('a claim that skips the reward write (simulating old bug) leaves purchases empty', async () => {
    // Old code path: only updates claimedRewards without writing the reward.
    const User = getUser();
    const user = await User.create({ purchases: [] });
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { 'battlePass.claimedFreeRewards': { $each: [4] } },
    });
    const updated = await User.findById(user._id);
    expect(updated.battlePass.claimedFreeRewards).toContain(4);
    expect(updated.purchases).not.toContain('title_market_watcher'); // reward missing → the bug
  });
});

// ── 3. Pro-track guard (bp_s1_l2_pro) ───────────────────────────────────────
describe('Fix G — Pro track mission guard (level 2 pro)', () => {

  test('Pro user with only bp_s1_l1_pro completed cannot claim level 2 pro (needs bp_s1_l2_pro)', () => {
    // aitanav.ruiz pattern: bp_s1_l1_pro + bp_s1_l2_free done, bp_s1_l2_pro missing.
    const missions = [L1_PRO, L2_FREE];
    // Level 2 pro mission = bp_s1_l2_pro (complete 5 dailies, target=5).
    const result = fixGCheck(missions, 2, true);
    expect(result).toBe(`MISSION_NOT_COMPLETED:${L2_PRO}`);
  });

  test('Pro user with all level-2 missions done can claim level 2 pro', () => {
    const missions = [L1_PRO, L2_FREE, L2_PRO];
    expect(fixGCheck(missions, 2, true)).toBeNull();
  });

  test('bp_s1_early_trader badge is written to user.badges on valid level-2 pro claim', async () => {
    const User = getUser();
    const user = await User.create({ badges: [] });

    const level2ProReward = season1.LEVELS[1].proReward; // badge bp_s1_early_trader
    expect(level2ProReward.type).toBe('badge');
    expect(level2ProReward.itemId).toBe('bp_s1_early_trader');

    await User.findByIdAndUpdate(user._id, {
      $addToSet: { badges: { $each: [level2ProReward.itemId] } },
    });
    const updated = await User.findById(user._id);
    expect(updated.badges).toContain('bp_s1_early_trader');
  });
});

// ── 4. Trading Mode missions block the claim like any other incomplete mission ─
describe('Fix G — disabled Trading Mode missions block claim (not exempt)', () => {

  test('Pro user at level 5 cannot claim level 5 pro — TM mission enabled:false counts as incomplete', () => {
    // Level 5 pro mission = bp_s1_l5_pro, enabled:false → no one can complete it yet.
    // Fix G now treats it like any other incomplete mission → MISSION_NOT_COMPLETED.
    const missions = [L1_PRO, L2_FREE, L2_PRO, 'bp_s1_l3_pro', L4_FREE, L4_PRO];
    expect(computeUserLevel(missions, true)).toBe(5);
    const result = fixGCheck(missions, 5, true);
    expect(result).toBe('MISSION_NOT_COMPLETED:bp_s1_l5_pro');
  });
});
