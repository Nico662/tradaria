'use strict';

// ── Phase 4 worker test ───────────────────────────────────────────────────────
//
// Verifies that runTradingWorker() acts autonomously:
//   Test 1 — Worker fires SL/TP on its own tick (no manual call)
//   Test 2 — Worker fires liquidation on its own tick
//   Test 3 — One user erroring doesn't crash the worker; next user still processed
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// ── In-memory store (same harness as phase 2/3 tests) ────────────────────────
function makeStore() {
  const map = new Map();
  let seq = 0;
  function fakeQuery(arr) {
    return {
      sort() { return this; },
      skip() { return this; },
      limit() { return this; },
      then(res, rej) { return Promise.resolve(arr).then(res, rej); },
    };
  }
  return {
    _map: map,
    create(doc) {
      const _id = new ObjectId();
      const stored = { ...doc, _id, save: async () => {} };
      map.set(String(_id), stored);
      return Promise.resolve(stored);
    },
    findOne(query) {
      for (const doc of map.values()) {
        if (matchesQuery(doc, query)) return Promise.resolve(doc);
      }
      return Promise.resolve(null);
    },
    find(query = {}) {
      const arr = [...map.values()].filter(d => matchesQuery(d, query));
      return fakeQuery(arr);
    },
    distinct(field, query = {}) {
      const seen = new Set();
      for (const doc of map.values()) {
        if (matchesQuery(doc, query)) seen.add(String(doc[field]));
      }
      return Promise.resolve([...seen]);
    },
    deleteOne(query) {
      for (const [k, doc] of map.entries()) {
        if (matchesQuery(doc, query)) { map.delete(k); break; }
      }
      return Promise.resolve();
    },
    countDocuments(query = {}) {
      const n = [...map.values()].filter(d => matchesQuery(d, query)).length;
      return Promise.resolve(n);
    },
  };
}

function matchesQuery(doc, query) {
  for (const [k, v] of Object.entries(query)) {
    const dv = doc[k];
    if (v instanceof mongoose.Types.ObjectId || v instanceof Object && v.constructor === ObjectId) {
      if (String(dv) !== String(v)) return false;
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      // basic $gte/$lte/$gt/$lt
      for (const [op, opVal] of Object.entries(v)) {
        if (op === '$gte' && !(dv >= opVal)) return false;
        if (op === '$lte' && !(dv <= opVal)) return false;
        if (op === '$gt'  && !(dv > opVal))  return false;
        if (op === '$lt'  && !(dv < opVal))  return false;
      }
    } else {
      if (String(dv) !== String(v)) return false;
    }
  }
  return true;
}

// ── Fake mongoose.model() ─────────────────────────────────────────────────────
const stores = {};
function fakeModel(name) {
  if (!stores[name]) stores[name] = makeStore();
  return stores[name];
}

// Patch mongoose.model to return our fake stores
const origModel = mongoose.model.bind(mongoose);
mongoose.model = function(name) {
  if (['TradingAccount', 'TradingPosition', 'TradingTrade'].includes(name)) {
    return fakeModel(name);
  }
  try { return origModel(name); } catch { return fakeModel(name); }
};

// ── Fake Redis (override map) ─────────────────────────────────────────────────
const priceOverrides = new Map();
const fakeRedis = {
  get: async (key) => priceOverrides.get(key) ?? null,
  set: async (key, val) => { priceOverrides.set(key, val); },
  del: async (key) => { priceOverrides.delete(key); },
};

// ── Wire up priceRouter ───────────────────────────────────────────────────────
const { priceRouter } = require('./trading/priceProvider');
const { StubPriceProvider } = require('./trading/stubProvider');
const stub = new StubPriceProvider(fakeRedis);
priceRouter.register('stub', stub);

// ── Import worker + phase 3 functions ────────────────────────────────────────
const { checkMarginLevel, checkStopLossTakeProfit } = require('./routes/trading');
const { runTradingWorker, INTERVAL_MS } = require('./trading/worker');

// ── Helpers ───────────────────────────────────────────────────────────────────
function resetStores() {
  for (const s of Object.values(stores)) s._map.clear();
  priceOverrides.clear();
}

function setPrice(symbol, price) {
  priceOverrides.set(`trading:override:${symbol}`, price);
}

async function openPosition(userId, symbol, direction, lots, opts = {}) {
  const catalog = require('./trading/priceProvider').SYMBOL_CATALOG;
  const entry = catalog.find(s => s.symbol === symbol);
  const priceObj = await priceRouter.getPrice(symbol);
  const entryPrice = direction === 'long' ? priceObj.ask : priceObj.bid;
  const marginUsed = (lots * entry.contractSize * entryPrice) / 100;
  return fakeModel('TradingPosition').create({
    userId, symbol,
    name: entry.name,
    category: entry.category,
    direction, entryPrice, lots,
    contractSize: entry.contractSize,
    leverage: 100, marginUsed,
    stopLoss:   opts.stopLoss   ?? null,
    takeProfit: opts.takeProfit ?? null,
    openedAt: new Date(),
  });
}

async function ensureAccount(userId, balance = 50000) {
  let acc = await fakeModel('TradingAccount').findOne({ userId });
  if (!acc) {
    acc = await fakeModel('TradingAccount').create({ userId, balance, resetCount: 0 });
  }
  return acc;
}

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(cond, label, extra = '') {
  if (cond) {
    console.log(`  ✓  ${label}${extra ? '\n     ' + extra : ''}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}${extra ? '\n     ' + extra : ''}`);
    failed++;
  }
}

// Wait slightly longer than one worker tick
function waitTick(multiplier = 1.4) {
  return new Promise(r => setTimeout(r, INTERVAL_MS * multiplier));
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — Worker autonomously fires Take Profit
// ─────────────────────────────────────────────────────────────────────────────
async function test1() {
  console.log('\n── Test 1: Worker dispara Take Profit solo (sin llamada manual) ─────────\n');
  resetStores();

  const userId = new ObjectId();
  await ensureAccount(userId, 50000);

  // BTC entry ~$64897, TP = $70000
  setPrice('BTC/USD', 64885);
  const pos = await openPosition(userId, 'BTC/USD', 'long', 0.01, { takeProfit: 70000 });
  console.log(`  Posición abierta: entry=${pos.entryPrice}, TP=${pos.takeProfit}`);

  // Worker starts — TP not yet hit
  const timer = runTradingWorker(checkStopLossTakeProfit, checkMarginLevel);

  // Move price ABOVE TP
  setPrice('BTC/USD', 71000);
  console.log(`  Precio movido a $71000 (por encima de TP $70000) — esperando tick del worker...`);

  await waitTick();
  clearInterval(timer);

  const openCount = (await fakeModel('TradingPosition').find({ userId })).length;
  const trades = await fakeModel('TradingTrade').find({ userId });

  assert(openCount === 0, '[T1] Worker cerró la posición automáticamente');
  assert(trades.length === 1, '[T1] Trade registrado en historial');
  assert(trades[0]?.closeReason === 'take_profit', '[T1] closeReason = take_profit', `closeReason=${trades[0]?.closeReason}`);
  assert(trades[0]?.pnl > 0, '[T1] pnl positivo', `pnl=${trades[0]?.pnl?.toFixed(2)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — Worker autonomously fires liquidation
// ─────────────────────────────────────────────────────────────────────────────
async function test2() {
  console.log('\n── Test 2: Worker liquida posición sola (sin llamada manual) ────────────\n');
  resetStores();

  const userId = new ObjectId();
  await ensureAccount(userId, 50000);

  // Open a large position so a price drop kills marginLevel
  setPrice('BTC/USD', 64885);
  const pos = await openPosition(userId, 'BTC/USD', 'long', 45);
  const marginUsed = pos.marginUsed;

  // Compute price needed for marginLevel ≈ 40% (below 50% stop-out)
  // equity = balance + pnl = balance + (closePrice - entryPrice)*contractSize*lots
  // marginLevel = equity / marginUsed * 100 < 50
  // → equity < 0.5 * marginUsed
  // → balance + (cp - entry)*cs*lots < 0.5 * marginUsed
  // → cp < entry + (0.5*marginUsed - balance) / (cs*lots)
  const stopOutPrice = pos.entryPrice + (0.5 * marginUsed - 50000) / (pos.contractSize * pos.lots);
  const triggerPrice = Math.floor(stopOutPrice - 500);

  console.log(`  entry=${pos.entryPrice.toFixed(2)}, marginUsed=${marginUsed.toFixed(2)}`);
  console.log(`  Precio stop-out calculado: $${stopOutPrice.toFixed(2)}, override a $${triggerPrice}`);

  const timer = runTradingWorker(checkStopLossTakeProfit, checkMarginLevel);

  setPrice('BTC/USD', triggerPrice);
  console.log(`  Precio movido a $${triggerPrice} — esperando tick del worker...`);

  await waitTick();
  clearInterval(timer);

  const openCount = (await fakeModel('TradingPosition').find({ userId })).length;
  const trades = await fakeModel('TradingTrade').find({ userId });

  assert(openCount === 0, '[T2] Worker liquidó la posición automáticamente');
  assert(trades.length === 1, '[T2] Trade registrado en historial');
  assert(trades[0]?.closeReason === 'liquidation', '[T2] closeReason = liquidation', `closeReason=${trades[0]?.closeReason}`);
  assert(trades[0]?.pnl < 0, '[T2] pnl negativo (pérdida)', `pnl=${trades[0]?.pnl?.toFixed(2)}`);

  // Check balance didn't go negative
  const acc = await fakeModel('TradingAccount').findOne({ userId });
  assert(acc.balance >= 0, '[T2] balance ≥ 0', `balance=${acc.balance.toFixed(2)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 — One user errors, worker keeps processing other users
// ─────────────────────────────────────────────────────────────────────────────
async function test3() {
  console.log('\n── Test 3: Error en un usuario no tumba al worker (otros siguen) ────────\n');
  resetStores();

  // User A — will throw an error when processed (corrupt userId that causes a DB crash)
  const userA = new ObjectId();
  // Inject a corrupt position that makes checkStopLossTakeProfit throw
  // We do this by inserting a position with a symbol that has no catalog entry,
  // causing priceRouter.getPrice() to throw inside getLivePositions().
  await fakeModel('TradingPosition').create({
    userId: userA,
    symbol: 'CORRUPT/FAKE',    // not in catalog → getPrice will throw
    name: 'Corrupt', category: 'crypto', direction: 'long',
    entryPrice: 1, lots: 1, contractSize: 1, leverage: 100,
    marginUsed: 0.01,
    stopLoss: null, takeProfit: null,
    openedAt: new Date(),
  });

  // User B — healthy TP position that SHOULD get processed after userA fails
  const userB = new ObjectId();
  await ensureAccount(userB, 50000);
  setPrice('BTC/USD', 64885);
  const pos = await openPosition(userB, 'BTC/USD', 'long', 0.01, { takeProfit: 70000 });
  console.log(`  UserA: posición corrupta (CORRUPT/FAKE) — debería dar error`);
  console.log(`  UserB: posición normal con TP=${pos.takeProfit}`);

  const timer = runTradingWorker(checkStopLossTakeProfit, checkMarginLevel);

  // Trigger userB's TP
  setPrice('BTC/USD', 71000);
  console.log(`  Precio BTC movido a $71000 — esperando tick del worker...`);

  await waitTick();
  clearInterval(timer);

  // UserA's corrupt position should still be there (couldn't process)
  const userAOpen = (await fakeModel('TradingPosition').find({ userId: userA })).length;

  // UserB's position should be closed despite userA erroring
  const userBOpen = (await fakeModel('TradingPosition').find({ userId: userB })).length;
  const userBTrades = await fakeModel('TradingTrade').find({ userId: userB });

  assert(userAOpen === 1, '[T3] Posición de userA sigue abierta (el worker no se cayó, solo logueó el error)');
  assert(userBOpen === 0, '[T3] Posición de userB cerrada correctamente a pesar del error de userA');
  assert(userBTrades.length === 1, '[T3] Trade de userB registrado en historial');
  assert(userBTrades[0]?.closeReason === 'take_profit', '[T3] closeReason = take_profit para userB');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══ Fase 4 Worker Test ═══');

  await test1();
  await test2();
  await test3();

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Resultado: ${passed} ✓   ${failed} ✗\n`);

  if (failed === 0) {
    console.log('✅  Todos los casos pasan — Fase 4 verificada\n');
  } else {
    console.error('❌  Algunos casos fallaron\n');
    process.exit(1);
  }

  stub.stop();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
