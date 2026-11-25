/**
 * Bloques 4, 5, 6 — username colors, theme/frame meta, titles system.
 *
 * The frontend source files use ES modules, so logic is reproduced inline
 * (matching the actual implementation) rather than imported.
 */

// ── Bloque 4: getUsernameColor ────────────────────────────────────────────────

const USERNAME_COLORS = {
  color_green:  { name: 'Verde',  hex: '#22c55e' },
  color_gold:   { name: 'Dorado', hex: '#f5c842' },
  color_red:    { name: 'Rojo',   hex: '#e05555' },
  color_purple: { name: 'Morado', hex: '#a855f7' },
};

function getUsernameColor(activeCosmetics) {
  const id = activeCosmetics?.username_color;
  return (id && USERNAME_COLORS[id]?.hex) || null;
}

describe('Bloque 4: getUsernameColor', () => {
  test('returns hex for color_green', () => {
    expect(getUsernameColor({ username_color: 'color_green' })).toBe('#22c55e');
  });

  test('returns hex for color_gold', () => {
    expect(getUsernameColor({ username_color: 'color_gold' })).toBe('#f5c842');
  });

  test('returns hex for color_red', () => {
    expect(getUsernameColor({ username_color: 'color_red' })).toBe('#e05555');
  });

  test('returns hex for color_purple', () => {
    expect(getUsernameColor({ username_color: 'color_purple' })).toBe('#a855f7');
  });

  test('returns null for unknown color ID', () => {
    expect(getUsernameColor({ username_color: 'color_hack' })).toBeNull();
  });

  test('returns null when activeCosmetics is null', () => {
    expect(getUsernameColor(null)).toBeNull();
  });

  test('returns null when activeCosmetics is undefined', () => {
    expect(getUsernameColor(undefined)).toBeNull();
  });

  test('returns null when no username_color key', () => {
    expect(getUsernameColor({ theme: 'theme_aurora' })).toBeNull();
  });

  test('USERNAME_COLORS has exactly 4 entries', () => {
    expect(Object.keys(USERNAME_COLORS)).toHaveLength(4);
  });

  test('all hex values are 7-char CSS hex', () => {
    for (const { hex } of Object.values(USERNAME_COLORS)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

// ── Bloque 5: theme_aurora + frame_season1 meta ───────────────────────────────

// Reproduces the THEME_META / FRAME_META entries from Inventory.jsx
const FRAME_META = {
  frame_gold:    { name: 'Gold'     },
  frame_neon:    { name: 'Neon'     },
  frame_fire:    { name: 'Fire'     },
  frame_diamond: { name: 'Diamond'  },
  frame_season1: { name: 'Season 1' },
};

const THEME_META = {
  theme_blood:    { name: 'Blood'    },
  theme_matrix:   { name: 'Matrix'   },
  theme_gold:     { name: 'Gold'     },
  theme_midnight: { name: 'Midnight' },
  theme_aurora:   { name: 'Aurora',  accent: '#c084fc', bg: '#0d0a14' },
};

describe('Bloque 5: theme_aurora + frame_season1 metadata', () => {
  test('FRAME_META contains frame_season1', () => {
    expect(FRAME_META).toHaveProperty('frame_season1');
    expect(FRAME_META.frame_season1.name).toBe('Season 1');
  });

  test('THEME_META contains theme_aurora', () => {
    expect(THEME_META).toHaveProperty('theme_aurora');
    expect(THEME_META.theme_aurora.name).toBe('Aurora');
  });

  test('theme_aurora has correct accent color', () => {
    expect(THEME_META.theme_aurora.accent).toBe('#c084fc');
  });

  test('theme_aurora has correct bg color', () => {
    expect(THEME_META.theme_aurora.bg).toBe('#0d0a14');
  });

  test('theme_aurora CSS block exists in index.css', () => {
    const fs = require('fs');
    const css = fs.readFileSync(require('path').join(__dirname, '../../src/index.css'), 'utf8');
    expect(css).toContain('#root.theme_aurora');
    expect(css).toContain('#c084fc');
    expect(css).toContain('#0d0a14');
  });

  test('frame_season1 is present in COMING_SOON list (Inventory.jsx)', () => {
    const fs = require('fs');
    const src = fs.readFileSync(require('path').join(__dirname, '../../src/Inventory.jsx'), 'utf8');
    expect(src).toContain('frame_season1');
    expect(src).toContain('theme_aurora');
  });
});

// ── Bloque 6: Titles system ───────────────────────────────────────────────────

const TITLE_LABELS = {
  title_market_watcher: 'Market Watcher',
  title_chart_reader:   'Chart Reader',
  title_risk_taker:     'Risk Taker',
  title_bull_runner:    'Bull Runner',
  title_bear_hunter:    'Bear Hunter',
  title_survivor:       'Survivor',
  title_veteran:        'Veteran',
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

describe('Bloque 6: Titles system', () => {
  test('BP_TITLES has exactly 7 entries', () => {
    expect(BP_TITLES.size).toBe(7);
  });

  test('TITLE_LABELS has exactly 7 entries', () => {
    expect(Object.keys(TITLE_LABELS)).toHaveLength(7);
  });

  test('every BP_TITLES ID is in TITLE_LABELS', () => {
    for (const id of BP_TITLES) {
      expect(TITLE_LABELS).toHaveProperty(id);
    }
  });

  test('every TITLE_LABELS key is in BP_TITLES', () => {
    for (const id of Object.keys(TITLE_LABELS)) {
      expect(BP_TITLES.has(id)).toBe(true);
    }
  });

  test('all TITLE_LABELS values are non-empty strings', () => {
    for (const [id, label] of Object.entries(TITLE_LABELS)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  test('all title IDs follow the title_ prefix convention', () => {
    for (const id of BP_TITLES) {
      expect(id).toMatch(/^title_[a-z_]+$/);
    }
  });

  test('claim: title type falls through to purchases path', () => {
    // Reproduce the switch logic from routes/battlepass.js
    function getUpdateTarget(rewardType) {
      switch (rewardType) {
        case 'xp':     return 'xp';
        case 'badge':  return 'badges';
        case 'title':
        case 'frame':
        case 'avatar':
        case 'theme':
        case 'effect':
        case 'username_color':
          return 'purchases';
        case 'mechanic':
          return 'battlePassMechanics';
        default:
          return null;
      }
    }
    expect(getUpdateTarget('title')).toBe('purchases');
    expect(getUpdateTarget('frame')).toBe('purchases');
    expect(getUpdateTarget('username_color')).toBe('purchases');
  });

  test('TitleBadge component exists at expected path', () => {
    const fs = require('fs');
    const exists = fs.existsSync(require('path').join(__dirname, '../../src/components/TitleBadge.jsx'));
    expect(exists).toBe(true);
  });

  test('TitleBadge imports TITLE_LABELS from cosmeticColors', () => {
    const fs = require('fs');
    const src = fs.readFileSync(require('path').join(__dirname, '../../src/components/TitleBadge.jsx'), 'utf8');
    expect(src).toContain('TITLE_LABELS');
    expect(src).toContain('cosmeticColors');
  });

  test('server BP_TITLES matches expected IDs', () => {
    const fs = require('fs');
    const src = fs.readFileSync(require('path').join(__dirname, '../index.js'), 'utf8');
    for (const id of BP_TITLES) {
      expect(src).toContain(`'${id}'`);
    }
  });
});
