/**
 * accountDeletion.js
 *
 * Account deletion service — NOT wired to any route.
 *
 * Wire this to DELETE /auth/account only after:
 *   1. Full legal review of KEEP decisions (PaidTournament retention, Stripe records).
 *   2. QA in a staging environment against real data snapshots.
 *   3. Explicit sign-off in the A VERIFICAR list.
 *
 * Usage (once wired):
 *   const { deleteAccount } = require('./services/accountDeletion');
 *   await deleteAccount(userId, { redis });
 */

'use strict';

const mongoose = require('mongoose');

/**
 * deleteAccount
 *
 * @param {string|ObjectId} userId
 * @param {{ redis: import('@upstash/redis').Redis }} deps
 * @returns {Promise<{ deletedCollections: Record<string,number>, anonymizedCollections: Record<string,number> }>}
 */
async function deleteAccount(userId, { redis } = {}) {
  const uid = new mongoose.Types.ObjectId(String(userId));
  const col = (name) => mongoose.connection.collection(name);

  const deleted    = {};
  const anonymized = {};

  // ── 1. Direct-ownership deletes ───────────────────────────────────────────

  const directDeletes = [
    ['portfolios',               'userId'],
    ['portfoliohistories',       'userId'],
    ['scores',                   'userId'],
    ['gamehistories',            'userId'],
    ['tournamentsessions',       'userId'],
    ['tradingaccounts',          'userId'],
    ['tradingaccounthistories',  'userId'],
    ['tradingpositions',         'userId'],
    ['tradingtrades',            'userId'],
    ['pricealerts',              'userId'],
    ['positionnotes',            'userId'],
    ['portfolioorders',          'userId'],
  ];

  for (const [colName, field] of directDeletes) {
    const r = await col(colName).deleteMany({ [field]: uid });
    deleted[colName] = r.deletedCount;
  }

  // Academy feedback (fromId OR toId)
  const feedbackR = await col('academyfeedbacks').deleteMany({
    $or: [{ fromId: uid }, { toId: uid }],
  });
  deleted['academyfeedbacks'] = feedbackR.deletedCount;

  // Friendship (both sides)
  const friendR = await col('friendships').deleteMany({
    $or: [{ requester: uid }, { recipient: uid }],
  });
  deleted['friendships'] = friendR.deletedCount;

  // User document (last, after all refs cleaned up)
  const userR = await col('users').deleteOne({ _id: uid });
  deleted['users'] = userR.deletedCount;

  // ── 2. Shared / relational: anonymize ─────────────────────────────────────

  // PortfolioDuel — null out userId references
  let r;
  r = await col('portfolioduels').updateMany(
    { challenger: uid }, { $set: { challenger: null } }
  );
  anonymized['portfolioduels.challenger'] = r.modifiedCount;

  r = await col('portfolioduels').updateMany(
    { opponent: uid }, { $set: { opponent: null } }
  );
  anonymized['portfolioduels.opponent'] = r.modifiedCount;

  r = await col('portfolioduels').updateMany(
    { winner: uid }, { $set: { winner: null } }
  );
  anonymized['portfolioduels.winner'] = r.modifiedCount;

  // TradingDuel — null out userId references
  r = await col('tradingduels').updateMany(
    { challenger: uid }, { $set: { challenger: null } }
  );
  anonymized['tradingduels.challenger'] = r.modifiedCount;

  r = await col('tradingduels').updateMany(
    { opponent: uid }, { $set: { opponent: null } }
  );
  anonymized['tradingduels.opponent'] = r.modifiedCount;

  r = await col('tradingduels').updateMany(
    { winner: uid }, { $set: { winner: null } }
  );
  anonymized['tradingduels.winner'] = r.modifiedCount;

  // AsyncDuel — null out nested userId
  r = await col('asyncduels').updateMany(
    { 'challenger.userId': uid }, { $set: { 'challenger.userId': null } }
  );
  anonymized['asyncduels.challenger'] = r.modifiedCount;

  r = await col('asyncduels').updateMany(
    { 'rival.userId': uid }, { $set: { 'rival.userId': null } }
  );
  anonymized['asyncduels.rival'] = r.modifiedCount;

  // TradingLeague — pull from members, null owner
  r = await col('tradingleagues').updateMany(
    { 'members.userId': uid }, { $pull: { members: { userId: uid } } }
  );
  anonymized['tradingleagues.members'] = r.modifiedCount;

  r = await col('tradingleagues').updateMany(
    { owner: uid }, { $set: { owner: null } }
  );
  anonymized['tradingleagues.owner'] = r.modifiedCount;

  // Academy — pull from students, null ownerId
  r = await col('academies').updateMany(
    { students: uid }, { $pull: { students: uid } }
  );
  anonymized['academies.students'] = r.modifiedCount;

  r = await col('academies').updateMany(
    { ownerId: uid }, { $set: { ownerId: null } }
  );
  anonymized['academies.ownerId'] = r.modifiedCount;

  // AcademyAssignment — null createdBy, pull submission
  r = await col('academyassignments').updateMany(
    { createdBy: uid }, { $set: { createdBy: null } }
  );
  anonymized['academyassignments.createdBy'] = r.modifiedCount;

  r = await col('academyassignments').updateMany(
    { 'submissions.userId': uid }, { $pull: { submissions: { userId: uid } } }
  );
  anonymized['academyassignments.submissions'] = r.modifiedCount;

  // AcademyTournament — null createdBy, pull participant
  r = await col('academytournaments').updateMany(
    { createdBy: uid }, { $set: { createdBy: null } }
  );
  anonymized['academytournaments.createdBy'] = r.modifiedCount;

  r = await col('academytournaments').updateMany(
    { 'participants.userId': uid }, { $pull: { participants: { userId: uid } } }
  );
  anonymized['academytournaments.participants'] = r.modifiedCount;

  // PaidTournament — KEEP (financial record, legal obligation)
  // No operation performed.

  // ── 3. Redis keys ──────────────────────────────────────────────────────────

  if (redis) {
    // Remove individual keys
    await redis.del(`push_user_sub:${uid}`).catch(() => {});
    await redis.del(`apns_token:${uid}`).catch(() => {});

    // Remove from global push_subscriptions array
    try {
      const webSubRaw = await redis.get(`push_user_sub:${uid}`).catch(() => null);
      if (webSubRaw) {
        const webSub = typeof webSubRaw === 'string' ? JSON.parse(webSubRaw) : webSubRaw;
        const globalRaw = await redis.get('push_subscriptions').catch(() => null);
        if (globalRaw) {
          const allSubs = Array.isArray(globalRaw) ? globalRaw : JSON.parse(globalRaw);
          const filtered = allSubs.filter(s => s.endpoint !== webSub.endpoint);
          if (filtered.length !== allSubs.length) {
            await redis.set('push_subscriptions', JSON.stringify(filtered));
          }
        }
      }
    } catch (_) {}
  }

  return { deleted, anonymized };
}

module.exports = { deleteAccount };
