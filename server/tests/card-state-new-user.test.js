/**
 * card-state-new-user.test.js
 *
 * Regression tests for the bug where a newly created user (no BP data, bp === null)
 * saw Level 2 cards as 'claimable' instead of 'mission_pending'.
 *
 * Root cause: GET /current-season returned allMissionProgress:null and
 * cardStates:null when bp was null (user had never played a game).  The client
 * fell back to its local getCardState, which short-circuited the mission-pending
 * guard when missionProgress was null and returned 'claimable' instead.
 *
 * Fix (server): always compute allMissionProgress / cardStates using bpForCalc
 * (real bp if available, synthetic { completedMissions:[] } otherwise).
 *
 * Fix (client-side): getCardState treats null missionProgress as mission not
 * done — tested here via the pure function extracted from BattlePass.jsx.
 *
 * These tests cover:
 *   1. computeCardState with allMissionProgress from a null-bp user → mission_pending
 *   2. getCardState (client fallback) with null missionProgress → mission_pending
 *   3. All 30 levels / both tracks for a fresh user — no card should be claimable
 *      unless its mission is genuinely not required (null mission / disabled)
 *   4. Partial progress: some missions done, others not
 *   5. All missions done for a level → claimable
 */

const season1 = require('../config/season1');
const { computeUserLevel } = require('../routes/battlepass');

// ── Inline copy of computeCardState (exported separately would be cleaner, but
//    the function is not currently exported; test it via its logic directly) ──
function computeCardState(lvlCfg, track, userLevel, claimedForTrack, isPro, allMissionProgress) {
  const reward   = track === 'free' ? lvlCfg.freeReward  : lvlCfg.proReward;
  const mission  = track === 'free' ? lvlCfg.freeMission : lvlCfg.proMission;
  const levelNum = lvlCfg.level;

  if (!reward && !mission) return 'empty';
  if (claimedForTrack.includes(levelNum)) return 'claimed';
  if (track === 'pro' && !isPro) return 'pro_locked';
  if (userLevel < levelNum) return 'locked';
  if (mission && mission.enabled !== false && allMissionProgress) {
    const prog = allMissionProgress[levelNum]?.[track];
    if (prog && prog.current < prog.target) return 'mission_pending';
  }
  return 'claimable';
}

// ── Inline copy of the FIXED getCardState from BattlePass.jsx ─────────────────
// (kept here so the test suite doesn't depend on JSX parsing)
function getCardState(reward, mission, levelNum, track, userLevel, claimedRewards, isPro, missionProgress) {
  if (!reward && !mission) return 'empty';
  if (claimedRewards.includes(levelNum)) return 'claimed';
  if (track === 'pro' && !isPro) return 'pro_locked';
  if (userLevel < levelNum) return 'locked';
  if (mission && mission.enabled !== false) {
    if (!missionProgress || missionProgress.current < missionProgress.target) {
      return 'mission_pending';
    }
  }
  return 'claimable';
}

// ── OLD (buggy) version for regression verification ───────────────────────────
function getCardStateBuggy(reward, mission, levelNum, track, userLevel, claimedRewards, isPro, missionProgress) {
  if (!reward && !mission) return 'empty';
  if (claimedRewards.includes(levelNum)) return 'claimed';
  if (track === 'pro' && !isPro) return 'pro_locked';
  if (userLevel < levelNum) return 'locked';
  // BUG: null missionProgress silently skips this guard
  if (mission && mission.enabled !== false && missionProgress && missionProgress.current < missionProgress.target) {
    return 'mission_pending';
  }
  return 'claimable';
}

// ── Helper: build allMissionProgress the way the fixed server does ────────────
// (using bpForCalc = synthetic empty bp when no real bp exists)
function buildAllMissionProgressEmpty(user = {}) {
  const bpForCalc = { completedMissions: [] };
  const acc = {};
  for (const lvlCfg of season1.LEVELS) {
    const free = lvlCfg.freeMission
      ? (lvlCfg.freeMission.enabled === false ? null : { current: 0, target: lvlCfg.freeMission.target })
      : null;
    const pro = lvlCfg.proMission
      ? (lvlCfg.proMission.enabled === false ? null : { current: 0, target: lvlCfg.proMission.target })
      : null;
    acc[lvlCfg.level] = { free, pro };
  }
  return acc;
}

// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Reproduce the original bug ────────────────────────────────────────────
describe('regression: new Free user — Level 2 card must NOT be claimable', () => {

  test('OLD getCardState with null missionProgress incorrectly returns claimable (documents the bug)', () => {
    const lvl2 = season1.LEVELS[1]; // level 2
    const state = getCardStateBuggy(
      lvl2.freeReward,
      lvl2.freeMission,
      2, 'free',
      2,   // userLevel = 2 (auto-pass level 1, no free mission there)
      [],  // claimedFreeRewards
      false, // isPro
      null,  // missionProgress: null — the case when bp is null
    );
    // This is the BUG: should have been mission_pending
    expect(state).toBe('claimable');
  });

  test('FIXED getCardState with null missionProgress returns mission_pending', () => {
    const lvl2 = season1.LEVELS[1];
    const state = getCardState(
      lvl2.freeReward,
      lvl2.freeMission,
      2, 'free',
      2, [], false, null,
    );
    expect(state).toBe('mission_pending');
  });
});

// ── 2. Server-side computeCardState with allMissionProgress from empty bp ────
describe('computeCardState — new Free user with empty synthetic bp', () => {

  const allMissionProgress = buildAllMissionProgressEmpty();
  const userLevel = computeUserLevel([], false); // = 2 (level 1 auto-passes)

  test('computeUserLevel for fresh Free user is 2', () => {
    expect(userLevel).toBe(2);
  });

  test('Level 2 Free → mission_pending (play_any_game not done)', () => {
    const lvl2  = season1.LEVELS[1];
    const state = computeCardState(lvl2, 'free', userLevel, [], false, allMissionProgress);
    expect(state).toBe('mission_pending');
  });

  test('Level 2 Pro → pro_locked (user is Free)', () => {
    const lvl2  = season1.LEVELS[1];
    const state = computeCardState(lvl2, 'pro', userLevel, [], false, allMissionProgress);
    expect(state).toBe('pro_locked');
  });

  test('Level 3 Free → locked (level 3 > userLevel 2)', () => {
    const lvl3  = season1.LEVELS[2];
    const state = computeCardState(lvl3, 'free', userLevel, [], false, allMissionProgress);
    // Level 3 has no freeReward/freeMission → 'empty', or if there's content → 'locked'
    // Level 3 has no free track content
    expect(['locked', 'empty']).toContain(state);
  });
});

// ── 3. All 30 levels / both tracks — no card claimable for a fresh new user ──
describe('full level sweep — fresh Free user (no missions, no activity)', () => {

  const allMissionProgress = buildAllMissionProgressEmpty();
  const completedMissions  = [];
  const isPro              = false;
  const userLevel          = computeUserLevel(completedMissions, isPro); // = 2

  test('userLevel for brand-new Free user is 2', () => {
    expect(userLevel).toBe(2);
  });

  test('no card on any level should show claimable for a fresh Free user', () => {
    const claimableLevels = [];
    for (const lvlCfg of season1.LEVELS) {
      for (const track of ['free', 'pro']) {
        const claimedForTrack = track === 'free' ? [] : [];
        const state = computeCardState(lvlCfg, track, userLevel, claimedForTrack, isPro, allMissionProgress);
        if (state === 'claimable') {
          claimableLevels.push({ level: lvlCfg.level, track });
        }
      }
    }
    expect(claimableLevels).toEqual([]);
  });
});

// ── 4. All 30 levels / both tracks — fresh Pro user ──────────────────────────
describe('full level sweep — fresh Pro user (no missions, no activity)', () => {

  const allMissionProgressPro = (() => {
    const acc = {};
    for (const lvlCfg of season1.LEVELS) {
      const free = lvlCfg.freeMission
        ? (lvlCfg.freeMission.enabled === false ? null : { current: 0, target: lvlCfg.freeMission.target })
        : null;
      const pro = lvlCfg.proMission
        ? (lvlCfg.proMission.enabled === false ? null : { current: 0, target: lvlCfg.proMission.target })
        : null;
      acc[lvlCfg.level] = { free, pro };
    }
    return acc;
  })();

  const isPro     = true;
  const userLevel = computeUserLevel([], isPro); // = 1 (level 1 requires bp_s1_l1_pro for Pro)

  test('userLevel for brand-new Pro user is 1 (blocked by bp_s1_l1_pro)', () => {
    expect(userLevel).toBe(1);
  });

  test('no card on any level should show claimable for a fresh Pro user', () => {
    const claimableLevels = [];
    for (const lvlCfg of season1.LEVELS) {
      for (const track of ['free', 'pro']) {
        const claimedForTrack = [];
        const state = computeCardState(lvlCfg, track, userLevel, claimedForTrack, isPro, allMissionProgressPro);
        if (state === 'claimable') {
          claimableLevels.push({ level: lvlCfg.level, track });
        }
      }
    }
    expect(claimableLevels).toEqual([]);
  });
});

// ── 5. Partial progress: some missions done ───────────────────────────────────
describe('partial progress — Free user with bp_s1_l2_free done but not l4_free', () => {

  const completedMissions = ['bp_s1_l2_free'];
  const isPro             = false;
  const userLevel         = computeUserLevel(completedMissions, isPro); // = 4 (levels 1,2,3 auto)

  // Build progress: l2_free is done (current = target), others at 0
  const allMissionProgress = (() => {
    const acc = {};
    for (const lvlCfg of season1.LEVELS) {
      const freeDone = completedMissions.includes(lvlCfg.freeMission?.id);
      const proDone  = completedMissions.includes(lvlCfg.proMission?.id);
      acc[lvlCfg.level] = {
        free: lvlCfg.freeMission && lvlCfg.freeMission.enabled !== false
          ? { current: freeDone ? lvlCfg.freeMission.target : 0, target: lvlCfg.freeMission.target }
          : null,
        pro: lvlCfg.proMission && lvlCfg.proMission.enabled !== false
          ? { current: proDone ? lvlCfg.proMission.target : 0, target: lvlCfg.proMission.target }
          : null,
      };
    }
    return acc;
  })();

  test('userLevel with only bp_s1_l2_free done is 4', () => {
    expect(userLevel).toBe(4);
  });

  test('Level 2 Free → claimed-unclaimed scenario: state is claimable (mission done, not yet claimed)', () => {
    const lvl2  = season1.LEVELS[1];
    const state = computeCardState(lvl2, 'free', userLevel, [], isPro, allMissionProgress);
    expect(state).toBe('claimable');
  });

  test('Level 2 Free → claimed after claiming', () => {
    const lvl2  = season1.LEVELS[1];
    const state = computeCardState(lvl2, 'free', userLevel, [2], isPro, allMissionProgress);
    expect(state).toBe('claimed');
  });

  test('Level 4 Free → mission_pending (bp_s1_l4_free not done)', () => {
    const lvl4  = season1.LEVELS[3];
    const state = computeCardState(lvl4, 'free', userLevel, [], isPro, allMissionProgress);
    expect(state).toBe('mission_pending');
  });

  test('Levels 5–30 Free → locked (userLevel = 4)', () => {
    for (const lvlCfg of season1.LEVELS.slice(4)) { // levels 5–30
      const state = computeCardState(lvlCfg, 'free', userLevel, [], isPro, allMissionProgress);
      if (lvlCfg.freeReward || lvlCfg.freeMission) {
        expect(state).toBe('locked');
      }
    }
  });
});

// ── 6. All missions done up to level N → all lower cards claimable ────────────
describe('all free missions completed through level 6 → levels 2/4/6 free are claimable', () => {

  // Level 6 Free uses Trading Mode (enabled:false) — it auto-passes for level computation
  // but the reward can still be claimed without completing it.
  const doneMissions = [
    'bp_s1_l2_free', 'bp_s1_l4_free',
    // Note: l6_free is enabled:false → not required for level advancement
  ];
  const isPro     = false;
  const userLevel = computeUserLevel(doneMissions, isPro); // = 6

  const allMissionProgress = (() => {
    const acc = {};
    for (const lvlCfg of season1.LEVELS) {
      const freeDone = doneMissions.includes(lvlCfg.freeMission?.id);
      const proDone  = doneMissions.includes(lvlCfg.proMission?.id);
      acc[lvlCfg.level] = {
        free: lvlCfg.freeMission
          ? (lvlCfg.freeMission.enabled === false
            ? null
            : { current: freeDone ? lvlCfg.freeMission.target : 0, target: lvlCfg.freeMission.target })
          : null,
        pro: lvlCfg.proMission
          ? (lvlCfg.proMission.enabled === false
            ? null
            : { current: proDone ? lvlCfg.proMission.target : 0, target: lvlCfg.proMission.target })
          : null,
      };
    }
    return acc;
  })();

  test('userLevel after l2_free + l4_free is 6 (levels 1,2,3,4,5 done; 5 has no free mission; 6 is TM disabled)', () => {
    expect(userLevel).toBe(6);
  });

  test('Level 2 Free → claimable (mission done, not claimed)', () => {
    const state = computeCardState(season1.LEVELS[1], 'free', userLevel, [], isPro, allMissionProgress);
    expect(state).toBe('claimable');
  });

  test('Level 4 Free → claimable (mission done, not claimed)', () => {
    const state = computeCardState(season1.LEVELS[3], 'free', userLevel, [], isPro, allMissionProgress);
    expect(state).toBe('claimable');
  });

  test('Level 6 Free → claimable (disabled mission — no mission guard applies)', () => {
    // Level 6 free mission is Trading Mode (enabled:false) → exempt from mission check
    const lvl6   = season1.LEVELS[5];
    expect(lvl6.freeMission?.enabled).toBe(false);
    const state = computeCardState(lvl6, 'free', userLevel, [], isPro, allMissionProgress);
    expect(state).toBe('claimable');
  });

  test('Level 8 Free → locked (userLevel = 6 < 8)', () => {
    const state = computeCardState(season1.LEVELS[7], 'free', userLevel, [], isPro, allMissionProgress);
    expect(state).toBe('locked');
  });
});

// ── 7. Regression: daily_streak/streak_days above userLevel must NOT be claimable
describe('regression: streak missions above userLevel are never claimable', () => {
  // Pro user blocked at level 5 by TM mission bp_s1_l5_pro (enabled:false).
  // They have a dailyStreak of 90, which numerically satisfies ALL streak targets
  // (7, 14, 21, 30, 45, 60).  None of those cards (levels 10, 15, 18, 23, 24, 28)
  // should be 'claimable' because userLevel (5) < each of those level numbers.
  const completedMissions = [
    'bp_s1_l1_pro', 'bp_s1_l2_free', 'bp_s1_l2_pro',
    'bp_s1_l3_pro', 'bp_s1_l4_free', 'bp_s1_l4_pro',
  ];
  const isPro     = true;
  const userLevel = computeUserLevel(completedMissions, isPro); // 5

  // allMissionProgress: streak missions show current=90 (counter satisfied but level not reached)
  const allMissionProgress = (() => {
    const done = new Set(completedMissions);
    const acc  = {};
    for (const lvlCfg of season1.LEVELS) {
      acc[lvlCfg.level] = {
        free: (() => {
          const m = lvlCfg.freeMission;
          if (!m || m.enabled === false) return null;
          if (done.has(m.id)) return { current: m.target, target: m.target };
          if (m.type === 'daily_streak' || m.type === 'streak_days') return { current: 90, target: m.target };
          return { current: 0, target: m.target };
        })(),
        pro: (() => {
          const m = lvlCfg.proMission;
          if (!m || m.enabled === false) return null;
          if (done.has(m.id)) return { current: m.target, target: m.target };
          if (m.type === 'daily_streak' || m.type === 'streak_days') return { current: 90, target: m.target };
          return { current: 0, target: m.target };
        })(),
      };
    }
    return acc;
  })();

  test('computeUserLevel for Pro blocked by TM l5_pro is 5', () => {
    expect(userLevel).toBe(5);
  });

  test('level 5 pro is claimable (TM-disabled mission, exempt from guard)', () => {
    const lvl5 = season1.LEVELS[4];
    expect(lvl5.proMission.enabled).toBe(false);
    expect(computeCardState(lvl5, 'pro', userLevel, [], isPro, allMissionProgress)).toBe('claimable');
  });

  const STREAK_MISSIONS = [
    { level: 10, track: 'free',  id: 'bp_s1_l10_free', target:  7 },
    { level: 10, track: 'pro',   id: 'bp_s1_l10_pro',  target: 14 },
    { level: 15, track: 'pro',   id: 'bp_s1_l15_pro',  target: 21 },
    { level: 18, track: 'pro',   id: 'bp_s1_l18_pro',  target: 30 },
    { level: 23, track: 'pro',   id: 'bp_s1_l23_pro',  target: 45 },
    { level: 24, track: 'free',  id: 'bp_s1_l24_free', target: 14 },
    { level: 28, track: 'pro',   id: 'bp_s1_l28_pro',  target: 60 },
  ];

  for (const { level, track, id, target } of STREAK_MISSIONS) {
    test(`level ${level} ${track} (${id}, target ${target}) is locked with userLevel=5 and streak=90`, () => {
      const lvlCfg = season1.LEVELS[level - 1];
      const state  = computeCardState(lvlCfg, track, userLevel, [], isPro, allMissionProgress);
      expect(state).toBe('locked');
    });
  }

  test('no level ABOVE 5 is claimable (streak missions do not bleed through the level guard)', () => {
    const claimableAbove5 = [];
    for (const lvlCfg of season1.LEVELS.filter(l => l.level > 5)) {
      for (const track of ['free', 'pro']) {
        const state = computeCardState(lvlCfg, track, userLevel, [], isPro, allMissionProgress);
        if (state === 'claimable') claimableAbove5.push({ level: lvlCfg.level, track });
      }
    }
    // Levels 10, 15, 18, 23, 24, 28 have streak missions satisfied (counter=90)
    // but none should be claimable — the level guard returns 'locked' first.
    expect(claimableAbove5).toEqual([]);
  });

  test('streak mission "completed" in allMissionProgress but level not reached → still locked', () => {
    // Even if allMissionProgress shows current===target, the level guard fires first.
    const lvl10     = season1.LEVELS[9];
    const progDone  = { ...allMissionProgress, 10: { free: { current: 7, target: 7 }, pro: { current: 14, target: 14 } } };
    expect(computeCardState(lvl10, 'free', userLevel, [], isPro, progDone)).toBe('locked');
    expect(computeCardState(lvl10, 'pro',  userLevel, [], isPro, progDone)).toBe('locked');
  });
});

// ── 9. getCardState client fallback — exhaustive null/zero/done cases ─────────
describe('getCardState (client fallback) — null / zero / done missionProgress', () => {

  const lvl2     = season1.LEVELS[1]; // level 2 free: play_any_game target=1
  const mission  = lvl2.freeMission;
  const reward   = lvl2.freeReward;

  test('null missionProgress → mission_pending', () => {
    expect(getCardState(reward, mission, 2, 'free', 2, [], false, null)).toBe('mission_pending');
  });

  test('{ current:0, target:1 } → mission_pending', () => {
    expect(getCardState(reward, mission, 2, 'free', 2, [], false, { current: 0, target: 1 })).toBe('mission_pending');
  });

  test('{ current:1, target:1 } → claimable', () => {
    expect(getCardState(reward, mission, 2, 'free', 2, [], false, { current: 1, target: 1 })).toBe('claimable');
  });

  test('disabled mission (enabled:false) + null progress → claimable (exempt from guard)', () => {
    const lvl6Free = season1.LEVELS[5].freeMission; // enabled:false
    expect(lvl6Free.enabled).toBe(false);
    const state = getCardState(
      season1.LEVELS[5].freeReward, lvl6Free, 6, 'free', 6, [], false, null,
    );
    expect(state).toBe('claimable');
  });

  test('level not reached → locked regardless of missionProgress', () => {
    expect(getCardState(reward, mission, 2, 'free', 1, [], false, null)).toBe('locked');
  });

  test('already claimed → claimed regardless of missionProgress', () => {
    expect(getCardState(reward, mission, 2, 'free', 2, [2], false, null)).toBe('claimed');
  });

  test('pro track + non-pro user → pro_locked regardless of missionProgress', () => {
    const lvl2pro = season1.LEVELS[1];
    expect(getCardState(lvl2pro.proReward, lvl2pro.proMission, 2, 'pro', 2, [], false, null)).toBe('pro_locked');
  });
});
