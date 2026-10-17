/**
 * tickets-restore.test.js
 *
 * Tests for the /tickets/use endpoint logic:
 * - lastPlayed = today when daily was already played
 * - lastPlayed = yesterday when daily not yet played
 * - 400 + ticket not consumed when streak is not broken
 * - concurrent requests: only one succeeds (atomic $elemMatch)
 * - streakBeforeLoss=0 + broken streak: snapshot inferred from dailyStreak (pre-daily USE)
 */

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase } = require('./helpers/testApp');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

// Raw collection access so lastPlayed is stored as String, matching production schema.
const col = () => mongoose.connection.db.collection('users');
const oid = () => new mongoose.Types.ObjectId();

function todayStr() {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function yesterdayStr() {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
function daysAgo(n) {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Mirrors the production /tickets/use logic from server/index.js.
 * Uses raw MongoDB operations to match String lastPlayed behaviour.
 */
async function ticketUse(userId) {
  const raw = await col().findOne({ _id: userId });
  if (!raw) return { status: 404, body: { error: 'User not found' } };

  const ticketIdx = (raw.battlePassItems || []).findIndex(
    t => !t.used && t.itemId === 'ticket_restore_streak'
  );
  if (ticketIdx === -1) return { status: 400, body: { error: 'No tickets available' } };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tStr = today.toISOString().slice(0, 10);
  const yd   = new Date(today);
  yd.setUTCDate(today.getUTCDate() - 1);

  let snapshot = raw.streakBeforeLoss || 0;
  if (snapshot === 0) {
    const lpDate = raw.lastPlayed
      ? (raw.lastPlayed instanceof Date ? raw.lastPlayed : new Date(raw.lastPlayed + 'T00:00:00Z'))
      : null;
    const streakBroken = !lpDate || lpDate < yd;
    if (raw.dailyStreak > 1 && streakBroken) {
      snapshot = raw.dailyStreak;
    } else {
      return { status: 400, body: { error: 'NO_STREAK_TO_RESTORE' } };
    }
  } else if (snapshot <= raw.dailyStreak) {
    return { status: 400, body: { error: 'NO_STREAK_TO_RESTORE' } };
  }

  const lpStr = raw.lastPlayed instanceof Date
    ? raw.lastPlayed.toISOString().slice(0, 10)
    : (raw.lastPlayed || null);
  const newLastPlayed = lpStr === tStr ? tStr : yd.toISOString().slice(0, 10);

  const doc = await col().findOneAndUpdate(
    {
      _id:             userId,
      battlePassItems: { $elemMatch: { itemId: 'ticket_restore_streak', used: false } },
    },
    {
      $set: {
        'battlePassItems.$.used': true,
        dailyStreak:              snapshot,
        lastPlayed:               newLastPlayed,
        streakBeforeLoss:         0,
      },
    },
    { returnDocument: 'after' }
  );

  if (!doc) return { status: 400, body: { error: 'No tickets available' } };

  const remaining = (doc.battlePassItems || []).filter(t => !t.used).length;
  return { status: 200, body: { success: true, restoredTo: snapshot, remaining }, doc };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

test('daily already played today: lastPlayed stays today after restore', async () => {
  const id = oid();
  await col().insertOne({
    _id: id, dailyStreak: 1, lastPlayed: todayStr(), streakBeforeLoss: 82,
    battlePassItems: [{ itemId: 'ticket_restore_streak', used: false }],
  });

  const res = await ticketUse(id);
  expect(res.status).toBe(200);
  expect(res.body.restoredTo).toBe(82);
  expect(res.doc.dailyStreak).toBe(82);
  expect(res.doc.lastPlayed).toBe(todayStr());
  expect(res.doc.streakBeforeLoss).toBe(0);
  expect(res.doc.battlePassItems[0].used).toBe(true);
});

test('daily not yet played today: lastPlayed set to yesterday after restore', async () => {
  const id = oid();
  await col().insertOne({
    _id: id, dailyStreak: 1, lastPlayed: daysAgo(2), streakBeforeLoss: 82,
    battlePassItems: [{ itemId: 'ticket_restore_streak', used: false }],
  });

  const res = await ticketUse(id);
  expect(res.status).toBe(200);
  expect(res.doc.dailyStreak).toBe(82);
  expect(res.doc.lastPlayed).toBe(yesterdayStr());
  expect(res.doc.streakBeforeLoss).toBe(0);
});

test('streakBeforeLoss=0 + broken streak + no daily yet: infers snapshot from dailyStreak', async () => {
  const id = oid();
  await col().insertOne({
    _id: id, dailyStreak: 82, lastPlayed: daysAgo(2), streakBeforeLoss: 0,
    battlePassItems: [{ itemId: 'ticket_restore_streak', used: false }],
  });

  const res = await ticketUse(id);
  expect(res.status).toBe(200);
  expect(res.body.restoredTo).toBe(82);
  expect(res.doc.lastPlayed).toBe(yesterdayStr());
});

test('streak not broken (played yesterday): 400 + ticket not consumed', async () => {
  const id = oid();
  await col().insertOne({
    _id: id, dailyStreak: 82, lastPlayed: yesterdayStr(), streakBeforeLoss: 0,
    battlePassItems: [{ itemId: 'ticket_restore_streak', used: false }],
  });

  const res = await ticketUse(id);
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('NO_STREAK_TO_RESTORE');

  const doc = await col().findOne({ _id: id });
  expect(doc.battlePassItems[0].used).toBe(false);
});

test('snapshot <= current streak: 400 + ticket not consumed', async () => {
  const id = oid();
  await col().insertOne({
    _id: id, dailyStreak: 82, lastPlayed: todayStr(), streakBeforeLoss: 30,
    battlePassItems: [{ itemId: 'ticket_restore_streak', used: false }],
  });

  const res = await ticketUse(id);
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('NO_STREAK_TO_RESTORE');

  const doc = await col().findOne({ _id: id });
  expect(doc.battlePassItems[0].used).toBe(false);
});

test('no unused ticket: 400 No tickets available', async () => {
  const id = oid();
  await col().insertOne({
    _id: id, dailyStreak: 1, lastPlayed: todayStr(), streakBeforeLoss: 82,
    battlePassItems: [{ itemId: 'ticket_restore_streak', used: true }],
  });

  const res = await ticketUse(id);
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('No tickets available');
});

test('two concurrent requests: only one restore succeeds', async () => {
  const id = oid();
  await col().insertOne({
    _id: id, dailyStreak: 1, lastPlayed: todayStr(), streakBeforeLoss: 82,
    battlePassItems: [{ itemId: 'ticket_restore_streak', used: false }],
  });

  const [r1, r2] = await Promise.all([ticketUse(id), ticketUse(id)]);
  const successes = [r1, r2].filter(r => r.status === 200).length;
  expect(successes).toBe(1);

  const doc = await col().findOne({ _id: id });
  expect(doc.battlePassItems.filter(t => t.used).length).toBe(1);
  expect(doc.dailyStreak).toBe(82);
});
