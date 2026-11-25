'use strict';
/**
 * DRY-RUN — Read-only audit of users with legacy claimedRewards.
 * Classifies each level per user as:
 *   FREE_ONLY     — level has no proReward at all
 *   PRO_DELIVERED — physical evidence found (badge/cosmetic/mechanic/ticket in user)
 *   PRO_AMBIGUOUS — proReward is XP (unverifiable) — may have already received it
 *   PRO_UNCLAIMED — proReward exists but no physical evidence → was NOT claimed
 *
 * Outputs nothing to DB.
 */
const mongoose = require('mongoose');
const season1  = require('../config/season1');
const { inferClaimedTracks } = require('../routes/battlepass');

const userSchema = new mongoose.Schema({}, { strict: false });
const LEVELS_WITH_DUAL_XP_PRO = new Set(
  season1.LEVELS
    .filter(l => !!l.freeReward && l.proReward?.type === 'xp')
    .map(l => l.level)
);

function isProRewardDelivered(proReward, user) {
  if (!proReward || !user) return false;
  switch (proReward.type) {
    case 'badge':          return (user.badges             || []).includes(proReward.itemId);
    case 'title':
    case 'frame':
    case 'avatar':
    case 'theme':
    case 'effect':
    case 'username_color': return (user.purchases           || []).includes(proReward.itemId);
    case 'mechanic':       return (user.battlePassMechanics || []).includes(proReward.itemId);
    case 'ticket':         return (user.battlePassItems      || []).some(i => i.itemId === proReward.itemId);
    case 'xp':
    default:               return false;
  }
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  let User;
  try { User = mongoose.model('User'); } catch { User = mongoose.model('User', userSchema); }

  // Only users with at least one legacy claim
  const users = await User.find({
    'battlePass.claimedRewards.0': { $exists: true },
  }).lean();

  console.log(`\nUsers with legacy claimedRewards: ${users.length}\n`);

  const xpRiskUsers = []; // users who might double-claim an XP Pro reward

  for (const user of users) {
    const bp = user.battlePass;
    if (!bp) continue;

    const legacyClaimed = bp.claimedRewards || [];
    const explicitFree  = new Set(bp.claimedFreeRewards || []);
    const explicitPro   = new Set(bp.claimedProRewards  || []);

    // Only audit legacy levels not yet in explicit arrays
    const legacyOnly = legacyClaimed.filter(n => !explicitFree.has(n) && !explicitPro.has(n));
    if (legacyOnly.length === 0) continue;

    const rows = [];
    for (const levelNum of legacyOnly) {
      const lvl = season1.LEVELS[levelNum - 1];
      if (!lvl) continue;

      const hasFree = !!lvl.freeReward;
      const hasPro  = !!lvl.proReward;

      if (!hasPro) {
        rows.push({ level: levelNum, classification: 'FREE_ONLY', evidence: '—' });
        continue;
      }

      if (!hasFree) {
        // Pro-only level → always inferred as Pro claimed (no XP risk from double-claim)
        rows.push({ level: levelNum, classification: 'PRO_INFERRED_PROONLY', evidence: 'pro-only level, safe' });
        continue;
      }

      // hasFree && hasPro
      if (lvl.proReward.type === 'xp') {
        rows.push({ level: levelNum, classification: 'PRO_AMBIGUOUS_XP', evidence: `xp(${lvl.proReward.amount}) — unverifiable` });
        xpRiskUsers.push({ userId: String(user._id), username: user.username || '(none)', level: levelNum, xpAmount: lvl.proReward.amount, isPro: !!user.isPro });
      } else if (isProRewardDelivered(lvl.proReward, user)) {
        rows.push({ level: levelNum, classification: 'PRO_DELIVERED', evidence: `${lvl.proReward.type}:${lvl.proReward.itemId} found` });
      } else {
        rows.push({ level: levelNum, classification: 'PRO_UNCLAIMED', evidence: `${lvl.proReward.type}:${lvl.proReward.itemId} absent` });
      }
    }

    if (rows.length > 0) {
      console.log(`  User: ${user.username || '—'} (${user._id}) isPro=${user.isPro}`);
      for (const r of rows) {
        console.log(`    Level ${r.level}: ${r.classification.padEnd(28)} ${r.evidence}`);
      }
    }
  }

  console.log('\n─────────────────────────────────────────────────────────────');
  console.log(`Levels with dual-track XP Pro reward: ${[...LEVELS_WITH_DUAL_XP_PRO].join(', ')}`);
  console.log(`Users at XP double-claim risk (isPro + legacy level in dual-XP range): `);

  const atRisk = xpRiskUsers.filter(u => u.isPro);
  if (atRisk.length === 0) {
    console.log('  NONE — no Pro users have a dual-track XP Pro level in legacy claimedRewards');
  } else {
    console.log(`  COUNT: ${atRisk.length}`);
    for (const u of atRisk) {
      console.log(`  ${u.username} (${u.userId}) — level ${u.level} Pro XP: +${u.xpAmount}`);
    }
  }

  console.log('\nTotal XP-ambiguous entries (Pro + non-Pro):');
  if (xpRiskUsers.length === 0) {
    console.log('  NONE');
  } else {
    for (const u of xpRiskUsers) {
      console.log(`  ${u.username} (${u.userId}) isPro=${u.isPro} — level ${u.level} +${u.xpAmount} XP`);
    }
  }

  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('NOTE: This script is READ-ONLY. No data was modified.');
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
