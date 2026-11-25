/**
 * account-deletion-dryrun.test.js
 *
 * Tests for server/services/accountDeletion.js:
 * - Deletes direct-ownership docs (portfolio, scores, gamehistories, etc.)
 * - Deletes friendship docs involving the user
 * - Anonymizes shared docs (asyncduel, tradingleague, academy, etc.)
 * - Leaves PaidTournament docs untouched (KEEP for legal)
 * - Accepts missing collections gracefully (no crash)
 */

'use strict';

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase } = require('./helpers/testApp');
const { deleteAccount } = require('../services/accountDeletion');

// ── Minimal schemas for collections used in this test ────────────────────────

function col(name) {
  return mongoose.connection.collection(name);
}

function oid() {
  return new mongoose.Types.ObjectId();
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  await connect();
});

afterAll(async () => {
  await disconnect();
});

afterEach(async () => {
  await clearDatabase();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('deleteAccount service', () => {
  test('deletes owned docs across direct-ownership collections', async () => {
    const uid = oid();
    const other = oid();

    await col('portfolios').insertMany([
      { userId: uid },
      { userId: other },
    ]);
    await col('scores').insertMany([
      { userId: uid },
      { userId: uid },
      { userId: other },
    ]);
    await col('gamehistories').insertOne({ userId: uid });
    await col('tournamentsessions').insertOne({ userId: uid });
    await col('users').insertOne({ _id: uid, email: 'test@example.com' });

    await deleteAccount(uid);

    expect(await col('portfolios').countDocuments({ userId: uid })).toBe(0);
    expect(await col('portfolios').countDocuments({ userId: other })).toBe(1);
    expect(await col('scores').countDocuments({ userId: uid })).toBe(0);
    expect(await col('scores').countDocuments({ userId: other })).toBe(1);
    expect(await col('gamehistories').countDocuments({ userId: uid })).toBe(0);
    expect(await col('tournamentsessions').countDocuments({ userId: uid })).toBe(0);
    expect(await col('users').countDocuments({ _id: uid })).toBe(0);
  });

  test('deletes friendship docs on both sides', async () => {
    const uid   = oid();
    const other = oid();
    await col('friendships').insertMany([
      { requester: uid,   recipient: other, status: 'accepted' },
      { requester: other, recipient: uid,   status: 'pending'  },
      { requester: other, recipient: oid(), status: 'accepted' },
    ]);
    await col('users').insertOne({ _id: uid });

    await deleteAccount(uid);

    expect(await col('friendships').countDocuments({ requester: uid })).toBe(0);
    expect(await col('friendships').countDocuments({ recipient: uid })).toBe(0);
    // unrelated friendship survives
    expect(await col('friendships').countDocuments()).toBe(1);
  });

  test('anonymizes asyncduel challenger and rival', async () => {
    const uid   = oid();
    const other = oid();
    await col('asyncduels').insertMany([
      { code: 'A1', challenger: { userId: uid },   rival: { userId: other } },
      { code: 'A2', challenger: { userId: other },  rival: { userId: uid }  },
    ]);
    await col('users').insertOne({ _id: uid });

    await deleteAccount(uid);

    const a1 = await col('asyncduels').findOne({ code: 'A1' });
    const a2 = await col('asyncduels').findOne({ code: 'A2' });
    expect(a1.challenger.userId).toBeNull();
    expect(a1.rival.userId).toStrictEqual(other); // other user untouched
    expect(a2.rival.userId).toBeNull();
    expect(a2.challenger.userId).toStrictEqual(other);
  });

  test('pulls user from tradingleague members and nulls owner', async () => {
    const uid   = oid();
    const other = oid();
    await col('tradingleagues').insertMany([
      { name: 'L1', owner: uid,   members: [{ userId: uid }, { userId: other }] },
      { name: 'L2', owner: other, members: [{ userId: uid }] },
    ]);
    await col('users').insertOne({ _id: uid });

    await deleteAccount(uid);

    const l1 = await col('tradingleagues').findOne({ name: 'L1' });
    const l2 = await col('tradingleagues').findOne({ name: 'L2' });
    expect(l1.owner).toBeNull();
    expect(l1.members.map(m => String(m.userId))).not.toContain(String(uid));
    expect(l1.members.map(m => String(m.userId))).toContain(String(other));
    expect(l2.members.map(m => String(m.userId))).not.toContain(String(uid));
  });

  test('pulls user from academy students and nulls ownerId', async () => {
    const uid   = oid();
    const other = oid();
    await col('academies').insertMany([
      { name: 'A1', ownerId: uid,   students: [uid, other] },
      { name: 'A2', ownerId: other, students: [uid] },
    ]);
    await col('users').insertOne({ _id: uid });

    await deleteAccount(uid);

    const a1 = await col('academies').findOne({ name: 'A1' });
    const a2 = await col('academies').findOne({ name: 'A2' });
    expect(a1.ownerId).toBeNull();
    expect(a1.students.map(String)).not.toContain(String(uid));
    expect(a1.students.map(String)).toContain(String(other));
    expect(a2.students.map(String)).not.toContain(String(uid));
  });

  test('does NOT delete paidtournament docs (KEEP legal)', async () => {
    const uid = oid();
    await col('paidtournaments').insertOne({
      players:   [{ userId: uid }],
      winner:    uid,
      createdBy: uid,
    });
    await col('users').insertOne({ _id: uid });

    await deleteAccount(uid);

    // PaidTournament must survive unchanged
    expect(await col('paidtournaments').countDocuments()).toBe(1);
    const doc = await col('paidtournaments').findOne({});
    expect(String(doc.players[0].userId)).toBe(String(uid));
  });

  test('returns summary of deleted and anonymized counts', async () => {
    const uid = oid();
    await col('portfolios').insertOne({ userId: uid });
    await col('users').insertOne({ _id: uid });

    const result = await deleteAccount(uid);

    expect(result).toHaveProperty('deleted');
    expect(result).toHaveProperty('anonymized');
    expect(result.deleted['portfolios']).toBe(1);
    expect(result.deleted['users']).toBe(1);
  });

  test('handles empty collections without crashing', async () => {
    const uid = oid();
    await col('users').insertOne({ _id: uid });

    // No other docs — should complete without throwing
    await expect(deleteAccount(uid)).resolves.not.toThrow();
  });
});
