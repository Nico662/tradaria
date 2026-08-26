const express   = require('express');
const jwt       = require('jsonwebtoken');
const mongoose  = require('mongoose');
const Season    = require('../models/Season');
const season1   = require('../config/season1');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeLevel(bpPoints) {
  return Math.min(30, Math.floor(bpPoints / season1.BP_POINTS_PER_LEVEL));
}

/** Returns the active Season document if one exists, null otherwise. */
async function getActiveSeason() {
  const now = new Date();
  return Season.findOne({ startDate: { $lte: now }, endDate: { $gte: now } });
}

/** Ensures user.battlePass is initialised for the given seasonId in-memory.
 *  Caller must save the user document after calling this. */
function ensureBattlePassInit(user, seasonId) {
  if (!user.battlePass || user.battlePass.seasonId !== seasonId) {
    user.battlePass = { seasonId, bpPoints: 0, completedMissions: [], claimedRewards: [] };
    user.markModified('battlePass');
  }
}

// ── Auth middleware ───────────────────────────────────────────────────────────

async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET);
    const User    = mongoose.model('User');
    const user    = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── addBattlePassProgress ─────────────────────────────────────────────────────
// Internal function called by game events (Phase 5) and by the claim endpoint.
//
// userId    – Mongoose ObjectId or string
// points    – BP points to add (300 for mission, 10 for a game win)
// missionId – optional; if provided, checked for idempotency and added to
//             completedMissions so the same mission can never award points twice.
// source    – optional label for future logging ('mission' | 'game_win' |
//             'trading_mode' etc.). Trading Mode missions pass source:'trading_mode'
//             but are gated by enabled:true in season1.js before this is called.
//
// Returns { leveledUp, newLevel, alreadyCompleted, noActiveSeason }

async function addBattlePassProgress(userId, points, missionId = null, source = 'game_win') {
  const User   = mongoose.model('User');
  const season = await getActiveSeason();
  if (!season) return { leveledUp: false, newLevel: 0, noActiveSeason: true };

  const user = await User.findById(userId);
  if (!user) return { leveledUp: false, newLevel: 0 };

  // Idempotency: a mission can only be completed once per season
  if (missionId) {
    ensureBattlePassInit(user, season.seasonId);
    if (user.battlePass.completedMissions.includes(missionId)) {
      return { leveledUp: false, newLevel: computeLevel(user.battlePass.bpPoints), alreadyCompleted: true };
    }
  } else {
    ensureBattlePassInit(user, season.seasonId);
  }

  const oldLevel = computeLevel(user.battlePass.bpPoints);

  user.battlePass.bpPoints += points;
  if (missionId) user.battlePass.completedMissions.push(missionId);
  user.markModified('battlePass');

  await user.save();

  const newLevel = computeLevel(user.battlePass.bpPoints);
  return { leveledUp: newLevel > oldLevel, newLevel };
}

// ── GET /battle-pass/current-season ──────────────────────────────────────────
// Returns the active season + the authenticated user's progress.
// If no season is currently active, returns { season: null }.

router.get('/current-season', requireAuth, async (req, res) => {
  try {
    const season = await getActiveSeason();
    if (!season) return res.json({ season: null });

    const user = req.user;
    const bp   = (user.battlePass && user.battlePass.seasonId === season.seasonId)
      ? user.battlePass
      : null;

    const bpPoints    = bp ? bp.bpPoints : 0;
    const level       = computeLevel(bpPoints);
    const pointsToNextLevel = level < 30
      ? (level + 1) * season1.BP_POINTS_PER_LEVEL - bpPoints
      : 0;

    res.json({
      season: {
        seasonId:  season.seasonId,
        name:      season.name,
        startDate: season.startDate,
        endDate:   season.endDate,
      },
      user: {
        level,
        bpPoints,
        pointsToNextLevel,
        claimedRewards:    bp ? bp.claimedRewards    : [],
        completedMissions: bp ? bp.completedMissions : [],
      },
    });
  } catch (err) {
    console.error('[BP] GET /current-season error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /battle-pass/claim/:level ────────────────────────────────────────────
// Claims the reward(s) for the given level.
//
// Validation chain (all must pass, in order):
//   1. Active season exists
//   2. :level is an integer 1–30
//   3. User's seasonId matches current season (init if first access)
//   4. User has not already claimed this level
//   5. User's current level >= :level
//   6. At least one reward exists for this user's tier at this level:
//        – freeReward: always claimable (any user) if present
//        – proReward:  only claimable if user.isPro === true
//      → free user at an odd level (proReward only) gets PRO_REQUIRED
//
// On success:
//   – xp rewards    → added to user.xp
//   – badge rewards → added to user.badges (deduplicated)
//   – cosmetic rewards (frame/avatar/theme/effect/username_color)
//                   → added to user.purchases with source metadata
//   – ticket rewards→ added to user.battlePassItems (Fase 6d logic pending)
//   – level added to user.battlePass.claimedRewards
//
// Returns { claimed: levelNum, rewards: [...] }

router.post('/claim/:level', requireAuth, async (req, res) => {
  try {
    const levelNum = parseInt(req.params.level, 10);
    if (isNaN(levelNum) || levelNum < 1 || levelNum > 30)
      return res.status(400).json({ error: 'INVALID_LEVEL' });

    const season = await getActiveSeason();
    if (!season) return res.status(403).json({ error: 'NO_ACTIVE_SEASON' });

    const user = req.user;
    ensureBattlePassInit(user, season.seasonId);

    // Already claimed?
    if (user.battlePass.claimedRewards.includes(levelNum))
      return res.status(403).json({ error: 'ALREADY_CLAIMED' });

    // Level reached?
    const userLevel = computeLevel(user.battlePass.bpPoints);
    if (userLevel < levelNum)
      return res.status(403).json({ error: 'LEVEL_NOT_REACHED', currentLevel: userLevel });

    const levelCfg = season1.LEVELS[levelNum - 1];
    const grantFree = !!levelCfg.freeReward;
    const grantPro  = !!levelCfg.proReward && user.isPro;

    // No reward available for this user's tier?
    if (!grantFree && !grantPro)
      return res.status(403).json({ error: 'PRO_REQUIRED' });

    // Collect rewards to grant
    const toGrant = [];
    if (grantFree) toGrant.push(levelCfg.freeReward);
    if (grantPro)  toGrant.push(levelCfg.proReward);

    const rewardsGranted = [];

    for (const reward of toGrant) {
      switch (reward.type) {
        case 'xp':
          user.xp = (user.xp || 0) + reward.amount;
          break;

        case 'badge':
          if (!user.badges.includes(reward.itemId))
            user.badges.push(reward.itemId);
          break;

        case 'frame':
        case 'avatar':
        case 'theme':
        case 'effect':
        case 'username_color':
          // Store with provenance so inventory can filter by source/season
          if (!user.purchases.includes(reward.itemId))
            user.purchases.push(reward.itemId);
          break;

        case 'ticket':
          // Fase 6d: mechanic logic not yet implemented.
          // Reserve the slot in battlePassItems so the item is trackable.
          user.battlePassItems = user.battlePassItems || [];
          user.battlePassItems.push({ itemId: reward.itemId, used: false });
          break;
      }
      rewardsGranted.push(reward);
    }

    user.battlePass.claimedRewards.push(levelNum);
    user.markModified('battlePass');

    await user.save();

    res.json({ claimed: levelNum, rewards: rewardsGranted });
  } catch (err) {
    console.error('[BP] POST /claim error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { router, addBattlePassProgress };
