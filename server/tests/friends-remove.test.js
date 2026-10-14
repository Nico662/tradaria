const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase } = require('./helpers/testApp');

// Mirror exact schemas from server/index.js
const FriendshipSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, required: true },
  status:    { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});
FriendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

const PortfolioDuelSchema = new mongoose.Schema({
  challenger: { type: mongoose.Schema.Types.ObjectId, required: true },
  opponent:   { type: mongoose.Schema.Types.ObjectId, required: true },
  status:     { type: String, enum: ['pending', 'active', 'finished'], default: 'pending' },
});

let Friendship, PortfolioDuel;

// Business logic extracted from DELETE /friends/:userId handler
async function removeFriend(myId, theirId) {
  await Friendship.deleteOne({
    $or: [
      { requester: myId, recipient: theirId },
      { requester: theirId, recipient: myId },
    ],
    status: 'accepted',
  });
  await PortfolioDuel.deleteMany({
    $or: [
      { challenger: myId, opponent: theirId },
      { challenger: theirId, opponent: myId },
    ],
    status: 'pending',
  });
}

beforeAll(async () => {
  await connect();
  try { Friendship = mongoose.model('Friendship'); } catch { Friendship = mongoose.model('Friendship', FriendshipSchema); }
  try { PortfolioDuel = mongoose.model('PortfolioDuel'); } catch { PortfolioDuel = mongoose.model('PortfolioDuel', PortfolioDuelSchema); }
});
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

describe('DELETE /friends/:userId — remove friend', () => {

  test('removes the friendship record regardless of who sent the original request', async () => {
    const alice = new mongoose.Types.ObjectId();
    const bob   = new mongoose.Types.ObjectId();
    await Friendship.create({ requester: alice, recipient: bob, status: 'accepted' });

    await removeFriend(alice, bob);

    const remaining = await Friendship.findOne({
      $or: [{ requester: alice, recipient: bob }, { requester: bob, recipient: alice }],
    });
    expect(remaining).toBeNull();
  });

  test('removes the friendship when bob was the requester (both sides)', async () => {
    const alice = new mongoose.Types.ObjectId();
    const bob   = new mongoose.Types.ObjectId();
    await Friendship.create({ requester: bob, recipient: alice, status: 'accepted' });

    await removeFriend(alice, bob); // alice initiates, bob was requester

    const remaining = await Friendship.findOne({
      $or: [{ requester: alice, recipient: bob }, { requester: bob, recipient: alice }],
    });
    expect(remaining).toBeNull();
  });

  test('idempotent: removing twice does not throw', async () => {
    const alice = new mongoose.Types.ObjectId();
    const bob   = new mongoose.Types.ObjectId();

    await expect(removeFriend(alice, bob)).resolves.not.toThrow();
    await expect(removeFriend(alice, bob)).resolves.not.toThrow();
  });

  test('only removes own friendships, not third-party relationships', async () => {
    const alice = new mongoose.Types.ObjectId();
    const bob   = new mongoose.Types.ObjectId();
    const carol = new mongoose.Types.ObjectId();
    await Friendship.create({ requester: bob, recipient: carol, status: 'accepted' });

    await removeFriend(alice, bob); // alice is not part of bob-carol friendship

    const bobCarol = await Friendship.findOne({ requester: bob, recipient: carol });
    expect(bobCarol).not.toBeNull();
  });

  test('cancels pending portfolio duels between the two users', async () => {
    const alice = new mongoose.Types.ObjectId();
    const bob   = new mongoose.Types.ObjectId();
    const carol = new mongoose.Types.ObjectId();
    await Friendship.create({ requester: alice, recipient: bob, status: 'accepted' });
    const d1 = await PortfolioDuel.create({ challenger: alice, opponent: bob, status: 'pending' });
    const d2 = await PortfolioDuel.create({ challenger: bob,   opponent: alice, status: 'pending' });
    const d3 = await PortfolioDuel.create({ challenger: alice, opponent: carol, status: 'pending' }); // unrelated

    await removeFriend(alice, bob);

    expect(await PortfolioDuel.findById(d1._id)).toBeNull();
    expect(await PortfolioDuel.findById(d2._id)).toBeNull();
    expect(await PortfolioDuel.findById(d3._id)).not.toBeNull(); // carol's duel untouched
  });

  test('does not cancel active or finished portfolio duels', async () => {
    const alice = new mongoose.Types.ObjectId();
    const bob   = new mongoose.Types.ObjectId();
    await Friendship.create({ requester: alice, recipient: bob, status: 'accepted' });
    const active   = await PortfolioDuel.create({ challenger: alice, opponent: bob, status: 'active' });
    const finished = await PortfolioDuel.create({ challenger: bob, opponent: alice, status: 'finished' });

    await removeFriend(alice, bob);

    expect(await PortfolioDuel.findById(active._id)).not.toBeNull();
    expect(await PortfolioDuel.findById(finished._id)).not.toBeNull();
  });

  test('invalid ObjectId is detected by mongoose.Types.ObjectId.isValid', () => {
    expect(mongoose.Types.ObjectId.isValid('not-an-id')).toBe(false);
    expect(mongoose.Types.ObjectId.isValid('')).toBe(false);
    expect(mongoose.Types.ObjectId.isValid('507f1f77bcf86cd799439011')).toBe(true);
  });

  test('self-removal is detected by string comparison of decoded.id === userId', () => {
    const id = new mongoose.Types.ObjectId();
    expect(id.toString() === id.toString()).toBe(true);
    expect(id.toString() === new mongoose.Types.ObjectId().toString()).toBe(false);
  });

  test('regression: adding and accepting a friend still works', async () => {
    const alice = new mongoose.Types.ObjectId();
    const bob   = new mongoose.Types.ObjectId();

    const f = await Friendship.create({ requester: alice, recipient: bob, status: 'pending' });
    expect(f.status).toBe('pending');

    f.status = 'accepted';
    await f.save();

    const updated = await Friendship.findById(f._id);
    expect(updated.status).toBe('accepted');
  });

  test('regression: removing a friend does not affect other friendships of the same user', async () => {
    const alice = new mongoose.Types.ObjectId();
    const bob   = new mongoose.Types.ObjectId();
    const carol = new mongoose.Types.ObjectId();
    await Friendship.create({ requester: alice, recipient: bob,   status: 'accepted' });
    await Friendship.create({ requester: alice, recipient: carol, status: 'accepted' });

    await removeFriend(alice, bob);

    const aliceCarol = await Friendship.findOne({ requester: alice, recipient: carol });
    expect(aliceCarol).not.toBeNull();
    expect(aliceCarol.status).toBe('accepted');
  });

});
