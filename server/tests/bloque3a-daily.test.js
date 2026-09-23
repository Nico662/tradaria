/**
 * Bloque 3A: /daily/complete atomic concurrency fix
 *
 * Tests that the atomic findOneAndUpdate with a filter on lastPlayed < startOfToday
 * prevents double-processing: only one of two concurrent requests will match the
 * filter and update, the other will get null back.
 */

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase, getUser } = require('./helpers/testApp');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

/**
 * Simulates the atomic /daily/complete update.
 * Returns the updated document, or null if the user already played today.
 */
async function atomicDailyComplete(User, userId, safeXp, safeBadges, dailyResult) {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);

  return User.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { lastPlayed: { $exists: false } },
        { lastPlayed: null },
        { lastPlayed: { $lt: startOfToday } },
      ],
    },
    [
      {
        $set: {
          lastPlayed: '$$NOW',
          dailyStreak: {
            $cond: {
              if: {
                $and: [
                  { $ne: [{ $ifNull: ['$lastPlayed', null] }, null] },
                  { $gte: ['$lastPlayed', startOfYesterday] },
                ],
              },
              then: { $add: ['$dailyStreak', 1] },
              else: 1,
            },
          },
          streakBeforeLoss: {
            $cond: {
              if: {
                $and: [
                  { $gt: ['$dailyStreak', 1] },
                  {
                    $or: [
                      { $eq: [{ $ifNull: ['$lastPlayed', null] }, null] },
                      { $lt: ['$lastPlayed', startOfYesterday] },
                    ],
                  },
                ],
              },
              then: '$dailyStreak',
              else: { $ifNull: ['$streakBeforeLoss', 0] },
            },
          },
          xp: { $max: ['$xp', safeXp] },
          badges: { $setUnion: [{ $ifNull: ['$badges', []] }, safeBadges] },
          dailyResult: dailyResult,
        },
      },
    ],
    { new: true, updatePipeline: true }
  );
}

describe('Bloque 3A: /daily/complete atomic concurrency', () => {
  test('two concurrent requests only increment streak once', async () => {
    const User = getUser();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const u = await User.create({ dailyStreak: 3, lastPlayed: yesterday, xp: 100 });

    // Simulate two concurrent requests
    const [r1, r2] = await Promise.all([
      atomicDailyComplete(User, u._id, 200, [], null),
      atomicDailyComplete(User, u._id, 200, [], null),
    ]);

    const updated = await User.findById(u._id);
    // Streak should be exactly 4 (incremented once, not twice)
    expect(updated.dailyStreak).toBe(4);

    // Exactly one of the two should have returned null (didn't match filter)
    const nullCount = [r1, r2].filter(r => r === null).length;
    expect(nullCount).toBe(1);
  });

  test('streak increments when last played yesterday', async () => {
    const User = getUser();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const u = await User.create({ dailyStreak: 5, lastPlayed: yesterday });
    const result = await atomicDailyComplete(User, u._id, 0, [], null);

    expect(result).not.toBeNull();
    expect(result.dailyStreak).toBe(6);
  });

  test('streak resets to 1 when last played 2+ days ago', async () => {
    const User = getUser();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const u = await User.create({ dailyStreak: 10, lastPlayed: twoDaysAgo });
    const result = await atomicDailyComplete(User, u._id, 0, [], null);

    expect(result).not.toBeNull();
    expect(result.dailyStreak).toBe(1);
  });

  test('streakBeforeLoss is set when streak resets', async () => {
    const User = getUser();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const u = await User.create({ dailyStreak: 8, lastPlayed: twoDaysAgo });
    const result = await atomicDailyComplete(User, u._id, 0, [], null);

    expect(result.streakBeforeLoss).toBe(8);
    expect(result.dailyStreak).toBe(1);
  });

  test('streakBeforeLoss is NOT set when streak continues', async () => {
    const User = getUser();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const u = await User.create({ dailyStreak: 4, lastPlayed: yesterday, streakBeforeLoss: 0 });
    const result = await atomicDailyComplete(User, u._id, 0, [], null);

    expect(result.streakBeforeLoss).toBe(0);
    expect(result.dailyStreak).toBe(5);
  });

  test('new user with no lastPlayed gets streak=1', async () => {
    const User = getUser();
    const u = await User.create({ dailyStreak: 0 });
    const result = await atomicDailyComplete(User, u._id, 500, ['badge_a'], null);

    expect(result).not.toBeNull();
    expect(result.dailyStreak).toBe(1);
  });

  test('xp is set to max of existing and incoming', async () => {
    const User = getUser();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const u = await User.create({ xp: 300, dailyStreak: 1, lastPlayed: yesterday });
    const result = await atomicDailyComplete(User, u._id, 500, [], null);
    expect(result.xp).toBe(500);

    // Now test that lower xp doesn't downgrade
    const u2 = await User.create({ xp: 600, dailyStreak: 1, lastPlayed: yesterday });
    const result2 = await atomicDailyComplete(User, u2._id, 400, [], null);
    expect(result2.xp).toBe(600);
  });

  test('returns null (alreadyPlayed) if lastPlayed is today', async () => {
    const User = getUser();
    const now = new Date();

    const u = await User.create({ dailyStreak: 3, lastPlayed: now });
    const result = await atomicDailyComplete(User, u._id, 100, [], null);

    expect(result).toBeNull();
  });
});
