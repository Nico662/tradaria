'use strict';
// Verifica el estado de nico_founder y simula 1 partida de Classic Mode (correct=3)
// para confirmar el flujo completo de baseline + relativeProgress en producción.

const mongoose = require('mongoose');
const season1  = require('../config/season1');
const { processGameBpProgress, relativeProgress, mapGet } = require('../routes/battlepass');

const userSchema = new mongoose.Schema({
  username: String,
  isPro:    { type: Boolean, default: false },
  battlePass: {
    seasonId:                  Number,
    completedMissions:         { type: [String], default: [] },
    classicWinsTotal:          { type: Number,   default: 0 },
    survivalRoundsTotal:       { type: Number,   default: 0 },
    historicalEventsCompleted: { type: Number,   default: 0 },
    completedEventIds:         { type: [String], default: [] },
    arenaWinsTotal:            { type: Number,   default: 0 },
    missionBaselines:          { type: Map, of: Number, default: new Map() },
    missionStreakCounters:     { type: Map, of: Number, default: new Map() },
  },
}, { strict: false });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  let User;
  try { User = mongoose.model('User'); }
  catch { User = mongoose.model('User', userSchema); }

  // --- Antes ---
  const before = await User.findOne({ username: 'nico_founder' }).lean();
  if (!before) { console.error('nico_founder not found'); process.exit(1); }

  const bpBefore   = before.battlePass;
  const baseline   = mapGet(bpBefore.missionBaselines, 'bp_s1_l3_pro');
  const totalBefore = bpBefore.classicWinsTotal || 0;
  const progBefore  = relativeProgress('bp_s1_l3_pro', 'classic_wins', bpBefore);

  console.log('\n══ ANTES de la partida ══');
  console.log(`  classicWinsTotal        : ${totalBefore}`);
  console.log(`  missionBaselines[l3_pro]: ${baseline ?? '(no seteado — problema)'}`);
  console.log(`  relativeProgress        : ${progBefore} / 15`);

  // --- Simular partida (correct=3) ---
  const result = await processGameBpProgress(before._id, { mode: 'guess', correct: 3 });

  // --- Después ---
  const after      = await User.findById(before._id).lean();
  const bpAfter    = after.battlePass;
  const totalAfter = bpAfter.classicWinsTotal || 0;
  const progAfter  = relativeProgress('bp_s1_l3_pro', 'classic_wins', bpAfter);

  console.log('\n══ DESPUÉS (correct=3 simulado) ══');
  console.log(`  classicWinsTotal        : ${totalAfter}  (subió +${totalAfter - totalBefore})`);
  console.log(`  relativeProgress        : ${progAfter} / 15`);
  console.log(`  awardedMissions         : [${result.awardedMissions.join(', ') || 'ninguna'}]`);
  console.log(`  leveledUp               : ${result.leveledUp}`);

  console.log('\n══ Sanidad ══');
  console.log(`  baseline coincide con total previo : ${baseline === totalBefore ? 'SÍ ✓' : `NO — baseline=${baseline}, totalBefore=${totalBefore}`}`);
  console.log(`  progAfter = totalAfter - baseline   : ${progAfter === totalAfter - (baseline ?? 0) ? 'SÍ ✓' : 'NO'}`);

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
