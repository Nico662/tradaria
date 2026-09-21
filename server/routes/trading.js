'use strict';

const express  = require('express');
const jwt      = require('jsonwebtoken');
const mongoose = require('mongoose');

const { priceRouter, SYMBOL_CATALOG, isSymbolTradeable } = require('../trading/priceProvider');

const router = express.Router();

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth ? auth.replace('Bearer ', '') : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Model accessors (lazy — models registered in index.js before listen) ─────
const Account  = () => mongoose.model('TradingAccount');
const Position = () => mongoose.model('TradingPosition');
const Trade    = () => mongoose.model('TradingTrade');

// ── Lot validation ────────────────────────────────────────────────────────────
function isValidLots(lots) {
  if (typeof lots !== 'number' || !isFinite(lots)) return false;
  if (lots < 0.01) return false;
  return Math.abs(Math.round(lots * 100) - lots * 100) < 1e-9;
}

// ── P&L for a position given its closing-side price ──────────────────────────
// LONG closes at bid, SHORT closes at ask.
function calcPnl(pos, priceObj) {
  const currClose = pos.direction === 'long' ? priceObj.bid : priceObj.ask;
  return pos.direction === 'long'
    ? (currClose - pos.entryPrice) * pos.contractSize * pos.lots
    : (pos.entryPrice - currClose) * pos.contractSize * pos.lots;
}

// ── Account summary: equity, margin, margin level ────────────────────────────
function buildAccountSummary(account, livePositions) {
  const totalPnl        = livePositions.reduce((s, { pnl }) => s + pnl, 0);
  const marginUsedTotal = livePositions.reduce((s, { pos }) => s + pos.marginUsed, 0);
  const equity          = account.balance + totalPnl;
  const freeMargin      = equity - marginUsedTotal;
  const marginLevel     = marginUsedTotal > 0 ? (equity / marginUsedTotal) * 100 : null;

  return {
    balance:       account.balance,
    equity,
    marginUsed:    marginUsedTotal,
    freeMargin,
    marginLevel,
    openPositions: livePositions.length,
  };
}

// ── Fetch all open positions with live prices ─────────────────────────────────
async function getLivePositions(userId) {
  const positions = await Position().find({ userId });
  return Promise.all(
    positions.map(async pos => {
      try {
        const priceObj = await priceRouter.getPrice(pos.symbol);
        return { pos, priceObj, pnl: calcPnl(pos, priceObj) };
      } catch {
        const fallback = { price: pos.entryPrice, bid: pos.entryPrice, ask: pos.entryPrice };
        return { pos, priceObj: fallback, pnl: 0 };
      }
    })
  );
}

// ── Ensure account exists, create with $50k on first access ──────────────────
async function getOrCreateAccount(userId) {
  let account = await Account().findOne({ userId });
  if (!account) {
    account = await Account().create({ userId, balance: 50000, resetCount: 0 });
  }
  return account;
}

// ─────────────────────────────────────────────────────────────────────────────
// closePosition — shared close logic used by manual close, liquidation, SL/TP.
//
// Accepts a pre-fetched priceObj to avoid a redundant getPrice() call when the
// caller already has it (e.g. checkMarginLevel passes the live price).
//
// Returns { pnl, pnlPct, closePrice, newBalance } or null if the position no
// longer exists (guard against double-close from concurrent calls).
// ─────────────────────────────────────────────────────────────────────────────
async function closePosition(pos, closeReason, priceObjOverride) {
  // Atomic guard: findOneAndDelete is a single operation — whichever concurrent
  // caller wins gets the document; the other gets null and exits cleanly.
  const deleted = await Position().findOneAndDelete({ _id: pos._id, userId: pos.userId });
  if (!deleted) return null;

  const priceObj   = priceObjOverride ?? await priceRouter.getPrice(deleted.symbol);
  const closePrice = deleted.direction === 'long' ? priceObj.bid : priceObj.ask;
  const pnl        = calcPnl(deleted, priceObj);
  const pnlPct     = deleted.marginUsed > 0 ? (pnl / deleted.marginUsed) * 100 : 0;

  // Atomic balance update: aggregation pipeline $max[0, balance+pnl] ensures the
  // floor-at-zero and the increment are one MongoDB operation — no read-compute-save window.
  const updatedAccount = await Account().findOneAndUpdate(
    { userId: deleted.userId },
    [{ $set: { balance: { $max: [0, { $add: ['$balance', pnl] }] } } }],
    { returnDocument: 'after', updatePipeline: true }
  );
  const newBalance = updatedAccount?.balance ?? 0;

  await Trade().create({
    userId:       deleted.userId,
    symbol:       deleted.symbol,
    name:         deleted.name,
    category:     deleted.category,
    direction:    deleted.direction,
    entryPrice:   deleted.entryPrice,
    closePrice,
    lots:         deleted.lots,
    contractSize: deleted.contractSize,
    marginUsed:   deleted.marginUsed,
    pnl,
    pnlPct,
    closeReason,
    openedAt:     deleted.openedAt,
  });

  return { pnl, pnlPct, closePrice, newBalance };
}

// ─────────────────────────────────────────────────────────────────────────────
// checkMarginLevel — MT5-style stop-out logic.
//
// marginLevel = (equity / marginUsedTotal) * 100
//   ≥ 100% → healthy
//   < 100% → margin call warning (not enforced here, reported to caller)
//   <  50% → STOP-OUT: close the position with the worst (most negative) P&L,
//            repeat until marginLevel ≥ 50% or no positions remain.
//
// Balance is always capped at $0 (via closePosition).
// Returns array of liquidated position summaries — empty if nothing triggered.
// Exported for Phase 4 worker.
// ─────────────────────────────────────────────────────────────────────────────
async function checkMarginLevel(userId) {
  const liquidated = [];

  while (true) {
    const account = await getOrCreateAccount(userId);
    const live    = await getLivePositions(userId);

    if (live.length === 0) break;

    const summary = buildAccountSummary(account, live);

    // No margin in use — no risk
    if (summary.marginUsed === 0) break;

    // Account is safe
    if (summary.marginLevel >= 50) break;

    // Find the position with the worst (most negative) P&L
    const worst = live.reduce((w, entry) => entry.pnl < w.pnl ? entry : w);

    const result = await closePosition(worst.pos, 'liquidation', worst.priceObj);
    if (!result) break; // position vanished concurrently — bail to avoid infinite loop

    liquidated.push({
      symbol:     worst.pos.symbol,
      direction:  worst.pos.direction,
      lots:       worst.pos.lots,
      ...result,
    });
  }

  return liquidated;
}

// ─────────────────────────────────────────────────────────────────────────────
// checkStopLossTakeProfit — evaluates every open position against its SL/TP.
//
// Uses the closing-side price for each check:
//   LONG : closing price = bid
//   SHORT: closing price = ask
//
// Closes triggered positions with closeReason 'stop_loss' or 'take_profit'.
// Returns array of triggered position summaries.
// Exported for Phase 4 worker.
// ─────────────────────────────────────────────────────────────────────────────
async function checkStopLossTakeProfit(userId) {
  const triggered = [];
  const live      = await getLivePositions(userId);

  for (const { pos, priceObj } of live) {
    const closePrice = pos.direction === 'long' ? priceObj.bid : priceObj.ask;
    let reason = null;

    if (pos.stopLoss != null) {
      if (pos.direction === 'long'  && closePrice <= pos.stopLoss) reason = 'stop_loss';
      if (pos.direction === 'short' && closePrice >= pos.stopLoss) reason = 'stop_loss';
    }

    if (!reason && pos.takeProfit != null) {
      if (pos.direction === 'long'  && closePrice >= pos.takeProfit) reason = 'take_profit';
      if (pos.direction === 'short' && closePrice <= pos.takeProfit) reason = 'take_profit';
    }

    if (reason) {
      const result = await closePosition(pos, reason, priceObj);
      if (result) {
        triggered.push({ symbol: pos.symbol, direction: pos.direction, reason, ...result });
      }
    }
  }

  return triggered;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/trading/account
// ─────────────────────────────────────────────────────────────────────────────
router.get('/account', requireAuth, async (req, res) => {
  try {
    const account = await getOrCreateAccount(req.userId);
    const live    = await getLivePositions(req.userId);
    res.json(buildAccountSummary(account, live));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/trading/positions
// ─────────────────────────────────────────────────────────────────────────────
router.get('/positions', requireAuth, async (req, res) => {
  try {
    const live   = await getLivePositions(req.userId);
    const result = live.map(({ pos, priceObj, pnl }) => ({
      id:           pos._id,
      symbol:       pos.symbol,
      name:         pos.name,
      category:     pos.category,
      direction:    pos.direction,
      lots:         pos.lots,
      entryPrice:   pos.entryPrice,
      currentPrice: priceObj.price,
      contractSize: pos.contractSize,
      leverage:     pos.leverage,
      marginUsed:   pos.marginUsed,
      stopLoss:     pos.stopLoss,
      takeProfit:   pos.takeProfit,
      pnl,
      openedAt:     pos.openedAt,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/trading/prices
// Returns current price, bid, ask for every catalog symbol. No auth required.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/prices', async (req, res) => {
  try {
    const results = await Promise.allSettled(
      SYMBOL_CATALOG.map(({ symbol }) => priceRouter.getPrice(symbol))
    );
    res.json(
      results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/trading/catalog
// Returns SYMBOL_CATALOG with live tradeable status. No auth required — the
// catalog is public information (same symbols shown to unauthenticated visitors).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/catalog', (req, res) => {
  res.json(
    SYMBOL_CATALOG.map(({ symbol, name, category, contractSize }) => ({
      symbol,
      name,
      category,
      contractSize,
      tradeable: isSymbolTradeable(symbol),
    }))
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/trading/open
// Body: { symbol, direction, lots, stopLoss?, takeProfit? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/open', requireAuth, async (req, res) => {
  try {
    const { symbol, direction, lots, stopLoss, takeProfit } = req.body ?? {};

    const catalogEntry = SYMBOL_CATALOG.find(s => s.symbol === symbol);
    if (!catalogEntry) return res.status(400).json({ error: `Unknown symbol: ${symbol}` });

    if (direction !== 'long' && direction !== 'short') {
      return res.status(400).json({ error: 'direction must be "long" or "short"' });
    }
    if (!isValidLots(lots)) {
      return res.status(400).json({ error: 'lots must be a multiple of 0.01 and ≥ 0.01' });
    }
    if (!isSymbolTradeable(symbol)) {
      return res.status(400).json({ error: `Market closed for ${symbol}` });
    }

    const priceObj   = await priceRouter.getPrice(symbol);
    const entryPrice = direction === 'long' ? priceObj.ask : priceObj.bid;

    const { contractSize } = catalogEntry;
    const LEVERAGE         = 100;
    const marginReq        = (lots * contractSize * entryPrice) / LEVERAGE;

    const account = await getOrCreateAccount(req.userId);
    const live    = await getLivePositions(req.userId);
    const summary = buildAccountSummary(account, live);

    if (summary.freeMargin < marginReq) {
      return res.status(400).json({
        error:     'Insufficient free margin',
        required:  marginReq,
        available: summary.freeMargin,
      });
    }

    if (stopLoss != null) {
      const sl = Number(stopLoss);
      if (!isFinite(sl) || sl <= 0) return res.status(400).json({ error: 'Invalid stopLoss' });
      if (direction === 'long'  && sl >= entryPrice) return res.status(400).json({ error: 'stopLoss must be below entry for long'  });
      if (direction === 'short' && sl <= entryPrice) return res.status(400).json({ error: 'stopLoss must be above entry for short' });
    }
    if (takeProfit != null) {
      const tp = Number(takeProfit);
      if (!isFinite(tp) || tp <= 0) return res.status(400).json({ error: 'Invalid takeProfit' });
      if (direction === 'long'  && tp <= entryPrice) return res.status(400).json({ error: 'takeProfit must be above entry for long'  });
      if (direction === 'short' && tp >= entryPrice) return res.status(400).json({ error: 'takeProfit must be below entry for short' });
    }

    const position = await Position().create({
      userId:       req.userId,
      symbol,
      name:         catalogEntry.name,
      category:     catalogEntry.category,
      direction,
      entryPrice,
      lots,
      contractSize,
      leverage:     LEVERAGE,
      marginUsed:   marginReq,
      stopLoss:     stopLoss   != null ? Number(stopLoss)   : null,
      takeProfit:   takeProfit != null ? Number(takeProfit) : null,
    });

    // Safety net: opening this position could (in edge cases) push marginLevel
    // below stop-out. Run the check but don't let its result affect the 201 response.
    checkMarginLevel(req.userId).catch(() => {});

    res.status(201).json({
      id:          position._id,
      symbol,
      direction,
      lots,
      entryPrice,
      contractSize,
      marginUsed:  marginReq,
      openedAt:    position.openedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/trading/close/:positionId  (manual close)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/close/:positionId', requireAuth, async (req, res) => {
  try {
    const pos = await Position().findOne({
      _id:    req.params.positionId,
      userId: req.userId,
    });
    if (!pos) return res.status(404).json({ error: 'Position not found' });

    const result = await closePosition(pos, 'manual');
    if (!result) return res.status(409).json({ error: 'Position already closed' });

    // If closing a big loser wiped the balance to 0 and other positions remain,
    // those may now be in stop-out territory.
    checkMarginLevel(req.userId).catch(() => {});

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/trading/positions/:id  (update SL/TP on an open position)
// Body: { stopLoss?, takeProfit? }  — at least one field required
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/positions/:id', requireAuth, async (req, res) => {
  try {
    const pos = await Position().findOne({ _id: req.params.id, userId: req.userId });
    if (!pos) return res.status(404).json({ error: 'Position not found' });

    const { stopLoss, takeProfit } = req.body ?? {};
    if (stopLoss == null && takeProfit == null) {
      return res.status(400).json({ error: 'Provide stopLoss, takeProfit, or both' });
    }

    if (stopLoss != null) {
      const sl = Number(stopLoss);
      if (!isFinite(sl) || sl <= 0) return res.status(400).json({ error: 'Invalid stopLoss' });
      if (pos.direction === 'long'  && sl >= pos.entryPrice) return res.status(400).json({ error: 'stopLoss must be below entry for long'  });
      if (pos.direction === 'short' && sl <= pos.entryPrice) return res.status(400).json({ error: 'stopLoss must be above entry for short' });
      pos.stopLoss = sl;
    }
    if (takeProfit != null) {
      const tp = Number(takeProfit);
      if (!isFinite(tp) || tp <= 0) return res.status(400).json({ error: 'Invalid takeProfit' });
      if (pos.direction === 'long'  && tp <= pos.entryPrice) return res.status(400).json({ error: 'takeProfit must be above entry for long'  });
      if (pos.direction === 'short' && tp >= pos.entryPrice) return res.status(400).json({ error: 'takeProfit must be below entry for short' });
      pos.takeProfit = tp;
    }

    await pos.save();

    res.json({
      id:         pos._id,
      symbol:     pos.symbol,
      direction:  pos.direction,
      entryPrice: pos.entryPrice,
      stopLoss:   pos.stopLoss,
      takeProfit: pos.takeProfit,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/trading/history
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const skip  = (page - 1) * limit;

    const [trades, total] = await Promise.all([
      Trade().find({ userId: req.userId })
        .sort({ closedAt: -1 })
        .skip(skip)
        .limit(limit),
      Trade().countDocuments({ userId: req.userId }),
    ]);

    res.json({
      trades,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Lazy accessors for social models ─────────────────────────────────────────
const TAccHistory = () => mongoose.model('TradingAccountHistory');
const TDuel       = () => mongoose.model('TradingDuel');
const TLeague     = () => mongoose.model('TradingLeague');
const User        = () => mongoose.model('User');
const Friendship  = () => mongoose.model('Friendship');

// ── Get current equity for any user (balance + floating P&L) ─────────────────
async function getTradingEquity(userId) {
  const account = await Account().findOne({ userId });
  if (!account) return 50000;
  const live = await getLivePositions(userId);
  return account.balance + live.reduce((s, { pnl }) => s + pnl, 0);
}

// ── Trade stats: total trades, win rate, current winning streak ───────────────
async function getTradeStats(userId) {
  const trades = await Trade().find({ userId }).sort({ closedAt: -1 });
  const total  = trades.length;
  const wins   = trades.filter(t => t.pnl > 0).length;
  let streak = 0;
  for (const t of trades) {
    if (t.pnl > 0) streak++;
    else break;
  }
  return {
    trades:  total,
    winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
    streak,
  };
}

// ── Batch-efficient leaderboard entry builder for all TradingAccounts ─────────
async function buildLeaderboardEntries() {
  const [accounts, allPositions] = await Promise.all([
    Account().find({}).populate('userId', 'name username avatar customAvatar activeCosmetics'),
    Position().find({}),
  ]);

  // Group open positions by userId
  const posMap = {};
  for (const pos of allPositions) {
    const uid = pos.userId.toString();
    if (!posMap[uid]) posMap[uid] = [];
    posMap[uid].push(pos);
  }

  // Fetch prices for all unique symbols in a single round
  const uniqueSymbols = [...new Set(allPositions.map(p => p.symbol))];
  const priceMap = {};
  await Promise.all(uniqueSymbols.map(async sym => {
    try {
      priceMap[sym] = await priceRouter.getPrice(sym);
    } catch {}
  }));

  return accounts
    .filter(a => a.userId)
    .map(a => {
      const uid      = a.userId._id.toString();
      const positions = posMap[uid] || [];
      const totalPnl = positions.reduce((s, pos) => {
        const priceObj = priceMap[pos.symbol] || { bid: pos.entryPrice, ask: pos.entryPrice };
        return s + calcPnl(pos, priceObj);
      }, 0);
      const equity    = a.balance + totalPnl;
      const returnPct = ((equity - 50000) / 50000) * 100;
      return {
        userId:          uid,
        name:            a.userId.username || a.userId.name || 'Anonymous',
        username:        a.userId.username || null,
        avatar:          a.userId.avatar   || null,
        customAvatar:    a.userId.customAvatar || null,
        activeCosmetics: a.userId.activeCosmetics || {},
        equity,
        returnPct,
      };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/trading/snapshot  — saves today's equity to TradingAccountHistory
// ─────────────────────────────────────────────────────────────────────────────
router.post('/snapshot', requireAuth, async (req, res) => {
  try {
    const equity = await getTradingEquity(req.userId);
    const date   = new Date().toISOString().split('T')[0];
    await TAccHistory().findOneAndUpdate(
      { userId: req.userId, date },
      { equity },
      { upsert: true }
    );
    res.json({ ok: true, equity, date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/trading/leaderboard?period=global|week[&userId=<id>]
// ─────────────────────────────────────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const period  = req.query.period === 'week' ? 'week' : 'global';
    const entries = await buildLeaderboardEntries();

    let baselineMap = {};
    if (period === 'week') {
      const now    = new Date();
      const day    = now.getUTCDay();
      const diff   = (day === 0) ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() + diff);
      monday.setUTCHours(0, 0, 0, 0);
      const mondayStr = monday.toISOString().split('T')[0];

      const baselineHistory = await TAccHistory().aggregate([
        { $match: { date: { $lt: mondayStr } } },
        { $sort:  { date: -1 } },
        { $group: { _id: '$userId', equity: { $first: '$equity' } } },
      ]);
      baselineHistory.forEach(h => { baselineMap[String(h._id)] = h.equity; });
    }

    const ranked = entries.map(e => {
      const baseline  = period === 'week' ? (baselineMap[e.userId] ?? 50000) : 50000;
      const returnPct = ((e.equity - baseline) / baseline) * 100;
      return { ...e, returnPct };
    }).sort((a, b) => b.returnPct - a.returnPct);

    const top10 = ranked.slice(0, 10);

    // Attach trade stats to each top-10 entry
    const statsArr = await Promise.all(top10.map(e => getTradeStats(e.userId)));
    const top10WithStats = top10.map((e, i) => ({ ...e, ...statsArr[i] }));

    let userPosition = null;
    if (req.query.userId) {
      const idx = ranked.findIndex(e => e.userId === req.query.userId);
      if (idx >= 10) {
        const u     = ranked[idx];
        const stats = await getTradeStats(u.userId);
        userPosition = { rank: idx + 1, ...u, ...stats };
      }
    }

    res.json({ leaderboard: top10WithStats, userPosition, period });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Trading Duels
// ─────────────────────────────────────────────────────────────────────────────

router.post('/duel/challenge', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });
    const target = await User().findOne({ username: username.toLowerCase() });
    if (!target) return res.status(404).json({ error: 'User not found' });
    const friendship = await Friendship().findOne({
      $or: [
        { requester: req.userId, recipient: target._id },
        { requester: target._id, recipient: req.userId },
      ],
      status: 'accepted',
    });
    if (!friendship) return res.status(403).json({ error: 'Not friends' });
    const existing = await TDuel().findOne({
      $or: [
        { challenger: req.userId, opponent: target._id },
        { challenger: target._id, opponent: req.userId },
      ],
      status: { $in: ['pending', 'active'] },
    });
    if (existing) return res.status(400).json({ error: 'Already have an active duel' });
    const duel = await TDuel().create({ challenger: req.userId, opponent: target._id });
    res.json({ ok: true, duelId: duel._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/duel/accept/:duelId', requireAuth, async (req, res) => {
  try {
    const duel = await TDuel().findOne({ _id: req.params.duelId, opponent: req.userId, status: 'pending' });
    if (!duel) return res.status(404).json({ error: 'Duel not found' });
    const [cEquity, oEquity] = await Promise.all([
      getTradingEquity(duel.challenger),
      getTradingEquity(duel.opponent),
    ]);
    const startDate = new Date().toISOString().split('T')[0];
    const endD = new Date(); endD.setDate(endD.getDate() + 7);
    const endDate = endD.toISOString().split('T')[0];
    duel.status = 'active';
    duel.startDate = startDate;
    duel.endDate   = endDate;
    duel.challengerStartEquity = cEquity;
    duel.opponentStartEquity   = oEquity;
    await duel.save();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/duel/reject/:duelId', requireAuth, async (req, res) => {
  try {
    await TDuel().findOneAndDelete({ _id: req.params.duelId, opponent: req.userId, status: 'pending' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/duel/pending', requireAuth, async (req, res) => {
  try {
    const duels = await TDuel().find({ opponent: req.userId, status: 'pending' })
      .populate('challenger', 'name avatar customAvatar username');
    res.json(duels.map(d => ({
      id:         d._id,
      challenger: {
        name: d.challenger.name, username: d.challenger.username,
        avatar: d.challenger.avatar, customAvatar: d.challenger.customAvatar || null,
      },
      createdAt: d.createdAt,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/duel/active', requireAuth, async (req, res) => {
  try {
    const duel = await TDuel().findOne({
      $or: [{ challenger: req.userId }, { opponent: req.userId }],
      status: 'active',
    }).populate('challenger', 'name avatar customAvatar username')
      .populate('opponent',   'name avatar customAvatar username');
    if (!duel) return res.json(null);
    const [cEquity, oEquity] = await Promise.all([
      getTradingEquity(duel.challenger._id),
      getTradingEquity(duel.opponent._id),
    ]);
    const daysLeft = Math.max(0, Math.ceil((new Date(duel.endDate) - new Date()) / 86400000));
    res.json({
      id: duel._id,
      challenger: {
        id: duel.challenger._id,
        name: duel.challenger.name, username: duel.challenger.username,
        avatar: duel.challenger.avatar, customAvatar: duel.challenger.customAvatar,
        returnPct: ((cEquity - duel.challengerStartEquity) / duel.challengerStartEquity) * 100,
        currentEquity: cEquity,
      },
      opponent: {
        id: duel.opponent._id,
        name: duel.opponent.name, username: duel.opponent.username,
        avatar: duel.opponent.avatar, customAvatar: duel.opponent.customAvatar,
        returnPct: ((oEquity - duel.opponentStartEquity) / duel.opponentStartEquity) * 100,
        currentEquity: oEquity,
      },
      startDate: duel.startDate, endDate: duel.endDate, daysLeft,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Trading Leagues
// ─────────────────────────────────────────────────────────────────────────────

function generateLeagueCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

router.post('/leagues/create', requireAuth, async (req, res) => {
  try {
    const { name, endDate } = req.body;
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Nombre demasiado corto' });
    let code, tries = 0;
    do { code = generateLeagueCode(); tries++; }
    while (await TLeague().exists({ code }) && tries < 10);
    const startEquity = await getTradingEquity(req.userId);
    const today       = new Date().toISOString().split('T')[0];
    const league      = await TLeague().create({
      name: name.trim().slice(0, 30), code, owner: req.userId,
      members: [{ userId: req.userId, startEquity, joinedAt: new Date() }],
      startDate: today, endDate: endDate || null,
    });
    res.json({ leagueId: league._id, code });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/leagues/join', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const league = await TLeague().findOne({ code: (code || '').toUpperCase() });
    if (!league) return res.status(404).json({ error: 'Liga no encontrada' });
    if (league.members.some(m => m.userId.toString() === req.userId))
      return res.status(400).json({ error: 'Ya eres miembro de esta liga' });
    const startEquity = await getTradingEquity(req.userId);
    league.members.push({ userId: req.userId, startEquity, joinedAt: new Date() });
    await league.save();
    res.json({ leagueId: league._id, name: league.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/leagues/mine', requireAuth, async (req, res) => {
  try {
    const leagues = await TLeague().find({ 'members.userId': req.userId });
    res.json(leagues.map(l => ({
      _id: l._id, name: l.name, code: l.code, owner: l.owner,
      memberCount: l.members.length, startDate: l.startDate, endDate: l.endDate,
      isOwner: l.owner.toString() === req.userId,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/leagues/:leagueId/ranking', requireAuth, async (req, res) => {
  try {
    const league = await TLeague().findById(req.params.leagueId);
    if (!league) return res.status(404).json({ error: 'Liga no encontrada' });
    if (!league.members.some(m => m.userId.toString() === req.userId))
      return res.status(403).json({ error: 'No eres miembro de esta liga' });

    const memberIds = league.members.map(m => m.userId);
    const [allPositions, accounts, users] = await Promise.all([
      Position().find({ userId: { $in: memberIds } }),
      Account().find({ userId: { $in: memberIds } }),
      User().find({ _id: { $in: memberIds } }).select('name username avatar customAvatar activeCosmetics'),
    ]);

    const uniqueSymbols = [...new Set(allPositions.map(p => p.symbol))];
    const priceMap = {};
    await Promise.all(uniqueSymbols.map(async sym => {
      try { priceMap[sym] = await priceRouter.getPrice(sym); } catch {}
    }));

    const posMap  = {};
    for (const pos of allPositions) {
      const uid = pos.userId.toString();
      if (!posMap[uid]) posMap[uid] = [];
      posMap[uid].push(pos);
    }
    const accMap  = {}; accounts.forEach(a => { accMap[a.userId.toString()] = a; });
    const userMap = {}; users.forEach(u => { userMap[u._id.toString()] = u; });

    const ranking = league.members.map(m => {
      const uid       = m.userId.toString();
      const u         = userMap[uid];
      const acc       = accMap[uid];
      const positions = posMap[uid] || [];
      const totalPnl  = positions.reduce((s, pos) => {
        const priceObj = priceMap[pos.symbol] || { bid: pos.entryPrice, ask: pos.entryPrice };
        return s + calcPnl(pos, priceObj);
      }, 0);
      const equity = acc ? acc.balance + totalPnl : m.startEquity;
      return {
        userId:          m.userId,
        name:            u?.username || u?.name || 'Anonymous',
        username:        u?.username || null,
        avatar:          u?.avatar   || null,
        customAvatar:    u?.customAvatar || null,
        activeCosmetics: u?.activeCosmetics || {},
        startEquity: m.startEquity, equity,
        returnPct: ((equity - m.startEquity) / m.startEquity) * 100,
        isYou: uid === req.userId,
      };
    }).sort((a, b) => b.returnPct - a.returnPct);

    const top10 = ranking.slice(0, 10);
    let userPosition = null;
    const userIdx = ranking.findIndex(e => e.isYou);
    if (userIdx >= 10) userPosition = { rank: userIdx + 1, ...ranking[userIdx] };

    res.json({
      _id: league._id, name: league.name, code: league.code,
      owner: league.owner, startDate: league.startDate, endDate: league.endDate,
      isOwner: league.owner.toString() === req.userId, ranking: top10, userPosition,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/leagues/:leagueId/leave', requireAuth, async (req, res) => {
  try {
    const league = await TLeague().findById(req.params.leagueId);
    if (!league) return res.status(404).json({ error: 'Liga no encontrada' });
    if (league.owner.toString() === req.userId)
      return res.status(400).json({ error: 'El owner no puede abandonar la liga. Elimínala.' });
    league.members = league.members.filter(m => m.userId.toString() !== req.userId);
    await league.save();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/leagues/:leagueId', requireAuth, async (req, res) => {
  try {
    const league = await TLeague().findById(req.params.leagueId);
    if (!league) return res.status(404).json({ error: 'Liga no encontrada' });
    if (league.owner.toString() !== req.userId)
      return res.status(403).json({ error: 'Solo el owner puede eliminar la liga' });
    await TLeague().findByIdAndDelete(req.params.leagueId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Exports for Phase 4 worker + Phase 5 crons ────────────────────────────────
module.exports = router;
module.exports.checkMarginLevel        = checkMarginLevel;
module.exports.checkStopLossTakeProfit = checkStopLossTakeProfit;
module.exports.getTradingEquity        = getTradingEquity;
