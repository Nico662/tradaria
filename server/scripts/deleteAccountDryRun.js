/**
 * deleteAccountDryRun.js — read-only account-deletion inventory
 *
 * ZERO WRITES — this script never modifies the database or Redis.
 * It counts affected documents per collection and prints the proposed action.
 *
 * Usage:
 *   node server/scripts/deleteAccountDryRun.js --userId <mongoId>
 *   node server/scripts/deleteAccountDryRun.js --email <email>
 *
 * Exit codes: 0 = found and printed, 1 = user not found, 2 = missing arg / error
 */

'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const { Redis } = require('@upstash/redis');

// ── Parse CLI args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let targetUserId = null;
let targetEmail  = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--userId') targetUserId = args[i + 1];
  if (args[i] === '--email')  targetEmail  = args[i + 1];
}

if (!targetUserId && !targetEmail) {
  console.error('Usage: node deleteAccountDryRun.js --userId <id> | --email <email>');
  process.exit(2);
}

// ── Minimal model re-declarations (read-only, no routes loaded) ───────────────

const UserSchema = new mongoose.Schema({}, { strict: false });

const col = (name) => mongoose.connection.collection(name);

// ── Helpers ───────────────────────────────────────────────────────────────────

const oid = (id) => new mongoose.Types.ObjectId(String(id));

function row(label, count, action, note) {
  const countStr = String(count).padStart(5);
  const noteStr  = note ? `  ← ${note}` : '';
  console.log(`  ${countStr}  ${action.padEnd(42)}  ${label}${noteStr}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) { console.error('MONGODB_URI not set'); process.exit(2); }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

  // 1. Resolve user
  const User = mongoose.model('User', UserSchema, 'users');
  const query = targetUserId
    ? { _id: oid(targetUserId) }
    : { email: targetEmail };

  const user = await User.findOne(query).lean();
  if (!user) {
    console.error(`User not found: ${targetUserId || targetEmail}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const uid = user._id;
  console.log('\n════════════════════════════════════════════════════════════');
  console.log(' ACCOUNT DELETION DRY RUN — READ-ONLY — ZERO WRITES');
  console.log('════════════════════════════════════════════════════════════');
  console.log(` userId  : ${uid}`);
  console.log(` email   : ${user.email || '(none)'}`);
  console.log(` username: ${user.username || '(none)'}`);
  console.log(` created : ${user.createdAt || '(unknown)'}`);
  console.log('────────────────────────────────────────────────────────────');
  console.log('  Count  Action                                              Collection');
  console.log('────────────────────────────────────────────────────────────');

  // ── Direct-ownership collections: DELETE all docs with userId === uid ────────
  const directDeletes = [
    ['portfolios',           'userId'],
    ['portfoliohistories',   'userId'],
    ['scores',               'userId'],
    ['gamehistories',        'userId'],
    ['tournamentsessions',   'userId'],
    ['tradingaccounts',      'userId'],
    ['tradingaccounthistories', 'userId'],
    ['tradingpositions',     'userId'],
    ['tradingtrades',        'userId'],
    ['pricealerts',          'userId'],
    ['positionnotes',        'userId'],
    ['portfolioorders',      'userId'],
  ];

  for (const [colName, field] of directDeletes) {
    const count = await col(colName).countDocuments({ [field]: uid });
    row(colName, count, 'DELETE (owned docs)', '');
  }

  // User document itself
  row('users', 1, 'DELETE (user document)', '');

  // Academy feedback (fromId OR toId)
  const feedbackCount = await col('academyfeedbacks').countDocuments({
    $or: [{ fromId: uid }, { toId: uid }],
  });
  row('academyfeedbacks', feedbackCount, 'DELETE (sent/received feedback)', '');

  // Friendship (requester OR recipient)
  const friendCount = await col('friendships').countDocuments({
    $or: [{ requester: uid }, { recipient: uid }],
  });
  row('friendships', friendCount, 'DELETE (both sides)', '');

  // ── Shared / relational collections: ANONYMIZE ───────────────────────────────

  const portfolioDuelChallenger = await col('portfolioduels').countDocuments({ challenger: uid });
  const portfolioDuelOpponent   = await col('portfolioduels').countDocuments({ opponent: uid });
  row('portfolioduels (as challenger)', portfolioDuelChallenger, 'ANONYMIZE (null userId)', '');
  row('portfolioduels (as opponent)',   portfolioDuelOpponent,   'ANONYMIZE (null userId)', '');

  const tradingDuelChallenger = await col('tradingduels').countDocuments({ challenger: uid });
  const tradingDuelOpponent   = await col('tradingduels').countDocuments({ opponent: uid });
  row('tradingduels (as challenger)', tradingDuelChallenger, 'ANONYMIZE (null userId)', '');
  row('tradingduels (as opponent)',   tradingDuelOpponent,   'ANONYMIZE (null userId)', '');

  const asyncDuelChallenger = await col('asyncduels').countDocuments({ 'challenger.userId': uid });
  const asyncDuelRival      = await col('asyncduels').countDocuments({ 'rival.userId': uid });
  row('asyncduels (as challenger)', asyncDuelChallenger, 'ANONYMIZE (null userId)', '');
  row('asyncduels (as rival)',      asyncDuelRival,      'ANONYMIZE (null userId)', '');

  // TradingLeague: pull from members array; if owner → orphan (no deletion yet)
  const leagueMember = await col('tradingleagues').countDocuments({ 'members.userId': uid });
  const leagueOwner  = await col('tradingleagues').countDocuments({ owner: uid });
  row('tradingleagues (as member)', leagueMember, 'ANONYMIZE ($pull from members)', '');
  row('tradingleagues (as owner)',  leagueOwner,  'ANONYMIZE (null owner field)',   'league persists without owner');

  // Academy: pull from students; if owner → orphan
  const academyStudent = await col('academies').countDocuments({ students: uid });
  const academyOwner   = await col('academies').countDocuments({ ownerId: uid });
  row('academies (as student)', academyStudent, 'ANONYMIZE ($pull from students)', '');
  row('academies (as owner)',   academyOwner,   'ANONYMIZE (null ownerId)',         'A VERIFICAR — academy may need transfer');

  // AcademyAssignment: anonymize createdBy; pull submission
  const assignCreator   = await col('academyassignments').countDocuments({ createdBy: uid });
  const assignSubmitter = await col('academyassignments').countDocuments({ 'submissions.userId': uid });
  row('academyassignments (as creator)',   assignCreator,   'ANONYMIZE (null createdBy)',     '');
  row('academyassignments (as submitter)', assignSubmitter, 'ANONYMIZE ($pull submission)',   '');

  // AcademyTournament: anonymize createdBy; pull participant
  const atCreator     = await col('academytournaments').countDocuments({ createdBy: uid });
  const atParticipant = await col('academytournaments').countDocuments({ 'participants.userId': uid });
  row('academytournaments (as creator)',     atCreator,     'ANONYMIZE (null createdBy)',   '');
  row('academytournaments (as participant)', atParticipant, 'ANONYMIZE ($pull participant)', '');

  // ── KEEP — legal obligation ──────────────────────────────────────────────────

  const paidCount = await col('paidtournaments').countDocuments({
    $or: [{ 'players.userId': uid }, { winner: uid }, { createdBy: uid }],
  });
  row('paidtournaments', paidCount,
    'KEEP (financial record — 7 yr legal)',
    'A VERIFICAR — confirm retention period with legal');

  // Stripe Customer ID on User
  if (user.stripeCustomerId) {
    row('Stripe customer', 1,
      'KEEP (Stripe record — 7 yr legal)',
      `stripeCustomerId: ${user.stripeCustomerId}`);
  }

  // ── Redis keys ───────────────────────────────────────────────────────────────

  console.log('────────────────────────────────────────────────────────────');
  console.log(' Redis keys (checked via Upstash REST)');
  console.log('────────────────────────────────────────────────────────────');

  const redisUrl   = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;

  if (redisUrl && redisToken) {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    const keysToCheck = [
      `push_user_sub:${uid}`,
      `apns_token:${uid}`,
    ];
    for (const key of keysToCheck) {
      const val = await redis.get(key).catch(() => null);
      const exists = val !== null;
      row(key, exists ? 1 : 0, exists ? 'DELETE (Redis key)' : 'SKIP (not found)', '');
    }
    // Check global push_subscriptions array for matching endpoint
    const globalSubs = await redis.get('push_subscriptions').catch(() => null);
    if (globalSubs) {
      const webSub = await redis.get(`push_user_sub:${uid}`).catch(() => null);
      let globalMatchCount = 0;
      if (webSub) {
        const parsed = typeof webSub === 'string' ? JSON.parse(webSub) : webSub;
        const allSubs = Array.isArray(globalSubs) ? globalSubs : JSON.parse(globalSubs);
        globalMatchCount = allSubs.filter(s => s.endpoint === parsed.endpoint).length;
      }
      row('push_subscriptions (global array)', globalMatchCount,
        globalMatchCount > 0 ? 'ANONYMIZE ($pull by endpoint)' : 'SKIP (not found)', '');
    }
  } else {
    console.log('  (Upstash credentials not set — Redis check skipped)');
  }

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log('════════════════════════════════════════════════════════════');
  console.log(' A VERIFICAR POR NICO:');
  console.log('  1. Academy owned by this user may need manual transfer or closure.');
  console.log('  2. PaidTournament retention period — confirm 7-year rule applies.');
  console.log('  3. Stripe customer record — verify if cancellation required.');
  console.log('  4. International transfers section in Privacy.jsx (marked A VERIFICAR).');
  console.log('  5. Wire accountDeletion.js to DELETE /auth/account when ready.');
  console.log('════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(2);
});
