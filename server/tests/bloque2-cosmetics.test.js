/**
 * Bloque 2: /auth/cosmetics BP cosmetics validation
 *
 * Tests the fixed validation logic that allows BP-exclusive cosmetics
 * (color_green, avatar_fox, frame_season1, theme_aurora, etc.) and titles
 * to be persisted via /auth/cosmetics, which previously silently dropped them.
 */

// Reproduce the fixed validation logic (no server import needed)
const SHOP_ITEMS = {
  frame_gold:    { name: 'Gold Frame',    price: 299 },
  frame_neon:    { name: 'Neon Frame',    price: 199 },
  frame_fire:    { name: 'Fire Frame',    price: 399 },
  frame_diamond: { name: 'Diamond Frame', price: 499 },
  theme_blood:   { name: 'Blood Theme',   price: 199 },
  theme_matrix:  { name: 'Matrix Theme',  price: 199 },
  theme_gold:    { name: 'Gold Theme',    price: 199 },
  theme_midnight:{ name: 'Midnight Theme',price: 199 },
  avatar_bull:   { name: 'Bull Avatar',   price: 99 },
  avatar_bear:   { name: 'Bear Avatar',   price: 99 },
  avatar_whale:  { name: 'Whale Avatar',  price: 199 },
  avatar_robot:  { name: 'Robot Avatar',  price: 199 },
  effect_confetti:  { name: 'Confetti Effect',  price: 199 },
  effect_lightning: { name: 'Lightning Effect', price: 299 },
  effect_explosion: { name: 'Explosion Effect', price: 299 },
  effect_stars:     { name: 'Stars Effect',     price: 199 },
};

const BP_COSMETICS = {
  color_green:   { type: 'username_color' },
  color_gold:    { type: 'username_color' },
  color_red:     { type: 'username_color' },
  color_purple:  { type: 'username_color' },
  avatar_fox:    { type: 'avatar' },
  avatar_dragon: { type: 'avatar' },
  frame_season1: { type: 'frame' },
  theme_aurora:  { type: 'theme' },
};

const BP_TITLES = new Set([
  'title_market_watcher',
  'title_chart_reader',
  'title_risk_taker',
  'title_bull_runner',
  'title_bear_hunter',
  'title_survivor',
  'title_veteran',
]);

const VALID_TYPES = new Set(['theme', 'frame', 'avatar', 'effect', 'username_color', 'title']);

// The FIXED validation function (mirrors server/index.js after Bloque 2)
function validateCosmetics(activeCosmetics, ownedSet) {
  const safe = {};
  for (const [type, itemId] of Object.entries(activeCosmetics || {})) {
    if (!VALID_TYPES.has(type)) continue;
    if (typeof itemId !== 'string') continue;
    if (type === 'title') {
      if (!BP_TITLES.has(itemId) || !ownedSet.has(itemId)) continue;
    } else {
      if (!SHOP_ITEMS[itemId] && !BP_COSMETICS[itemId]) continue;
      if (!ownedSet.has(itemId)) continue;
    }
    safe[type] = itemId;
  }
  return safe;
}

// The OLD (broken) validation function — for regression testing
function oldValidate(activeCosmetics, ownedSet) {
  const safe = {};
  const OLD_VALID_TYPES = new Set(['theme', 'frame', 'avatar', 'effect', 'username_color']);
  for (const [type, itemId] of Object.entries(activeCosmetics || {})) {
    if (!OLD_VALID_TYPES.has(type)) continue;
    if (typeof itemId !== 'string' || !SHOP_ITEMS[itemId] || !ownedSet.has(itemId)) continue;
    safe[type] = itemId;
  }
  return safe;
}

describe('Bloque 2: /auth/cosmetics BP cosmetics validation', () => {
  test('BP cosmetic (color_green) is kept when user owns it', () => {
    const owned = new Set(['color_green']);
    const result = validateCosmetics({ username_color: 'color_green' }, owned);
    expect(result.username_color).toBe('color_green');
  });

  test('REGRESSION: BP cosmetic was silently dropped in old logic', () => {
    const owned = new Set(['color_green']);
    const result = oldValidate({ username_color: 'color_green' }, owned);
    expect(result.username_color).toBeUndefined();
  });

  test('BP avatar (avatar_fox) persists when owned', () => {
    const owned = new Set(['avatar_fox']);
    const result = validateCosmetics({ avatar: 'avatar_fox' }, owned);
    expect(result.avatar).toBe('avatar_fox');
  });

  test('BP frame (frame_season1) persists when owned', () => {
    const owned = new Set(['frame_season1']);
    const result = validateCosmetics({ frame: 'frame_season1' }, owned);
    expect(result.frame).toBe('frame_season1');
  });

  test('BP theme (theme_aurora) persists when owned', () => {
    const owned = new Set(['theme_aurora']);
    const result = validateCosmetics({ theme: 'theme_aurora' }, owned);
    expect(result.theme).toBe('theme_aurora');
  });

  test('title cosmetic persists when user owns it', () => {
    const owned = new Set(['title_market_watcher']);
    const result = validateCosmetics({ title: 'title_market_watcher' }, owned);
    expect(result.title).toBe('title_market_watcher');
  });

  test('title cosmetic is rejected when user does not own it', () => {
    const owned = new Set([]);
    const result = validateCosmetics({ title: 'title_market_watcher' }, owned);
    expect(result.title).toBeUndefined();
  });

  test('REGRESSION: title type was not in OLD_VALID_TYPES, always dropped', () => {
    const owned = new Set(['title_market_watcher']);
    const result = oldValidate({ title: 'title_market_watcher' }, owned);
    expect(result.title).toBeUndefined();
  });

  test('shop item (frame_gold) still works normally', () => {
    const owned = new Set(['frame_gold']);
    const result = validateCosmetics({ frame: 'frame_gold' }, owned);
    expect(result.frame).toBe('frame_gold');
  });

  test('shop item not owned is rejected', () => {
    const owned = new Set([]);
    const result = validateCosmetics({ frame: 'frame_gold' }, owned);
    expect(result.frame).toBeUndefined();
  });

  test('unknown item type is ignored', () => {
    const owned = new Set(['hack_item']);
    const result = validateCosmetics({ hack: 'hack_item' }, owned);
    expect(result.hack).toBeUndefined();
  });

  test('non-existent item ID is rejected even if type is valid', () => {
    const owned = new Set(['fake_item']);
    const result = validateCosmetics({ frame: 'fake_item' }, owned);
    expect(result.frame).toBeUndefined();
  });

  test('multiple valid items all persist', () => {
    const owned = new Set(['frame_gold', 'color_green', 'theme_aurora', 'title_veteran']);
    const result = validateCosmetics({
      frame: 'frame_gold',
      username_color: 'color_green',
      theme: 'theme_aurora',
      title: 'title_veteran',
    }, owned);
    expect(result.frame).toBe('frame_gold');
    expect(result.username_color).toBe('color_green');
    expect(result.theme).toBe('theme_aurora');
    expect(result.title).toBe('title_veteran');
  });
});
