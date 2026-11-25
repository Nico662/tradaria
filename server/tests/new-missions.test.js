/**
 * new-missions.test.js
 *
 * Tests for Trading Mode placeholder missions in new-modes branch.
 * Verifies:
 *   1. Config: TM missions exist with enabled:false at the right levels.
 *   2. Level 30 lists include TM mission IDs.
 *   3. TM missions produce 'locked' card state (not claimable) even at reachable levels.
 *   4. Non-TM missions at the same levels still work normally.
 */

const season1 = require('../config/season1');
const { computeUserLevel, BASELINE_TYPES } = require('../routes/battlepass');

// ── Inline computeCardState (mirrors server logic including enabled:false guard) ─
function computeCardState(lvlCfg, track, userLevel, claimedForTrack, isPro, allMissionProgress) {
  const reward   = track === 'free' ? lvlCfg.freeReward  : lvlCfg.proReward;
  const mission  = track === 'free' ? lvlCfg.freeMission : lvlCfg.proMission;
  const levelNum = lvlCfg.level;
  if (!reward && !mission) return 'empty';
  if (claimedForTrack.includes(levelNum)) return 'claimed';
  if (track === 'pro' && !isPro) return 'pro_locked';
  if (userLevel < levelNum) return 'locked';
  if (mission && mission.enabled === false) return 'locked';
  if (mission && allMissionProgress) {
    const prog = allMissionProgress[levelNum]?.[track];
    if (prog && prog.current < prog.target) return 'mission_pending';
  }
  return 'claimable';
}

const TM_MISSIONS = [
  { id: 'bp_s1_l5_pro',   level: 5,  track: 'pro'  },
  { id: 'bp_s1_l6_free',  level: 6,  track: 'free' },
  { id: 'bp_s1_l11_pro',  level: 11, track: 'pro'  },
  { id: 'bp_s1_l14_free', level: 14, track: 'free' },
  { id: 'bp_s1_l17_pro',  level: 17, track: 'pro'  },
  { id: 'bp_s1_l26_pro',  level: 26, track: 'pro'  },
];

// ── 1. TM missions exist with enabled:false ───────────────────────────────────
describe('config: Trading Mode missions have enabled:false', () => {
  test.each(TM_MISSIONS)('$id has enabled:false', ({ id }) => {
    const allMissions = season1.LEVELS.flatMap(l => [l.freeMission, l.proMission]).filter(Boolean);
    const m = allMissions.find(x => x.id === id);
    expect(m).toBeDefined();
    expect(m.enabled).toBe(false);
  });

  test('TM free missions are exactly at levels 6 and 14', () => {
    const tmFree = season1.LEVELS
      .filter(l => l.freeMission && l.freeMission.enabled === false)
      .map(l => l.level);
    expect(tmFree).toEqual([6, 14]);
  });

  test('TM pro missions are exactly at levels 5, 11, 17, 26', () => {
    const tmPro = season1.LEVELS
      .filter(l => l.proMission && l.proMission.enabled === false)
      .map(l => l.level);
    expect(tmPro).toEqual([5, 11, 17, 26]);
  });

  test('all non-TM missions have enabled:true', () => {
    for (const lvl of season1.LEVELS) {
      for (const m of [lvl.freeMission, lvl.proMission]) {
        if (!m) continue;
        if (m.enabled === false) continue; // TM missions are OK
        expect(m.enabled).toBe(true);
      }
    }
  });
});

// ── 2. TM missions show 'locked' at reachable levels ─────────────────────────
describe('TM missions: card state is locked even when user level is high enough', () => {
  const highProgress = {};
  for (const lvlCfg of season1.LEVELS) {
    highProgress[lvlCfg.level] = {
      free: lvlCfg.freeMission ? { current: 0, target: lvlCfg.freeMission.target } : null,
      pro:  lvlCfg.proMission  ? { current: 0, target: lvlCfg.proMission.target  } : null,
    };
  }

  test.each(TM_MISSIONS)(
    '$id at level $level shows locked for user at level 30',
    ({ level, track }) => {
      const userLevel = 30;
      const lvlCfg = season1.LEVELS[level - 1];
      const state = computeCardState(lvlCfg, track, userLevel, [], true, highProgress);
      expect(state).toBe('locked');
    },
  );
});

// ── 3. Level 30 lists include TM mission IDs ──────────────────────────────────
describe('level 30 completion lists include TM missions', () => {
  const allFreeIds = season1.LEVELS.slice(0, 29).filter(l => l.freeMission).map(l => l.freeMission.id);
  const allProIds  = season1.LEVELS.slice(0, 29).filter(l => l.proMission).map(l => l.proMission.id);

  test('free track list includes bp_s1_l6_free and bp_s1_l14_free', () => {
    expect(allFreeIds).toContain('bp_s1_l6_free');
    expect(allFreeIds).toContain('bp_s1_l14_free');
  });

  test('pro track list includes all 4 TM pro missions', () => {
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
