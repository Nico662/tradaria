/**
 * season1-changes.test.js
 *
 * Regression tests for the six mission changes applied to season1.js:
 *
 *   L14 Pro  — classic_streak → classic_wins (target 15)
 *   L16 Free — classic_streak target 5 → 3
 *   L16 Pro  — arena_wins target 20 → 3
 *   L20 Pro  — win_tournament → classic_wins (target 40)
 *   L21 Pro  — arena_wins target 30 → 5
 *   L22 Pro  — classic_streak → classic_wins (target 20)
 */

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase, getUser } = require('./helpers/testApp');
const Season   = require('../models/Season');
const {
  processGameBpProgress,
  processArenaWinBpProgress,
} = require('../routes/battlepass');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

async function createSeason() {
  return Season.create({
    seasonId:  1,
    name:      'Test Season',
    startDate: new Date(Date.now() - 1000),
    endDate:   new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    status:    'active',
  });
}

async function createUser(User, { isPro = false, completedMissions = [], bp = {} } = {}) {
  return User.create({
    username: `tester_${Math.random().toString(36).slice(2)}`,
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

// ── Prerequisites ─────────────────────────────────────────────────────────────
// Pro user at level N = all missions for levels 1…(N-1) completed.

const PRE_L14_PRO = [
  'bp_s1_l1_pro',
  'bp_s1_l2_free', 'bp_s1_l2_pro',
  'bp_s1_l3_pro',
  'bp_s1_l4_free', 'bp_s1_l4_pro',
  'bp_s1_l5_pro',
  'bp_s1_l6_free', 'bp_s1_l6_pro',
  'bp_s1_l7_pro',
  'bp_s1_l8_free', 'bp_s1_l8_pro',
  'bp_s1_l9_pro',
  'bp_s1_l10_free', 'bp_s1_l10_pro',
  'bp_s1_l11_pro',
  'bp_s1_l12_free', 'bp_s1_l12_pro',
  'bp_s1_l13_pro',
];

// Free user at level 16: one free mission per even level 2–14.
const PRE_L16_FREE = [
  'bp_s1_l2_free', 'bp_s1_l4_free', 'bp_s1_l6_free',
  'bp_s1_l8_free', 'bp_s1_l10_free', 'bp_s1_l12_free',
  'bp_s1_l14_free',
];

const PRE_L16_PRO = [
  ...PRE_L14_PRO,
  'bp_s1_l14_free', 'bp_s1_l14_pro',
  'bp_s1_l15_pro',
];

const PRE_L20_PRO = [
  ...PRE_L16_PRO,
  'bp_s1_l16_free', 'bp_s1_l16_pro',
  'bp_s1_l17_pro',
  'bp_s1_l18_free', 'bp_s1_l18_pro',
  'bp_s1_l19_pro',
];

const PRE_L22_PRO = [
  ...PRE_L20_PRO,
  'bp_s1_l20_free', 'bp_s1_l20_pro',
  'bp_s1_l21_pro',
];

// ── L14 Pro: classic_wins, target 15 ─────────────────────────────────────────

test('L14 Pro is awarded after 15 classic wins (no streak required)', async () => {
  const User = getUser();
  await createSeason();

  const baselines = new Map([['bp_s1_l14_pro', 0]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L14_PRO,
    bp: { classicWinsTotal: 0, missionBaselines: baselines },
  });

  const result = await processGameBpProgress(user._id, { mode: 'guess', correct: 15, streak: 0 });

  expect(result.awardedMissions).toContain('bp_s1_l14_pro');
});

test('L14 Pro is NOT awarded when streak=15 but correct=0', async () => {
  const User = getUser();
  await createSeason();

  const streakCounters = new Map([['bp_s1_l14_pro', 0]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L14_PRO,
    bp: { missionStreakCounters: streakCounters },
  });

  // Streak without classic wins — classic_wins branch (correct=0) does not fire
  const result = await processGameBpProgress(user._id, { mode: 'guess', streak: 15, correct: 0 });

  expect(result.awardedMissions).not.toContain('bp_s1_l14_pro');
});

test('L14 Pro is NOT awarded with only 14 classic wins', async () => {
  const User = getUser();
  await createSeason();

  const baselines = new Map([['bp_s1_l14_pro', 0]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L14_PRO,
    bp: { classicWinsTotal: 0, missionBaselines: baselines },
  });

  const result = await processGameBpProgress(user._id, { mode: 'guess', correct: 14 });

  expect(result.awardedMissions).not.toContain('bp_s1_l14_pro');
});

// ── L16 Free: classic_streak, target 3 ───────────────────────────────────────

test('L16 Free is awarded with streak=3', async () => {
  const User = getUser();
  await createSeason();

  const streakCounters = new Map([['bp_s1_l16_free', 0]]);
  const user = await createUser(User, {
    isPro: false,
    completedMissions: PRE_L16_FREE,
    bp: { missionStreakCounters: streakCounters },
  });

  const result = await processGameBpProgress(user._id, { mode: 'guess', streak: 3, correct: 0 });

  expect(result.awardedMissions).toContain('bp_s1_l16_free');
});

test('L16 Free is NOT awarded with streak=2', async () => {
  const User = getUser();
  await createSeason();

  const streakCounters = new Map([['bp_s1_l16_free', 0]]);
  const user = await createUser(User, {
    isPro: false,
    completedMissions: PRE_L16_FREE,
    bp: { missionStreakCounters: streakCounters },
  });

  const result = await processGameBpProgress(user._id, { mode: 'guess', streak: 2, correct: 0 });

  expect(result.awardedMissions).not.toContain('bp_s1_l16_free');
});

// ── L16 Pro: arena_wins, target 3 ────────────────────────────────────────────

test('L16 Pro is awarded after 3 arena wins', async () => {
  const User = getUser();
  await createSeason();

  const baselines = new Map([['bp_s1_l16_pro', 0]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L16_PRO,
    bp: { arenaWinsTotal: 0, missionBaselines: baselines },
  });

  for (let i = 0; i < 3; i++) {
    await processArenaWinBpProgress(user._id);
  }

  const updated = await getUser().findById(user._id);
  expect(updated.battlePass.completedMissions).toContain('bp_s1_l16_pro');
});

test('L16 Pro is NOT awarded after only 2 arena wins', async () => {
  const User = getUser();
  await createSeason();

  const baselines = new Map([['bp_s1_l16_pro', 0]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L16_PRO,
    bp: { arenaWinsTotal: 0, missionBaselines: baselines },
  });

  for (let i = 0; i < 2; i++) {
    const r = await processArenaWinBpProgress(user._id);
    expect(r.awardedMissions).not.toContain('bp_s1_l16_pro');
  }
});

// ── L20 Pro: classic_wins, target 40 ─────────────────────────────────────────

test('L20 Pro is awarded after 40 classic wins', async () => {
  const User = getUser();
  await createSeason();

  const baselines = new Map([['bp_s1_l20_pro', 0]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L20_PRO,
    bp: { classicWinsTotal: 0, missionBaselines: baselines },
  });

  const result = await processGameBpProgress(user._id, { mode: 'guess', correct: 40 });

  expect(result.awardedMissions).toContain('bp_s1_l20_pro');
});

test('L20 Pro is NOT awarded with only 39 classic wins', async () => {
  const User = getUser();
  await createSeason();

  const baselines = new Map([['bp_s1_l20_pro', 0]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L20_PRO,
    bp: { classicWinsTotal: 0, missionBaselines: baselines },
  });

  const result = await processGameBpProgress(user._id, { mode: 'guess', correct: 39 });

  expect(result.awardedMissions).not.toContain('bp_s1_l20_pro');
});

// ── L21 Pro: arena_wins, target 5 ────────────────────────────────────────────

test('L21 Pro is awarded after 5 arena wins', async () => {
  const User = getUser();
  await createSeason();

  const baselines = new Map([['bp_s1_l21_pro', 0]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L20_PRO,
    bp: { arenaWinsTotal: 0, missionBaselines: baselines },
  });

  for (let i = 0; i < 5; i++) {
    await processArenaWinBpProgress(user._id);
  }

  const updated = await getUser().findById(user._id);
  expect(updated.battlePass.completedMissions).toContain('bp_s1_l21_pro');
});

test('L21 Pro is NOT awarded after only 4 arena wins', async () => {
  const User = getUser();
  await createSeason();

  const baselines = new Map([['bp_s1_l21_pro', 0]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L20_PRO,
    bp: { arenaWinsTotal: 0, missionBaselines: baselines },
  });

  for (let i = 0; i < 4; i++) {
    const r = await processArenaWinBpProgress(user._id);
    expect(r.awardedMissions).not.toContain('bp_s1_l21_pro');
  }
});

// ── L22 Pro: classic_wins, target 20 ─────────────────────────────────────────

test('L22 Pro is awarded after 20 classic wins (no streak required)', async () => {
  const User = getUser();
  await createSeason();

  const baselines = new Map([['bp_s1_l22_pro', 0]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L22_PRO,
    bp: { classicWinsTotal: 0, missionBaselines: baselines },
  });

  const result = await processGameBpProgress(user._id, { mode: 'guess', correct: 20 });

  expect(result.awardedMissions).toContain('bp_s1_l22_pro');
});

test('L22 Pro is NOT awarded when streak=20 but correct=0', async () => {
  const User = getUser();
  await createSeason();

  const streakCounters = new Map([['bp_s1_l22_pro', 0]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: PRE_L22_PRO,
    bp: { missionStreakCounters: streakCounters },
  });

  const result = await processGameBpProgress(user._id, { mode: 'guess', streak: 20, correct: 0 });

  expect(result.awardedMissions).not.toContain('bp_s1_l22_pro');
});
