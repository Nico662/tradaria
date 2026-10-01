'use strict';

/**
 * UpscalePriceProvider — feeds de precios reales de Upscale Trade.
 *
 * Implementa la misma interfaz que StubPriceProvider (hereda PriceProvider).
 * Solo se activa cuando USE_UPSCALE_PRICES=true en las variables de entorno.
 * Con false todo sigue en StubPriceProvider sin cambio de comportamiento.
 *
 * Rate limit Upscale: 10 req/s, 60 req/min por API key.
 * GET /v2/markets devuelve TODOS los símbolos en una sola llamada,
 * así que POLL_INTERVAL_MS=6000 → ~10 llamadas/min, dentro del límite.
 *
 * Símbolos NO disponibles en Upscale (delegados a fallback siempre):
 *   UK100 (FTSE 100), JPN225 (Nikkei 225)
 * Están en el catálogo con precios simulados para no reducir la oferta.
 */

const { PriceProvider, SYMBOL_CATALOG } = require('./priceProvider');
const { SPREADS } = require('./stubProvider');

// ── Configuración ─────────────────────────────────────────────────────────────

// 10 req/min deja margen amplio dentro del límite de 60/min de Upscale.
// Fácil de ajustar si Upscale confirma un límite diferente o más generoso.
const POLL_INTERVAL_MS = 6_000;

// Verificar esta URL contra la documentación real antes de activar con clave.
const UPSCALE_API_BASE = 'https://api.upscale.trade';

// ── fp9 → decimal ─────────────────────────────────────────────────────────────
// Upscale codifica precios como enteros escalados × 10^9 (strings en JSON).
// Ejemplo: "60000000000000" → 60 000 USD.
// BigInt evita pérdida de precisión al leer el entero; la división final
// se hace en float64 (seguro porque 10^9 es exacto en float64).
function fp9ToDecimal(fp9Str) {
  const raw   = BigInt(fp9Str);
  const whole = Number(raw / 1_000_000_000n);
  const frac  = Number(raw % 1_000_000_000n) / 1_000_000_000;
  return whole + frac;
}

// ── Spread bid/ask a partir del precio mid ────────────────────────────────────
// Misma fórmula que StubPriceProvider para consistencia entre modos.
function spreadHalf(symbol, midPrice) {
  const raw   = SPREADS[symbol] ?? 1;
  const entry = SYMBOL_CATALOG.find(s => s.symbol === symbol);
  if (entry?.category === 'forex') return (raw * 0.0001) / 2;
  const tick = midPrice > 1000 ? 1 : midPrice > 100 ? 0.1 : 0.01;
  return (raw * tick) / 2;
}

// ── Mapeo ticker Upscale → símbolo Tradiko ────────────────────────────────────
// La documentación de Upscale indica config.ticker como "base ticker" (e.g. "BTC").
// Para forex e índices el formato exacto no está completamente documentado,
// por eso se incluyen ambas variantes (con y sin slash).
// VERIFICAR el formato real contra la respuesta de /v2/markets con la clave real.
const TICKER_MAP = {
  // Crypto
  'BTC':     'BTC/USD',  'ETH':     'ETH/USD',  'SOL':    'SOL/USD',
  'XRP':     'XRP/USD',  'BNB':     'BNB/USD',  'DOGE':   'DOGE/USD',
  'LINK':    'LINK/USD', 'AVAX':    'AVAX/USD', 'ADA':    'ADA/USD',
  'DOT':     'DOT/USD',
  // Forex (ambas variantes por incertidumbre de formato)
  'EURUSD':  'EUR/USD',  'EUR/USD': 'EUR/USD',
  'GBPUSD':  'GBP/USD',  'GBP/USD': 'GBP/USD',
  'USDJPY':  'USD/JPY',  'USD/JPY': 'USD/JPY',
  'USDCHF':  'USD/CHF',  'USD/CHF': 'USD/CHF',
  'AUDUSD':  'AUD/USD',  'AUD/USD': 'AUD/USD',
  'USDCAD':  'USD/CAD',  'USD/CAD': 'USD/CAD',
  // Índices (Upscale: US500/USD, NAS100/USD, US30/USD, GER40/EUR)
  'US500':   'S&P 500',  'US500/USD': 'S&P 500',
  'NAS100':  'NASDAQ',   'NAS100/USD': 'NASDAQ',
  'US30':    'DOW',      'US30/USD': 'DOW',
  'GER40':   'GER40',    'GER40/EUR': 'GER40',
  // Materias primas (Upscale usa códigos: XAU=Gold, XAG=Silver, WTI=Oil, NATGAS, HG=Copper)
  'XAU':     'GOLD',     'XAU/USD': 'GOLD',
  'XAG':     'SILVER',   'XAG/USD': 'SILVER',
  'WTI':     'OIL/USD',  'WTI/USD': 'OIL/USD',
  'NATGAS':  'NGAS',     'NATGAS/USD': 'NGAS',
  'HG':      'COPPER',   'HG/USD': 'COPPER',
  // Acciones
  'AAPL': 'AAPL', 'TSLA': 'TSLA', 'MSFT': 'MSFT', 'AMZN': 'AMZN',
  'GOOGL': 'GOOGL', 'META': 'META', 'NVDA': 'NVDA',
};

// Símbolos que NO existen en Upscale → fallback a StubPriceProvider siempre.
// Los mantenemos en el catálogo con precios simulados en vez de eliminarlos.
const NO_UPSCALE_SYMBOLS = new Set(['UK100', 'JPN225']);

// ─────────────────────────────────────────────────────────────────────────────
class UpscalePriceProvider extends PriceProvider {
  /**
   * @param {object}        opts
   * @param {string}        opts.apiKey            UPSCALE_API_KEY
   * @param {PriceProvider} opts.fallback           StubPriceProvider (requerido)
   * @param {number}        [opts.pollIntervalMs]   override del intervalo (para tests)
   * @param {Function}      [opts._fetch]           fetch inyectable (para tests)
   */
  constructor({ apiKey, fallback, pollIntervalMs = POLL_INTERVAL_MS, _fetch } = {}) {
    super();
    if (!apiKey)   throw new Error('UpscalePriceProvider: UPSCALE_API_KEY is required');
    if (!fallback) throw new Error('UpscalePriceProvider: fallback provider is required');

    this._apiKey       = apiKey;
    this._fallback     = fallback;
    this._pollMs       = pollIntervalMs;
    this._fetch        = _fetch ?? ((...a) => fetch(...a)); // Node 18+ global fetch
    this._accountId    = null;
    this._cache        = new Map(); // symbol → { price, bid, ask, ts }
    this._interval     = null;
    this._pollFailures = 0;
  }

  // ── Inicialización: resuelve accountId y arranca el polling ──────────────────
  async start() {
    let accounts;
    try {
      const res = await this._fetch(`${UPSCALE_API_BASE}/accounts/with-risk-status`, {
        headers: { 'X-Api-Key': this._apiKey, 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      accounts = await res.json();
    } catch (err) {
      throw new Error(`[upscale] /accounts/with-risk-status failed: ${err.message}`);
    }

    const list   = Array.isArray(accounts) ? accounts : (accounts?.accounts ?? []);
    const active = list.find(a => a.status === 'active');

    if (!active) {
      throw new Error('[upscale] No active account found — check API key and account status');
    }

    this._accountId = active.accountId;
    console.log(`[upscale] accountId resolved: ${this._accountId}`);

    // Primera llamada inmediata, luego en intervalo
    await this._poll();

    this._interval = setInterval(() => this._poll(), this._pollMs);
    if (this._interval.unref) this._interval.unref();

    console.log(`[upscale] polling started — interval=${this._pollMs}ms`);
  }

  // ── Polling de precios ────────────────────────────────────────────────────────
  async _poll() {
    try {
      const res = await this._fetch(
        `${UPSCALE_API_BASE}/v2/markets?accountId=${this._accountId}`,
        { headers: { 'X-Api-Key': this._apiKey, 'Accept': 'application/json' } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const body    = await res.json();
      const markets = Array.isArray(body) ? body : (body?.markets ?? []);

      let updated = 0;
      for (const market of markets) {
        const ticker = market?.config?.ticker;
        const fp9Str = market?.state?.indexPrice;
        if (!ticker || !fp9Str) continue;

        const symbol = TICKER_MAP[ticker];
        if (!symbol) continue;

        const mid = fp9ToDecimal(fp9Str);
        if (!isFinite(mid) || mid <= 0) continue;

        const half = spreadHalf(symbol, mid);
        this._cache.set(symbol, {
          price: mid,
          bid:   mid - half,
          ask:   mid + half,
          ts:    Date.now(),
        });
        updated++;
      }

      if (updated > 0) {
        this._pollFailures = 0;
      } else {
        console.warn('[upscale] poll returned 0 recognized markets — verify TICKER_MAP against real API');
      }
    } catch (err) {
      this._pollFailures++;
      console.error(`[upscale] poll error #${this._pollFailures}: ${err.message}`);
    }
  }

  // ── getPrice ─────────────────────────────────────────────────────────────────
  async getPrice(symbol) {
    // Símbolos no disponibles en Upscale → siempre al fallback
    if (NO_UPSCALE_SYMBOLS.has(symbol)) {
      return this._fallback.getPrice(symbol);
    }

    const cached = this._cache.get(symbol);
    if (cached) {
      return { symbol, ...cached, source: 'upscale' };
    }

    // Cache vacío (primer poll no completado o fallo persistente) → fallback
    console.warn(`[upscale] no cached price for ${symbol}, falling back to stub`);
    return this._fallback.getPrice(symbol);
  }

  // ── getCandles ───────────────────────────────────────────────────────────────
  // Upscale no expone candles en este formato → siempre al fallback.
  async getCandles(symbol, interval) {
    return this._fallback.getCandles(symbol, interval);
  }

  // ── stop ─────────────────────────────────────────────────────────────────────
  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
}

module.exports = {
  UpscalePriceProvider,
  fp9ToDecimal,
  TICKER_MAP,
  NO_UPSCALE_SYMBOLS,
  POLL_INTERVAL_MS,
};
