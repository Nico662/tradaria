/**
 * inferClaimedTracks — regression tests
 *
 * The key bug: user.isPro was used to infer Pro track as claimed, which
 * permanently blocked any Pro user who had claimed a Free reward (before the
 * per-track arrays existed) from ever claiming their Pro reward.
 *
 * Level 2 config (from season1.js):
 *   freeMission: bp_s1_l2_free (play 1 game)
 *   freeReward:  xp(300)
 *   proMission:  bp_s1_l2_pro  (complete 5 daily challenges)
 *   proReward:   badge(bp_s1_early_trader)
 */

const { inferClaimedTracks } = require('../routes/battlepass');

// ── helpers ───────────────────────────────────────────────────────────────────

function makeBp(overrides = {}) {
  return {
    claimedRewards:    [],
    claimedFreeRewards:[],
    claimedProRewards: [],
    completedMissions: [],
    ...overrides,
  };
}

// ── main regression ───────────────────────────────────────────────────────────

describe('inferClaimedTracks — user.isPro regression', () => {

  test('Free-only claim + later upgrade to Pro does NOT mark Pro as claimed', () => {
    // Exact scenario for tradara.nvidalc@gmail.com:
    //   1. User claimed Free reward for level 2 when not Pro
    //      → level 2 in claimedRewards (legacy), claimedProRewards still empty
    //   2. User later became Pro
    //   3. BEFORE fix: inferClaimedTracks returned claimedProRewards=[2] due to user.isPro
    //      → UI showed ✓ on Pro card, server rejected claim with ALREADY_CLAIMED
    //   AFTER fix: Pro NOT inferred, user can claim their Pro reward normally

    const bp   = makeBp({ claimedRewards: [2], completedMissions: ['bp_s1_l2_free'] });
    const user = { isPro: true };

    const result = inferClaimedTracks(bp, user);

    expect(result.claimedFreeRewards).toContain(2);
    expect(result.claimedProRewards).not.toContain(2);
  });

  test('Free-only claim while non-Pro does NOT mark Pro as claimed', () => {
    const bp   = makeBp({ claimedRewards: [2], completedMissions: ['bp_s1_l2_free'] });
    const user = { isPro: false };

    const result = inferClaimedTracks(bp, user);

    expect(result.claimedFreeRewards).toContain(2);
    expect(result.claimedProRewards).not.toContain(2);
  });

  test('Pro mission completed → Pro IS inferred as claimed (correct positive)', () => {
    const bp = makeBp({
      claimedRewards:    [2],
      completedMissions: ['bp_s1_l2_free', 'bp_s1_l2_pro'],
    });
    const user = { isPro: true };

    const result = inferClaimedTracks(bp, user);

    expect(result.claimedFreeRewards).toContain(2);
    expect(result.claimedProRewards).toContain(2);
  });

  test('Pro mission completed even if user is no longer Pro → Pro IS inferred as claimed', () => {
    // Covers former-Pro users who completed mission, claimed, then downgraded
    const bp = makeBp({
      claimedRewards:    [2],
      completedMissions: ['bp_s1_l2_free', 'bp_s1_l2_pro'],
    });
    const user = { isPro: false };

    const result = inferClaimedTracks(bp, user);

    expect(result.claimedProRewards).toContain(2);
  });

});

// ── other levels and edge cases ───────────────────────────────────────────────

describe('inferClaimedTracks — level structure and edge cases', () => {

  test('Pro-only level (level 1) in legacy → always inferred as Pro-claimed', () => {
    // Level 1: no freeReward, only proReward → !hasFree && hasPro branch
    const bp   = makeBp({ claimedRewards: [1], completedMissions: ['bp_s1_l1_pro'] });
    const user = { isPro: false };

    const result = inferClaimedTracks(bp, user);

    expect(result.claimedFreeRewards).not.toContain(1);
    expect(result.claimedProRewards).toContain(1);
  });

  test('Level already in explicit claimedProRewards is not double-added', () => {
    const bp = makeBp({
      claimedRewards:    [2],
      claimedFreeRewards:[2],
      claimedProRewards: [2],
      completedMissions: ['bp_s1_l2_free', 'bp_s1_l2_pro'],
    });
    const user = { isPro: true };

    const result = inferClaimedTracks(bp, user);

    expect(result.claimedProRewards.filter(n => n === 2).length).toBe(1);
  });

  test('Level already in explicit claimedFreeRewards is not double-added', () => {
    const bp = makeBp({
      claimedRewards:    [2],
      claimedFreeRewards:[2],
      completedMissions: ['bp_s1_l2_free'],
    });
    const user = { isPro: false };

    const result = inferClaimedTracks(bp, user);

    expect(result.claimedFreeRewards.filter(n => n === 2).length).toBe(1);
  });

  test('null bp returns empty arrays', () => {
    const result = inferClaimedTracks(null, { isPro: true });

    expect(result.claimedFreeRewards).toEqual([]);
    expect(result.claimedProRewards).toEqual([]);
  });

  test('empty claimedRewards returns empty arrays', () => {
    const bp   = makeBp({ claimedRewards: [] });
    const user = { isPro: true };

    const result = inferClaimedTracks(bp, user);

    expect(result.claimedFreeRewards).toEqual([]);
    expect(result.claimedProRewards).toEqual([]);
  });

  test('multiple levels — each inferred independently', () => {
    // Level 1 (pro-only, claimed), level 2 (both, free claimed only), level 4 (both, both completed)
    const bp = makeBp({
      claimedRewards:    [1, 2, 4],
      completedMissions: ['bp_s1_l1_pro', 'bp_s1_l2_free', 'bp_s1_l4_free', 'bp_s1_l4_pro'],
    });
    const user = { isPro: true };

    const result = inferClaimedTracks(bp, user);

    expect(result.claimedProRewards).toContain(1);   // pro-only level
    expect(result.claimedFreeRewards).toContain(2);
    expect(result.claimedProRewards).not.toContain(2); // free claimed only
    expect(result.claimedFreeRewards).toContain(4);
    expect(result.claimedProRewards).toContain(4);   // pro mission completed
  });

});
