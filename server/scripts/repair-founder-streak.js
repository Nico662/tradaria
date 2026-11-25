'use strict';
const mongoose = require('mongoose');
require('dotenv').config();

const TARGET_ID          = '69e50b1d14eb53add1505fe3';
const EXPECTED_STREAK    = 94;
const EXPECTED_SBL       = 94;
const EXPECTED_LAST      = '2026-10-22';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.collection('users');

  // ── BEFORE ──────────────────────────────────────────────────────────────────
  const before = await col.findOne({ _id: new mongoose.Types.ObjectId(TARGET_ID) });
  if (!before) { console.error('Usuario no encontrado'); process.exit(1); }

  const tickets = (before.battlePassItems || []).filter(t => t.itemId === 'ticket_restore_streak');
  console.log('=== ANTES ===');
  console.log('dailyStreak      :', before.dailyStreak);
  console.log('lastPlayed       :', before.lastPlayed);
  console.log('streakBeforeLoss :', before.streakBeforeLoss);
  console.log('tickets          :', JSON.stringify(tickets));

  // ── GUARD ────────────────────────────────────────────────────────────────────
  const lpStr = before.lastPlayed instanceof Date
    ? before.lastPlayed.toISOString().slice(0, 10)
    : before.lastPlayed;

  if (
    before.dailyStreak    !== EXPECTED_STREAK ||
    before.streakBeforeLoss !== EXPECTED_SBL  ||
    lpStr                 !== EXPECTED_LAST
  ) {
    console.log('\nEstado distinto al esperado, no se escribe nada');
    await mongoose.disconnect();
    process.exit(0);
  }

  // ── WRITE ────────────────────────────────────────────────────────────────────
  const result = await col.findOneAndUpdate(
    {
      _id:              new mongoose.Types.ObjectId(TARGET_ID),
      dailyStreak:      EXPECTED_STREAK,
      streakBeforeLoss: EXPECTED_SBL,
      lastPlayed:       EXPECTED_LAST,
    },
    {
      $set:  { dailyStreak: 1 },
      $push: { battlePassItems: { itemId: 'ticket_restore_streak', used: false } },
    },
    { returnDocument: 'after' }
  );

  if (!result) {
    console.log('\nEl findOneAndUpdate no encontró el documento (race condition). No se escribió nada.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // ── AFTER ────────────────────────────────────────────────────────────────────
  const ticketsAfter = (result.battlePassItems || []).filter(t => t.itemId === 'ticket_restore_streak');
  console.log('\n=== DESPUÉS ===');
  console.log('dailyStreak      :', result.dailyStreak);
  console.log('lastPlayed       :', result.lastPlayed);
  console.log('streakBeforeLoss :', result.streakBeforeLoss);
  console.log('tickets          :', JSON.stringify(ticketsAfter));

  await mongoose.disconnect();
}

run().catch(e => { console.error(e.message); process.exit(1); });
