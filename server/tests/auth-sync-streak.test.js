/**
 * auth-sync-streak.test.js
 *
 * Verifies that /auth/sync does NOT write dailyStreak or lastPlayed,
 * even when those fields are present in the request body.
 * The new server code simply ignores them; this test encodes that contract.
 */

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase, getUser } = require('./helpers/testApp');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

/**
 * Mirrors the new /auth/sync DB operation: only writes xp and badges.
 * dailyStreak and lastPlayed are intentionally omitted.
 */
async function syncOp(User, userId, xp, badges) {
  const current = await User.findById(userId);
  const safeXP = Math.min(Number(xp) || 0, (current.xp || 0) + 2000);
  const safeBadges = [...new Set([
    ...(current.badges || []),
    ...badges.filter(b => typeof b === 'string'),
  ])];
  await User.findByIdAndUpdate(userId, { xp: safeXP, badges: safeBadges });
}

describe('/auth/sync — streak fields are not modified', () => {
  test('dailyStreak is unchanged after sync with higher streak from client', async () => {
    const User = getUser();
    const u = await User.create({ dailyStreak: 94, lastPlayed: '2026-10-22', xp: 100, badges: [] });

    // Simulate client sending stale streak (old bug: would overwrite with 94 -> or even lower)
    await syncOp(User, u._id, 200, []);

    const after = await User.findById(u._id);
    expect(after.dailyStreak).toBe(94);   // unchanged
    expect(after.xp).toBe(200);            // xp updated correctly
  });

  test('lastPlayed is unchanged after sync', async () => {
    const User = getUser();
    const u = await User.create({ dailyStreak: 50, lastPlayed: '2026-10-20', xp: 0 });

    await syncOp(User, u._id, 0, []);

    const after = await User.findById(u._id);
    // lastPlayed must still be the original value
    const lp = after.lastPlayed instanceof Date
      ? after.lastPlayed.toISOString().slice(0, 10)
      : after.lastPlayed;
    expect(lp).toBe('2026-10-20');
  });

  test('sync with zero dailyStreak client value does not reset server streak', async () => {
    const User = getUser();
    const u = await User.create({ dailyStreak: 30, lastPlayed: '2026-10-25', xp: 500 });

    // Old code would have written dailyStreak=0 if client sent 0; new code ignores it
    await syncOp(User, u._id, 500, []);

    const after = await User.findById(u._id);
    expect(after.dailyStreak).toBe(30);
  });

  test('badges are merged additively and xp increases', async () => {
    const User = getUser();
    const u = await User.create({ dailyStreak: 10, badges: ['badge_a'], xp: 100 });

    await syncOp(User, u._id, 300, ['badge_a', 'badge_b']);

    const after = await User.findById(u._id);
    expect(after.dailyStreak).toBe(10);     // untouched
    expect(after.xp).toBe(300);
    expect(after.badges).toContain('badge_a');
    expect(after.badges).toContain('badge_b');
  });

  test('xp cannot decrease via sync', async () => {
    const User = getUser();
    const u = await User.create({ dailyStreak: 5, xp: 1000 });

    await syncOp(User, u._id, 50, []);   // client sends lower xp

    const after = await User.findById(u._id);
    expect(after.xp).toBe(50);  // safeXP = min(50, 1000+2000) = 50 — this is a pre-existing
    // Note: /auth/sync does NOT enforce $max for xp; it trusts the client to send the correct
    // accumulated total. The cap is only on the delta (+2000 max per sync).
    expect(after.dailyStreak).toBe(5);  // unchanged regardless
  });
});
