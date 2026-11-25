'use strict';
// Dry-run script: detects Portfolio B (slot=1) documents with corrupted cash (NaN/Infinity)
// or positions with undefined/NaN avgPrice that cause getPortfolioValue() to return NaN
// and POST /portfolio/snapshot to 500.
//
// Run with:   DRY_RUN=true node server/scripts/repair-portfolio-b-nan.js
// Apply fix:  DRY_RUN=false node server/scripts/repair-portfolio-b-nan.js  (after review)

const mongoose = require('mongoose');
const DRY_RUN = process.env.DRY_RUN !== 'false';

async function run() {
  if (!process.env.MONGODB_URI) { console.error('MONGODB_URI required'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`[repair-portfolio-b-nan] DRY_RUN=${DRY_RUN}`);

  const Portfolio = mongoose.connection.collection('portfolios');
  const docs = await Portfolio.find({ slot: 1 }).toArray();
  console.log(`Found ${docs.length} Portfolio B documents`);

  let needsRepair = 0;
  for (const doc of docs) {
    const issues = [];

    if (!Number.isFinite(doc.cash)) {
      issues.push(`cash=${doc.cash}`);
    }

    const badPositions = (doc.positions || []).filter(
      p => !Number.isFinite(p.avgPrice) || !Number.isFinite(p.qty),
    );
    if (badPositions.length) {
      issues.push(`bad positions: ${badPositions.map(p => `${p.symbol} avgPrice=${p.avgPrice} qty=${p.qty}`).join(', ')}`);
    }

    if (issues.length) {
      needsRepair++;
      console.log(`\n  userId=${doc.userId}  _id=${doc._id}`);
      issues.forEach(i => console.log(`    ⚠ ${i}`));

      if (!DRY_RUN) {
        const update = {};
        if (!Number.isFinite(doc.cash)) {
          update.cash = 0;
        }
        if (badPositions.length) {
          update.positions = (doc.positions || []).filter(
            p => Number.isFinite(p.avgPrice) && Number.isFinite(p.qty),
          );
        }
        await Portfolio.updateOne({ _id: doc._id }, { $set: update });
        console.log(`    ✓ repaired`);
      }
    }
  }

  if (needsRepair === 0) {
    console.log('\nNo Portfolio B documents need repair.');
  } else {
    console.log(`\n${needsRepair} document(s) ${DRY_RUN ? 'would be' : 'were'} repaired.`);
    if (DRY_RUN) console.log('Re-run with DRY_RUN=false to apply fixes.');
  }

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
