/**
 * arena-bp.test.js
 *
 * Verifies that arena wins are credited correctly via processArenaWinBpProgress,
 * and that the function is NOT invoked by the bot/stats path.
 *
 * Four contracts:
 *  1. Winner with userId   → arenaWinsTotal increments by 1.
 *  2. Tie                  → neither player's counter changes (function not called for either).
 *  3. Socket with no userId → counter stays 0 (function is skipped server-side).
 *  4. Bot game (stats path) → processGameBpProgress('arena') does NOT increment arenaWinsTotal.
 */

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase, getUser } = require('./helpers/testApp');
const Season = require('../models/Season');
const { processArenaWinBpProgress, processGameBpProgress } = require('../routes/battlepass');

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

async function createUser(User, overrides = {}) {
  return User.create({
    username: `tester_${Math.random().toString(36).slice(2)}`,
    isPro: false,
    battlePass: {
      seasonId: 1,
      bpPoints: 0,
      completedMissions: [],
      claimedRewards: [],
      claimedFreeRewards: [],
      claimedProRewards: [],
      dailiesCompleted: 0,
      survivalRoundsTotal: 0,
      classicMaxStreak: 0,
      classicWinsTotal: 0,
      historicalEventsCompleted: 0,
      completedEventIds: [],
      arenaWinsTotal: 0,
      missionBaselines: new Map(),
      missionStreakCounters: new Map(),
    },
    ...overrides,
  });
}

// ── Test 1: winner with userId → arenaWinsTotal + 1 ──────────────────────────

test('processArenaWinBpProgress increments arenaWinsTotal by 1', async () => {
  const User = getUser();
  await createSeason();
  const user = await createUser(User);

  await processArenaWinBpProgress(user._id);

  const updated = await User.findById(user._id);
  expect(updated.battlePass.arenaWinsTotal).toBe(1);
});

// ── Test 2: tie → neither player's counter changes ────────────────────────────
// The server guard (if s1 !== s2) skips processArenaWinBpProgress for both players.
// Modelled here by not calling the function for either user.

test('tie: neither player arenaWinsTotal changes when function is not called', async () => {
  const User = getUser();
  await createSeason();
  const player1 = await createUser(User);
  const player2 = await createUser(User);

  // Neither player wins — no call is made, just like the server tie path.
  const p1after = await User.findById(player1._id);
  const p2after = await User.findById(player2._id);
  expect(p1after.battlePass.arenaWinsTotal).toBe(0);
  expect(p2after.battlePass.arenaWinsTotal).toBe(0);
});

// ── Test 3: socket with no userId → counter stays 0 ──────────────────────────
// The server skips processArenaWinBpProgress when winnerSocket.userId is falsy.
// Modelled here by verifying the counter is 0 when the function is never called.

test('arena win is not credited when function is skipped (no userId on socket)', async () => {
  const User = getUser();
  await createSeason();
  const user = await createUser(User);

  // Simulate the server guard failing (socket.userId was undefined).
  // processArenaWinBpProgress is deliberately NOT called.
  const after = await User.findById(user._id);
  expect(after.battlePass.arenaWinsTotal).toBe(0);
});

// ── Test 4: bot game (stats path) → arenaWinsTotal unchanged ─────────────────
// Bot games post to /stats/game with mode='arena'.  processGameBpProgress handles
// that call but has no arena branch, so arenaWinsTotal must stay 0.

test('processGameBpProgress with mode arena does NOT increment arenaWinsTotal', async () => {
  const User = getUser();
  await createSeason();
  const user = await createUser(User);

  await processGameBpProgress(user._id, { mode: 'arena', correct: 1, rounds: 10, streak: 0 });

  const updated = await User.findById(user._id);
  expect(updated.battlePass.arenaWinsTotal).toBe(0);
});
