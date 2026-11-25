// Verifies the BSON type-mismatch bug in the dailyStreak pipeline and its fix.
// Uses a throwaway collection (__streak_fix_test__) — safe to run against prod URI.
// Usage (from server/): node test_streak_fix.js
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('MONGODB_URI env var not set');
  await mongoose.connect(MONGODB_URI);

  const col = mongoose.connection.collection('__streak_fix_test__');
  await col.deleteMany({});

  const today     = new Date(); today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const todayStr     = today.toISOString().slice(0, 10);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Baseline: user with String-type lastPlayed = yesterday, streak = 60
  const { insertedId } = await col.insertOne({
    dailyStreak: 60,
    lastPlayed: yesterdayStr, // BSON String, e.g. "2026-09-23"
    streakBeforeLoss: 0,
  });

  // ── OLD pipeline (broken) ──────────────────────────────────────────────────
  const oldDoc = await col.findOneAndUpdate(
    { _id: insertedId },
    [
      {
        $set: {
          dailyStreak: {
            $cond: {
              if: {
                $and: [
                  { $ne: [{ $ifNull: ['$lastPlayed', null] }, null] },
                  { $gte: ['$lastPlayed', yesterday] }, // String vs Date — BSON type ordering: always false
                ],
              },
              then: { $add: ['$dailyStreak', 1] },
              else: 1,
            },
          },
        },
      },
    ],
    { returnDocument: 'after' }
  );

  const oldStreak = oldDoc.dailyStreak;
  const oldPass   = oldStreak !== 61; // we EXPECT this to be broken (== 1)
  console.log('OLD pipeline | String "$lastPlayed" vs JavaScript Date literal');
  console.log(`  lastPlayed = "${yesterdayStr}" (BSON String), dailyStreak = 60`);
  console.log(`  Expected streak 61 (continues), got: ${oldStreak}  ${oldStreak === 1 ? '✗ BUG reproduced — streak reset to 1' : oldStreak === 61 ? '(not reproducing bug on this engine)' : '?'}`);

  // Reset for second test
  await col.updateOne({ _id: insertedId }, { $set: { dailyStreak: 60, lastPlayed: yesterdayStr } });

  // ── NEW pipeline (fixed) ───────────────────────────────────────────────────
  // Converts $lastPlayed to a Date before comparison, regardless of stored BSON type.
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

  const newDoc = await col.findOneAndUpdate(
    { _id: insertedId },
    [
      {
        $set: {
          lastPlayed: todayStr,
          dailyStreak: {
            $cond: {
              if: {
                $and: [
                  { $ne: [{ $ifNull: ['$lastPlayed', null] }, null] },
                  { $gte: [lastPlayedAsDate, yesterday] }, // Date vs Date — correct
                ],
              },
              then: { $add: ['$dailyStreak', 1] },
              else: 1,
            },
          },
        },
      },
    ],
    { returnDocument: 'after' }
  );

  const newStreak = newDoc.dailyStreak;
  console.log('\nNEW pipeline | $dateFromString normalises String → Date before compare');
  console.log(`  lastPlayed = "${yesterdayStr}" (BSON String), dailyStreak = 60`);
  console.log(`  Expected streak 61 (continues), got: ${newStreak}  ${newStreak === 61 ? '✓ FIXED' : '✗ STILL BROKEN'}`);

  // Also verify the Date-type path (transition: users whose lastPlayed was set by $$NOW)
  await col.deleteMany({});
  const { insertedId: id2 } = await col.insertOne({
    dailyStreak: 5,
    lastPlayed: new Date(yesterday.getTime() + 14 * 3600 * 1000), // BSON Date from yesterday
    streakBeforeLoss: 0,
  });
  const transDoc = await col.findOneAndUpdate(
    {
      _id: id2,
      $or: [
        { lastPlayed: { $type: 'string', $lt: todayStr } },
        { lastPlayed: { $type: 'date', $lt: today } },
      ],
    },
    [
      {
        $set: {
          lastPlayed: todayStr,
          dailyStreak: {
            $cond: {
              if: {
                $and: [
                  { $ne: [{ $ifNull: ['$lastPlayed', null] }, null] },
                  { $gte: [lastPlayedAsDate, yesterday] },
                ],
              },
              then: { $add: ['$dailyStreak', 1] },
              else: 1,
            },
          },
        },
      },
    ],
    { returnDocument: 'after' }
  );
  const transStreak = transDoc?.dailyStreak;
  console.log('\nNEW pipeline | Date-type lastPlayed (transition — was set by $$NOW)');
  console.log(`  lastPlayed = Date(yesterday 14:00 UTC), dailyStreak = 5`);
  console.log(`  Expected streak 6 (continues), got: ${transStreak}  ${transStreak === 6 ? '✓ FIXED' : '✗ BROKEN'}`);

  await col.deleteMany({});
  await mongoose.disconnect();

  const allPass = oldStreak === 1 && newStreak === 61 && transStreak === 6;
  process.exit(allPass ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
