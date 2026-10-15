/**
 * socket-auth.test.js
 *
 * Verifies that verifySocketToken never throws and that the four bad-input
 * cases all return null — so matchmaking:join / room:create / room:join /
 * challenge:join continue to work (with socket.userId left undefined) when
 * the client sends no token, null, a malformed string, or an expired JWT.
 */

process.env.JWT_SECRET = 'test_secret';

const jwt = require('jsonwebtoken');
const { verifySocketToken } = require('../utils/socketAuth');

// ── Test 1: absent token (undefined) ─────────────────────────────────────────

test('absent token (undefined) → returns null without throwing', () => {
  expect(() => verifySocketToken(undefined)).not.toThrow();
  expect(verifySocketToken(undefined)).toBeNull();
});

// ── Test 2: null token ────────────────────────────────────────────────────────

test('null token → returns null without throwing', () => {
  expect(() => verifySocketToken(null)).not.toThrow();
  expect(verifySocketToken(null)).toBeNull();
});

// ── Test 3: malformed / garbage string ───────────────────────────────────────

test('malformed token string → returns null without throwing', () => {
  expect(() => verifySocketToken('not.a.jwt')).not.toThrow();
  expect(verifySocketToken('not.a.jwt')).toBeNull();
});

// ── Test 4: structurally valid JWT but expired ────────────────────────────────

test('expired JWT → returns null without throwing', () => {
  const expired = jwt.sign({ id: 'user123' }, 'test_secret', { expiresIn: -1 });
  expect(() => verifySocketToken(expired)).not.toThrow();
  expect(verifySocketToken(expired)).toBeNull();
});

// ── Bonus: valid token returns the userId string ──────────────────────────────

test('valid token → returns userId string', () => {
  const token = jwt.sign({ id: 'user123' }, 'test_secret');
  expect(verifySocketToken(token)).toBe('user123');
});
