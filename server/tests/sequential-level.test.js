/**
 * sequential-level.test.js
 *
 * Unit tests for computeUserLevel — the new sequential, mission-based level
 * system that replaced the old bpPoints / 300 formula.
 *
 * computeUserLevel(completedMissions, isPro) → number 1–30
 *
 * Rules:
 *   Free user: freeMission required per level (if null → auto-pass that level).
 *   Pro  user: both freeMission AND proMission required (those that exist).
 *   Trading Mode missions (enabled:false) still block, like any other mission.
 *
 * Level structure (relevant levels):
 *   Level 1:  freeMission=null,          proMission=L1_PRO
 *   Level 2:  freeMission=L2_FREE,       proMission=L2_PRO
 *   Level 3:  freeMission=null,          proMission=L3_PRO
 *   Level 4:  freeMission=L4_FREE,       proMission=L4_PRO
 *   Level 5:  freeMission=null,          proMission=L5_PRO  (enabled:false)
 *   Level 6:  freeMission=L6_FREE (disabled), proMission=L6_PRO
 *
 * Free user base level (no missions):
 *   Level 1 auto-passes (no freeMission) → level 2 is the starting frontier.
 *   Level 3 auto-passes similarly → level 4 frontier after completing L2_FREE.
 *   Level 5 auto-passes → level 6 frontier after completing L4_FREE.
 *   Level 6 has a disabled freeMission → blocks there until Trading Mode activates.
 */

const { computeUserLevel } = require('../routes/battlepass');

const L1_PRO  = 'bp_s1_l1_pro';
const L2_FREE = 'bp_s1_l2_free';
const L2_PRO  = 'bp_s1_l2_pro';
const L3_PRO  = 'bp_s1_l3_pro';
const L4_FREE = 'bp_s1_l4_free';
const L4_PRO  = 'bp_s1_l4_pro';
const L5_PRO  = 'bp_s1_l5_pro';   // Trading Mode — enabled:false
const L6_FREE = 'bp_s1_l6_free';  // Trading Mode — enabled:false
const L6_PRO  = 'bp_s1_l6_pro';

// ─── Test suite ─────────────────────────────────────────────────────────────

describe('computeUserLevel — sequential mission-based level system', () => {

  // ── 1. Free user advances level by level ──────────────────────────────────
  describe('Free user — advances strictly via freeMissions', () => {
    test('no missions completed → level 2 (level 1 auto-passes — it has no freeMission)', () => {
      // Level 1 has freeMission=null → auto-passes for Free user.
      // Level 2 requires L2_FREE which is NOT done → blocked at frontier level 2.
      expect(computeUserLevel([], false)).toBe(2);
    });

    test('completing L2_FREE → frontier becomes level 4 (level 3 auto-passes too)', () => {
      // Level 1: auto-pass. Level 2: L2_FREE done → passes.
      // Level 3: no freeMission → auto-pass. Level 4: L4_FREE missing → blocked.
      expect(computeUserLevel([L2_FREE], false)).toBe(4);
    });

    test('completing L2_FREE + L4_FREE → frontier becomes level 6 (level 5 auto-passes)', () => {
      // Levels 1 (auto), 2 (done), 3 (auto), 4 (done), 5 (auto) all pass.
      // Level 6 has a disabled freeMission (Trading Mode) → blocked at frontier 6.
      expect(computeUserLevel([L2_FREE, L4_FREE], false)).toBe(6);
    });

    test('completing only L4_FREE without L2_FREE → still blocked at frontier 2', () => {
      // Level 1 auto-passes. Level 2: L2_FREE NOT done → break immediately.
      // L4_FREE being complete doesn't help because the chain breaks at level 2.
      expect(computeUserLevel([L4_FREE], false)).toBe(2);
    });

    test('mission order in array is irrelevant — same result as sequential order', () => {
      expect(computeUserLevel([L4_FREE, L2_FREE], false)).toBe(6);
    });

    test('proMission IDs in completedMissions do NOT advance a Free user', () => {
      // Free user has L2_PRO done (e.g., from before upgrade) but not L2_FREE.
      // Level 1 auto-passes. Level 2: L2_FREE missing → blocked at 2.
      expect(computeUserLevel([L2_PRO], false)).toBe(2);
    });
  });

  // ── 2. Pro user needs both missions per level ──────────────────────────────
  describe('Pro user — needs freeMission AND proMission per level', () => {
    test('no missions → level 1 (immediately blocked by L1_PRO at level 1)', () => {
      // Level 1: freeMission=null (free ok), proMission=L1_PRO not done → block.
      expect(computeUserLevel([], true)).toBe(1);
    });

    test('L1_PRO done → level 2 (both satisfied: free=auto, pro=done)', () => {
      expect(computeUserLevel([L1_PRO], true)).toBe(2);
    });

    test('level 2 needs both — only L2_FREE done → stays at level 2', () => {
      expect(computeUserLevel([L1_PRO, L2_FREE], true)).toBe(2);
    });

    test('level 2 needs both — only L2_PRO done → stays at level 2', () => {
      expect(computeUserLevel([L1_PRO, L2_PRO], true)).toBe(2);
    });

    test('level 2: both L2_FREE + L2_PRO done → advances to level 3', () => {
      expect(computeUserLevel([L1_PRO, L2_FREE, L2_PRO], true)).toBe(3);
    });

    test('level 3 has no freeMission — completing L3_PRO (after levels 1–2) → level 4', () => {
      expect(computeUserLevel([L1_PRO, L2_FREE, L2_PRO, L3_PRO], true)).toBe(4);
    });

    test('level 4: partial — only L4_FREE done → stays at level 4', () => {
      const throughL3 = [L1_PRO, L2_FREE, L2_PRO, L3_PRO];
      expect(computeUserLevel([...throughL3, L4_FREE], true)).toBe(4);
    });

    test('level 4: partial — only L4_PRO done → stays at level 4', () => {
      const throughL3 = [L1_PRO, L2_FREE, L2_PRO, L3_PRO];
      expect(computeUserLevel([...throughL3, L4_PRO], true)).toBe(4);
    });

    test('level 4: both L4_FREE + L4_PRO done → level 5', () => {
      const throughL4 = [L1_PRO, L2_FREE, L2_PRO, L3_PRO, L4_FREE, L4_PRO];
      expect(computeUserLevel(throughL4, true)).toBe(5);
    });
  });

  // ── 3. Free→Pro upgrade mid-way ───────────────────────────────────────────
  describe('Free→Pro upgrade mid-way', () => {
    test('as Free, [L2_FREE, L4_FREE] → level 6; after Pro upgrade → recalculates to level 1 (L1_PRO never done)', () => {
      // The spec allows level to drop on upgrade (recálculo natural).
      // As Free: levels 1(auto),2,3(auto),4,5(auto) pass → frontier 6 (blocked by disabled L6_FREE).
      // As Pro:  level 1 needs L1_PRO which was never completed → blocked at 1.
      const freeOnlyMissions = [L2_FREE, L4_FREE];
      expect(computeUserLevel(freeOnlyMissions, false)).toBe(6);
      expect(computeUserLevel(freeOnlyMissions, true)).toBe(1);
    });

    test('after upgrade, completing missing pro missions resumes advancement', () => {
      // User had L2_FREE from Free days. After Pro upgrade, they complete L1_PRO + L2_PRO.
      // Level 1: L1_PRO ✓ → pass. Level 2: L2_FREE + L2_PRO ✓ → pass.
      // Level 3: L3_PRO missing → stuck at level 3.
      const missions = [L2_FREE, L1_PRO, L2_PRO];
      expect(computeUserLevel(missions, true)).toBe(3);
    });

    test('partial pro missions after upgrade — advances only as far as both are done', () => {
      // Has L1_PRO, L2_FREE, L2_PRO, L3_PRO, L4_FREE but NOT L4_PRO.
      // Through level 3: all done. Level 4: L4_PRO missing → stuck at level 4.
      const missions = [L1_PRO, L2_FREE, L2_PRO, L3_PRO, L4_FREE];
      expect(computeUserLevel(missions, true)).toBe(4);
    });
  });

  // ── 4. Trading Mode missions (enabled:false) block advancement ─────────────
  describe('Trading Mode missions (enabled:false) block advancement', () => {
    test('Free user: levels 1–5 pass but blocked at frontier 6 by disabled L6_FREE', () => {
      // Levels 1 (auto), 2 (L2_FREE), 3 (auto), 4 (L4_FREE), 5 (auto) all pass.
      // Level 6 freeMission = L6_FREE which is disabled and NOT completed → block.
      const throughL4Free = [L2_FREE, L4_FREE];
      expect(computeUserLevel(throughL4Free, false)).toBe(6);
    });

    test('Free user advances past level 6 once the disabled mission is completed', () => {
      // After Trading Mode activates and user completes L6_FREE:
      // Level 6 passes. Level 7 has no freeMission (auto). Level 8 needs L8_FREE (not done).
      const missions = [L2_FREE, L4_FREE, L6_FREE];
      expect(computeUserLevel(missions, false)).toBe(8);
    });

    test('Pro user blocked at frontier 5 by disabled L5_PRO', () => {
      // All through level 4 done for Pro. Level 5: freeMission=null (ok), L5_PRO disabled and not done → block.
      const throughL4Pro = [L1_PRO, L2_FREE, L2_PRO, L3_PRO, L4_FREE, L4_PRO];
      expect(computeUserLevel(throughL4Pro, true)).toBe(5);
    });

    test('Pro user advances past level 5 once the disabled mission is completed', () => {
      const missions = [L1_PRO, L2_FREE, L2_PRO, L3_PRO, L4_FREE, L4_PRO, L5_PRO];
      // Level 5 done. Level 6: L6_FREE (disabled, not done) → blocked at 6.
      expect(computeUserLevel(missions, true)).toBe(6);
    });
  });

  // ── 5. Regression: level never exceeds 30 ─────────────────────────────────
  describe('Regression: level cap at 30', () => {
    test('with every mission ID from levels 1–30, level is exactly 30', () => {
      const season1 = require('../config/season1');
      const allIds = [];
      for (const lvl of season1.LEVELS) {
        if (lvl.freeMission) allIds.push(lvl.freeMission.id);
        if (lvl.proMission)  allIds.push(lvl.proMission.id);
      }
      expect(computeUserLevel(allIds, true)).toBe(30);
      expect(computeUserLevel(allIds, false)).toBe(30);
    });

    test('Free user with all freeMissions from levels 1–29 reaches level 30', () => {
      const season1 = require('../config/season1');
      const freeIds = season1.LEVELS.slice(0, 29)
        .filter(l => l.freeMission)
        .map(l => l.freeMission.id);
      expect(computeUserLevel(freeIds, false)).toBe(30);
    });
  });
});
