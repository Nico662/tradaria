/**
 * new-missions.test.js
 *
 * Tests for the 6 new missions that replaced Trading Mode placeholders.
 * Verifies:
 *   1. Config: no mission has enabled:false.
 *   2. Level 30 lists now include the 6 new mission IDs.
 *   3. New missions produce mission_pending (not claimable) without progress.
 *   4. Pro user at level 5 sees mission_pending with 0/2 historical_event progress.
 *   5. Triggered mission types are in BASELINE_TYPES (snapshots at unlock).
 */

const season1 = require('../config/season1');
const { computeUserLevel, BASELINE_TYPES } = require('../routes/battlepass');

// ── Inline computeCardState (mirrors server logic) ────────────────────────────
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

const NEW_MISSIONS = [
  { id: 'bp_s1_l5_pro',   level: 5,  track: 'pro',  type: 'historical_event', target: 2,   mode: 'historical' },
  { id: 'bp_s1_l6_free',  level: 6,  track: 'free', type: 'classic_wins',     target: 10,  mode: 'classic'    },
  { id: 'bp_s1_l11_pro',  level: 11, track: 'pro',  type: 'classic_wins',     target: 30,  mode: 'classic'    },
  { id: 'bp_s1_l14_free', level: 14, track: 'free', type: 'survival_rounds',  target: 35,  mode: 'survival'   },
  { id: 'bp_s1_l17_pro',  level: 17, track: 'pro',  type: 'survival_rounds',  target: 100, mode: 'survival'   },
  { id: 'bp_s1_l26_pro',  level: 26, track: 'pro',  type: 'historical_event', target: 20,  mode: 'historical' },
];

// ── 1. No mission in the config has enabled:false ─────────────────────────────
describe('config: no enabled:false missions remain', () => {
  test('all mission objects have no enabled:false field', () => {
    for (const lvl of season1.LEVELS) {
      for (const m of [lvl.freeMission, lvl.proMission]) {
        if (!m) continue;
        expect(m.enabled).not.toBe(false);
      }
    }
  });

  test.each(NEW_MISSIONS)('$id has no enabled:false field', ({ id }) => {
    const allMissions = season1.LEVELS.flatMap(l => [l.freeMission, l.proMission]).filter(Boolean);
    const m = allMissions.find(x => x.id === id);
    expect(m).toBeDefined();
    expect(m.enabled).not.toBe(false);
  });
});

// ── 2. New mission specs match the config ─────────────────────────────────────
describe('new mission specs match season1 config', () => {
  test.each(NEW_MISSIONS)('$id: type=$type target=$target', ({ id, level, track, type, target, mode }) => {
    const lvlCfg = season1.LEVELS[level - 1];
    const m = track === 'free' ? lvlCfg.freeMission : lvlCfg.proMission;
    expect(m.id).toBe(id);
    expect(m.type).toBe(type);
    expect(m.target).toBe(target);
    expect(m.mode).toBe(mode);
  });
});

// ── 3. All new mission types are in BASELINE_TYPES ───────────────────────────
describe('new mission types use baseline system', () => {
  test.each(NEW_MISSIONS)('$id type $type is in BASELINE_TYPES', ({ type }) => {
    expect(BASELINE_TYPES.has(type)).toBe(true);
  });
});

// ── 4. New missions produce mission_pending without completion ────────────────
describe('new missions: no claimable without progress', () => {
  // Build allMissionProgress with 0 progress for new missions
  function buildProgress(completedMissions) {
    const done = new Set(completedMissions);
    const acc  = {};
    for (const lvlCfg of season1.LEVELS) {
      acc[lvlCfg.level] = {
        free: lvlCfg.freeMission
          ? (done.has(lvlCfg.freeMission.id)
            ? { current: lvlCfg.freeMission.target, target: lvlCfg.freeMission.target }
            : { current: 0, target: lvlCfg.freeMission.target })
          : null,
        pro: lvlCfg.proMission
          ? (done.has(lvlCfg.proMission.id)
            ? { current: lvlCfg.proMission.target, target: lvlCfg.proMission.target }
            : { current: 0, target: lvlCfg.proMission.target })
          : null,
      };
    }
    return acc;
  }

  test('bp_s1_l5_pro: Pro user at level 5 sees mission_pending (historical_event 0/2)', () => {
    const completedMissions = [
      'bp_s1_l1_pro', 'bp_s1_l2_free', 'bp_s1_l2_pro',
      'bp_s1_l3_pro', 'bp_s1_l4_free', 'bp_s1_l4_pro',
    ];
    const userLevel = computeUserLevel(completedMissions, true);
    expect(userLevel).toBe(5);
    const progress = buildProgress(completedMissions);
    const state = computeCardState(season1.LEVELS[4], 'pro', userLevel, [], true, progress);
    expect(state).toBe('mission_pending');
    expect(progress[5].pro).toEqual({ current: 0, target: 2 });
  });

  test.each(NEW_MISSIONS)(
    '$id at level $level: mission_pending without completion',
    ({ id, level, track }) => {
      // Build a completedMissions set that gets the user to the right level
      // but has NOT completed the target mission itself.
      // Easiest approach: mark every OTHER mission at levels 1..29 as done.
      const allExcept = season1.LEVELS.slice(0, 29)
        .flatMap(l => [l.freeMission?.id, l.proMission?.id])
        .filter(x => x && x !== id);

      const isPro   = track === 'pro';
      // Compute level with all except the target mission done
      const userLevel = computeUserLevel(allExcept, isPro);
      expect(userLevel).toBeGreaterThanOrEqual(level);

      const progress = buildProgress(allExcept);
      const lvlCfg   = season1.LEVELS[level - 1];
      const state    = computeCardState(lvlCfg, track, userLevel, [], isPro, progress);
      expect(state).toBe('mission_pending');
    },
  );
});

// ── 5. Level 30 lists include the 6 new missions ─────────────────────────────
describe('level 30 completion lists include new missions', () => {
  const allFreeIds = season1.LEVELS.slice(0, 29).filter(l => l.freeMission).map(l => l.freeMission.id);
  const allProIds  = season1.LEVELS.slice(0, 29).filter(l => l.proMission).map(l => l.proMission.id);

  test('free track list includes bp_s1_l6_free and bp_s1_l14_free', () => {
    expect(allFreeIds).toContain('bp_s1_l6_free');
    expect(allFreeIds).toContain('bp_s1_l14_free');
  });

  test('pro track list includes bp_s1_l5_pro, bp_s1_l11_pro, bp_s1_l17_pro, bp_s1_l26_pro', () => {
    expect(allProIds).toContain('bp_s1_l5_pro');
    expect(allProIds).toContain('bp_s1_l11_pro');
    expect(allProIds).toContain('bp_s1_l17_pro');
    expect(allProIds).toContain('bp_s1_l26_pro');
  });

  test('free track count is 14 (one per even level 2–28)', () => {
    expect(allFreeIds.length).toBe(14);
  });

  test('pro track count is 29 (one per level 1–29)', () => {
    expect(allProIds.length).toBe(29);
  });
});
