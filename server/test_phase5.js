'use strict';
/**
 * Fase 5 integration test — ejecutar desde server/:
 *   node test_phase5.js
 *
 * Verifica: leaderboard global + semanal, snapshot, duel completo, liga completa.
 */

process.env.JWT_SECRET = 'test-jwt-secret-phase5';

const express  = require('express');
const jwt      = require('jsonwebtoken');
const http     = require('http');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// ─────────────────────────────────────────────────────────────────────────────
// Query matcher: soporta $or, $and, $in, $lt, $lte, $gt, $gte, $ne, path.nested
// ─────────────────────────────────────────────────────────────────────────────
function matchesQuery(doc, query) {
  for (const [key, val] of Object.entries(query)) {
    if (key === '$or') {
      if (!val.some(subq => matchesQuery(doc, subq))) return false;
      continue;
    }
    if (key === '$and') {
      if (!val.every(subq => matchesQuery(doc, subq))) return false;
      continue;
    }
    if (key.includes('.')) {
      const [arrKey, subKey] = key.split('.');
      const arr = doc[arrKey];
      if (Array.isArray(arr)) {
        if (!arr.some(item => String(item[subKey]) === String(val))) return false;
      }
      continue;
    }
    const docVal = doc[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val._bsontype)) {
      for (const [op, opVal] of Object.entries(val)) {
        if (op === '$in')  { if (!opVal.some(v => String(v) === String(docVal))) return false; }
        if (op === '$nin') { if ( opVal.some(v => String(v) === String(docVal))) return false; }
        if (op === '$lt')  { if (!(docVal <  opVal)) return false; }
        if (op === '$lte') { if (!(docVal <= opVal)) return false; }
        if (op === '$gt')  { if (!(docVal >  opVal)) return false; }
        if (op === '$gte') { if (!(docVal >= opVal)) return false; }
        if (op === '$ne')  { if (String(docVal) === String(opVal)) return false; }
      }
      continue;
    }
    if (val === null || val === undefined) {
      if (docVal != null) return false;
    } else {
      if (String(docVal) !== String(val)) return false;
    }
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Global user store reference (para populate)
// ─────────────────────────────────────────────────────────────────────────────
let userStoreDocs;  // set after stores are created

function resolvePopulate(doc, field) {
  if (!doc) return doc;
  const id = doc[field];
  if (!id || typeof id === 'object') return doc; // ya populado o null
  const user = userStoreDocs?.get(String(id));
  if (user) return { ...doc, [field]: { ...user } };
  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory store
// ─────────────────────────────────────────────────────────────────────────────
function makeStore(name, defaults = {}) {
  const docs = new Map();
  let seq = 1;

  function makeId() { return `oid_${name}_${seq++}`; }

  function attach(raw) {
    if (!raw) return null;
    const doc = { ...raw };
    doc.save = async function () {
      const updated = { ...this }; delete updated.save; delete updated.deleteOne;
      docs.set(String(this._id), updated);
      Object.assign(this, updated); doc.save = this.save;
      return this;
    };
    doc.deleteOne = async function () { docs.delete(String(this._id)); };
    return doc;
  }

  function filterAll(query) {
    const arr = [...docs.values()];
    if (!query || Object.keys(query).length === 0) return arr.map(d => attach({ ...d }));
    return arr.filter(d => matchesQuery(d, query)).map(d => attach({ ...d }));
  }

  // Thenable chain con soporte real de .populate() y .sort()
  function makeChain(docsArr) {
    let arr = docsArr;
    const popFields = [];
    const chain = {
      sort(spec) {
        if (spec && typeof spec === 'object') {
          const [field, dir] = Object.entries(spec)[0];
          arr = [...arr].sort((a, b) => {
            const cmp = a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
            return (dir === -1 || dir === '-1') ? -cmp : cmp;
          });
        }
        return this;
      },
      skip(n)  { arr = arr.slice(n); return this; },
      limit(n) { arr = arr.slice(0, n); return this; },
      select() { return this; },
      populate(field) { popFields.push(field); return this; },
      then(resolve, reject) {
        const result = arr.map(doc => {
          let d = doc;
          for (const f of popFields) d = resolvePopulate(d, f);
          return d;
        });
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return chain;
  }

  // Thenable findOne con soporte de .populate()
  function makeSingleChain(query) {
    let doc = filterAll(query)[0] || null;
    const popFields = [];
    return {
      populate(field) { popFields.push(field); return this; },
      then(resolve, reject) {
        if (!doc) return Promise.resolve(null).then(resolve, reject);
        let d = attach({ ...doc });
        for (const f of popFields) d = resolvePopulate(d, f);
        return Promise.resolve(d).then(resolve, reject);
      },
    };
  }

  const store = {
    _docs: docs,
    _name: name,
    async create(data) {
      const _id = makeId();
      const raw = { _id, createdAt: new Date(), openedAt: new Date(), closedAt: new Date(), ...defaults, ...data };
      docs.set(_id, raw);
      return attach({ ...raw });
    },
    findOne(query) { return makeSingleChain(query); },
    async findById(id) {
      const raw = docs.get(String(id));
      return raw ? attach({ ...raw }) : null;
    },
    async findByIdAndUpdate(id, upd) {
      const doc = docs.get(String(id));
      if (!doc) return null;
      const updated = { ...doc, ...upd };
      docs.set(String(id), updated);
      return attach({ ...updated });
    },
    async findByIdAndDelete(id) { docs.delete(String(id)); return { ok: 1 }; },
    async findOneAndUpdate(query, upd, opts) {
      let doc = filterAll(query)[0];
      if (!doc && opts?.upsert) {
        const _id = makeId();
        const cleanQuery = {};
        for (const [k, v] of Object.entries(query)) {
          if (typeof v !== 'object' || v === null) cleanQuery[k] = v;
        }
        const raw = { _id, ...defaults, ...cleanQuery, ...upd };
        docs.set(_id, raw);
        return attach({ ...raw });
      }
      if (doc) {
        const updated = { ...doc, ...upd };
        docs.set(String(doc._id), updated);
        return attach({ ...updated });
      }
      return null;
    },
    async findOneAndDelete(query) {
      const doc = filterAll(query)[0];
      if (doc) docs.delete(String(doc._id));
      return doc || null;
    },
    async deleteOne(query) {
      const doc = filterAll(query)[0];
      if (doc) { docs.delete(String(doc._id)); return { deletedCount: 1 }; }
      return { deletedCount: 0 };
    },
    async countDocuments(query) { return filterAll(query).length; },
    async distinct(field, query) {
      return [...new Set(filterAll(query).map(d => d[field]))];
    },
    async exists(query) { return filterAll(query).length > 0 ? { _id: 'x' } : null; },
    async aggregate(pipeline) {
      let arr = [...docs.values()];
      for (const stage of pipeline) {
        if (stage.$match) arr = arr.filter(d => matchesQuery(d, stage.$match));
        if (stage.$sort)  {
          const [f, d2] = Object.entries(stage.$sort)[0];
          arr.sort((a, b) => {
            const cmp = a[f] < b[f] ? -1 : a[f] > b[f] ? 1 : 0;
            return (d2 === -1) ? -cmp : cmp;
          });
        }
        if (stage.$group) {
          const grouped = new Map();
          for (const doc of arr) {
            const idField = stage.$group._id.replace('$', '');
            const key = String(doc[idField]);
            if (!grouped.has(key)) {
              const entry = { _id: doc[idField] };
              for (const [out, agg] of Object.entries(stage.$group)) {
                if (out === '_id') continue;
                if (agg.$first) entry[out] = doc[agg.$first.replace('$', '')];
                if (typeof agg.$sum === 'number') entry[out] = (entry[out] || 0) + agg.$sum;
                if (typeof agg.$sum === 'string') entry[out] = (entry[out] || 0) + (doc[agg.$sum.replace('$', '')] || 0);
              }
              grouped.set(key, entry);
            }
          }
          arr = [...grouped.values()];
        }
      }
      return arr;
    },
    find(query) { return makeChain(filterAll(query)); },
  };
  return store;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stores — nota: TradingDuel tiene status:'pending' como default
// ─────────────────────────────────────────────────────────────────────────────
const stores = {
  TradingAccount:        makeStore('TradingAccount'),
  TradingPosition:       makeStore('TradingPosition'),
  TradingTrade:          makeStore('TradingTrade'),
  TradingAccountHistory: makeStore('TradingAccountHistory'),
  TradingDuel:           makeStore('TradingDuel', { status: 'pending' }),
  TradingLeague:         makeStore('TradingLeague'),
  User:                  makeStore('User'),
  Friendship:            makeStore('Friendship', { status: 'accepted' }),
};

userStoreDocs = stores.User._docs;

const originalModel = mongoose.model.bind(mongoose);
mongoose.model = function (name) {
  if (stores[name]) return { ...stores[name] };
  return originalModel(name);
};

// ─────────────────────────────────────────────────────────────────────────────
// Load models & trading route
// ─────────────────────────────────────────────────────────────────────────────
require('./models/TradingAccount');
require('./models/TradingPosition');
require('./models/TradingTrade');
require('./models/TradingAccountHistory');
require('./models/TradingDuel');
require('./models/TradingLeague');

// ─────────────────────────────────────────────────────────────────────────────
// Price stub
// ─────────────────────────────────────────────────────────────────────────────
const { priceRouter, SYMBOL_CATALOG } = require('./trading/priceProvider');
const { StubPriceProvider } = require('./trading/stubProvider');
const stub = new StubPriceProvider({ get: async () => null, set: async () => {} });
priceRouter.register('stub', stub);

function setPrice(symbol, price) {
  const bid = price * 0.9999;
  const ask = price * 1.0001;
  stub._overrides = stub._overrides || new Map();
  stub._overrides.set(symbol, { symbol, price, bid, ask, timestamp: Date.now() });
}

const origGetPrice = stub.getPrice.bind(stub);
stub.getPrice = async function (symbol) {
  if (this._overrides?.has(symbol)) return this._overrides.get(symbol);
  return origGetPrice(symbol);
};

// ─────────────────────────────────────────────────────────────────────────────
// Build test Express app
// ─────────────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use('/api/trading', require('./routes/trading'));

const server = http.createServer(app);
let PORT;

function token(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET);
}

function req(method, path, body, userId) {
  return new Promise((resolve, reject) => {
    const raw  = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: '127.0.0.1', port: PORT,
      path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { Authorization: `Bearer ${token(userId)}` } : {}),
        ...(raw ? { 'Content-Length': Buffer.byteLength(raw) } : {}),
      },
    };
    const r = http.request(opts, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (raw) r.write(raw);
    r.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Test reporter
// ─────────────────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function check(label, ok, got) {
  if (ok) { passed++; console.log(`  ✓ ${label}`); }
  else    { failed++; console.log(`  ✗ ${label}  (got: ${JSON.stringify(got)})`); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────
let tradeTs = Date.now() - 10000; // start 10s in the past, increment per trade

async function createUser(id, username) {
  const u = { _id: id, name: username, username, avatar: null, customAvatar: null,
               activeCosmetics: {}, battlePassMechanics: [] };
  stores.User._docs.set(String(id), u);
}

async function createAccount(userId, balance) {
  const existing = stores.TradingAccount._docs;
  for (const [k, v] of existing.entries()) {
    if (String(v.userId) === String(userId)) {
      v.balance = balance;
      return v;
    }
  }
  return stores.TradingAccount.create({ userId, balance, resetCount: 0 });
}

async function createTrade(userId, pnl) {
  tradeTs += 1000; // each trade is 1s later (last created = most recent)
  return stores.TradingTrade.create({
    userId, symbol: 'BTC/USD', name: 'Bitcoin', category: 'crypto',
    direction: 'long', entryPrice: 60000, closePrice: 60000 + pnl,
    lots: 0.01, contractSize: 1, marginUsed: 600, pnl,
    pnlPct: pnl / 600 * 100, closeReason: 'manual',
    closedAt: new Date(tradeTs),
  });
}

async function makeFriends(a, b) {
  await stores.Friendship.create({ requester: a, recipient: b });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function run() {
  await new Promise(res => server.listen(0, '127.0.0.1', () => {
    PORT = server.address().port;
    res();
  }));
  console.log(`\nTest server on port ${PORT}\n`);

  setPrice('BTC/USD', 65000);

  const U1 = 'user_alice';
  const U2 = 'user_bob';
  const U3 = 'user_charlie';

  await createUser(U1, 'alice');
  await createUser(U2, 'bob');
  await createUser(U3, 'charlie');

  // ══════════════════════════════════════════════════════════════════════════
  // GRUPO A: Leaderboard global — alice +10%, charlie +5%, bob -4%
  // ══════════════════════════════════════════════════════════════════════════
  console.log('── Grupo A: Leaderboard global ──────────────────────────────────\n');

  await createAccount(U1, 55000);  // alice +10%
  await createAccount(U2, 48000);  // bob -4%
  await createAccount(U3, 52500);  // charlie +5%

  const lbGlobal = await req('GET', '/api/trading/leaderboard?period=global');
  check('[A1] GET /leaderboard → 200',   lbGlobal.status === 200, lbGlobal.status);
  const lb = lbGlobal.body.leaderboard;
  check('[A2] top 3 presentes',          lb.length === 3, lb.length);
  check('[A3] alice (55k) es #1',        lb[0]?.name === 'alice',   lb[0]?.name);
  check('[A4] charlie (52.5k) es #2',    lb[1]?.name === 'charlie', lb[1]?.name);
  check('[A5] bob (48k) es #3',          lb[2]?.name === 'bob',     lb[2]?.name);
  check('[A6] alice returnPct ≈ +10%',   Math.abs(lb[0]?.returnPct - 10) < 0.01, lb[0]?.returnPct?.toFixed(4));
  check('[A7] bob returnPct ≈ -4%',      Math.abs(lb[2]?.returnPct - (-4)) < 0.01, lb[2]?.returnPct?.toFixed(4));
  check('[A8] periodo = global',         lbGlobal.body.period === 'global', lbGlobal.body.period);
  console.log(`     alice=${lb[0]?.returnPct?.toFixed(2)}%  charlie=${lb[1]?.returnPct?.toFixed(2)}%  bob=${lb[2]?.returnPct?.toFixed(2)}%`);

  // ══════════════════════════════════════════════════════════════════════════
  // GRUPO B: Stats — trades, winRate, streak
  // alice: 3 wins (streak=3)
  // bob:   +90 (oldest) → +120 → -80 (newest) → streak=0
  // charlie: 1 win (streak=1)
  // Crea trades de más antiguo a más reciente — tradeTs se incrementa con cada await
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Grupo B: Stats en leaderboard ────────────────────────────────\n');

  // alice: 3 wins en orden cronológico
  await createTrade(U1, +100);
  await createTrade(U1, +150);
  await createTrade(U1, +200);
  // bob: oldest=win, middle=win, newest=loss → streak=0
  await createTrade(U2, +90);
  await createTrade(U2, +120);
  await createTrade(U2, -80);   // más reciente
  // charlie
  await createTrade(U3, +60);

  const lbStats = await req('GET', '/api/trading/leaderboard?period=global');
  const lbS = lbStats.body.leaderboard;
  check('[B1] alice trades=3',          lbS[0]?.trades  === 3,   lbS[0]?.trades);
  check('[B2] alice winRate=100',       lbS[0]?.winRate === 100, lbS[0]?.winRate);
  check('[B3] alice streak=3',          lbS[0]?.streak  === 3,   lbS[0]?.streak);
  check('[B4] bob winRate≈67',          lbS[2]?.winRate === 67,  lbS[2]?.winRate);
  check('[B5] bob streak=0 (loss más reciente)', lbS[2]?.streak === 0, lbS[2]?.streak);
  check('[B6] charlie streak=1',        lbS[1]?.streak  === 1,   lbS[1]?.streak);
  console.log(`     alice  t=${lbS[0]?.trades} wr=${lbS[0]?.winRate}% streak=${lbS[0]?.streak}`);
  console.log(`     charlie t=${lbS[1]?.trades} wr=${lbS[1]?.winRate}% streak=${lbS[1]?.streak}`);
  console.log(`     bob    t=${lbS[2]?.trades} wr=${lbS[2]?.winRate}% streak=${lbS[2]?.streak}`);

  // ══════════════════════════════════════════════════════════════════════════
  // GRUPO C: Snapshot + leaderboard semanal
  // Baseline (viernes pasado): alice 50000, bob 50000, charlie 49000
  // Hoy: alice 55000 (+10%), charlie 52500 (+7.14%), bob 48000 (-4%)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Grupo C: Snapshot + leaderboard semanal ──────────────────────\n');

  const now     = new Date();
  const day     = now.getUTCDay();
  const diff    = (day === 0) ? -6 : 1 - day;
  const monday  = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  const lastFriday = new Date(monday);
  lastFriday.setUTCDate(monday.getUTCDate() - 3);
  const fridayStr = lastFriday.toISOString().split('T')[0];

  await stores.TradingAccountHistory.create({ userId: U1, date: fridayStr, equity: 50000 });
  await stores.TradingAccountHistory.create({ userId: U2, date: fridayStr, equity: 50000 });
  await stores.TradingAccountHistory.create({ userId: U3, date: fridayStr, equity: 49000 });

  const snapshotRes = await req('POST', '/api/trading/snapshot', {}, U1);
  check('[C1] POST /snapshot → 200',   snapshotRes.status === 200, snapshotRes.status);
  check('[C2] snapshot ok=true',       snapshotRes.body.ok === true, snapshotRes.body.ok);
  check('[C3] snapshot incluye equity y date', snapshotRes.body.equity != null && snapshotRes.body.date != null, snapshotRes.body);
  console.log(`     alice equity snapshot: ${snapshotRes.body.equity?.toFixed(2)} (${snapshotRes.body.date})`);

  const lbWeek = await req('GET', '/api/trading/leaderboard?period=week');
  check('[C4] leaderboard week → 200',  lbWeek.status === 200, lbWeek.status);
  check('[C5] periodo = week',          lbWeek.body.period === 'week', lbWeek.body.period);
  const lbW = lbWeek.body.leaderboard;
  check('[C6] tiene 3 entradas',        lbW.length === 3, lbW.length);
  check('[C7] alice #1 esta semana',   lbW[0]?.name === 'alice',   lbW[0]?.name);
  check('[C8] charlie #2 esta semana', lbW[1]?.name === 'charlie', lbW[1]?.name);
  check('[C9] bob #3 esta semana',     lbW[2]?.name === 'bob',     lbW[2]?.name);
  console.log(`     [week] alice=${lbW[0]?.returnPct?.toFixed(2)}%  charlie=${lbW[1]?.returnPct?.toFixed(2)}%  bob=${lbW[2]?.returnPct?.toFixed(2)}%`);

  // ══════════════════════════════════════════════════════════════════════════
  // GRUPO D: Duel — flujo completo (challenge → pending → accept → active)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Grupo D: Duel — flujo completo ───────────────────────────────\n');

  const challengeNoFriend = await req('POST', '/api/trading/duel/challenge', { username: 'bob' }, U1);
  check('[D1] challenge sin amistad → 403', challengeNoFriend.status === 403, challengeNoFriend.status);

  await makeFriends(U1, U2);

  const challengeRes = await req('POST', '/api/trading/duel/challenge', { username: 'bob' }, U1);
  check('[D2] challenge con amistad → 200', challengeRes.status === 200, challengeRes.status);
  check('[D3] duelId presente',             !!challengeRes.body.duelId, challengeRes.body);

  const dupChallenge = await req('POST', '/api/trading/duel/challenge', { username: 'bob' }, U1);
  check('[D4] challenge duplicado → 400',   dupChallenge.status === 400, dupChallenge.status);

  const pendingRes = await req('GET', '/api/trading/duel/pending', null, U2);
  check('[D5] GET /duel/pending → 200',       pendingRes.status === 200, pendingRes.status);
  check('[D6] 1 duel pendiente para bob',     pendingRes.body.length === 1, pendingRes.body.length);
  check('[D7] challenger.username = alice',
    pendingRes.body[0]?.challenger?.username === 'alice', pendingRes.body[0]?.challenger?.username);
  console.log(`     pending challenger: ${pendingRes.body[0]?.challenger?.username}`);

  const duelId = pendingRes.body[0]?.id;

  const acceptRes = await req('POST', `/api/trading/duel/accept/${duelId}`, {}, U2);
  check('[D8] accept → 200',      acceptRes.status === 200, acceptRes.status);
  check('[D9] accept ok=true',    acceptRes.body.ok === true, acceptRes.body.ok);

  const pendingAfter = await req('GET', '/api/trading/duel/pending', null, U2);
  check('[D10] sin pendientes tras aceptar', pendingAfter.body.length === 0, pendingAfter.body.length);

  const activeAlice = await req('GET', '/api/trading/duel/active', null, U1);
  check('[D11] GET /duel/active → 200',     activeAlice.status === 200, activeAlice.status);
  check('[D12] duel activo existe',          activeAlice.body !== null, activeAlice.body);
  const bodyA = activeAlice.body;
  check('[D13] daysLeft ≤ 7',              bodyA?.daysLeft <= 7, bodyA?.daysLeft);
  check('[D14] challenger.name = alice',   bodyA?.challenger?.name === 'alice', bodyA?.challenger?.name);
  check('[D15] opponent.name = bob',       bodyA?.opponent?.name   === 'bob',   bodyA?.opponent?.name);
  check('[D16] challenger tiene equity',   bodyA?.challenger?.currentEquity != null, bodyA?.challenger?.currentEquity);
  console.log(`     challenger: ${bodyA?.challenger?.name}  equity=${bodyA?.challenger?.currentEquity?.toFixed(2)}  ret=${bodyA?.challenger?.returnPct?.toFixed(2)}%`);
  console.log(`     opponent:   ${bodyA?.opponent?.name}  equity=${bodyA?.opponent?.currentEquity?.toFixed(2)}  ret=${bodyA?.opponent?.returnPct?.toFixed(2)}%`);
  console.log(`     daysLeft=${bodyA?.daysLeft}`);

  const activeBob = await req('GET', '/api/trading/duel/active', null, U2);
  check('[D17] bob también ve el duel activo', activeBob.status === 200 && activeBob.body !== null, activeBob.status);
  check('[D18] mismo duelId para ambos', String(activeBob.body?.id) === String(bodyA?.id), activeBob.body?.id);

  // ══════════════════════════════════════════════════════════════════════════
  // GRUPO E: Duel — reject
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Grupo E: Duel — reject ────────────────────────────────────────\n');

  await makeFriends(U3, U2);
  const chal2 = await req('POST', '/api/trading/duel/challenge', { username: 'bob' }, U3);
  check('[E1] charlie reta a bob → 200', chal2.status === 200, chal2.status);

  const pending2 = await req('GET', '/api/trading/duel/pending', null, U2);
  check('[E2] bob ve 1 pendiente de charlie', pending2.body.length === 1, pending2.body.length);

  const duelId2 = pending2.body[0]?.id;
  const rejectRes = await req('POST', `/api/trading/duel/reject/${duelId2}`, {}, U2);
  check('[E3] reject → 200',     rejectRes.status === 200, rejectRes.status);
  check('[E4] reject ok=true',   rejectRes.body.ok === true, rejectRes.body.ok);

  const pending3 = await req('GET', '/api/trading/duel/pending', null, U2);
  check('[E5] sin pendientes tras rechazar', pending3.body.length === 0, pending3.body.length);
  console.log(`     duel charlie→bob rechazado correctamente`);

  // ══════════════════════════════════════════════════════════════════════════
  // GRUPO F: Liga — crear, unirse, ranking
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Grupo F: Liga — flujo completo ───────────────────────────────\n');

  const createLigaRes = await req('POST', '/api/trading/leagues/create', { name: 'Liga Test' }, U1);
  check('[F1] POST /leagues/create → 200', createLigaRes.status === 200, createLigaRes.status);
  check('[F2] code 6 chars',               createLigaRes.body.code?.length === 6, createLigaRes.body.code);
  check('[F3] leagueId presente',          !!createLigaRes.body.leagueId, createLigaRes.body);
  const leagueCode = createLigaRes.body.code;
  const leagueId   = createLigaRes.body.leagueId;
  console.log(`     liga creada: "${leagueCode}"`);

  const badName = await req('POST', '/api/trading/leagues/create', { name: 'A' }, U2);
  check('[F4] nombre corto → 400', badName.status === 400, badName.status);

  const joinBob = await req('POST', '/api/trading/leagues/join', { code: leagueCode }, U2);
  check('[F5] bob se une → 200', joinBob.status === 200, joinBob.status);

  const joinDup = await req('POST', '/api/trading/leagues/join', { code: leagueCode }, U2);
  check('[F6] unirse dos veces → 400', joinDup.status === 400, joinDup.status);

  const joinChar = await req('POST', '/api/trading/leagues/join', { code: leagueCode }, U3);
  check('[F7] charlie se une → 200', joinChar.status === 200, joinChar.status);

  const mineRes = await req('GET', '/api/trading/leagues/mine', null, U1);
  check('[F8] GET /leagues/mine → 200',  mineRes.status === 200, mineRes.status);
  check('[F9] alice en 1 liga',          mineRes.body.length === 1, mineRes.body.length);
  check('[F10] alice es owner',          mineRes.body[0]?.isOwner === true, mineRes.body[0]?.isOwner);
  check('[F11] 3 miembros',              mineRes.body[0]?.memberCount === 3, mineRes.body[0]?.memberCount);

  const rankRes = await req('GET', `/api/trading/leagues/${leagueId}/ranking`, null, U1);
  check('[F12] GET /leagues/:id/ranking → 200', rankRes.status === 200, rankRes.status);
  check('[F13] name = "Liga Test"',              rankRes.body.name === 'Liga Test', rankRes.body.name);
  check('[F14] 3 entradas en ranking',           rankRes.body.ranking?.length === 3, rankRes.body.ranking?.length);
  const rankNames = rankRes.body.ranking.map(r => r.name || r.username);
  check('[F15] alice en ranking',   rankNames.includes('alice'),   rankNames);
  check('[F16] bob en ranking',     rankNames.includes('bob'),     rankNames);
  check('[F17] charlie en ranking', rankNames.includes('charlie'), rankNames);
  check('[F18] isYou=true para alice', rankRes.body.ranking.some(r => r.isYou), rankRes.body.ranking.map(r=>r.isYou));
  check('[F19] isOwner = true',        rankRes.body.isOwner === true, rankRes.body.isOwner);
  console.log(`     ranking: ${rankRes.body.ranking.map(r=>`${r.name||r.username}(${r.returnPct?.toFixed(2)}%)`).join(' > ')}`);

  const U4 = 'user_dave';
  await createUser(U4, 'dave');
  const rankUnauth = await req('GET', `/api/trading/leagues/${leagueId}/ranking`, null, U4);
  check('[F20] no-miembro → 403',    rankUnauth.status === 403, rankUnauth.status);

  const rankBad = await req('GET', '/api/trading/leagues/nonexistent/ranking', null, U1);
  check('[F21] liga inválida → 404', rankBad.status === 404, rankBad.status);

  // ══════════════════════════════════════════════════════════════════════════
  // GRUPO G: Liga — leave y delete
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Grupo G: Liga — leave y delete ───────────────────────────────\n');

  const leaveOwner = await req('POST', `/api/trading/leagues/${leagueId}/leave`, {}, U1);
  check('[G1] owner no puede abandonar → 400', leaveOwner.status === 400, leaveOwner.status);

  const leaveRes = await req('POST', `/api/trading/leagues/${leagueId}/leave`, {}, U2);
  check('[G2] bob abandona → 200', leaveRes.status === 200, leaveRes.status);

  const mineAfterLeave = await req('GET', '/api/trading/leagues/mine', null, U2);
  check('[G3] bob ya no ve la liga', mineAfterLeave.body.length === 0, mineAfterLeave.body.length);

  const delNotOwner = await req('DELETE', `/api/trading/leagues/${leagueId}`, null, U3);
  check('[G4] no-owner no puede eliminar → 403', delNotOwner.status === 403, delNotOwner.status);

  const delRes = await req('DELETE', `/api/trading/leagues/${leagueId}`, null, U1);
  check('[G5] owner elimina → 200', delRes.status === 200, delRes.status);

  const mineAfterDel = await req('GET', '/api/trading/leagues/mine', null, U1);
  check('[G6] alice ya no ve la liga', mineAfterDel.body.length === 0, mineAfterDel.body.length);
  console.log(`     liga "${leagueCode}" eliminada correctamente`);

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Resultado: ${passed} ✓   ${failed} ✗`);
  if (failed > 0) console.log('\n⚠️  Hay fallos — revisar antes de conectar frontend\n');
  else            console.log('\n✅  Todos los casos pasan — Fase 5 verificada\n');

  server.close(() => process.exit(failed > 0 ? 1 : 0));
}

run().catch(err => { console.error('Test runner error:', err.stack); process.exit(1); });
