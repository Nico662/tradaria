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

// ── tryAwardAtomic ────────────────────────────────────────────────────────────
// Fix D: atomic mission award using $addToSet + $ne filter.
// Returns true if the mission was newly awarded, false if already completed.
// Two concurrent calls with the same missionId are safe: the $ne filter ensures
// only one can win the race; the loser gets null and is a no-op.

async function tryAwardAtomic(userId, missionId, awardedMissions) {
  const User = mongoose.model('User');
  const r = await User.findOneAndUpdate(
    { _id: userId, 'battlePass.completedMissions': { $ne: missionId } },
    {
      $addToSet: { 'battlePass.completedMissions': missionId },
      $inc:      { 'battlePass.bpPoints': season1.BP_POINTS_PER_LEVEL },
    },
    { new: false }
  );
  if (r) { awardedMissions.push(missionId); return true; }
  return false;
}

// ── addBattlePassProgress ─────────────────────────────────────────────────────
// Internal function called by game events (Phase 5) and by the claim endpoint.
//
// userId    – Mongoose ObjectId or string
// points    – BP points to add (300 for mission, 10 for a game win)
// missionId – optional; if provided, checked atomically so same mission can
//             never award points twice.
// source    – optional label for logging ('mission' | 'game_win' | 'weekly_ranking')
//
// Returns { leveledUp, newLevel, alreadyCompleted, noActiveSeason }

async function addBattlePassProgress(userId, points, missionId = null, source = 'game_win') {
  const User   = mongoose.model('User');
  const season = await getActiveSeason();
  if (!season) return { leveledUp: false, newLevel: 0, noActiveSeason: true };

  // Ensure BP initialised for this season (atomic)
  await User.findOneAndUpdate(
    { _id: userId, 'battlePass.seasonId': { $ne: season.seasonId } },
    { $set: { battlePass: { seasonId: season.seasonId, bpPoints: 0, completedMissions: [], claimedRewards: [] } } }
  );

  if (missionId) {
    // Atomic award: only succeeds if mission not yet completed
    const r = await User.findOneAndUpdate(
      { _id: userId, 'battlePass.completedMissions': { $ne: missionId } },
      {
        $addToSet: { 'battlePass.completedMissions': missionId },
        $inc:      { 'battlePass.bpPoints': points },
      },
      { new: true }
    );
    if (!r) {
      // Filter matched nothing → mission already completed
      const user = await User.findById(userId);
      return { leveledUp: false, newLevel: computeLevel(user?.battlePass?.bpPoints ?? 0), alreadyCompleted: true };
    }
    const oldLevel = computeLevel(r.battlePass.bpPoints - points);
    const newLevel = computeLevel(r.battlePass.bpPoints);
    return { leveledUp: newLevel > oldLevel, newLevel };
  } else {
    // Game win: no idempotency by design (each win adds +10 BP)
    const r = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { 'battlePass.bpPoints': points } },
      { new: true }
    );
    if (!r) return { leveledUp: false, newLevel: 0 };
    const oldLevel = computeLevel(r.battlePass.bpPoints - points);
    const newLevel = computeLevel(r.battlePass.bpPoints);
    return { leveledUp: newLevel > oldLevel, newLevel };
  }
}

// ── inferClaimedTracks ────────────────────────────────────────────────────────
// For users who claimed rewards before the claimedFreeRewards/claimedProRewards
// fields existed, reconstruct which tracks were claimed from the legacy
// claimedRewards array (level numbers only, no track info).
//
// Inference rules per level present in legacy claimedRewards:
//   • free-only level  → claimedFree
//   • pro-only level   → claimedPro
//   • both tracks exist:
//       always → claimedFree (free reward was definitely claimed)
//       → claimedPro if user.isPro OR proMission is in completedMissions
//         (covers former-Pro users who downgraded after claiming)
//
// Returns plain arrays (not Sets) ready to send to the client.
function inferClaimedTracks(bp, user) {
  if (!bp) return { claimedFreeRewards: [], claimedProRewards: [] };

  const claimedFree = new Set(bp.claimedFreeRewards || []);
  const claimedPro  = new Set(bp.claimedProRewards  || []);

  for (const levelNum of (bp.claimedRewards || [])) {
    // Skip levels already recorded in the new fields (claimed post-fix)
    if (claimedFree.has(levelNum) || claimedPro.has(levelNum)) continue;

    const lvlCfg = season1.LEVELS[levelNum - 1];
    if (!lvlCfg) continue;

    const hasFree = !!lvlCfg.freeReward;
    const hasPro  = !!lvlCfg.proReward;

    if (hasFree && !hasPro) {
      claimedFree.add(levelNum);
    } else if (!hasFree && hasPro) {
      claimedPro.add(levelNum);
    } else if (hasFree && hasPro) {
      claimedFree.add(levelNum);
      const proMissionId = lvlCfg.proMission ? lvlCfg.proMission.id : null;
      const proWasClaimed = user.isPro ||
        (proMissionId && (bp.completedMissions || []).includes(proMissionId));
      if (proWasClaimed) claimedPro.add(levelNum);
    }
  }

  return {
    claimedFreeRewards: [...claimedFree],
    claimedProRewards:  [...claimedPro],
  };
}

// ── progressFor ──────────────────────────────────────────────────────────────
// Maps a mission config + stored bp counters → { current, target } for the UI.
// Returns null for disabled missions or unrecognised types (no progress bar shown).
function progressFor(m, bp, user) {
  if (!m || m.enabled === false || !bp) return null;

  // Level-30 completion missions have target=0 in config; compute real target dynamically.
  if (m.type === 'complete_all_free_missions') {
    const enabledFreeIds = season1.LEVELS.slice(0, 29)
      .filter(l => l.freeMission && l.freeMission.enabled !== false)
      .map(l => l.freeMission.id);
    const done = enabledFreeIds.filter(id => bp.completedMissions.includes(id)).length;
    return { current: done, target: enabledFreeIds.length };
  }
  if (m.type === 'complete_all_pro_missions') {
    const enabledProIds = season1.LEVELS.slice(0, 29)
      .filter(l => l.proMission && l.proMission.enabled !== false)
      .map(l => l.proMission.id);
    const done = enabledProIds.filter(id => bp.completedMissions.includes(id)).length;
    return { current: done, target: enabledProIds.length };
  }

  if (bp.completedMissions.includes(m.id)) return { current: m.target, target: m.target };
  switch (m.type) {
    case 'play_any_game':         return { current: 0,                                       target: m.target };
    case 'survival_rounds':       return { current: bp.survivalRoundsTotal       || 0,        target: m.target };
    case 'classic_streak':        return { current: bp.classicMaxStreak          || 0,        target: m.target };
    case 'classic_wins':          return { current: bp.classicWinsTotal          || 0,        target: m.target };
    case 'complete_daily':        return { current: bp.dailiesCompleted          || 0,        target: m.target };
    case 'daily_streak':
    case 'streak_days':           return { current: user.dailyStreak             || 0,        target: m.target };
    case 'arena_wins':            return { current: bp.arenaWinsTotal            || 0,        target: m.target };
    case 'historical_event':      return { current: bp.historicalEventsCompleted || 0,        target: m.target };
    case 'historical_all_events': return { current: (bp.completedEventIds || []).length,      target: m.target };
    default:                      return null;
  }
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

    // Progress for all 30 levels — used by the UI to show progress bars on every card.
    const allMissionProgress = bp ? season1.LEVELS.reduce((acc, lvlCfg) => {
      acc[lvlCfg.level] = {
        free: lvlCfg.freeMission ? progressFor(lvlCfg.freeMission, bp, user) : null,
        pro:  lvlCfg.proMission  ? progressFor(lvlCfg.proMission,  bp, user) : null,
      };
      return acc;
    }, {}) : null;

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
        ...inferClaimedTracks(bp, user),
        completedMissions: bp ? bp.completedMissions : [],
        allMissionProgress,
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
//   4. Per-track ALREADY_CLAIMED check (Fix C: uses inferClaimedTracks, not legacy flat array)
//   5. User's current level >= :level
//   6. Mission-specific completion check per track (Fix G):
//        – freeMission must be in completedMissions (unless disabled/null)
//        – proMission  must be in completedMissions (unless disabled/null)
//   7. At least one reward exists for this user's tier:
//        – freeReward: always claimable (any user) if present and not yet claimed
//        – proReward:  only claimable if user.isPro === true and not yet claimed
//      → free user at an odd level (proReward only) gets PRO_REQUIRED
//
// On success:
//   – xp rewards    → added to user.xp
//   – badge rewards → added to user.badges (deduplicated)
//   – cosmetic rewards (frame/avatar/theme/effect/username_color)
//                   → added to user.purchases with source metadata
//   – ticket rewards→ added to user.battlePassItems
//   – level added to user.battlePass.claimedRewards (legacy) + per-track arrays
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

    const levelCfg = season1.LEVELS[levelNum - 1];

    // Fix C: per-track ALREADY_CLAIMED check using inferClaimedTracks.
    // Replaces the old per-level check so Free→Pro upgrades can still claim the Pro track.
    const { claimedFreeRewards, claimedProRewards } = inferClaimedTracks(user.battlePass, user);
    const freeAlreadyClaimed = claimedFreeRewards.includes(levelNum);
    const proAlreadyClaimed  = claimedProRewards.includes(levelNum);

    // Level reached?
    const userLevel = computeLevel(user.battlePass.bpPoints);
    if (userLevel < levelNum)
      return res.status(403).json({ error: 'LEVEL_NOT_REACHED', currentLevel: userLevel });

    // Determine which tracks will be granted (accounting for already-claimed tracks)
    const grantFree = !!levelCfg.freeReward  && !freeAlreadyClaimed;
    const grantPro  = !!levelCfg.proReward   && user.isPro && !proAlreadyClaimed;

    // No reward available (all applicable tracks already claimed, or user is Free at Pro-only level)?
    if (!grantFree && !grantPro) {
      // Distinguish between "already claimed everything" vs "Pro required"
      const hasAnyClaimed = freeAlreadyClaimed || proAlreadyClaimed;
      return res.status(403).json({ error: hasAnyClaimed ? 'ALREADY_CLAIMED' : 'PRO_REQUIRED' });
    }

    // Fix G: mission-specific completion check per track.
    // Disabled missions (Trading Mode, enabled===false) are exempt — they can't be
    // completed yet, so BP-level gating remains as the only guard for those levels.
    if (grantFree && levelCfg.freeMission?.enabled !== false) {
      if (!user.battlePass.completedMissions.includes(levelCfg.freeMission.id))
        return res.status(403).json({ error: 'MISSION_NOT_COMPLETED', missionId: levelCfg.freeMission.id });
    }
    if (grantPro && levelCfg.proMission?.enabled !== false) {
      if (!user.battlePass.completedMissions.includes(levelCfg.proMission.id))
        return res.status(403).json({ error: 'MISSION_NOT_COMPLETED', missionId: levelCfg.proMission.id });
    }

    // Collect rewards to grant
    const toGrant = [];
    if (grantFree) toGrant.push({ ...levelCfg.freeReward, track: 'free' });
    if (grantPro)  toGrant.push({ ...levelCfg.proReward,  track: 'pro'  });

    const rewardsGranted = [];

    // Build atomic update
    const incOps      = {};
    const addToSetMap = {};
    const pushMap     = {};

    for (const reward of toGrant) {
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
      rewardsGranted.push(reward);
    }

    // Claimed tracking — $addToSet prevents duplicates (fixes Bloque 8 too)
    addToSetMap['battlePass.claimedRewards']     = { $each: [levelNum] };
    if (grantFree) addToSetMap['battlePass.claimedFreeRewards'] = { $each: [levelNum] };
    if (grantPro)  addToSetMap['battlePass.claimedProRewards']  = { $each: [levelNum] };

    const atomicUpdate = {};
    if (Object.keys(incOps).length)      atomicUpdate.$inc      = incOps;
    if (Object.keys(addToSetMap).length) atomicUpdate.$addToSet = addToSetMap;
    if (Object.keys(pushMap).length)     atomicUpdate.$push     = pushMap;

    const User = mongoose.model('User');
    await User.findByIdAndUpdate(user._id, atomicUpdate);

    res.json({ claimed: levelNum, rewards: rewardsGranted });
  } catch (err) {
    console.error('[BP] POST /claim error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Shared helper: build missionsByType index from season config ──────────────
function buildMissionsByType() {
  const map = {};
  for (const lvl of season1.LEVELS) {
    for (const m of [lvl.freeMission, lvl.proMission]) {
      if (!m || !m.enabled) continue;
      if (!map[m.type]) map[m.type] = [];
      map[m.type].push(m);
    }
  }
  return map;
}

// Enabled mission IDs for each track, excluding level 30 (the completion missions themselves).
// enabled:false missions (Trading Mode, not yet live) are excluded so level 30 is reachable.
const ENABLED_FREE_MISSION_IDS = season1.LEVELS.slice(0, 29)
  .filter(l => l.freeMission && l.freeMission.enabled !== false)
  .map(l => l.freeMission.id);

const ENABLED_PRO_MISSION_IDS = season1.LEVELS.slice(0, 29)
  .filter(l => l.proMission && l.proMission.enabled !== false)
  .map(l => l.proMission.id);

// ── checkLevel30Atomic ────────────────────────────────────────────────────────
// Fix D: atomic replacement for checkLevel30 + checkCompletionBpMissions.
// Reads the latest completedMissions state and awards level-30 completion
// missions via tryAwardAtomic. Safe under concurrent access.

async function checkLevel30Atomic(userId, awardedMissions) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  if (!user?.battlePass) return;
  const completedSet   = new Set(user.battlePass.completedMissions);
  const missionsByType = buildMissionsByType();
  if (ENABLED_FREE_MISSION_IDS.every(id => completedSet.has(id))) {
    for (const m of missionsByType['complete_all_free_missions'] || [])
      await tryAwardAtomic(userId, m.id, awardedMissions);
  }
  if (ENABLED_PRO_MISSION_IDS.every(id => completedSet.has(id))) {
    for (const m of missionsByType['complete_all_pro_missions'] || [])
      await tryAwardAtomic(userId, m.id, awardedMissions);
  }
}

// ── processGameBpProgress ─────────────────────────────────────────────────────
// Called from POST /stats/game after recording the game in GameHistory.
// Fix D: all counter updates use atomic $inc/$max/$addToSet.
// Fix A: Classic Mode uses mode==='guess' (App.jsx sends 'guess', not 'classic').
// Fix F: Historical mode now calls this function (Historical.jsx was patched).
//
// Returns { leveledUp, newLevel, awardedMissions: [missionId, ...] }

async function processGameBpProgress(userId, { mode, streak = 0, rounds = 0, correct = 0, eventId = null }) {
  const User   = mongoose.model('User');
  const season = await getActiveSeason();
  if (!season) return { leveledUp: false, newLevel: 0, awardedMissions: [] };

  // 1. Ensure BP initialised for this season (atomic, no-op if already correct)
  await User.findOneAndUpdate(
    { _id: userId, 'battlePass.seasonId': { $ne: season.seasonId } },
    { $set: { battlePass: { seasonId: season.seasonId, bpPoints: 0, completedMissions: [], claimedRewards: [] } } }
  );

  // 2. Build atomic counter update for this game's mode
  const incOps    = {};
  const maxOps    = {};
  const addSetOps = {};

  if (mode === 'survival' && rounds > 0) {
    incOps['battlePass.survivalRoundsTotal'] = rounds;
  }
  // Fix A: was mode === 'classic', now mode === 'guess' (Classic Mode internal identifier)
  if (mode === 'guess') {
    if (streak  > 0) maxOps['battlePass.classicMaxStreak']  = streak;
    if (correct > 0) incOps['battlePass.classicWinsTotal']  = correct;
  }
  if (mode === 'historical') {
    incOps['battlePass.historicalEventsCompleted'] = 1;
    if (eventId) addSetOps['battlePass.completedEventIds'] = eventId;
  }

  const counterUpdate = {};
  if (Object.keys(incOps).length)    counterUpdate.$inc      = incOps;
  if (Object.keys(maxOps).length)    counterUpdate.$max      = maxOps;
  if (Object.keys(addSetOps).length) counterUpdate.$addToSet = addSetOps;

  let user;
  if (Object.keys(counterUpdate).length > 0) {
    user = await User.findOneAndUpdate({ _id: userId }, counterUpdate, { new: true });
  } else {
    user = await User.findById(userId);
  }
  if (!user) return { leveledUp: false, newLevel: 0, awardedMissions: [] };

  const bp             = user.battlePass;
  const oldLevel       = computeLevel(bp.bpPoints);
  const awardedMissions = [];
  const missionsByType = buildMissionsByType();

  // 3. Award missions atomically based on updated counter values

  // play_any_game — any game in any mode counts (Fix F: now also fires for Daily/Historical)
  for (const m of missionsByType['play_any_game'] || []) {
    await tryAwardAtomic(userId, m.id, awardedMissions);
  }

  // survival_rounds — cumulative rounds survived
  if (mode === 'survival' && rounds > 0) {
    for (const m of missionsByType['survival_rounds'] || []) {
      if (bp.survivalRoundsTotal >= m.target) await tryAwardAtomic(userId, m.id, awardedMissions);
    }
  }

  // classic_streak + classic_wins (mode 'guess' = Classic Mode)
  if (mode === 'guess') {
    if (streak > 0) {
      for (const m of missionsByType['classic_streak'] || []) {
        if (bp.classicMaxStreak >= m.target) await tryAwardAtomic(userId, m.id, awardedMissions);
      }
    }
    if (correct > 0) {
      for (const m of missionsByType['classic_wins'] || []) {
        if (bp.classicWinsTotal >= m.target) await tryAwardAtomic(userId, m.id, awardedMissions);
      }
    }
  }

  // historical_event + historical_all_events (Fix F: Historical.jsx now calls /stats/game)
  if (mode === 'historical') {
    for (const m of missionsByType['historical_event'] || []) {
      if (bp.historicalEventsCompleted >= m.target) await tryAwardAtomic(userId, m.id, awardedMissions);
    }
    const uniqueCount = (bp.completedEventIds || []).length;
    for (const m of missionsByType['historical_all_events'] || []) {
      if (uniqueCount >= m.target) await tryAwardAtomic(userId, m.id, awardedMissions);
    }
  }

  // Level-30 completion missions (checked after all other awards)
  await checkLevel30Atomic(userId, awardedMissions);

  const finalUser = await User.findById(userId);
  const newLevel  = computeLevel(finalUser.battlePass.bpPoints);
  return { leveledUp: newLevel > oldLevel, newLevel, awardedMissions };
}

// ── processDailyBpProgress ────────────────────────────────────────────────────
// Called from POST /daily/complete (Phase 5B).
// Fix F: now also awards play_any_game missions (completing a daily = playing a game).
// Fix D: atomic counter updates.
//
// Returns { leveledUp, newLevel, awardedMissions: [missionId, ...] }

async function processDailyBpProgress(userId, { newStreak }) {
  const User   = mongoose.model('User');
  const season = await getActiveSeason();
  if (!season) return { leveledUp: false, newLevel: 0, awardedMissions: [] };

  // Ensure BP initialised (atomic)
  await User.findOneAndUpdate(
    { _id: userId, 'battlePass.seasonId': { $ne: season.seasonId } },
    { $set: { battlePass: { seasonId: season.seasonId, bpPoints: 0, completedMissions: [], claimedRewards: [] } } }
  );

  // Atomically increment dailiesCompleted and return updated doc
  const user = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { 'battlePass.dailiesCompleted': 1 } },
    { new: true }
  );
  if (!user) return { leveledUp: false, newLevel: 0, awardedMissions: [] };

  const bp             = user.battlePass;
  const oldLevel       = computeLevel(bp.bpPoints);
  const awardedMissions = [];
  const missionsByType = buildMissionsByType();

  // Fix F: completing a daily counts as playing a game
  for (const m of missionsByType['play_any_game'] || []) {
    await tryAwardAtomic(userId, m.id, awardedMissions);
  }

  // complete_daily — cumulative dailies completed (3, 5, 20, 40, 50)
  for (const m of missionsByType['complete_daily'] || []) {
    if (bp.dailiesCompleted >= m.target) await tryAwardAtomic(userId, m.id, awardedMissions);
  }

  // daily_streak + streak_days — both measure consecutive daily streak
  for (const m of missionsByType['daily_streak'] || []) {
    if (newStreak >= m.target) await tryAwardAtomic(userId, m.id, awardedMissions);
  }
  for (const m of missionsByType['streak_days'] || []) {
    if (newStreak >= m.target) await tryAwardAtomic(userId, m.id, awardedMissions);
  }

  await checkLevel30Atomic(userId, awardedMissions);

  const finalUser = await User.findById(userId);
  const newLevel  = computeLevel(finalUser.battlePass.bpPoints);
  return { leveledUp: newLevel > oldLevel, newLevel, awardedMissions };
}

// ── processArenaWinBpProgress ─────────────────────────────────────────────────
// Called when a user wins an Arena duel (real-time socket or async). (Phase 5D)
// Fix D: atomic $inc + atomic mission award.
//
// Returns { leveledUp, newLevel, awardedMissions: [missionId, ...] }

async function processArenaWinBpProgress(userId) {
  const User   = mongoose.model('User');
  const season = await getActiveSeason();
  if (!season) return { leveledUp: false, newLevel: 0, awardedMissions: [] };

  // Ensure BP initialised (atomic)
  await User.findOneAndUpdate(
    { _id: String(userId), 'battlePass.seasonId': { $ne: season.seasonId } },
    { $set: { battlePass: { seasonId: season.seasonId, bpPoints: 0, completedMissions: [], claimedRewards: [] } } }
  );

  // Atomically increment arenaWinsTotal
  const user = await User.findOneAndUpdate(
    { _id: String(userId) },
    { $inc: { 'battlePass.arenaWinsTotal': 1 } },
    { new: true }
  );
  if (!user) return { leveledUp: false, newLevel: 0, awardedMissions: [] };

  const bp             = user.battlePass;
  const oldLevel       = computeLevel(bp.bpPoints);
  const awardedMissions = [];
  const missionsByType = buildMissionsByType();

  for (const m of missionsByType['arena_wins'] || []) {
    if (bp.arenaWinsTotal >= m.target) await tryAwardAtomic(String(userId), m.id, awardedMissions);
  }

  await checkLevel30Atomic(String(userId), awardedMissions);

  const finalUser = await User.findById(String(userId));
  const newLevel  = computeLevel(finalUser.battlePass.bpPoints);
  return { leveledUp: newLevel > oldLevel, newLevel, awardedMissions };
}

// ── checkCompletionBpMissions ─────────────────────────────────────────────────
// Checks level-30 completion missions for a user after events that don't go
// through the process* functions (e.g. the weekly ranking cron).
// Fix D: now delegates to checkLevel30Atomic for correct atomicity.

async function checkCompletionBpMissions(userId) {
  const season = await getActiveSeason();
  if (!season) return;
  const awardedMissions = [];
  await checkLevel30Atomic(String(userId), awardedMissions);
}

module.exports = {
  router,
  addBattlePassProgress,
  processGameBpProgress,
  processDailyBpProgress,
  processArenaWinBpProgress,
  checkCompletionBpMissions,
};
