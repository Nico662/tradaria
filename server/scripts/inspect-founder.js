'use strict';
const mongoose = require('mongoose');
const { relativeProgress, mapGet, computeUserLevel } = require('../routes/battlepass');
const userSchema = new mongoose.Schema({ username: String, isPro: Boolean, battlePass: { type: mongoose.Schema.Types.Mixed } }, { strict: false });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  let User;
  try { User = mongoose.model('User'); } catch { User = mongoose.model('User', userSchema); }

  const u = await User.findOne({ username: 'nico_founder' }).lean();
  if (!u) { console.error('not found'); process.exit(1); }

  const bp = u.battlePass;
  console.log('isPro              :', u.isPro);
  console.log('seasonId           :', bp.seasonId);
  console.log('classicWinsTotal   :', bp.classicWinsTotal);
  console.log('computeUserLevel   :', computeUserLevel(bp.completedMissions, u.isPro));
  console.log('completedMissions  :', bp.completedMissions);
  console.log('missionBaselines   :', bp.missionBaselines);
  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
