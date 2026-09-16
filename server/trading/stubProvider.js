/**
 * StubPriceProvider — simulador de precios para desarrollo y testing.
 *
 * Dos modos de operación:
 *   1. Random walk (default): precios se mueven solos, calibrados por categoría.
 *      Los activos no-cripto se CONGELAN fuera de horario de mercado.
 *   2. Override manual: un precio fijado vía Redis (clave trading:override:{symbol})
 *      toma prioridad sobre el walk. Se activa desde los endpoints admin de testing.
 *
 * Reemplazable: cuando Upscale esté listo, se crea UpscalePriceProvider
 * con la misma interfaz y se registra en priceRouter sin tocar el resto del motor.
 */
'use strict';

const { PriceProvider, SYMBOL_CATALOG, isSymbolTradeable } = require('./priceProvider');

// ── Precios iniciales (mirrors INITIAL_PRICES in TradingMode.jsx) ─────────────
const INITIAL_PRICES = {
  'BTC/USD':  64872.50,
  'ETH/USD':  3215.80,
  'SOL/USD':  152.40,
  'XRP/USD':  0.61240,
  'BNB/USD':  582.30,
  'DOGE/USD': 0.13420,
  'LINK/USD': 14.820,
  'AVAX/USD': 38.600,
  'ADA/USD':  0.45200,
  'DOT/USD':  7.3400,
  'EUR/USD':  1.08520,
  'GBP/USD':  1.27410,
  'USD/JPY':  155.420,
  'USD/CHF':  0.89320,
  'AUD/USD':  0.65840,
  'USD/CAD':  1.36500,
  'S&P 500':  5280.40,
  'NASDAQ':   18420.30,
  'DOW':      39540.20,
  'GER40':    18105.80,
  'UK100':    8185.40,
  'JPN225':   38240.50,
  'GOLD':     2284.50,
  'SILVER':   28.540,
  'OIL/USD':  78.320,
  'NGAS':     2.8420,
  'COPPER':   4.5200,
  'AAPL':     189.50,
  'TSLA':     178.20,
  'MSFT':     415.30,
  'AMZN':     183.70,
  'GOOGL':    172.40,
  'META':     508.60,
  'NVDA':     875.30,
};

// ── Volatilidades por símbolo (de assets.js) ──────────────────────────────────
// Fracción del precio por unidad de tiempo. Mismo origen que el frontend.
const VOL = {
  'BTC/USD':  0.025, 'ETH/USD':  0.030, 'SOL/USD':  0.035, 'XRP/USD':  0.030,
  'BNB/USD':  0.025, 'DOGE/USD': 0.040, 'LINK/USD': 0.035, 'AVAX/USD': 0.035,
  'ADA/USD':  0.030, 'DOT/USD':  0.035,
  'EUR/USD':  0.004, 'GBP/USD':  0.005, 'USD/JPY':  0.004, 'USD/CHF':  0.004,
  'AUD/USD':  0.004, 'USD/CAD':  0.004,
  'S&P 500':  0.012, 'NASDAQ':   0.014, 'DOW':      0.010, 'GER40':    0.012,
  'UK100':    0.010, 'JPN225':   0.012,
  'GOLD':     0.008, 'SILVER':   0.015, 'OIL/USD':  0.020, 'NGAS':     0.025,
  'COPPER':   0.015,
  'AAPL':     0.020, 'TSLA':     0.035, 'MSFT':     0.018, 'AMZN':     0.022,
  'GOOGL':    0.020, 'META':     0.025, 'NVDA':     0.030,
};

// ── Spreads (mirrors SPREADS in TradingMode.jsx) ──────────────────────────────
// Forex: en pips (0.0001). Resto: en unidades de precio (USD, puntos).
const SPREADS = {
  'BTC/USD':  25,  'ETH/USD':  8,  'SOL/USD':  3,  'XRP/USD':  2,  'BNB/USD':  4,
  'DOGE/USD': 2,   'LINK/USD': 2,  'AVAX/USD': 2,  'ADA/USD':  1,  'DOT/USD':  1,
  'EUR/USD':  2,   'GBP/USD':  3,  'USD/JPY':  2,  'USD/CHF':  3,  'AUD/USD':  2,
  'USD/CAD':  3,
  'S&P 500':  40,  'NASDAQ':   60, 'DOW':      80, 'GER40':    50, 'UK100':    50,
  'JPN225':   70,
  'GOLD':     15,  'SILVER':   20, 'OIL/USD':  6,  'NGAS':     3,  'COPPER':   4,
  'AAPL':     5,   'TSLA':     8,  'MSFT':     5,  'AMZN':     6,  'GOOGL':    5,
  'META':     8,   'NVDA':     10,
};

// ── Seeded PRNG (idéntico al del frontend para candles deterministas) ─────────
function strHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33 + str.charCodeAt(i)) & 0x7fffffff;
  return h;
}
function makePRNG(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

// ── Calcula spread en unidades de precio ──────────────────────────────────────
function spreadInPrice(symbol) {
  const raw = SPREADS[symbol] ?? 1;
  const entry = SYMBOL_CATALOG.find(s => s.symbol === symbol);
  if (entry?.category === 'forex') return raw * 0.0001;
  return raw;
}

// ─────────────────────────────────────────────────────────────────────────────
class StubPriceProvider extends PriceProvider {
  /**
   * @param {import('@upstash/redis').Redis} redis  — instancia ya inicializada
   * @param {number} tickMs  — intervalo del random walk en ms (default 2000)
   */
  constructor(redis, tickMs = 2000) {
    super();
    this._redis  = redis;
    this._tickMs = tickMs;
    this._prices = new Map(); // symbol → { price, ts }
    this._interval = null;

    for (const sym of SYMBOL_CATALOG) {
      const price = INITIAL_PRICES[sym.symbol] ?? 100;
      this._prices.set(sym.symbol, { price, ts: Date.now() });
    }

    this._startWalk();
  }

  _startWalk() {
    this._interval = setInterval(() => this._tick(), this._tickMs);
  }

  _tick() {
    for (const { symbol, category } of SYMBOL_CATALOG) {
      // Congelar activos no-cripto fuera de su horario de mercado
      if (category !== 'crypto' && !isSymbolTradeable(symbol)) continue;

      const current = this._prices.get(symbol);
      if (!current) continue;

      const vol      = (VOL[symbol] ?? 0.015) * 0.12; // fracción por tick, igual que el frontend
      const delta    = (Math.random() - 0.5) * 2 * vol * current.price;
      const newPrice = Math.max(0.00001, current.price + delta);
      this._prices.set(symbol, { price: newPrice, ts: Date.now() });
    }
  }

  async getPrice(symbol) {
    // 1. Override manual tiene máxima prioridad
    try {
      const raw = await this._redis.get(`trading:override:${symbol}`);
      if (raw !== null && raw !== undefined) {
        const overridePrice = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
        if (isFinite(overridePrice) && overridePrice > 0) {
          const half = spreadInPrice(symbol) / 2;
          return {
            symbol,
            price: overridePrice,
            bid:   overridePrice - half,
            ask:   overridePrice + half,
            ts:    Date.now(),
            source: 'override',
          };
        }
      }
    } catch (_) {
      // Redis no disponible — continuar con el walk
    }

    // 2. Precio del random walk
    const current = this._prices.get(symbol);
    if (!current) throw new Error(`StubPriceProvider: unknown symbol '${symbol}'`);

    const half = spreadInPrice(symbol) / 2;
    return {
      symbol,
      price: current.price,
      bid:   current.price - half,
      ask:   current.price + half,
      ts:    current.ts,
      source: 'stub',
    };
  }

  /**
   * Genera 60 velas deterministas (seeded) — misma lógica que generateCandles()
   * en TradingMode.jsx, portada al servidor para consistencia.
   */
  async getCandles(symbol, interval) {
    const COUNT = 60;
    const rng   = makePRNG(strHash(symbol + interval));
    const vol   = VOL[symbol] ?? 0.020;
    const base  = INITIAL_PRICES[symbol] ?? 100;

    let price = base * (0.90 + rng() * 0.20);

    const MS_MAP = { M1: 60e3, M5: 300e3, M15: 900e3, H1: 3600e3, H4: 14400e3, D1: 86400e3 };
    const intervalMs  = MS_MAP[interval] ?? 3600e3;
    const intervalSec = intervalMs / 1000;
    const nowSec      = Math.floor(Date.now() / 1000);
    const alignedNow  = Math.floor(nowSec / intervalSec) * intervalSec;

    return Array.from({ length: COUNT }, (_, i) => {
      const dir   = (rng() - 0.49) * 2;
      const body  = rng() * vol * price * 0.8;
      const open  = price;
      const close = price + dir * body;
      const wkUp  = rng() * vol * price * 0.4;
      const wkDn  = rng() * vol * price * 0.4;
      const high  = Math.max(open, close) + wkUp;
      const low   = Math.min(open, close) - wkDn;
      price = close;
      return { time: alignedNow - (COUNT - 1 - i) * intervalSec, open, high, low, close };
    });
  }

  /** Detiene el random walk (para tests / graceful shutdown). */
  stop() {
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
  }
}

module.exports = { StubPriceProvider, INITIAL_PRICES, SPREADS, VOL };
