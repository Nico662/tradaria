// Impact assessment — read-only, zero writes
// Shows how many users have bp_s1_l21_pro unlocked (level >= 21)
// or already completed, and how many would auto-complete with the new target.

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const completed = await User.countDocuments({
    'battlePass.completedMissions': 'bp_s1_l21_pro',
  });

  // level 21 requires bpPoints >= 6300 (21 * 300)
  const unlocked = await User.countDocuments({
    'battlePass.seasonId': 1,
    'battlePass.bpPoints': { $gte: 6300 },
    'battlePass.completedMissions': { $ne: 'bp_s1_l21_pro' },
  });

  const wouldComplete = await User.countDocuments({
    'battlePass.seasonId': 1,
    'battlePass.bpPoints': { $gte: 6300 },
    'battlePass.completedMissions': { $ne: 'bp_s1_l21_pro' },
    'battlePass.arenaWinsTotal': { $gte: 5 },
  });

  const partial = await User.countDocuments({
    'battlePass.seasonId': 1,
    'battlePass.bpPoints': { $gte: 6300 },
    'battlePass.completedMissions': { $ne: 'bp_s1_l21_pro' },
    'battlePass.arenaWinsTotal': { $gte: 1, $lt: 5 },
  });

  console.log('--- Impact: L21 Pro arena_wins target 30 → 5 ---');
  console.log('Already completed (unchanged):', completed);
  console.log('Level 21 unlocked, mission pending:', unlocked);
  console.log('  arenaWinsTotal >= 5 (auto-complete on next arena win):', wouldComplete);
  console.log('  arenaWinsTotal 1-4 (partial progress, closer to goal):', partial);
  console.log('  arenaWinsTotal = 0 (no progress yet):', unlocked - wouldComplete - partial);

  await mongoose.disconnect();
}

main().catch(console.error);
