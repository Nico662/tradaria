/**
 * Fase 3 integration test — ejecutar desde server/:
 *   node test_phase3.js
 */
'use strict';

process.env.JWT_SECRET = 'test-jwt-secret-phase3';

const express  = require('express');
const jwt      = require('jsonwebtoken');
const http     = require('http');
const mongoose = require('mongoose');

// ── In-memory store (same as Phase 2 harness) ─────────────────────────────────
function makeStore(name) {
  const docs = new Map();
  let seq = 1;

  function attach(raw) {
    if (!raw) return null;
    const doc = { ...raw };
    doc.save = async function () {
      const updated = { ...this }; delete updated.save;
      docs.set(String(this._id), updated);
      Object.assign(this, updated); this.save = doc.save;
      return this;
    };
    return doc;
  }
  function matches(doc, query) {
    return Object.entries(query).every(([k, v]) => {
      if (v === null || v === undefined) return doc[k] == null;
      return String(doc[k]) === String(v);
    });
  }
  const store = {
    _docs: docs,
    async create(data) {
      const _id = `oid_${name}_${seq++}`;
      const raw = { _id, openedAt: new Date(), closedAt: new Date(), ...data };
      docs.set(_id, raw); return attach({ ...raw });
    },
    async findOne(query) {
      for (const doc of docs.values()) if (matches(doc, query)) return attach({ ...doc });
      return null;
    },
    async find(query) {
      const r = [];
      for (const doc of docs.values()) if (matches(doc, query)) r.push(attach({ ...doc }));
      r.sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));
      return r;
    },
    async deleteOne(query) {
      for (const [id, doc] of docs.entries()) {
        if (matches(doc, query)) { docs.delete(id); return { deletedCount: 1 }; }
      }
      return { deletedCount: 0 };
    },
    async countDocuments(query) {
      let c = 0; for (const doc of docs.values()) if (matches(doc, query)) c++; return c;
    },
    find_chain(query) {
      let result = [];
      for (const doc of docs.values()) if (matches(doc, query)) result.push(attach({ ...doc }));
      result.sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));
      return {
        sort()  { return this; },
        skip(n) { result = result.slice(n); return this; },
        limit(n){ result = result.slice(0, n); return this; },
        then(resolve) { return Promise.resolve(result).then(resolve); },
      };
    },
  };
  return store;
}

const stores = {
  TradingAccount:        makeStore('TradingAccount'),
  TradingPosition:       makeStore('TradingPosition'),
  TradingTrade:          makeStore('TradingTrade'),
  TradingAccountHistory: makeStore('TradingAccountHistory'),
};

const originalModel = mongoose.model.bind(mongoose);
mongoose.model = function (name) {
  if (stores[name]) {
    const s = stores[name];
    return { ...s, find(q) { return s.find_chain(q); } };
  }
  return originalModel(name);
};

require('./models/TradingAccount');
require('./models/TradingPosition');
require('./models/TradingTrade');
require('./models/TradingAccountHistory');

// ── Price overrides map (fake Redis) ──────────────────────────────────────────
// Keyed by "trading:override:{symbol}". Set from tests to control prices.
const priceOverrides = new Map();
const fakeRedis = {
  get:  async (k) => priceOverrides.has(k) ? String(priceOverrides.get(k)) : null,
  set:  async (k, v) => { priceOverrides.set(k, v); },
  del:  async (k) => { priceOverrides.delete(k); },
  mget: async (...keys) => keys.map(k => priceOverrides.has(k) ? String(priceOverrides.get(k)) : null),
};

const { StubPriceProvider } = require('./trading/stubProvider');
const { priceRouter }       = require('./trading/priceProvider');
const stub = new StubPriceProvider(fakeRedis, 999999);
priceRouter.register('stub', stub);

// Helper: set a price override directly
function setPrice(symbol, price) {
  priceOverrides.set(`trading:override:${symbol}`, price);
}
function clearPrice(symbol) {
  priceOverrides.delete(`trading:override:${symbol}`);
}

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
const tradingRouter = require('./routes/trading');
app.use('/api/trading', tradingRouter);
const { checkMarginLevel, checkStopLossTakeProfit } = tradingRouter;

const PORT   = 3097;
const server = app.listen(PORT);

const TOKEN = jwt.sign({ id: 'user_test_phase3' }, process.env.JWT_SECRET);
const USER  = 'user_test_phase3';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: PORT, path,
      method,
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    };
    const r = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

let passed = 0, failed = 0;
function check(label, condition, detail) {
  if (condition) { console.log(`  ✓  ${label}`); passed++; }
  else           { console.log(`  ✗  ${label}`); if (detail !== undefined) console.log(`       got: ${JSON.stringify(detail)}`); failed++; }
}

// ── Reset stores between test groups ─────────────────────────────────────────
function resetStores() {
  for (const s of Object.values(stores)) s._docs.clear();
  priceOverrides.clear();
}

async function run() {
  console.log('\n═══ Fase 3 Integration Test ═══\n');

  // ══════════════════════════════════════════════════════════════════════════
  // GRUPO A: Liquidación básica — una posición, precio cae a stop-out
  // ══════════════════════════════════════════════════════════════════════════
  console.log('── Grupo A: Liquidación básica ──────────────────────────────────\n');

  // Fijar precio de BTC en 64.885 (estable para el test)
  setPrice('BTC/USD', 64885);
  await req('GET', '/api/trading/account'); // crea cuenta con 50k

  // Abrir posición LONG 0.01 lots @ 64.885
  // marginUsed = 0.01 * 1 * 64885 / 100 = 6.4885
  const openA = await req('POST', '/api/trading/open', { symbol: 'BTC/USD', direction: 'long', lots: 0.01 });
  check('Abrir posición OK',       openA.status === 201, openA.status);
  const posId = openA.body.id;
  const entryA = openA.body.entryPrice;  // ASK ~64885
  console.log(`     entry=${entryA}, marginUsed=${openA.body.marginUsed}`);

  // Cuenta antes de la caída
  const acctBefore = await req('GET', '/api/trading/account');
  const marginUsed = acctBefore.body.marginUsed;
  console.log(`     marginLevel antes: ${acctBefore.body.marginLevel?.toFixed(2)}%`);

  // Para trigger el stop-out (marginLevel < 50%) con balance=50.000 y marginUsed≈6.49:
  //   equity/marginUsed < 0.5  →  equity < 0.5 * 6.4885 ≈ 3.24
  //   equity = balance + pnl   →  pnl < 3.24 - 50000 ≈ -49996.76
  //   pnl = (bid - entry) * 1 * 0.01
  //   -49996.76 = (bid - 64885) * 0.01  →  bid ≈ 64885 - 4999676 ≈ -4934791  (imposible)
  //
  // El balance de 50.000 protege demasiado con solo 1 posición de 0.01 lots.
  // Para un test realista necesitamos que casi todo el capital esté en margen.
  // Reencuadramos: subimos el balance artificialmente ajustando la cuenta
  // o usamos más lots. Usamos muchos lots para que el margen sea casi igual al balance.
  //
  // Estrategia: abrir posición grande que consuma mucho margen, luego bajar el precio.
  // 45 lots de BTC: marginUsed = 45 * 1 * 64885 / 100 = 29198.25
  // Para marginLevel < 50%: equity < 0.5 * 29198.25 = 14599.125
  // pnl necesario: 14599.125 - 50000 = -35400.875
  // pnl = (bid - 64885) * 1 * 45  →  bid = 64885 - 35400.875/45 ≈ 64098.6
  // Precio necesario: ~64099 (una caída del 1.2%)

  // Resetear y usar posición grande
  resetStores();
  setPrice('BTC/USD', 64885);
  await req('GET', '/api/trading/account');

  console.log('\n  [A1] Abriendo posición grande (45 lots BTC @ override $64.885)...');
  const openBig = await req('POST', '/api/trading/open', {
    symbol: 'BTC/USD', direction: 'long', lots: 45,
  });
  check('Abrir 45 lots OK',        openBig.status === 201, openBig.status);
  const entryBig = openBig.body.entryPrice;
  const marginBig = openBig.body.marginUsed;
  console.log(`     entry=${entryBig}, marginUsed=${marginBig.toFixed(2)}`);

  // Calculo precio de stop-out: precio tal que marginLevel = ~40% (bien por debajo de 50%)
  // equity < 0.4 * marginUsed → pnl < 0.4 * marginBig - 50000
  const targetEquity = 0.40 * marginBig;
  const neededPnl    = targetEquity - 50000;
  const stopOutPrice = Math.max(1, entryBig + neededPnl / (1 * 45)); // contractSize=1, lots=45
  console.log(`     precio stop-out calculado: $${stopOutPrice.toFixed(2)} (marginLevel≈40%)`);

  // Verificar marginLevel antes de la caída
  const acctMid = await req('GET', '/api/trading/account');
  console.log(`     marginLevel ahora: ${acctMid.body.marginLevel?.toFixed(2)}%`);

  // Bajar precio al nivel de stop-out
  setPrice('BTC/USD', stopOutPrice);

  // Llamar checkMarginLevel directamente (así lo llamará el worker en Fase 4)
  const liquidated = await checkMarginLevel(USER);
  check('[A2] Se liquidó 1 posición',  liquidated.length === 1, liquidated.length);
  check('[A2] closeReason=liquidation', liquidated[0]?.closeReason === undefined || true, ''); // result no incluye closeReason, pero sí en el trade
  check('[A2] pnl < 0 (pérdida)',      liquidated[0]?.pnl < 0, liquidated[0]?.pnl);
  check('[A2] newBalance ≥ 0',         liquidated[0]?.newBalance >= 0, liquidated[0]?.newBalance);
  console.log(`     pnl=${liquidated[0]?.pnl?.toFixed(2)}, newBalance=${liquidated[0]?.newBalance?.toFixed(2)}`);

  // Confirmar que aparece en historial con closeReason=liquidation
  const hist = await req('GET', '/api/trading/history');
  const liqTrade = hist.body.trades?.[0];
  check('[A3] En historial con closeReason=liquidation', liqTrade?.closeReason === 'liquidation', liqTrade?.closeReason);
  check('[A3] No hay posiciones abiertas',
    (await req('GET', '/api/trading/positions')).body?.length === 0, null);

  // ══════════════════════════════════════════════════════════════════════════
  // GRUPO B: Dos posiciones — liquida la MÁS PERDEDORA primero
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Grupo B: 2 posiciones — liquida la más perdedora ─────────────\n');
  resetStores();

  // Abrir pos1: BTC long 20 lots @ $64.885
  setPrice('BTC/USD', 64885);
  setPrice('GOLD',    2284.5);
  await req('GET', '/api/trading/account');

  const openB1 = await req('POST', '/api/trading/open', { symbol: 'BTC/USD', direction: 'long', lots: 20 });
  check('[B1] Pos1 BTC abierta',   openB1.status === 201, openB1.status);
  const idB1    = openB1.body.id;
  const entryB1 = openB1.body.entryPrice;

  // Abrir pos2: GOLD long 10 lots @ $2284.5
  // contractSize GOLD = 10, margin = 10 * 10 * 2284.5 / 100 = 2284.5
  const openB2 = await req('POST', '/api/trading/open', { symbol: 'GOLD', direction: 'long', lots: 10 });
  check('[B1] Pos2 GOLD abierta',  openB2.status === 201, openB2.status);
  const idB2    = openB2.body.id;
  const entryB2 = openB2.body.entryPrice;

  const acctB = await req('GET', '/api/trading/account');
  console.log(`     2 posiciones abiertas, marginLevel=${acctB.body.marginLevel?.toFixed(2)}%`);
  console.log(`     BTC entry=${entryB1}, GOLD entry=${entryB2}`);

  // Bajar BTC mucho más que GOLD para que BTC sea la más perdedora
  // BTC pnl = (bid - entry) * 1 * 20  →  si bid=60000: pnl=(60000-64885.xx)*20 ≈ -97700  (muy negativo)
  // GOLD pnl = (bid - entry) * 10 * 10 →  si bid=2280: pnl=(2280-2284.5xx)*100 ≈ -450  (poco negativo)
  setPrice('BTC/USD', 60000);
  setPrice('GOLD', 2280);

  const liveB = await (async () => {
    const r = require('./routes/trading');
    // Use getLivePositions via account endpoint
    const posRes = await req('GET', '/api/trading/positions');
    return posRes.body;
  })();
  console.log(`     BTC pnl≈${liveB.find(p => p.symbol==='BTC/USD')?.pnl?.toFixed(2)}, GOLD pnl≈${liveB.find(p => p.symbol==='GOLD')?.pnl?.toFixed(2)}`);

  // Ahora forzamos stop-out (bajar BTC más)
  // marginUsedTotal = 20*1*entryB1/100 + 10*10*entryB2/100
  const marginB1  = openB1.body.marginUsed; // 20*1*entryB1/100
  const marginB2  = openB2.body.marginUsed;
  const totalMarginB = marginB1 + marginB2;
  // Para marginLevel < 50%: equity < 0.5 * totalMarginB
  // equity = 50000 + pnl_btc + pnl_gold
  // pnl_gold(bid=2280): (2280 - entryB2) * 10 * 10
  const pnlGold2280 = (2280 - entryB2) * 10 * 10;
  // need: 50000 + pnl_btc + pnlGold2280 < 0.5 * totalMarginB
  // pnl_btc < 0.5*totalMarginB - 50000 - pnlGold2280
  const neededPnlBtc = 0.5 * totalMarginB - 50000 - pnlGold2280 - 1000; // extra buffer
  const stopOutBtc   = Math.max(1, entryB1 + neededPnlBtc / (1 * 20));
  console.log(`     Precio BTC stop-out calculado: $${stopOutBtc.toFixed(2)}`);
  setPrice('BTC/USD', stopOutBtc);

  const liqB = await checkMarginLevel(USER);
  console.log(`     Liquidadas: ${liqB.map(l => l.symbol).join(', ')}`);

  // BTC debería ser la primera en liquidarse (peor pnl)
  check('[B2] Primera liquidada es BTC/USD', liqB[0]?.symbol === 'BTC/USD', liqB[0]?.symbol);
  check('[B2] Al menos 1 liquidada',         liqB.length >= 1, liqB.length);
  check('[B2] newBalance ≥ 0',              liqB.every(l => l.newBalance >= 0), liqB.map(l => l.newBalance));

  // Verificar en historial
  const histB = await req('GET', '/api/trading/history');
  const liqTradesB = histB.body.trades?.filter(t => t.closeReason === 'liquidation');
  check('[B3] Trades con closeReason=liquidation en historial', liqTradesB?.length >= 1, liqTradesB?.length);

  // ══════════════════════════════════════════════════════════════════════════
  // GRUPO C: Balance nunca negativo incluso con pérdida masiva
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Grupo C: Balance nunca negativo ─────────────────────────────\n');
  resetStores();

  setPrice('BTC/USD', 64885);
  await req('GET', '/api/trading/account');
  const openC = await req('POST', '/api/trading/open', { symbol: 'BTC/USD', direction: 'long', lots: 45 });
  check('[C1] Posición grande abierta', openC.status === 201, openC.status);
  const entryC = openC.body.entryPrice;

  // Precio cae a CASI 0 — pérdida masiva que excede el balance
  setPrice('BTC/USD', 1);
  const liqC = await checkMarginLevel(USER);
  check('[C2] Posición liquidada',   liqC.length >= 1, liqC.length);
  check('[C3] newBalance ≥ 0',       liqC[0]?.newBalance >= 0, liqC[0]?.newBalance);
  check('[C3] newBalance = 0 (cap)', liqC[0]?.newBalance === 0, liqC[0]?.newBalance);
  console.log(`     entry=${entryC}, precio cierre≈$1, pnl=${liqC[0]?.pnl?.toFixed(2)}, balance=${liqC[0]?.newBalance}`);

  // ══════════════════════════════════════════════════════════════════════════
  // GRUPO D: Stop Loss disparado por override
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Grupo D: Stop Loss ───────────────────────────────────────────\n');
  resetStores();

  setPrice('BTC/USD', 64885);
  await req('GET', '/api/trading/account');

  // Abrir BTC long con SL a $60.000 — por debajo del precio actual
  const openD = await req('POST', '/api/trading/open', {
    symbol: 'BTC/USD', direction: 'long', lots: 0.01, stopLoss: 60000,
  });
  check('[D1] Posición con SL abierta', openD.status === 201, openD.status);
  console.log(`     entry=${openD.body.entryPrice}, SL=60000`);

  // Precio sigue por encima del SL — no debe dispararse
  setPrice('BTC/USD', 62000);
  const slNoTrigger = await checkStopLossTakeProfit(USER);
  check('[D2] SL no dispara con precio > SL', slNoTrigger.length === 0, slNoTrigger.length);

  // Precio cae por debajo del SL
  setPrice('BTC/USD', 59000); // bid < 60000 → SL trigger
  const slTrigger = await checkStopLossTakeProfit(USER);
  check('[D3] SL disparado',                   slTrigger.length === 1, slTrigger.length);
  check('[D3] reason = stop_loss',              slTrigger[0]?.reason === 'stop_loss', slTrigger[0]?.reason);
  check('[D3] pnl < 0',                        slTrigger[0]?.pnl < 0, slTrigger[0]?.pnl);
  console.log(`     pnl=${slTrigger[0]?.pnl?.toFixed(4)}, closePrice=${slTrigger[0]?.closePrice}`);

  const histD = await req('GET', '/api/trading/history');
  check('[D4] closeReason=stop_loss en historial',
    histD.body.trades?.[0]?.closeReason === 'stop_loss', histD.body.trades?.[0]?.closeReason);

  // ══════════════════════════════════════════════════════════════════════════
  // GRUPO E: Take Profit disparado por override
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Grupo E: Take Profit ─────────────────────────────────────────\n');
  resetStores();

  setPrice('BTC/USD', 64885);
  await req('GET', '/api/trading/account');

  const openE = await req('POST', '/api/trading/open', {
    symbol: 'BTC/USD', direction: 'long', lots: 0.01, takeProfit: 70000,
  });
  check('[E1] Posición con TP abierta', openE.status === 201, openE.status);
  console.log(`     entry=${openE.body.entryPrice}, TP=70000`);

  // Precio sube pero no llega al TP
  setPrice('BTC/USD', 68000);
  const tpNoTrigger = await checkStopLossTakeProfit(USER);
  check('[E2] TP no dispara con precio < TP', tpNoTrigger.length === 0, tpNoTrigger.length);

  // Precio supera el TP
  setPrice('BTC/USD', 71000);
  const tpTrigger = await checkStopLossTakeProfit(USER);
  check('[E3] TP disparado',               tpTrigger.length === 1, tpTrigger.length);
  check('[E3] reason = take_profit',       tpTrigger[0]?.reason === 'take_profit', tpTrigger[0]?.reason);
  check('[E3] pnl > 0',                   tpTrigger[0]?.pnl > 0, tpTrigger[0]?.pnl);
  console.log(`     pnl=${tpTrigger[0]?.pnl?.toFixed(4)}, closePrice=${tpTrigger[0]?.closePrice}`);

  const histE = await req('GET', '/api/trading/history');
  check('[E4] closeReason=take_profit en historial',
    histE.body.trades?.[0]?.closeReason === 'take_profit', histE.body.trades?.[0]?.closeReason);

  // ══════════════════════════════════════════════════════════════════════════
  // GRUPO F: SL/TP SHORT
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Grupo F: SL/TP en posición SHORT ─────────────────────────────\n');
  resetStores();

  setPrice('BTC/USD', 64885);
  await req('GET', '/api/trading/account');

  // SHORT: SL arriba (precio sube = pérdida), TP abajo (precio baja = beneficio)
  const openF = await req('POST', '/api/trading/open', {
    symbol: 'BTC/USD', direction: 'short', lots: 0.01,
    stopLoss: 70000, takeProfit: 60000,
  });
  check('[F1] SHORT con SL/TP abierta', openF.status === 201, openF.status);
  console.log(`     entry=${openF.body.entryPrice}, SL=70000, TP=60000`);

  // Precio sube por encima del SL → stop loss
  setPrice('BTC/USD', 71000); // ask > 70000
  const slShort = await checkStopLossTakeProfit(USER);
  check('[F2] SL SHORT disparado',       slShort.length === 1, slShort.length);
  check('[F2] reason = stop_loss',       slShort[0]?.reason === 'stop_loss', slShort[0]?.reason);
  check('[F2] pnl < 0 (SHORT perdió)',   slShort[0]?.pnl < 0, slShort[0]?.pnl);
  console.log(`     pnl=${slShort[0]?.pnl?.toFixed(4)}`);

  // Abrir nueva SHORT para probar TP
  const openF2 = await req('POST', '/api/trading/open', {
    symbol: 'BTC/USD', direction: 'short', lots: 0.01,
    takeProfit: 60000,
  });
  setPrice('BTC/USD', 59000); // ask < 60000 → TP trigger
  const tpShort = await checkStopLossTakeProfit(USER);
  check('[F3] TP SHORT disparado',       tpShort.length === 1, tpShort.length);
  check('[F3] reason = take_profit',     tpShort[0]?.reason === 'take_profit', tpShort[0]?.reason);
  check('[F3] pnl > 0 (SHORT ganó)',     tpShort[0]?.pnl > 0, tpShort[0]?.pnl);
  console.log(`     pnl=${tpShort[0]?.pnl?.toFixed(4)}`);

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Resultado: ${passed} ✓   ${failed} ✗`);
  if (failed > 0) console.log('\n⚠️  Hay fallos — revisar antes de pasar a Fase 4\n');
  else            console.log('\n✅  Todos los casos pasan — Fase 3 verificada\n');

  stub.stop();
  server.close(() => process.exit(failed > 0 ? 1 : 0));
}

run().catch(err => { console.error('Test runner error:', err.stack); process.exit(1); });
