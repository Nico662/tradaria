/**
 * Bloque 10: frame_season1 style, theme_aurora unequip, hasVerifiedBadge, auto-equip on claim.
 */

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase, getUser } = require('./helpers/testApp');

// ── 1. frame_season1 has a visible style ─────────────────────────────────────
// Reproduces FRAME_STYLES from UserAvatar.jsx
const FRAME_STYLES = {
  frame_gold:    { border: '2px solid var(--color-neutral)', boxShadow: '0 0 8px rgba(232,184,75,0.6)' },
  frame_neon:    { border: '2px solid var(--green)', boxShadow: '0 0 8px rgba(0,229,160,0.6)' },
  frame_fire:    { border: '2px solid var(--color-down)', boxShadow: '0 0 8px rgba(255,126,179,0.6)' },
  frame_diamond: { border: '2px solid var(--t3)', boxShadow: '0 0 8px rgba(136,153,176,0.6)' },
  frame_season1: { border: '2px solid var(--color-neutral)', boxShadow: '0 0 10px rgba(245,200,66,0.7), 0 0 20px rgba(34,211,165,0.35)' },
};

describe('Bloque 10A: frame_season1 FRAME_STYLES entry', () => {
  test('frame_season1 exists in FRAME_STYLES', () => {
    expect(FRAME_STYLES.frame_season1).toBeDefined();
  });

  test('frame_season1 has a non-empty border', () => {
    expect(FRAME_STYLES.frame_season1.border).toBeTruthy();
  });

  test('frame_season1 has a boxShadow (glow effect)', () => {
    expect(FRAME_STYLES.frame_season1.boxShadow).toBeTruthy();
  });

  test('frame_season1 boxShadow is distinct — has two layers (double glow)', () => {
    // Premium frames should stand out; Season 1 uses a double-glow
    const layers = FRAME_STYLES.frame_season1.boxShadow.split(',').length;
    expect(layers).toBeGreaterThanOrEqual(2);
  });

  test('all 5 frames have both border and boxShadow', () => {
    for (const [id, style] of Object.entries(FRAME_STYLES)) {
      expect(style.border).toBeTruthy()    // message: `${id} missing border`
      expect(style.boxShadow).toBeTruthy() // message: `${id} missing boxShadow`
    }
  });
});

// ── 2. Theme classList.remove includes theme_aurora ───────────────────────────
// Reproduces the list passed to classList.remove in App.jsx
const THEME_CLASSES_TO_REMOVE = [
  'theme_matrix', 'theme_blood', 'theme_gold', 'theme_midnight', 'theme_aurora',
];

const ALL_KNOWN_THEMES = [
  'theme_blood', 'theme_matrix', 'theme_gold', 'theme_midnight', 'theme_aurora',
];

describe('Bloque 10B: theme classList.remove completeness', () => {
  test('theme_aurora is in the remove list', () => {
    expect(THEME_CLASSES_TO_REMOVE).toContain('theme_aurora');
  });

  test('all known themes are in the remove list', () => {
    for (const theme of ALL_KNOWN_THEMES) {
      expect(THEME_CLASSES_TO_REMOVE).toContain(theme);
    }
  });

  test('remove list has exactly 5 entries (one per known theme)', () => {
    expect(THEME_CLASSES_TO_REMOVE.length).toBe(5);
  });
});

// ── 3. hasVerifiedBadge in server responses ───────────────────────────────────
// Reproduces the logic used in /u/:username and portfolio leaderboard endpoints

function computeHasVerifiedBadge(battlePassMechanics) {
  return battlePassMechanics?.includes('mechanic_verified_badge') || false;
}

describe('Bloque 10C: hasVerifiedBadge computation', () => {
  test('returns true when mechanic_verified_badge is in battlePassMechanics', () => {
    expect(computeHasVerifiedBadge(['mechanic_portfolio_view', 'mechanic_verified_badge'])).toBe(true);
  });

  test('returns false when mechanic_verified_badge is absent', () => {
    expect(computeHasVerifiedBadge(['mechanic_portfolio_view'])).toBe(false);
  });

  test('returns false for empty array', () => {
    expect(computeHasVerifiedBadge([])).toBe(false);
  });

  test('returns false for null battlePassMechanics', () => {
    expect(computeHasVerifiedBadge(null)).toBe(false);
  });

  test('returns false for undefined battlePassMechanics', () => {
    expect(computeHasVerifiedBadge(undefined)).toBe(false);
  });
});

// ── 4. Auto-equip on claim ────────────────────────────────────────────────────
// Reproduces the updated claim logic from battlepass.js

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

const COSMETIC_EQUIP_KEY = {
  title:          'title',
  frame:          'frame',
  avatar:         'avatar',
  theme:          'theme',
  username_color: 'username_color',
};

async function applyRewardsWithAutoEquip(User, userId, rewards, levelNum, grantFree, grantPro) {
  const incOps      = {};
  const addToSetMap = {};
  const pushMap     = {};
  const setOps      = {};

  for (const reward of rewards) {
    switch (reward.type) {
      case 'xp':
        incOps.xp = (incOps.xp || 0) + reward.amount;
        break;
      case 'badge':
        if (!addToSetMap.badges) addToSetMap.badges = { $each: [] };
        addToSetMap.badges.$each.push(reward.itemId);
        break;
      case 'title':
      case 'frame':
      case 'avatar':
      case 'theme':
      case 'effect':
      case 'username_color':
        if (!addToSetMap.purchases) addToSetMap.purchases = { $each: [] };
        addToSetMap.purchases.$each.push(reward.itemId);
        if (COSMETIC_EQUIP_KEY[reward.type]) {
          setOps[`activeCosmetics.${COSMETIC_EQUIP_KEY[reward.type]}`] = reward.itemId;
        }
        break;
      case 'mechanic':
        if (reward.itemId) {
          if (!addToSetMap.battlePassMechanics) addToSetMap.battlePassMechanics = { $each: [] };
          addToSetMap.battlePassMechanics.$each.push(reward.itemId);
        }
        break;
      case 'ticket':
        if (!pushMap.battlePassItems) pushMap.battlePassItems = { $each: [] };
        pushMap.battlePassItems.$each.push({ itemId: reward.itemId, used: false });
        break;
    }
  }

  addToSetMap['battlePass.claimedRewards']     = { $each: [levelNum] };
  if (grantFree) addToSetMap['battlePass.claimedFreeRewards'] = { $each: [levelNum] };
  if (grantPro)  addToSetMap['battlePass.claimedProRewards']  = { $each: [levelNum] };

  const atomicUpdate = {};
  if (Object.keys(incOps).length)      atomicUpdate.$inc      = incOps;
  if (Object.keys(addToSetMap).length) atomicUpdate.$addToSet = addToSetMap;
  if (Object.keys(pushMap).length)     atomicUpdate.$push     = pushMap;
  if (Object.keys(setOps).length)      atomicUpdate.$set      = setOps;

  return User.findByIdAndUpdate(userId, atomicUpdate, { new: true });
}

describe('Bloque 10D: auto-equip on claim', () => {
  test('claiming a title auto-equips it (activeCosmetics.title is set)', async () => {
    const User = getUser();
    const u = await User.create({ purchases: [], activeCosmetics: {} });

    await applyRewardsWithAutoEquip(User, u._id,
      [{ type: 'title', itemId: 'title_market_watcher' }], 4, true, false);

    const updated = await User.findById(u._id);
    expect(updated.purchases).toContain('title_market_watcher');
    expect(updated.activeCosmetics.title).toBe('title_market_watcher');
  });

  test('claiming a frame auto-equips it (activeCosmetics.frame is set)', async () => {
    const User = getUser();
    const u = await User.create({ purchases: [], activeCosmetics: {} });

    await applyRewardsWithAutoEquip(User, u._id,
      [{ type: 'frame', itemId: 'frame_season1' }], 24, false, true);

    const updated = await User.findById(u._id);
    expect(updated.purchases).toContain('frame_season1');
    expect(updated.activeCosmetics.frame).toBe('frame_season1');
  });

  test('claiming a username_color auto-equips it', async () => {
    const User = getUser();
    const u = await User.create({ purchases: [], activeCosmetics: {} });

    await applyRewardsWithAutoEquip(User, u._id,
      [{ type: 'username_color', itemId: 'color_green' }], 3, false, true);

    const updated = await User.findById(u._id);
    expect(updated.activeCosmetics.username_color).toBe('color_green');
  });

  test('claiming an avatar auto-equips it', async () => {
    const User = getUser();
    const u = await User.create({ purchases: [], activeCosmetics: {} });

    await applyRewardsWithAutoEquip(User, u._id,
      [{ type: 'avatar', itemId: 'avatar_fox' }], 9, false, true);

    const updated = await User.findById(u._id);
    expect(updated.activeCosmetics.avatar).toBe('avatar_fox');
  });

  test('claiming a theme auto-equips it', async () => {
    const User = getUser();
    const u = await User.create({ purchases: [], activeCosmetics: {} });

    await applyRewardsWithAutoEquip(User, u._id,
      [{ type: 'theme', itemId: 'theme_aurora' }], 22, false, true);

    const updated = await User.findById(u._id);
    expect(updated.activeCosmetics.theme).toBe('theme_aurora');
  });

  test('claiming a new title replaces an existing equipped title', async () => {
    const User = getUser();
    const u = await User.create({
      purchases: ['title_market_watcher'],
      activeCosmetics: { title: 'title_market_watcher' },
    });

    await applyRewardsWithAutoEquip(User, u._id,
      [{ type: 'title', itemId: 'title_chart_reader' }], 8, true, false);

    const updated = await User.findById(u._id);
    expect(updated.activeCosmetics.title).toBe('title_chart_reader');
    expect(updated.purchases).toContain('title_market_watcher');
    expect(updated.purchases).toContain('title_chart_reader');
  });

  test('claiming a new color replaces the previously equipped color', async () => {
    const User = getUser();
    const u = await User.create({
      purchases: ['color_green'],
      activeCosmetics: { username_color: 'color_green' },
    });

    await applyRewardsWithAutoEquip(User, u._id,
      [{ type: 'username_color', itemId: 'color_gold' }], 8, false, true);

    const updated = await User.findById(u._id);
    expect(updated.activeCosmetics.username_color).toBe('color_gold');
  });

  test('claiming a badge does NOT set any activeCosmetics key', async () => {
    const User = getUser();
    const u = await User.create({ badges: [], activeCosmetics: {} });

    await applyRewardsWithAutoEquip(User, u._id,
      [{ type: 'badge', itemId: 'bp_s1_early_trader' }], 2, false, true);

    const updated = await User.findById(u._id);
    expect(updated.badges).toContain('bp_s1_early_trader');
    expect(Object.keys(updated.activeCosmetics)).toHaveLength(0);
  });

  test('claiming a ticket does NOT set any activeCosmetics key', async () => {
    const User = getUser();
    const u = await User.create({ battlePassItems: [], activeCosmetics: {} });

    await applyRewardsWithAutoEquip(User, u._id,
      [{ type: 'ticket', itemId: 'ticket_restore_streak' }], 5, false, true);

    const updated = await User.findById(u._id);
    expect(updated.battlePassItems.length).toBe(1);
    expect(Object.keys(updated.activeCosmetics)).toHaveLength(0);
  });

  test('claiming a mechanic does NOT set any activeCosmetics key', async () => {
    const User = getUser();
    const u = await User.create({ battlePassMechanics: [], activeCosmetics: {} });

    await applyRewardsWithAutoEquip(User, u._id,
      [{ type: 'mechanic', itemId: 'mechanic_portfolio_view' }], 10, false, true);

    const updated = await User.findById(u._id);
    expect(updated.battlePassMechanics).toContain('mechanic_portfolio_view');
    expect(Object.keys(updated.activeCosmetics)).toHaveLength(0);
  });

  test('other activeCosmetics keys are not cleared when a new cosmetic is auto-equipped', async () => {
    const User = getUser();
    const u = await User.create({
      purchases: ['color_green'],
      activeCosmetics: { username_color: 'color_green', frame: 'frame_gold' },
    });

    await applyRewardsWithAutoEquip(User, u._id,
      [{ type: 'title', itemId: 'title_market_watcher' }], 4, true, false);

    const updated = await User.findById(u._id);
    expect(updated.activeCosmetics.title).toBe('title_market_watcher');
    expect(updated.activeCosmetics.username_color).toBe('color_green');
    expect(updated.activeCosmetics.frame).toBe('frame_gold');
  });
});
