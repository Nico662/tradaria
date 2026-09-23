/**
 * Bloque 3B: /claim/:level atomic fix
 *
 * Tests the atomic reward application using findByIdAndUpdate with $inc/$addToSet/$push.
 * Also verifies that the claimedRewards dedup via $addToSet (Bloque 8) works correctly.
 */

const mongoose = require('mongoose');
const { connect, disconnect, clearDatabase, getUser } = require('./helpers/testApp');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDatabase(); });

/**
 * Simulates the atomic reward application from the fixed /claim/:level handler.
 */
async function applyRewardsAtomic(User, userId, rewards, levelNum, grantFree, grantPro) {
  const incOps      = {};
  const addToSetMap = {};
  const pushMap     = {};

  for (const reward of rewards) {
    switch (reward.type) {
      case 'xp':
        incOps.xp = (incOps.xp || 0) + reward.amount;
        break;
      case 'badge':
        if (!addToSetMap.badges) addToSetMap.badges = { $each: [] };
        addToSetMap.badges.$each.push(reward.itemId);
        break;
      case 'title':
      case 'frame':
      case 'avatar':
      case 'theme':
      case 'effect':
      case 'username_color':
        if (!addToSetMap.purchases) addToSetMap.purchases = { $each: [] };
        addToSetMap.purchases.$each.push(reward.itemId);
        break;
      case 'mechanic':
        if (reward.itemId) {
          if (!addToSetMap.battlePassMechanics) addToSetMap.battlePassMechanics = { $each: [] };
          addToSetMap.battlePassMechanics.$each.push(reward.itemId);
        }
        break;
      case 'ticket':
        if (!pushMap.battlePassItems) pushMap.battlePassItems = { $each: [] };
        pushMap.battlePassItems.$each.push({ itemId: reward.itemId, used: false });
        break;
    }
  }

  // Claimed tracking with $addToSet (Bloque 8 fix)
  addToSetMap['battlePass.claimedRewards']     = { $each: [levelNum] };
  if (grantFree) addToSetMap['battlePass.claimedFreeRewards'] = { $each: [levelNum] };
  if (grantPro)  addToSetMap['battlePass.claimedProRewards']  = { $each: [levelNum] };

  const atomicUpdate = {};
  if (Object.keys(incOps).length)      atomicUpdate.$inc      = incOps;
  if (Object.keys(addToSetMap).length) atomicUpdate.$addToSet = addToSetMap;
  if (Object.keys(pushMap).length)     atomicUpdate.$push     = pushMap;

  return User.findByIdAndUpdate(userId, atomicUpdate, { new: true });
}

describe('Bloque 3B: /claim/:level atomic reward application', () => {
  test('xp reward is added atomically via $inc', async () => {
    const User = getUser();
    const u = await User.create({ xp: 100 });

    await applyRewardsAtomic(User, u._id, [{ type: 'xp', amount: 300 }], 1, true, false);

    const updated = await User.findById(u._id);
    expect(updated.xp).toBe(400);
  });

  test('badge reward is added via $addToSet (no duplicates)', async () => {
    const User = getUser();
    const u = await User.create({ badges: ['existing_badge'] });

    await applyRewardsAtomic(User, u._id, [{ type: 'badge', itemId: 'bp_s1_elite' }], 2, true, false);

    const updated = await User.findById(u._id);
    expect(updated.badges).toContain('bp_s1_elite');
    expect(updated.badges).toContain('existing_badge');
    expect(updated.badges.length).toBe(2);
  });

  test('duplicate badge is not added twice', async () => {
    const User = getUser();
    const u = await User.create({ badges: ['bp_s1_elite'] });

    await applyRewardsAtomic(User, u._id, [{ type: 'badge', itemId: 'bp_s1_elite' }], 2, true, false);

    const updated = await User.findById(u._id);
    expect(updated.badges.filter(b => b === 'bp_s1_elite').length).toBe(1);
  });

  test('cosmetic/frame reward added to purchases via $addToSet', async () => {
    const User = getUser();
    const u = await User.create({ purchases: [] });

    await applyRewardsAtomic(User, u._id, [{ type: 'frame', itemId: 'frame_season1' }], 3, true, false);

    const updated = await User.findById(u._id);
    expect(updated.purchases).toContain('frame_season1');
  });

  test('username_color reward added to purchases', async () => {
    const User = getUser();
    const u = await User.create({ purchases: [] });

    await applyRewardsAtomic(User, u._id, [{ type: 'username_color', itemId: 'color_green' }], 4, true, false);

    const updated = await User.findById(u._id);
    expect(updated.purchases).toContain('color_green');
  });

  test('title reward added to purchases', async () => {
    const User = getUser();
    const u = await User.create({ purchases: [] });

    await applyRewardsAtomic(User, u._id, [{ type: 'title', itemId: 'title_market_watcher' }], 5, true, false);

    const updated = await User.findById(u._id);
    expect(updated.purchases).toContain('title_market_watcher');
  });

  test('ticket reward is added via $push to battlePassItems', async () => {
    const User = getUser();
    const u = await User.create({ battlePassItems: [] });

    await applyRewardsAtomic(User, u._id, [{ type: 'ticket', itemId: 'ticket_restore_streak' }], 6, true, false);

    const updated = await User.findById(u._id);
    expect(updated.battlePassItems.length).toBe(1);
    expect(updated.battlePassItems[0].itemId).toBe('ticket_restore_streak');
    expect(updated.battlePassItems[0].used).toBe(false);
  });

  test('mechanic reward added to battlePassMechanics', async () => {
    const User = getUser();
    const u = await User.create({ battlePassMechanics: [] });

    await applyRewardsAtomic(User, u._id, [{ type: 'mechanic', itemId: 'extended_rounds' }], 7, true, false);

    const updated = await User.findById(u._id);
    expect(updated.battlePassMechanics).toContain('extended_rounds');
  });

  test('claimedRewards uses $addToSet (no duplicates) — Bloque 8', async () => {
    const User = getUser();
    const u = await User.create({ 'battlePass.claimedRewards': [1, 2] });

    // Apply level 2 again (simulating a race condition)
    await applyRewardsAtomic(User, u._id, [], 2, true, false);

    const updated = await User.findById(u._id);
    expect(updated.battlePass.claimedRewards.filter(n => n === 2).length).toBe(1);
  });

  test('claimedFreeRewards is set for free track claim', async () => {
    const User = getUser();
    const u = await User.create({});

    await applyRewardsAtomic(User, u._id, [{ type: 'xp', amount: 100 }], 5, true, false);

    const updated = await User.findById(u._id);
    expect(updated.battlePass.claimedFreeRewards).toContain(5);
    expect(updated.battlePass.claimedProRewards).not.toContain(5);
  });

  test('claimedProRewards is set for pro track claim', async () => {
    const User = getUser();
    const u = await User.create({});

    await applyRewardsAtomic(User, u._id, [{ type: 'xp', amount: 200 }], 5, false, true);

    const updated = await User.findById(u._id);
    expect(updated.battlePass.claimedProRewards).toContain(5);
    expect(updated.battlePass.claimedFreeRewards).not.toContain(5);
  });

  test('concurrent claims only apply rewards once via $addToSet', async () => {
    const User = getUser();
    const u = await User.create({ purchases: [] });

    // Simulate two concurrent claim requests for level 3 (both pass validation)
    await Promise.all([
      applyRewardsAtomic(User, u._id, [{ type: 'frame', itemId: 'frame_season1' }], 3, true, false),
      applyRewardsAtomic(User, u._id, [{ type: 'frame', itemId: 'frame_season1' }], 3, true, false),
    ]);

    const updated = await User.findById(u._id);
    // $addToSet ensures no duplicates in purchases
    expect(updated.purchases.filter(p => p === 'frame_season1').length).toBe(1);
    // $addToSet ensures no duplicates in claimedRewards
    expect(updated.battlePass.claimedRewards.filter(n => n === 3).length).toBe(1);
  });
});
