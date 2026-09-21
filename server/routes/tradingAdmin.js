/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  DEVELOPMENT-ONLY — PRICE OVERRIDE ENDPOINTS                       ║
 * ║                                                                          ║
 * ║  Estos endpoints permiten fijar manualmente el precio de cualquier       ║
 * ║  símbolo en el StubPriceProvider para probar liquidaciones,              ║
 * ║  stop-outs y margin calls de forma fiable y determinista.                ║
 * ║                                                                          ║
 * ║  PROTECCIÓN DOBLE:                                                       ║
 * ║    1. El router NO SE REGISTRA si NODE_ENV === 'production'              ║
 * ║       (ver server/index.js — la condición está allí, antes del mount).   ║
 * ║    2. Todos los endpoints exigen el header x-admin-secret con el         ║
 * ║       valor de process.env.ADMIN_SECRET (mismo patrón que el resto       ║
 * ║       de endpoints /admin/* del servidor).                               ║
 * ║                                                                          ║
 * ║  NUNCA eliminar ninguna de las dos capas de protección.                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Uso rápido (desarrollo local):
 *
 *   # Fijar BTC a $20.000 (fuerza liquidación de longs con entry ~$64k)
 *   curl -X POST http://localhost:3001/api/admin/trading/override \
 *     -H "Content-Type: application/json" \
 *     -H "x-admin-secret: $ADMIN_SECRET" \
 *     -d '{"symbol":"BTC/USD","price":20000}'
 *
 *   # Ver todos los overrides activos
 *   curl http://localhost:3001/api/admin/trading/overrides \
 *     -H "x-admin-secret: $ADMIN_SECRET"
 *
 *   # Eliminar override (precios vuelven al random walk)
 *   curl -X DELETE http://localhost:3001/api/admin/trading/override/BTC%2FUSD \
 *     -H "x-admin-secret: $ADMIN_SECRET"
 */
'use strict';

const express = require('express');
const { SYMBOL_CATALOG } = require('../trading/priceProvider');

const OVERRIDE_TTL_SEC = 86400; // los overrides expiran a las 24h por si acaso

/**
 * @param {import('@upstash/redis').Redis} redis
 * @param {string} ADMIN_SECRET
 * @returns {express.Router}
 */
function makeTradingAdminRouter(redis, ADMIN_SECRET) {
  const router = express.Router();

  // ── Middleware de autenticación admin ──────────────────────────────────────
  const requireAdmin = (req, res, next) => {
    const key = req.headers['x-admin-secret'];
    if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };

  // ── POST /api/admin/trading/override ──────────────────────────────────────
  // Fija el precio de un símbolo. El StubPriceProvider lo lee en cada getPrice().
  router.post('/override', requireAdmin, async (req, res) => {
    const { symbol, price } = req.body ?? {};

    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ error: 'symbol required' });
    }
    const numPrice = Number(price);
    if (!isFinite(numPrice) || numPrice <= 0) {
      return res.status(400).json({ error: 'price must be a positive number' });
    }
    const known = SYMBOL_CATALOG.find(s => s.symbol === symbol);
    if (!known) {
      return res.status(400).json({ error: `Unknown symbol: ${symbol}` });
    }

    try {
      await redis.set(`trading:override:${symbol}`, String(numPrice), { ex: OVERRIDE_TTL_SEC });
      console.log(`[trading-admin] override set: ${symbol} → ${numPrice}`);
      res.json({ ok: true, symbol, price: numPrice, expiresInSec: OVERRIDE_TTL_SEC });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── DELETE /api/admin/trading/override/:symbol ────────────────────────────
  // Elimina el override; el símbolo vuelve al random walk.
  router.delete('/override/:symbol', requireAdmin, async (req, res) => {
    const symbol = decodeURIComponent(req.params.symbol);
    try {
      await redis.del(`trading:override:${symbol}`);
      console.log(`[trading-admin] override cleared: ${symbol}`);
      res.json({ ok: true, symbol });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/admin/trading/overrides ──────────────────────────────────────
  // Lista todos los overrides activos en Redis.
  router.get('/overrides', requireAdmin, async (req, res) => {
    try {
      const keys = SYMBOL_CATALOG.map(s => `trading:override:${s.symbol}`);
      const values = await redis.mget(...keys);
      const active = [];
      for (let i = 0; i < keys.length; i++) {
        if (values[i] !== null && values[i] !== undefined) {
          active.push({
            symbol: SYMBOL_CATALOG[i].symbol,
            price:  parseFloat(values[i]),
          });
        }
      }
      res.json({ overrides: active });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { makeTradingAdminRouter };
