/**
 * listPaidTournaments.js — READ-ONLY audit script
 *
 * Lists all PaidTournament documents from MongoDB and, if STRIPE_SECRET_KEY is
 * set, all Checkout Sessions with metadata type=tournament_entry from Stripe.
 *
 * ZERO writes — no documents are created, modified, or deleted.
 * ZERO refunds — this script never issues or initiates any refund.
 *
 * Usage:
 *   cd server && node scripts/listPaidTournaments.js
 *
 * Required env: MONGODB_URI
 * Optional env: STRIPE_SECRET_KEY (without it, only MongoDB data is shown)
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('FATAL: MONGODB_URI env var is not set'); process.exit(1); }

const PaidTournamentSchema = new mongoose.Schema({
  entryFee:    { type: Number },
  prize:       { type: Number },
  maxPlayers:  { type: Number },
  totalPot:    { type: Number },
  createdBy:   mongoose.Schema.Types.ObjectId,
  players:     [{
    _id:             false,
    userId:          mongoose.Schema.Types.ObjectId,
    paymentIntentId: String,
  }],
  status:      String,
  winner:      mongoose.Schema.Types.ObjectId,
  payoutStatus:String,
  createdAt:   Date,
}, { strict: false });

const PaidTournament = mongoose.model('PaidTournament', PaidTournamentSchema);

async function listFromMongo() {
  const tournaments = await PaidTournament.find({}).lean();

  console.log('\n=== PAID TOURNAMENTS (MongoDB) ===');
  console.log(`Total: ${tournaments.length}`);
  for (const t of tournaments) {
    console.log(`\n  _id:         ${t._id}`);
    console.log(`  status:      ${t.status}`);
    console.log(`  players:     ${t.players?.length ?? 0} / ${t.maxPlayers}`);
    console.log(`  pot:         €${t.totalPot}  prize: €${t.prize}  entryFee: €${t.entryFee}`);
    console.log(`  payoutStatus:${t.payoutStatus}`);
    console.log(`  createdAt:   ${t.createdAt}`);
    if (t.players?.length) {
      console.log('  players:');
      for (const p of t.players) {
        console.log(`    userId: ${p.userId}  paymentIntentId: ${p.paymentIntentId || 'null'}`);
      }
    }
  }

  return tournaments;
}

async function listFromStripe() {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    console.log('\n=== STRIPE (skipped — STRIPE_SECRET_KEY not set) ===');
    return [];
  }

  const Stripe = require('stripe');
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  console.log('\n=== STRIPE Checkout Sessions (type=tournament_entry) ===');
  const sessions = [];
  let hasMore = true;
  let startingAfter;

  while (hasMore) {
    const params = { limit: 100 };
    if (startingAfter) params.starting_after = startingAfter;
    const page = await stripe.checkout.sessions.list(params);

    for (const s of page.data) {
      if (s.metadata?.type === 'tournament_entry') {
        sessions.push(s);
      }
    }

    hasMore = page.has_more;
    if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
  }

  console.log(`Found: ${sessions.length} tournament_entry sessions`);
  let completedCount = 0;
  let totalAmount = 0;

  for (const s of sessions) {
    const refunds = s.payment_intent ? '(check PI for refunds)' : 'n/a';
    const paid = s.payment_status === 'paid';
    if (paid) { completedCount++; totalAmount += s.amount_total || 0; }
    console.log(`\n  sessionId:      ${s.id}`);
    console.log(`  amount:         ${(s.amount_total || 0) / 100} ${s.currency?.toUpperCase()}`);
    console.log(`  status:         ${s.status} / payment_status: ${s.payment_status}`);
    console.log(`  created:        ${new Date(s.created * 1000).toISOString()}`);
    console.log(`  payment_intent: ${s.payment_intent || 'null'}`);
    console.log(`  refund:         ${refunds}`);
    console.log(`  meta userId:    ${s.metadata?.userId}`);
    console.log(`  meta tournamentId: ${s.metadata?.tournamentId}`);
  }

  return { sessions, completedCount, totalAmount };
}

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    const tournaments = await listFromMongo();
    const stripe = await listFromStripe();

    console.log('\n=== SUMMARY ===');
    console.log(`Tournaments in DB: ${tournaments.length}`);
    if (stripe && stripe.sessions !== undefined) {
      console.log(`Stripe tournament_entry sessions: ${stripe.sessions.length}`);
      console.log(`  Completed payments: ${stripe.completedCount}`);
      console.log(`  Total paid: €${(stripe.totalAmount / 100).toFixed(2)}`);
    }
    console.log('');
  } catch (err) {
    console.error('Script error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
