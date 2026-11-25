/**
 * l30-catchup.test.js
 *
 * Regression for the bp_s1_l30_free / bp_s1_l30_pro miss caused by the
 * catch-up loops in snapshotNewlyUnlockedMissions passing [] to tryAwardAtomic
 * instead of a shared array, so checkLevel30Atomic never saw those awards.
 *
 * Root cause recap:
 *   processGame/Daily/ArenaWinBpProgress all call:
 *     await checkLevel30Atomic(userId, awardedMissions);   // 1st
 *     await snapshotNewlyUnlockedMissions(userId);          // 2nd
 *
 *   snapshotNewlyUnlockedMissions has two catch-up loops (ACCUMULATOR_TYPES and
 *   historical_all_events) that called tryAwardAtomic(userId, m.id, []).
 *   Because the array was empty and discarded, any mission awarded there was
 *   invisible to checkLevel30Atomic — which had already run and missed it.
 *
 * Scenario tested:
 *   Free user has 13/14 required free missions done.  The 14th (bp_s1_l28_free,
 *   complete_daily target=40) was not awarded by processDailyBpProgress because
 *   dailiesCompleted reached 40 when the user's sequential level was < 28.
 *   Later, playing any game triggers snapshotNewlyUnlockedMissions, whose
 *   catch-up detects dailiesCompleted>=40 at userLevel=28 and awards l28_free —
 *   but the old code never triggered a second checkLevel30Atomic, so l30_free
 *   remained un-awarded despite all 14 prerequisites being satisfied.
 *
 * Fix:
 *   Pass a shared catchupMissions array to both catch-up loops, then call
 *   checkLevel30Atomic(userId, catchupMissions) if any missions were awarded.
 */

'use strict';

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase, getUser } = require('./helpers/testApp');
const Season = require('../models/Season');
const {
  processGameBpProgress,
  processArenaWinBpProgress,
  snapshotNewlyUnlockedMissions,
} = require('../routes/battlepass');

// ── Season factory ────────────────────────────────────────────────────────────
async function createSeason() {
  return Season.create({
    seasonId:  1,
    name:      'Test Season',
    startDate: new Date(Date.now() - 1000),
    endDate:   new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    status:    'active',
  });
}

// ── User factory ──────────────────────────────────────────────────────────────
async function createUser(User, { isPro = false, completedMissions = [], bp = {}, dailyStreak = 0 } = {}) {
  return User.create({
    username:   `tester_${Math.random().toString(36).slice(2)}`,
    isPro,
    dailyStreak,
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

// ── Mission ID constants ──────────────────────────────────────────────────────
// 14 free missions required for bp_s1_l30_free (even levels 2–28)
const FREE_MISSIONS_L2_TO_L26 = [
  'bp_s1_l2_free',  'bp_s1_l4_free',  'bp_s1_l6_free',  'bp_s1_l8_free',
  'bp_s1_l10_free', 'bp_s1_l12_free', 'bp_s1_l14_free', 'bp_s1_l16_free',
  'bp_s1_l18_free', 'bp_s1_l20_free', 'bp_s1_l22_free', 'bp_s1_l24_free',
  'bp_s1_l26_free',
  // bp_s1_l28_free intentionally absent — will be awarded by ACCUMULATOR catch-up
];

// All 14 free mission IDs (prerequisites for l30_free)
const ALL_FREE_14 = [...FREE_MISSIONS_L2_TO_L26, 'bp_s1_l28_free'];

// 29 pro missions required for bp_s1_l30_pro (levels 1–29).
// All except bp_s1_l28_pro (streak_days target=60) which will be awarded by catch-up.
// l29_pro IS included: without it checkLevel30Atomic would still fail even after
// l28_pro is catch-up awarded, because userLevel stays at 28 (l28_pro missing blocks
// the sequential chain) and the catch-up loop only iterates i < userLevel = i < 28,
// which does NOT include level 29 (index 28).  l29_pro must be pre-awarded so the
// only missing piece is l28_pro.
const PRO_MISSING_ONLY_L28 = [
  'bp_s1_l1_pro',  'bp_s1_l2_pro',  'bp_s1_l3_pro',  'bp_s1_l4_pro',
  'bp_s1_l5_pro',  'bp_s1_l6_pro',  'bp_s1_l7_pro',  'bp_s1_l8_pro',
  'bp_s1_l9_pro',  'bp_s1_l10_pro', 'bp_s1_l11_pro', 'bp_s1_l12_pro',
  'bp_s1_l13_pro', 'bp_s1_l14_pro', 'bp_s1_l15_pro', 'bp_s1_l16_pro',
  'bp_s1_l17_pro', 'bp_s1_l18_pro', 'bp_s1_l19_pro', 'bp_s1_l20_pro',
  'bp_s1_l21_pro', 'bp_s1_l22_pro', 'bp_s1_l23_pro', 'bp_s1_l24_pro',
  'bp_s1_l25_pro', 'bp_s1_l26_pro', 'bp_s1_l27_pro', 'bp_s1_l29_pro',
  // bp_s1_l28_pro intentionally absent — will be awarded by streak_days catch-up
];

// ─────────────────────────────────────────────────────────────────────────────

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

// ── 1. Free track: catch-up awards l28_free → l30_free awarded ───────────────
describe('l30 catch-up — Free track (complete_daily)', () => {

  test('processGameBpProgress: l28_free awarded by catch-up → l30_free also awarded', async () => {
    const User = getUser();
    await createSeason();

    // 13/14 free missions done; dailiesCompleted=40 pre-exists (was not awarded at the
    // time because the user's sequential level was below 28 when the 40th daily ran).
    const user = await createUser(User, {
      isPro: false,
      completedMissions: FREE_MISSIONS_L2_TO_L26,
      bp: { dailiesCompleted: 40 },
    });

    // Any game event that is NOT a daily triggers processGameBpProgress.
    // The main award loops do not touch complete_daily; only snapshotNewlyUnlockedMissions'
    // catch-up will see dailiesCompleted>=40 and award l28_free.
    await processGameBpProgress(user._id, { mode: 'survival', rounds: 1 });

    const updated = await User.findById(user._id);
    const done = updated.battlePass.completedMissions;

    expect(done).toContain('bp_s1_l28_free'); // catch-up awarded it
    expect(done).toContain('bp_s1_l30_free'); // fix: checkLevel30Atomic re-ran
  });

  test('processArenaWinBpProgress: same catch-up path → l30_free awarded', async () => {
    const User = getUser();
    await createSeason();

    const user = await createUser(User, {
      isPro: false,
      completedMissions: FREE_MISSIONS_L2_TO_L26,
      bp: { dailiesCompleted: 40 },
    });

    await processArenaWinBpProgress(user._id);

    const updated = await User.findById(user._id);
    const done = updated.battlePass.completedMissions;

    expect(done).toContain('bp_s1_l28_free');
    expect(done).toContain('bp_s1_l30_free');
  });

  test('snapshotNewlyUnlockedMissions directly: l28_free awarded by catch-up → l30_free awarded', async () => {
    const User = getUser();
    await createSeason();

    const user = await createUser(User, {
      isPro: false,
      completedMissions: FREE_MISSIONS_L2_TO_L26,
      bp: { dailiesCompleted: 40 },
    });

    await snapshotNewlyUnlockedMissions(user._id);

    const updated = await User.findById(user._id);
    const done = updated.battlePass.completedMissions;

    expect(done).toContain('bp_s1_l28_free');
    expect(done).toContain('bp_s1_l30_free');
  });

  test('idempotent: calling twice does not double-award l30_free or add bpPoints twice', async () => {
    const User = getUser();
    await createSeason();

    const user = await createUser(User, {
      isPro: false,
      completedMissions: FREE_MISSIONS_L2_TO_L26,
      bp: { dailiesCompleted: 40 },
    });

    await processGameBpProgress(user._id, { mode: 'survival', rounds: 1 });
    await processGameBpProgress(user._id, { mode: 'survival', rounds: 1 });

    const updated = await User.findById(user._id);
    const done = updated.battlePass.completedMissions;

    // l30_free must appear exactly once
    const l30Count = done.filter(id => id === 'bp_s1_l30_free').length;
    expect(l30Count).toBe(1);
  });

  test('no catch-up needed: l28_free already in completedMissions → l30_free awarded normally', async () => {
    // Control case: when the user already has all 14 missions, l30_free should
    // be awarded by the regular checkLevel30Atomic path (no catch-up involved).
    const User = getUser();
    await createSeason();

    const user = await createUser(User, {
      isPro: false,
      completedMissions: ALL_FREE_14, // all 14 free missions already done
      bp: { dailiesCompleted: 40 },
    });

    await processGameBpProgress(user._id, { mode: 'survival', rounds: 1 });

    const updated = await User.findById(user._id);
    expect(updated.battlePass.completedMissions).toContain('bp_s1_l30_free');
  });
});

// ── 2. Pro track: catch-up awards l28_pro → l30_pro awarded ──────────────────
describe('l30 catch-up — Pro track (streak_days)', () => {

  test('processGameBpProgress: l28_pro awarded by streak catch-up → l30_pro and l30_free awarded', async () => {
    const User = getUser();
    await createSeason();

    // Pro user with all 14 free missions done and 28/29 pro missions done.
    // bp_s1_l28_pro has type streak_days, target=60.
    // User's dailyStreak=60 pre-exists but l28_pro was not awarded because the
    // sequential level was below 28 when the streak was first reached.
    const user = await createUser(User, {
      isPro: true,
      completedMissions: [...ALL_FREE_14, ...PRO_MISSING_ONLY_L28],
      dailyStreak: 60,
    });

    await processGameBpProgress(user._id, { mode: 'survival', rounds: 1 });

    const updated = await User.findById(user._id);
    const done = updated.battlePass.completedMissions;

    expect(done).toContain('bp_s1_l28_pro'); // catch-up awarded it
    expect(done).toContain('bp_s1_l30_pro'); // fix: all 29 pro missions done
    expect(done).toContain('bp_s1_l30_free'); // all 14 free missions were already done
  });

  test('idempotent: calling twice does not double-award l30_pro', async () => {
    const User = getUser();
    await createSeason();

    const user = await createUser(User, {
      isPro: true,
      completedMissions: [...ALL_FREE_14, ...PRO_MISSING_ONLY_L28],
      dailyStreak: 60,
    });

    await processGameBpProgress(user._id, { mode: 'survival', rounds: 1 });
    await processGameBpProgress(user._id, { mode: 'survival', rounds: 1 });

    const updated = await User.findById(user._id);
    const done = updated.battlePass.completedMissions;

    expect(done.filter(id => id === 'bp_s1_l30_pro').length).toBe(1);
    expect(done.filter(id => id === 'bp_s1_l30_free').length).toBe(1);
  });
});

// ── 3. No false-positive: insufficient catch-up does not award l30 ────────────
describe('l30 catch-up — no false awards', () => {

  test('dailiesCompleted below target → l28_free not awarded by catch-up → l30_free NOT awarded', async () => {
    const User = getUser();
    await createSeason();

    // 13/14 free missions done; dailiesCompleted=30 — below the target of 40 for l28_free.
    // The catch-up guard (counter >= target) prevents the award, so l30_free must
    // not be awarded either.
    const user = await createUser(User, {
      isPro: false,
      completedMissions: FREE_MISSIONS_L2_TO_L26,
      bp: { dailiesCompleted: 30 }, // 30 < 40 → catch-up must NOT fire
    });

    await processGameBpProgress(user._id, { mode: 'survival', rounds: 1 });

    const updated = await User.findById(user._id);
    const done = updated.battlePass.completedMissions;

    expect(done).not.toContain('bp_s1_l28_free'); // counter below target → not awarded
    expect(done).not.toContain('bp_s1_l30_free'); // prerequisite not met
  });
});
