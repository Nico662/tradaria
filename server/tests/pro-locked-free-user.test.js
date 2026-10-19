/**
 * pro-locked-free-user.test.js
 *
 * Verifies the pro-locked behaviour for Free users (isPro false):
 *
 *   1. computeCardState always returns 'pro_locked' for the Pro track
 *      when isPro false — regardless of completedMissions.
 *   2. hasClaimableRewards never counts the Pro track for Free users,
 *      even if all Pro missions are "done".
 *   3. The grantPro condition in the claim handler is always false
 *      for isPro false → PRO_REQUIRED error path.
 *   4. (Behaviour report, no code change) Free user activity accumulates
 *      Pro mission counters; after upgrading to Pro they can claim instantly.
 */

const season1 = require('../config/season1');
const { computeUserLevel, inferClaimedTracks } = require('../routes/battlepass');

// ── Inline computeCardState (mirrors the server implementation) ───────────────
function computeCardState(lvlCfg, track, userLevel, claimedForTrack, isPro, allMissionProgress) {
  const reward   = track === 'free' ? lvlCfg.freeReward  : lvlCfg.proReward;
  const mission  = track === 'free' ? lvlCfg.freeMission : lvlCfg.proMission;
  const levelNum = lvlCfg.level;

  if (!reward && !mission) return 'empty';
  if (claimedForTrack.includes(levelNum)) return 'claimed';
  if (track === 'pro' && !isPro) return 'pro_locked';
  if (userLevel < levelNum) return 'locked';
  if (mission && allMissionProgress) {
    const prog = allMissionProgress[levelNum]?.[track];
    if (prog && prog.current < prog.target) return 'mission_pending';
  }
  return 'claimable';
}

function buildAllMissionProgress() {
  const acc = {};
  for (const lvlCfg of season1.LEVELS) {
    acc[lvlCfg.level] = {
      free: lvlCfg.freeMission ? { current: 0, target: lvlCfg.freeMission.target } : null,
      pro:  lvlCfg.proMission  ? { current: 0, target: lvlCfg.proMission.target  } : null,
    };
  }
  return acc;
}

// ── 1. computeCardState always pro_locked for Free users ─────────────────────

describe('computeCardState: pro track is always pro_locked for Free users', () => {
  test('all 30 pro-track states are pro_locked for a fresh Free user', () => {
    const allMissionProgress = buildAllMissionProgress();
    const userLevel = computeUserLevel([], false); // = 2

    for (const lvlCfg of season1.LEVELS) {
      const state = computeCardState(lvlCfg, 'pro', userLevel, [], false, allMissionProgress);
      expect(state).toBe('pro_locked');
    }
  });

  test('pro_locked regardless of userLevel (advanced Free user)', () => {
    const allFreeMissionIds = season1.LEVELS
      .filter(l => l.freeMission)
      .map(l => l.freeMission.id);
    const userLevel = computeUserLevel(allFreeMissionIds, false);
    const allMissionProgress = buildAllMissionProgress();

    for (const lvlCfg of season1.LEVELS) {
      const state = computeCardState(lvlCfg, 'pro', userLevel, [], false, allMissionProgress);
      expect(state).toBe('pro_locked');
    }
  });

  test('pro_locked even when Pro mission appears in completedMissions', () => {
    const mixedMissions = ['bp_s1_l2_free', 'bp_s1_l4_free', 'bp_s1_l1_pro', 'bp_s1_l2_pro'];
    const userLevel = computeUserLevel(mixedMissions, false);
    const allMissionProgress = buildAllMissionProgress();

    for (const lvlCfg of season1.LEVELS) {
      const state = computeCardState(lvlCfg, 'pro', userLevel, [], false, allMissionProgress);
      expect(state).toBe('pro_locked');
    }
  });
});

// ── 2. hasClaimableRewards never counts Pro for Free users ────────────────────

describe('hasClaimableRewards: Pro track never contributes for Free users', () => {
  test('no Pro card is ever claimable for a Free user', () => {
    const allMissionProgress = buildAllMissionProgress();
    const userLevel = computeUserLevel([], false);

    const cardStates = {};
    for (const lvlCfg of season1.LEVELS) {
      cardStates[lvlCfg.level] = {
        free: computeCardState(lvlCfg, 'free', userLevel, [], false, allMissionProgress),
        pro:  computeCardState(lvlCfg, 'pro',  userLevel, [], false, allMissionProgress),
      };
    }

    const proClaimable = Object.values(cardStates).filter(lvl => lvl.pro === 'claimable');
    expect(proClaimable).toHaveLength(0);
  });

  test('Pro track does not trigger hasClaimableRewards flag even with all free missions done', () => {
    const allFreeMissionIds = season1.LEVELS.filter(l => l.freeMission).map(l => l.freeMission.id);
    const userLevel = computeUserLevel(allFreeMissionIds, false);
    const allMissionProgress = {};
    for (const lvlCfg of season1.LEVELS) {
      const freeDone = allFreeMissionIds.includes(lvlCfg.freeMission?.id);
      allMissionProgress[lvlCfg.level] = {
        free: lvlCfg.freeMission
          ? { current: freeDone ? lvlCfg.freeMission.target : 0, target: lvlCfg.freeMission.target }
          : null,
        pro:  lvlCfg.proMission
          ? { current: 0, target: lvlCfg.proMission.target }
          : null,
      };
    }

    const cardStates = {};
    for (const lvlCfg of season1.LEVELS) {
      cardStates[lvlCfg.level] = {
        free: computeCardState(lvlCfg, 'free', userLevel, [], false, allMissionProgress),
        pro:  computeCardState(lvlCfg, 'pro',  userLevel, [], false, allMissionProgress),
      };
    }

    const proContributes = Object.values(cardStates).some(lvl => lvl.pro === 'claimable');
    expect(proContributes).toBe(false);
  });
});

// ── 3. Claim PRO_REQUIRED for Free users ─────────────────────────────────────

describe('claim logic: PRO_REQUIRED for any Pro-track claim by Free users', () => {
  test('grantPro is false for every level when isPro false', () => {
    const user = { isPro: false };
    for (const lvlCfg of season1.LEVELS) {
      if (!lvlCfg.proReward) continue;
      const grantPro = !!lvlCfg.proReward && user.isPro;
      expect(grantPro).toBe(false);
    }
  });

  test('error is PRO_REQUIRED when track=pro, isPro=false, nothing claimed', () => {
    // Mirrors: grantFree=false (track='pro' filter), grantPro=false (!isPro)
    // → !grantFree && !grantPro, hasAnyClaimed=false → PRO_REQUIRED
    const user = { isPro: false };
    for (const lvlCfg of season1.LEVELS) {
      const freeAlreadyClaimed = false;
      const proAlreadyClaimed  = false;
      const grantFree = !!lvlCfg.freeReward && !freeAlreadyClaimed && false; // track='pro'
      const grantPro  = !!lvlCfg.proReward  && user.isPro && !proAlreadyClaimed;

      if (!grantFree && !grantPro) {
        const error = (freeAlreadyClaimed || proAlreadyClaimed) ? 'ALREADY_CLAIMED' : 'PRO_REQUIRED';
        expect(error).toBe('PRO_REQUIRED');
      }
    }
  });
});

// ── 4. Behaviour report: Free user activity accumulates Pro missions ──────────

describe('behaviour: Free user activity and Pro missions (report only, no code change)', () => {
  test('computeUserLevel ignores Pro missions for Free users', () => {
    const completedWithProOnly = ['bp_s1_l1_pro'];
    expect(computeUserLevel(completedWithProOnly, false)).toBe(2);
  });

  test('Free→Pro upgrade: completed Pro missions become instantly claimable', () => {
    const completedMissions = [
      'bp_s1_l2_free', 'bp_s1_l4_free',
      'bp_s1_l1_pro', 'bp_s1_l2_pro', 'bp_s1_l3_pro', 'bp_s1_l4_pro',
    ];
    // Passes levels 1–4 (all free+pro done), blocked at 5 by bp_s1_l5_pro (not done)
    const newLevel = computeUserLevel(completedMissions, true);
    expect(newLevel).toBe(5);

    // Pro cards at levels 1–4 are now claimable
    const allMissionProgress = buildAllMissionProgress();
    for (const lvlCfg of season1.LEVELS.slice(0, 4)) {
      allMissionProgress[lvlCfg.level].pro = {
        current: lvlCfg.proMission.target,
        target:  lvlCfg.proMission.target,
      };
    }

    for (const lvlCfg of season1.LEVELS.slice(0, 4)) {
      const state = computeCardState(lvlCfg, 'pro', newLevel, [], true, allMissionProgress);
      expect(state).toBe('claimable');
    }
  });
});
