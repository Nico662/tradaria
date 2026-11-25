'use strict';
/**
 * migrate-portfolio-history-slot-index.js
 *
 * Fixes the production E11000 on portfoliohistories caused by the legacy unique
 * index userId_1_date_1 (without slot), which blocks Portfolio B (slot=1) from
 * saving a snapshot on the same day as Portfolio A (slot=0).
 *
 * Steps (idempotent):
 *   1. Fill slot: 0 on every doc that has slot=null or no slot field.
 *   2. Drop the old index userId_1_date_1 (if it exists).
 *   3. Drop the intermediate index userId_1_date_1_slot_1 (if it exists).
 *   4. Create the correct unique index { userId, slot, date }.
 *
 * Modes:
 *   node migrate-portfolio-history-slot-index.js           → dry-run (default)
 *   node migrate-portfolio-history-slot-index.js --apply   → apply changes
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const DRY_RUN = !process.argv.includes('--apply');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌  MONGODB_URI not set.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to MongoDB. mode=${DRY_RUN ? 'DRY-RUN' : 'APPLY'}\n`);

  const col = mongoose.connection.collection('portfoliohistories');

  // ── 1. Current indexes ───────────────────────────────────────────────────────
  const indexes = await col.indexes();
  console.log('── Current indexes on portfoliohistories ───────────────────────');
  for (const idx of indexes) {
    const flag = idx.unique ? '(unique)' : '       ';
    console.log(`  ${flag}  ${idx.name}  key=${JSON.stringify(idx.key)}`);
  }

  const hasOldIdx  = indexes.some(i => i.name === 'userId_1_date_1');
  const hasIntIdx  = indexes.some(i => i.name === 'userId_1_date_1_slot_1');
  const hasNewIdx  = indexes.some(i => i.name === 'userId_1_slot_1_date_1');

  console.log();
  if (hasOldIdx)  console.log('  ⚠  userId_1_date_1         → will be DROPPED (root cause of E11000)');
  if (hasIntIdx)  console.log('  ⚠  userId_1_date_1_slot_1  → will be DROPPED (replaced by correct order)');
  if (hasNewIdx)  console.log('  ✓  userId_1_slot_1_date_1  → already present (create skipped)');
  if (!hasNewIdx) console.log('  +  userId_1_slot_1_date_1  → will be CREATED');

  // ── 2. Document counts ───────────────────────────────────────────────────────
  const [total, countSlot0, countSlot1, countNoSlot] = await Promise.all([
    col.countDocuments({}),
    col.countDocuments({ slot: 0 }),
    col.countDocuments({ slot: 1 }),
    col.countDocuments({ slot: null }),   // matches null AND missing field
  ]);

  console.log('\n── Document counts ──────────────────────────────────────────────');
  console.log(`  Total:                ${total}`);
  console.log(`  slot = 0 (explicit):  ${countSlot0}`);
  console.log(`  slot = 1:             ${countSlot1}`);
  console.log(`  slot = null/missing:  ${countNoSlot}  ← would get slot: 0 set`);

  // ── 3. Apply or report ───────────────────────────────────────────────────────
  console.log('\n── Changes ──────────────────────────────────────────────────────');

  if (DRY_RUN) {
    if (countNoSlot > 0)
      console.log(`  [DRY] Set slot: 0 on ${countNoSlot} legacy docs`);
    if (hasOldIdx)
      console.log('  [DRY] Drop index userId_1_date_1');
    if (hasIntIdx)
      console.log('  [DRY] Drop index userId_1_date_1_slot_1');
    if (!hasNewIdx)
      console.log('  [DRY] Create index { userId:1, slot:1, date:1 } unique');
    console.log('\n[DRY-RUN] No changes written. Re-run with --apply to execute.');
  } else {
    // 3a. Fill slot: 0 on legacy docs
    if (countNoSlot > 0) {
      const r = await col.updateMany({ slot: null }, { $set: { slot: 0 } });
      console.log(`  ✓ Set slot: 0 on ${r.modifiedCount} legacy docs`);
    } else {
      console.log('  ✓ No legacy docs without slot (nothing to fill)');
    }

    // 3b. Drop old index (ignore "index not found")
    if (hasOldIdx) {
      await col.dropIndex('userId_1_date_1');
      console.log('  ✓ Dropped index userId_1_date_1');
    } else {
      console.log('  ✓ Index userId_1_date_1 not found (already dropped)');
    }

    // 3c. Drop intermediate index (ignore if not present)
    if (hasIntIdx) {
      await col.dropIndex('userId_1_date_1_slot_1');
      console.log('  ✓ Dropped index userId_1_date_1_slot_1');
    }

    // 3d. Create correct unique index (idempotent — MongoDB no-ops if same spec exists)
    await col.createIndex(
      { userId: 1, slot: 1, date: 1 },
      { unique: true, name: 'userId_1_slot_1_date_1' },
    );
    console.log('  ✓ Created/confirmed index userId_1_slot_1_date_1');

    // ── 4. Verify ────────────────────────────────────────────────────────────
    const idxAfter = await col.indexes();
    console.log('\n── Indexes after migration ──────────────────────────────────────');
    for (const idx of idxAfter) {
      const flag = idx.unique ? '(unique)' : '       ';
      console.log(`  ${flag}  ${idx.name}  key=${JSON.stringify(idx.key)}`);
    }
    const [t0, t1, tNull] = await Promise.all([
      col.countDocuments({ slot: 0 }),
      col.countDocuments({ slot: 1 }),
      col.countDocuments({ slot: null }),
    ]);
    console.log('\n── Document counts after migration ──────────────────────────────');
    console.log(`  slot = 0:             ${t0}`);
    console.log(`  slot = 1:             ${t1}`);
    console.log(`  slot = null/missing:  ${tNull}  (should be 0)`);
    console.log('\n[APPLY] Done.');
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
