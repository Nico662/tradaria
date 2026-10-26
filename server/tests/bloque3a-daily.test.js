/**
 * Bloque 3A: /daily/complete atomic concurrency fix
 *
 * Mirrors the production implementation exactly:
 *   - lastPlayed stored as String "YYYY-MM-DD" (not Date / $$NOW)
 *   - Filter uses { $type: 'string', $lt: todayStr } for the normal case
 *   - Pipeline writes lastPlayed: todayStr (a string)
 *   - streakBeforeLoss computed inside the same pipeline
 */

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase, getUser } = require('./helpers/testApp');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

function todayStr() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function daysAgoStr(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Mirrors the production /daily/complete update from server/index.js.
 * Uses String-typed lastPlayed and type-specific filter, matching production.
 */
async function atomicDailyComplete(User, userId, safeXp, safeBadges, dailyResult) {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);
  const today = startOfToday.toISOString().slice(0, 10);

  const lastPlayedAsDate = {
    $cond: {
      if: { $eq: [{ $type: '$lastPlayed' }, 'date'] },
      then: '$lastPlayed',
      else: {
        $cond: {
          if: { $ne: [{ $ifNull: ['$lastPlayed', null] }, null] },
          then: { $dateFromString: { dateString: '$lastPlayed', onError: null, onNull: null } },
          else: null,
        },
      },
    },
  };

  return User.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { lastPlayed: { $exists: false } },
        { lastPlayed: null },
        { lastPlayed: { $type: 'string', $lt: today } },
        { lastPlayed: { $type: 'date',   $lt: startOfToday } },
      ],
    },
    [
      {
        $set: {
          lastPlayed: today,
          dailyStreak: {
            $cond: {
              if: {
                $and: [
                  { $ne: [{ $ifNull: ['$lastPlayed', null] }, null] },
                  { $gte: [lastPlayedAsDate, startOfYesterday] },
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
                      { $lt: [lastPlayedAsDate, startOfYesterday] },
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

describe('Bloque 3A: /daily/complete — String-based lastPlayed (production schema)', () => {
  test('streak increments when lastPlayed is yesterday (string)', async () => {
    const User = getUser();
    const u = await User.create({ dailyStreak: 5, lastPlayed: daysAgoStr(1), xp: 0 });
    const result = await atomicDailyComplete(User, u._id, 0, [], null);
    expect(result).not.toBeNull();
    expect(result.dailyStreak).toBe(6);
    // lastPlayed may be returned as Date or String depending on schema; both should represent today
    const lp = result.lastPlayed instanceof Date
      ? result.lastPlayed.toISOString().slice(0, 10)
      : result.lastPlayed;
    expect(lp).toBe(todayStr());
  });

  test('streak resets to 1 when lastPlayed is 2+ days ago (string)', async () => {
    const User = getUser();
    const u = await User.create({ dailyStreak: 10, lastPlayed: daysAgoStr(2), xp: 0 });
    const result = await atomicDailyComplete(User, u._id, 0, [], null);
    expect(result).not.toBeNull();
    expect(result.dailyStreak).toBe(1);
  });

  test('streakBeforeLoss is set when streak resets (string lastPlayed)', async () => {
    const User = getUser();
    const u = await User.create({ dailyStreak: 8, lastPlayed: daysAgoStr(3), xp: 0 });
    const result = await atomicDailyComplete(User, u._id, 0, [], null);
    expect(result.streakBeforeLoss).toBe(8);
    expect(result.dailyStreak).toBe(1);
  });

  test('streakBeforeLoss is NOT set when streak continues (string lastPlayed)', async () => {
    const User = getUser();
    const u = await User.create({ dailyStreak: 4, lastPlayed: daysAgoStr(1), streakBeforeLoss: 0 });
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

  test('returns null (alreadyPlayed) if lastPlayed is today (string)', async () => {
    const User = getUser();
    const u = await User.create({ dailyStreak: 3, lastPlayed: todayStr() });
    const result = await atomicDailyComplete(User, u._id, 100, [], null);
    expect(result).toBeNull();
  });

  test('two concurrent requests only increment streak once', async () => {
    const User = getUser();
    const u = await User.create({ dailyStreak: 3, lastPlayed: daysAgoStr(1), xp: 100 });
    const [r1, r2] = await Promise.all([
      atomicDailyComplete(User, u._id, 200, [], null),
      atomicDailyComplete(User, u._id, 200, [], null),
    ]);
    const updated = await User.findById(u._id);
    expect(updated.dailyStreak).toBe(4);
    expect([r1, r2].filter(r => r === null).length).toBe(1);
  });

  test('xp is set to max of existing and incoming', async () => {
    const User = getUser();
    const u = await User.create({ xp: 300, dailyStreak: 1, lastPlayed: daysAgoStr(1) });
    const result = await atomicDailyComplete(User, u._id, 500, [], null);
    expect(result.xp).toBe(500);
  });

  test('lower incoming xp does not downgrade existing xp', async () => {
    const User = getUser();
    const u = await User.create({ xp: 600, dailyStreak: 1, lastPlayed: daysAgoStr(1) });
    const result = await atomicDailyComplete(User, u._id, 400, [], null);
    expect(result.xp).toBe(600);
  });
});
