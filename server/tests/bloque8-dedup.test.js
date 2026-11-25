/**
 * Bloque 8: claimedRewards deduplication via $addToSet
 *
 * Validates that using $addToSet instead of $push for battlePass.claimedRewards
 * prevents duplicate level entries under any scenario.
 */

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase, getUser } = require('./helpers/testApp');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

describe('Bloque 8: claimedRewards dedup with $addToSet', () => {
  test('$addToSet prevents duplicate levelNum in claimedRewards', async () => {
    const User = getUser();
    const u = await User.create({ 'battlePass.claimedRewards': [1, 2] });

    // Try to add levelNum=2 again (simulating a race)
    await User.findByIdAndUpdate(u._id, {
      $addToSet: { 'battlePass.claimedRewards': { $each: [2] } },
    });

    const updated = await User.findById(u._id);
    expect(updated.battlePass.claimedRewards.filter(n => n === 2).length).toBe(1);
  });

  test('$addToSet with new levelNum does add it', async () => {
    const User = getUser();
    const u = await User.create({ 'battlePass.claimedRewards': [1, 2] });

    await User.findByIdAndUpdate(u._id, {
      $addToSet: { 'battlePass.claimedRewards': { $each: [3] } },
    });

    const updated = await User.findById(u._id);
    expect(updated.battlePass.claimedRewards).toContain(3);
    expect(updated.battlePass.claimedRewards.length).toBe(3);
  });

  test('OLD $push behavior would create duplicates (regression proof)', async () => {
    const User = getUser();
    const u = await User.create({ 'battlePass.claimedRewards': [1, 2] });

    // Simulate old push behavior
    await User.findByIdAndUpdate(u._id, {
      $push: { 'battlePass.claimedRewards': 2 },
    });

    const updated = await User.findById(u._id);
    // This WOULD create a duplicate — verifying the old bug
    expect(updated.battlePass.claimedRewards.filter(n => n === 2).length).toBe(2);
  });

  test('concurrent $addToSet calls produce no duplicates', async () => {
    const User = getUser();
    const u = await User.create({ 'battlePass.claimedRewards': [] });

    // Simulate two concurrent claim requests for level 5
    await Promise.all([
      User.findByIdAndUpdate(u._id, { $addToSet: { 'battlePass.claimedRewards': { $each: [5] } } }),
      User.findByIdAndUpdate(u._id, { $addToSet: { 'battlePass.claimedRewards': { $each: [5] } } }),
    ]);

    const updated = await User.findById(u._id);
    expect(updated.battlePass.claimedRewards.filter(n => n === 5).length).toBe(1);
  });

  test('claimedFreeRewards dedup via $addToSet', async () => {
    const User = getUser();
    const u = await User.create({ 'battlePass.claimedFreeRewards': [1] });

    await User.findByIdAndUpdate(u._id, {
      $addToSet: { 'battlePass.claimedFreeRewards': { $each: [1] } },
    });

    const updated = await User.findById(u._id);
    expect(updated.battlePass.claimedFreeRewards.filter(n => n === 1).length).toBe(1);
  });

  test('claimedProRewards dedup via $addToSet', async () => {
    const User = getUser();
    const u = await User.create({ 'battlePass.claimedProRewards': [3] });

    await User.findByIdAndUpdate(u._id, {
      $addToSet: { 'battlePass.claimedProRewards': { $each: [3] } },
    });

    const updated = await User.findById(u._id);
    expect(updated.battlePass.claimedProRewards.filter(n => n === 3).length).toBe(1);
  });
});
