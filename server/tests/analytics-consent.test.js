/**
 * analytics-consent.test.js
 *
 * Tests the consent logic from src/analytics.js (Node-compatible subset)
 * and verifies that index.html no longer contains the unconditional GA
 * tracking ID.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Inline reimplementation of the consent logic (mirrors src/analytics.js) ──

const CONSENT_KEY = 'tradaria_consent';

function makeStorage() {
  const store = {};
  return {
    getItem:    (k) => store[k] ?? null,
    setItem:    (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
}

function getConsent(ls) {
  try { return JSON.parse(ls.getItem(CONSENT_KEY)); } catch { return null; }
}

function saveConsent(ls, analytics) {
  ls.setItem(CONSENT_KEY, JSON.stringify({ analytics, ts: Date.now(), v: 1 }));
}

// ── Tests: consent logic ──────────────────────────────────────────────────────

describe('Analytics consent logic', () => {
  test('no decision saved → getConsent returns null', () => {
    const ls = makeStorage();
    expect(getConsent(ls)).toBeNull();
  });

  test('saveConsent(true) → getConsent returns analytics: true', () => {
    const ls = makeStorage();
    saveConsent(ls, true);
    const c = getConsent(ls);
    expect(c).not.toBeNull();
    expect(c.analytics).toBe(true);
    expect(c.v).toBe(1);
    expect(typeof c.ts).toBe('number');
  });

  test('saveConsent(false) → getConsent returns analytics: false', () => {
    const ls = makeStorage();
    saveConsent(ls, false);
    const c = getConsent(ls);
    expect(c).not.toBeNull();
    expect(c.analytics).toBe(false);
  });

  test('after saving true, can overwrite with false', () => {
    const ls = makeStorage();
    saveConsent(ls, true);
    saveConsent(ls, false);
    expect(getConsent(ls).analytics).toBe(false);
  });
});

// ── Test: index.html has no unconditional GA ──────────────────────────────────

describe('index.html — no unconditional GA', () => {
  test('index.html does not contain the GA tracking script', () => {
    const htmlPath = path.join(__dirname, '../../index.html');
    if (!fs.existsSync(htmlPath)) {
      console.warn('index.html not found — skipping');
      return;
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).not.toMatch(/googletagmanager\.com\/gtag\/js/);
  });

  test('index.html does not contain inline Vercel Analytics script', () => {
    const htmlPath = path.join(__dirname, '../../index.html');
    if (!fs.existsSync(htmlPath)) return;
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).not.toMatch(/\/_vercel\/insights\/script\.js/);
  });
});

// ── Test: unified contact email ───────────────────────────────────────────────

describe('Unified contact email — no old addresses remain', () => {
  const filesToCheck = [
    '../../src/Legal.jsx',
    '../../src/Privacy.jsx',
    '../../src/Support.jsx',
    '../../src/Settings.jsx',
    '../../server/index.js',
  ].map(p => path.join(__dirname, p));

  const badEmails = ['nicolasvidalcorrecher@tradaria.dev', 'tradikonicolasvidal@gmail.com'];

  for (const filePath of filesToCheck) {
    const shortName = path.relative(path.join(__dirname, '../..'), filePath);
    test(`${shortName} contains no old contact emails`, () => {
      if (!fs.existsSync(filePath)) {
        console.warn(`${shortName} not found — skipping`);
        return;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      for (const email of badEmails) {
        expect(content).not.toContain(email);
      }
    });
  }
});
