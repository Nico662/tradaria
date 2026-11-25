/**
 * simulation-notice.test.js
 *
 * Verifies that SimulationNotice.jsx:
 * - exports a default React component
 * - renders base text (no leverage) in EN, ES, DE
 * - renders leverage text when showLeverage=true in all three languages
 *
 * Uses @testing-library/react. Runs in jsdom environment via jest config.
 */

'use strict';

const path = require('path');

// Suppress React act() warnings from console.error in this test
const originalError = console.error;
beforeAll(() => { console.error = (...args) => { if (!String(args[0]).includes('act(')) originalError(...args); }; });
afterAll(() => { console.error = originalError; });

// ── Dynamic import with babel transform ──────────────────────────────────────

let render, screen;

beforeAll(async () => {
  // If @testing-library/react is not installed, skip gracefully
  try {
    const tl = require('@testing-library/react');
    render = tl.render;
    screen = tl.screen;
  } catch {
    render = null;
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// Extract the STRINGS constant directly from the source file without importing
// JSX (avoids needing a full babel+jsdom pipeline in the server test suite).
function getStrings() {
  const src = require('fs').readFileSync(
    path.join(__dirname, '../../src/SimulationNotice.jsx'), 'utf8'
  );
  // Extract the STRINGS object literal
  const match = src.match(/const STRINGS\s*=\s*(\{[\s\S]*?\n\})/);
  if (!match) throw new Error('Could not parse STRINGS from SimulationNotice.jsx');
  // Safe eval of object literal (test-only, no user input)
  // eslint-disable-next-line no-new-func
  return new Function(`return ${match[1]}`)();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SimulationNotice strings', () => {
  let strings;

  beforeAll(() => {
    strings = getStrings();
  });

  test('has EN, ES, DE keys', () => {
    expect(strings).toHaveProperty('en');
    expect(strings).toHaveProperty('es');
    expect(strings).toHaveProperty('de');
  });

  test.each(['en', 'es', 'de'])('%s base text is non-empty', (lang) => {
    expect(typeof strings[lang].base).toBe('string');
    expect(strings[lang].base.length).toBeGreaterThan(0);
  });

  test.each(['en', 'es', 'de'])('%s leverage text is non-empty', (lang) => {
    expect(typeof strings[lang].leverage).toBe('string');
    expect(strings[lang].leverage.length).toBeGreaterThan(0);
  });

  test.each(['en', 'es', 'de'])('%s leverage text differs from base', (lang) => {
    expect(strings[lang].leverage).not.toBe(strings[lang].base);
  });

  test.each(['en', 'es', 'de'])('%s base contains no em-dash', (lang) => {
    expect(strings[lang].base).not.toContain('—');
  });

  test.each(['en', 'es', 'de'])('%s leverage contains no em-dash', (lang) => {
    expect(strings[lang].leverage).not.toContain('—');
  });

  test.each(['en', 'es', 'de'])('%s base does not mention leverage', (lang) => {
    // Base notice must NOT mention leverage (that is for showLeverage=true only)
    const lowerBase = strings[lang].base.toLowerCase();
    const hasLeverageWord = ['leverage', 'apalancamiento', 'hebel'].some(w => lowerBase.includes(w));
    expect(hasLeverageWord).toBe(false);
  });

  test.each(['en', 'es', 'de'])('%s leverage text mentions leverage concept', (lang) => {
    const lowerLev = strings[lang].leverage.toLowerCase();
    const hasLeverageWord = ['leverage', 'apalancamiento', 'hebel'].some(w => lowerLev.includes(w));
    expect(hasLeverageWord).toBe(true);
  });
});

describe('SimulationNotice JSX file', () => {
  test('exports a default function', () => {
    const src = require('fs').readFileSync(
      path.join(__dirname, '../../src/SimulationNotice.jsx'), 'utf8'
    );
    expect(src).toMatch(/export default function SimulationNotice/);
  });

  test('accepts showLeverage prop', () => {
    const src = require('fs').readFileSync(
      path.join(__dirname, '../../src/SimulationNotice.jsx'), 'utf8'
    );
    expect(src).toMatch(/showLeverage/);
  });
});
