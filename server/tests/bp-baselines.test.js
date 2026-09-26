/**
 * bp-baselines.test.js
 *
 * Verifies the per-mission baseline system introduced in Phase 5E.
 *
 * Tests 1–6  cover the 6 mission types that use relative progress.
 * Tests 7–9  are regressions confirming complete_daily / daily_streak / streak_days
 *            are NOT affected by the baseline system (they stay absolute / streak-based).
 * Test  10   confirms missions are not double-awarded after the first completion.
 */

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase, getUser } = require('./helpers/testApp');
const Season   = require('../models/Season');
const {
  processGameBpProgress,
  processArenaWinBpProgress,
  processDailyBpProgress,
  snapshotNewlyUnlockedMissions,
  relativeProgress,
  rawCounterFor,
  mapGet,
} = require('../routes/battlepass');

// ── Prerequisites for common levels (Pro user) ──────────────────────────────
// Computed by tracing computeUserLevel forward for a Pro user.
// Disabled Trading Mode mission IDs are included so tests can bypass them.

const PRE_L3_PRO  = ['bp_s1_l1_pro', 'bp_s1_l2_free', 'bp_s1_l2_pro'];
const PRE_L4_PRO  = [...PRE_L3_PRO,  'bp_s1_l3_pro'];
const PRE_L6_PRO  = [...PRE_L4_PRO,  'bp_s1_l4_free', 'bp_s1_l4_pro', 'bp_s1_l5_pro'];
const PRE_L7_PRO  = [...PRE_L6_PRO,  'bp_s1_l6_free', 'bp_s1_l6_pro'];
const PRE_L12_FREE = ['bp_s1_l2_free', 'bp_s1_l4_free', 'bp_s1_l6_free', 'bp_s1_l8_free', 'bp_s1_l10_free'];

// Prerequisites for a Free user at level 4 (needs l2_free only; odd levels auto-pass)
const PRE_L4_FREE = ['bp_s1_l2_free'];

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

/** Creates an always-active Season document for the current test. */
async function createSeason() {
  return Season.create({
    seasonId:  1,
    name:      'Test Season',
    startDate: new Date(Date.now() - 1000),
    endDate:   new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    status:    'active',
  });
}

/** Creates a user with the given battlePass state and returns the saved document. */
async function createUser(User, { isPro = false, completedMissions = [], bp = {} } = {}) {
  return User.create({
    username: 'tester',
    isPro,
    battlePass: {
      seasonId:                  1,
      bpPoints:                  0,
      completedMissions,
      claimedRewards:            [],
      claimedFreeRewards:        [],
      claimedProRewards:         [],
      dailiesCompleted:          0,
      survivalRoundsTotal:       0,
      classicMaxStreak:          0,
      classicWinsTotal:          0,
      historicalEventsCompleted: 0,
      completedEventIds:         [],
      arenaWinsTotal:            0,
      missionBaselines:          new Map(),
      missionStreakCounters:     new Map(),
      ...bp,
    },
  });
}

// ── Test 1: snapshotNewlyUnlockedMissions sets classic_wins baseline ──────────

test('snapshotNewlyUnlockedMissions sets classicWins baseline for newly accessible mission', async () => {
  const User = getUser();
  await createSeason();

  // Pro user at level 3 with 10 wins already on the counter
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L3_PRO,
    bp: { classicWinsTotal: 10 },
  });

  await snapshotNewlyUnlockedMissions(user._id);

  const updated = await User.findById(user._id);
  expect(mapGet(updated.battlePass.missionBaselines, 'bp_s1_l3_pro')).toBe(10);
});

// ── Test 2: classic_wins awards when relative progress meets target ───────────

test('classic_wins mission is awarded when relative progress reaches target', async () => {
  const User = getUser();
  await createSeason();

  // Baseline already set at 10; user needs 15 more wins (target=15)
  const baselines = new Map([['bp_s1_l3_pro', 10]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L3_PRO,
    bp: { classicWinsTotal: 10, missionBaselines: baselines },
  });

  const result = await processGameBpProgress(user._id, { mode: 'guess', correct: 15 });

  expect(result.awardedMissions).toContain('bp_s1_l3_pro');
});

// ── Test 3: classic_wins NOT awarded when relative progress is below target ───

test('classic_wins mission is NOT awarded when relative progress is below target', async () => {
  const User = getUser();
  await createSeason();

  const baselines = new Map([['bp_s1_l3_pro', 10]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L3_PRO,
    bp: { classicWinsTotal: 10, missionBaselines: baselines },
  });

  // Only 5 wins → relativeProgress = 15-10 = 5 < target 15
  const result = await processGameBpProgress(user._id, { mode: 'guess', correct: 5 });

  expect(result.awardedMissions).not.toContain('bp_s1_l3_pro');
});

// ── Test 4: classic_streak tracks streak after initialisation ─────────────────

test('classic_streak mission is awarded when post-unlock streak reaches target', async () => {
  const User = getUser();
  await createSeason();

  // missionStreakCounters initialised to 0 at unlock (target=10)
  const streakCounters = new Map([['bp_s1_l7_pro', 0]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L7_PRO,
    bp: { missionStreakCounters: streakCounters },
  });

  const result = await processGameBpProgress(user._id, { mode: 'guess', streak: 10 });

  expect(result.awardedMissions).toContain('bp_s1_l7_pro');
});

// ── Test 5: classic_streak pre-unlock streak is not counted ───────────────────

test('classic_streak pre-unlock streak is not counted toward the mission', async () => {
  const User = getUser();
  await createSeason();

  // User at level 6 — l7_pro not yet accessible, streak counter NOT initialised
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L6_PRO,
    bp: {},
  });

  // streak=10 but the counter is not initialised — $max should not fire
  const result = await processGameBpProgress(user._id, { mode: 'guess', streak: 10 });

  expect(result.awardedMissions).not.toContain('bp_s1_l7_pro');

  // Confirm the counter was NOT written (pre-read gate)
  const updated = await User.findById(user._id);
  expect(mapGet(updated.battlePass.missionStreakCounters, 'bp_s1_l7_pro')).toBeUndefined();
});

// ── Test 6: survival_rounds uses relative progress ────────────────────────────

test('survival_rounds mission is awarded based on relative progress, not absolute total', async () => {
  const User = getUser();
  await createSeason();

  // Baseline 25 set at unlock; target=30 — user needs 30 MORE rounds
  const baselines = new Map([['bp_s1_l4_pro', 25]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L4_PRO,
    bp: { survivalRoundsTotal: 25, missionBaselines: baselines },
  });

  const result = await processGameBpProgress(user._id, { mode: 'survival', rounds: 30 });

  expect(result.awardedMissions).toContain('bp_s1_l4_pro');
});

// ── Test 7: complete_daily is NOT affected by baseline system (regression) ────

test('complete_daily is awarded based on absolute dailiesCompleted counter (no baseline)', async () => {
  const User = getUser();
  await createSeason();

  // Free user at level 4, 2 dailies done — needs 3 total (target=3 for bp_s1_l4_free)
  const user = await createUser(User, {
    isPro: false,
    completedMissions: PRE_L4_FREE,
    bp: { dailiesCompleted: 2 },
  });

  const result = await processDailyBpProgress(user._id, { newStreak: 1 });

  expect(result.awardedMissions).toContain('bp_s1_l4_free');

  // No baseline should have been written for bp_s1_l4_free
  const updated = await User.findById(user._id);
  expect(mapGet(updated.battlePass.missionBaselines, 'bp_s1_l4_free')).toBeUndefined();
});

// ── Test 8: daily_streak is NOT affected by baseline system (regression) ──────

test('daily_streak mission is awarded when newStreak reaches target', async () => {
  const User = getUser();
  await createSeason();

  // Free user at level 10 — bp_s1_l10_free requires daily_streak=7
  const user = await createUser(User, {
    isPro: false,
    completedMissions: PRE_L12_FREE.slice(0, 4), // l2_free … l8_free → level 10
    bp: {},
  });

  const result = await processDailyBpProgress(user._id, { newStreak: 7 });

  expect(result.awardedMissions).toContain('bp_s1_l10_free');
});

// ── Test 9: streak_days is NOT affected by baseline system (regression) ───────

test('streak_days mission uses newStreak directly (no baseline)', async () => {
  const User = getUser();
  await createSeason();

  // Pro user with lots of prerequisites to reach level 15 — bp_s1_l15_pro streak_days=21
  const PRE_L15_PRO = [
    'bp_s1_l1_pro', 'bp_s1_l2_free', 'bp_s1_l2_pro',
    'bp_s1_l3_pro',
    'bp_s1_l4_free', 'bp_s1_l4_pro',
    'bp_s1_l5_pro',                          // disabled TM — bypassed for test
    'bp_s1_l6_free', 'bp_s1_l6_pro',         // l6_free disabled — bypassed
    'bp_s1_l7_pro',
    'bp_s1_l8_free', 'bp_s1_l8_pro',
    'bp_s1_l9_pro',
    'bp_s1_l10_free', 'bp_s1_l10_pro',
    'bp_s1_l11_pro',                         // disabled TM — bypassed
    'bp_s1_l12_free', 'bp_s1_l12_pro',
    'bp_s1_l13_pro',
    'bp_s1_l14_free', 'bp_s1_l14_pro',      // l14_free disabled — bypassed
  ];

  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L15_PRO,
    bp: {},
  });

  const result = await processDailyBpProgress(user._id, { newStreak: 21 });

  expect(result.awardedMissions).toContain('bp_s1_l15_pro');
});

// ── Test 10: arena_wins relative progress, no double-award ───────────────────

test('arena_wins awards at relative target, then is not double-awarded', async () => {
  const User = getUser();
  await createSeason();

  // Pro user at level 6, baseline=3, target=5 — needs 5 more wins
  const baselines = new Map([['bp_s1_l6_pro', 3]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L6_PRO,
    bp: { arenaWinsTotal: 3, missionBaselines: baselines },
  });

  // Win 4 times: relative progress = (3+4) - 3 = 4 < 5, NOT awarded
  for (let i = 0; i < 4; i++) {
    const r = await processArenaWinBpProgress(user._id);
    expect(r.awardedMissions).not.toContain('bp_s1_l6_pro');
  }

  // 5th win: relative progress = 5 >= 5 — AWARDED
  const r5 = await processArenaWinBpProgress(user._id);
  expect(r5.awardedMissions).toContain('bp_s1_l6_pro');

  // 6th win: already completed — NOT double-awarded
  const r6 = await processArenaWinBpProgress(user._id);
  expect(r6.awardedMissions).not.toContain('bp_s1_l6_pro');
});
