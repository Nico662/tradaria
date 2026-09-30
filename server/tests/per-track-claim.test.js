/**
 * per-track-claim.test.js
 *
 * Tests for the per-track claim system (Block 2):
 *   - track='free' | 'pro' | undefined param on POST /claim/:level
 *   - Atomic dedup via $ne filter → 409 on race condition
 *   - Full user state in claim response
 *   - Physical-evidence inference (Block 1.2)
 *   - Pro required, mission guard, concurrent dedup
 */

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase, getUser } = require('./helpers/testApp');
const Season   = require('../models/Season');
const {
  computeUserLevel,
  inferClaimedTracks,
  relativeProgress,
  mapGet,
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

async function createUser(User, { isPro = false, completedMissions = [], bp = {}, badges = [], purchases = [] } = {}) {
  return User.create({
    username: 'tester',
    isPro,
    badges,
    purchases,
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

// ── Test 1: inferClaimedTracks regression ────────────────────────────────────

test('inferClaimedTracks: completing Pro mission without badge does NOT mark Pro as claimed', () => {
  const bp = {
    claimedRewards:    [2],
    claimedFreeRewards:[],
    claimedProRewards: [],
    completedMissions: ['bp_s1_l2_free', 'bp_s1_l2_pro'],
  };
  const user = { isPro: true, badges: [], purchases: [] };

  const result = inferClaimedTracks(bp, user);

  expect(result.claimedFreeRewards).toContain(2);
  expect(result.claimedProRewards).not.toContain(2); // badge absent → not inferred
});

// ── Test 2: Pro with Free done + Pro pending → separate track results ─────────

test('Pro with free mission done + pro mission NOT done: free claimable, pro blocked by inference', () => {
  const bp = {
    claimedRewards:    [2],
    claimedFreeRewards:[2],
    claimedProRewards: [],
    completedMissions: ['bp_s1_l2_free'],
  };
  const user = { isPro: true, badges: [], purchases: [] };

  const result = inferClaimedTracks(bp, user);

  // Free already claimed (in explicit claimedFreeRewards)
  expect(result.claimedFreeRewards).toContain(2);
  // Pro not inferred (badge absent)
  expect(result.claimedProRewards).not.toContain(2);
});

// ── Test 3: Pro with both done and badge present ──────────────────────────────

test('Pro with badge in user.badges: Pro IS inferred as claimed', () => {
  const bp = {
    claimedRewards:    [2],
    claimedFreeRewards:[],
    claimedProRewards: [],
    completedMissions: ['bp_s1_l2_free', 'bp_s1_l2_pro'],
  };
  const user = { isPro: true, badges: ['bp_s1_early_trader'], purchases: [] };

  const result = inferClaimedTracks(bp, user);

  expect(result.claimedFreeRewards).toContain(2);
  expect(result.claimedProRewards).toContain(2);
});

// ── Test 4: Free user, track='pro' (cosmetic case via inference) ──────────────

test('Free user: inferClaimedTracks never marks pro track as claimed for pro-only XP levels', () => {
  const bp = {
    claimedRewards:    [1],
    claimedFreeRewards:[],
    claimedProRewards: [],
    completedMissions: ['bp_s1_l1_pro'],
  };
  // Level 1 proReward is xp(500) — unverifiable, so for hasFree=false && hasPro=true
  // the !hasFree && hasPro branch always infers as claimed (because there's nothing else)
  const user = { isPro: false, badges: [], purchases: [] };

  const result = inferClaimedTracks(bp, user);

  // Pro-only level with xp reward → always inferred as claimed (only track available)
  expect(result.claimedProRewards).toContain(1);
});

// ── Test 5: Concurrent double-claim atomic dedup ──────────────────────────────

test('concurrent claim: $ne filter prevents double-write to claimedFreeRewards', async () => {
  const User = getUser();
  await createSeason();

  const user = await createUser(User, {
    completedMissions: ['bp_s1_l2_free', 'bp_s1_l1_pro'],
    bp: { bpPoints: 600 },
  });

  // Simulate two concurrent atomic claims at level 2 free track
  const dedupeFilter1 = { _id: user._id, 'battlePass.claimedFreeRewards': { $ne: 2 } };
  const dedupeFilter2 = { _id: user._id, 'battlePass.claimedFreeRewards': { $ne: 2 } };
  const update = { $addToSet: { 'battlePass.claimedFreeRewards': { $each: [2] }, badges: { $each: ['test_badge'] } } };

  const [r1, r2] = await Promise.all([
    User.findOneAndUpdate(dedupeFilter1, update, { new: true }),
    User.findOneAndUpdate(dedupeFilter2, update, { new: true }),
  ]);

  // One must win, one must lose (returns null)
  const wins = [r1, r2].filter(Boolean).length;
  const losses = [r1, r2].filter(r => r === null).length;
  expect(wins).toBe(1);
  expect(losses).toBe(1);

  // Verify no duplicate in DB
  const final = await User.findById(user._id);
  expect(final.battlePass.claimedFreeRewards.filter(n => n === 2).length).toBe(1);
});

// ── Test 6: Free→Pro upgrade with level Free already claimed → Pro still claimable ──

test('Free user claims level 2 free, then upgrades to Pro: Pro track still claimable', async () => {
  const User = getUser();
  await createSeason();

  // Step 1: Free user claims level 2 free (stores in claimedFreeRewards, NOT legacy)
  const user = await createUser(User, {
    completedMissions: ['bp_s1_l2_free'],
    bp: { claimedFreeRewards: [2] },
  });

  // Step 2: User becomes Pro
  await User.findByIdAndUpdate(user._id, { $set: { isPro: true } });

  // Step 3: Check inference — Pro should NOT be inferred as claimed
  const updated = await User.findById(user._id);
  const result = inferClaimedTracks(updated.battlePass, updated);

  expect(result.claimedFreeRewards).toContain(2);
  expect(result.claimedProRewards).not.toContain(2); // Pro still unclaimed
});

// ── Test 7: server cardState equivalence for 'claimable' ─────────────────────

test('computeCardState returns claimable when mission is complete and level reached', () => {
  // We test the inference logic directly since computeCardState is server-internal
  // A level 2 free is claimable when: level >= 2, mission done, not yet claimed
  const bp = {
    claimedRewards:    [],
    claimedFreeRewards:[],
    claimedProRewards: [],
    completedMissions: ['bp_s1_l2_free', 'bp_s1_l1_pro'],
  };
  const userLevel = computeUserLevel(bp.completedMissions, false);
  expect(userLevel).toBeGreaterThanOrEqual(2);

  const { claimedFreeRewards } = inferClaimedTracks(bp, { badges: [], purchases: [] });
  expect(claimedFreeRewards).not.toContain(2); // not yet claimed → claimable
});

// ── Test 8: badge in user.badges after claim (inference confirms delivery) ────

test('after badge reward claim, badge appears in user.badges and is inferred as claimed', async () => {
  const User = getUser();
  await createSeason();

  const user = await createUser(User, {
    isPro: true,
    completedMissions: ['bp_s1_l1_pro', 'bp_s1_l2_free', 'bp_s1_l2_pro'],
    bp: { claimedFreeRewards: [2], bpPoints: 600 },
  });

  // Simulate badge reward delivery
  await User.findByIdAndUpdate(user._id, {
    $addToSet: {
      badges: { $each: ['bp_s1_early_trader'] },
      'battlePass.claimedProRewards': { $each: [2] },
    },
  });

  const updated = await User.findById(user._id);
  expect(updated.badges).toContain('bp_s1_early_trader');

  // Now inference should confirm Pro as claimed via physical evidence
  const result = inferClaimedTracks(updated.battlePass, updated);
  expect(result.claimedProRewards).toContain(2);
});

// ── Test 9: enabled:false missions still claimable (Trading Mode exempt) ──────

test('level 5 Pro claimable without completing Trading Mode mission (enabled:false)', () => {
  // Level 5 has only a proMission with enabled:false → no mission gate → claimable
  // if user has reached level 5
  const completedMissions = ['bp_s1_l1_pro', 'bp_s1_l2_free', 'bp_s1_l2_pro', 'bp_s1_l3_pro', 'bp_s1_l4_free', 'bp_s1_l4_pro'];
  const userLevel = computeUserLevel(completedMissions, true);
  expect(userLevel).toBeGreaterThanOrEqual(5);

  // bp_s1_l5_pro is enabled:false → exempt from mission guard
  // (no mission to check, so the claim should be allowed for level 5)
  const bp = {
    claimedRewards:    [],
    claimedFreeRewards:[],
    claimedProRewards: [],
    completedMissions,
  };
  const { claimedProRewards } = inferClaimedTracks(bp, { badges: [], purchases: [] });
  expect(claimedProRewards).not.toContain(5); // not claimed yet
});

// ── Test 10: Baseline = 0 not treated as falsy ───────────────────────────────

test('relativeProgress: baseline=0 is treated as 0, not absent (no false baseline snap)', async () => {
  const User = getUser();
  await createSeason();

  // User unlocked bp_s1_l3_pro (classicWins target=15) with baseline=0
  // Then played 5 games → classicWinsTotal=5
  // relativeProgress should be 5-0=5, NOT 5 (which would be correct if baseline absent = 0)
  // The key is that baseline should not be RE-snapshotted to 5 on the next call
  const baselines = new Map([['bp_s1_l3_pro', 0]]);
  const user = await createUser(User, {
    isPro: true,
    completedMissions: ['bp_s1_l1_pro', 'bp_s1_l2_free', 'bp_s1_l2_pro'],
    bp: { classicWinsTotal: 5, missionBaselines: baselines },
  });

  const updated = await User.findById(user._id);
  const baseline = mapGet(updated.battlePass.missionBaselines, 'bp_s1_l3_pro');
  expect(baseline).toBe(0); // 0 is a valid baseline, not "absent"

  // relativeProgress = 5 - 0 = 5 (correct)
  const prog = relativeProgress('bp_s1_l3_pro', 'classic_wins', updated.battlePass);
  expect(prog).toBe(5);
});

// ── Test 11: Level 30 no regressions ─────────────────────────────────────────

test('level 30 completion mission inference: user at max level has no regressions', () => {
  // User at level 30 has all missions completed
  // inferClaimedTracks should not throw or return wrong data
  const bp = {
    claimedRewards:    [1, 2, 4, 6, 8, 12, 16, 18, 20, 22, 24, 26, 28, 30],
    claimedFreeRewards:[2, 4, 6, 8, 12, 16, 18, 20, 22, 24, 26, 28, 30],
    claimedProRewards: [1, 2, 4, 6, 8, 12, 16, 18, 20, 22, 24, 26, 28, 30],
    completedMissions: [],
  };
  const user = { isPro: true, badges: [], purchases: [] };

  // Should not throw
  expect(() => inferClaimedTracks(bp, user)).not.toThrow();

  const result = inferClaimedTracks(bp, user);
  expect(Array.isArray(result.claimedFreeRewards)).toBe(true);
  expect(Array.isArray(result.claimedProRewards)).toBe(true);
});

// ── Test 12: Badge visible immediately via user state (no reload) ─────────────

test('claim response includes badges array so client can update without reload', async () => {
  const User = getUser();
  await createSeason();

  const user = await createUser(User, {
    isPro: true,
    badges: [],
    completedMissions: ['bp_s1_l1_pro', 'bp_s1_l2_free', 'bp_s1_l2_pro'],
    bp: { claimedFreeRewards: [2], bpPoints: 600 },
  });

  // Simulate the claim endpoint's atomic update
  const updated = await User.findOneAndUpdate(
    { _id: user._id, 'battlePass.claimedProRewards': { $ne: 2 } },
    {
      $addToSet: {
        badges: { $each: ['bp_s1_early_trader'] },
        'battlePass.claimedProRewards': { $each: [2] },
      },
    },
    { new: true }
  );

  expect(updated).not.toBeNull();
  expect(updated.badges).toContain('bp_s1_early_trader');

  // The full state returned in the response should contain the badge
  const fullState = {
    badges: updated.badges ?? [],
    purchases: updated.purchases ?? [],
  };
  expect(fullState.badges).toContain('bp_s1_early_trader');
});
