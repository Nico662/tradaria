/**
 * PriceProvider — contrato que todo proveedor de precios debe implementar.
 *
 * Implementaciones previstas:
 *   StubPriceProvider   — random walk + overrides manuales (desarrollo/test)
 *   UpscalePriceProvider — feeds reales de Upscale (producción, Fase futura)
 *
 * Contrato:
 *   getPrice(symbol)            → Promise<{ symbol, price, bid, ask, timestamp }>
 *   getCandles(symbol, interval) → Promise<Candle[]>
 *     Candle: { time, open, high, low, close }
 *     interval: 'M1'|'M5'|'M15'|'H1'|'H4'|'D1'
 */
class PriceProvider {
  // eslint-disable-next-line no-unused-vars
  async getPrice(symbol) {
    throw new Error('getPrice() must be implemented by subclass');
  }

  // eslint-disable-next-line no-unused-vars
  async getCandles(symbol, interval) {
    throw new Error('getCandles() must be implemented by subclass');
  }
}

// ── Symbol → category mapping (mirrors getContractSize in TradingMode.jsx) ──────
const SYMBOL_CATALOG = [
  // crypto — 24/7
  { symbol: 'BTC/USD',  name: 'Bitcoin',         category: 'crypto',    contractSize: 1     },
  { symbol: 'ETH/USD',  name: 'Ethereum',        category: 'crypto',    contractSize: 10    },
  { symbol: 'SOL/USD',  name: 'Solana',          category: 'crypto',    contractSize: 100   },
  { symbol: 'XRP/USD',  name: 'XRP',             category: 'crypto',    contractSize: 100   },
  { symbol: 'BNB/USD',  name: 'BNB',             category: 'crypto',    contractSize: 100   },
  { symbol: 'DOGE/USD', name: 'Dogecoin',        category: 'crypto',    contractSize: 100   },
  { symbol: 'LINK/USD', name: 'Chainlink',       category: 'crypto',    contractSize: 100   },
  { symbol: 'AVAX/USD', name: 'Avalanche',       category: 'crypto',    contractSize: 100   },
  { symbol: 'ADA/USD',  name: 'Cardano',         category: 'crypto',    contractSize: 100   },
  { symbol: 'DOT/USD',  name: 'Polkadot',        category: 'crypto',    contractSize: 100   },
  // forex — lun-vie, 24h
  { symbol: 'EUR/USD',  name: 'Euro / USD',      category: 'forex',     contractSize: 100000 },
  { symbol: 'GBP/USD',  name: 'Pound / USD',     category: 'forex',     contractSize: 100000 },
  { symbol: 'USD/JPY',  name: 'USD / Yen',       category: 'forex',     contractSize: 100000 },
  { symbol: 'USD/CHF',  name: 'USD / Franc',     category: 'forex',     contractSize: 100000 },
  { symbol: 'AUD/USD',  name: 'AUD / USD',       category: 'forex',     contractSize: 100000 },
  { symbol: 'USD/CAD',  name: 'USD / CAD',       category: 'forex',     contractSize: 100000 },
  // indices — lun-vie, horario bolsa
  { symbol: 'S&P 500',  name: 'S&P 500',         category: 'index',     contractSize: 1     },
  { symbol: 'NASDAQ',   name: 'NASDAQ',           category: 'index',     contractSize: 1     },
  { symbol: 'DOW',      name: 'Dow Jones',        category: 'index',     contractSize: 1     },
  { symbol: 'GER40',    name: 'DAX 40',           category: 'index',     contractSize: 1     },
  { symbol: 'UK100',    name: 'FTSE 100',         category: 'index',     contractSize: 1     },
  { symbol: 'JPN225',   name: 'Nikkei 225',       category: 'index',     contractSize: 1     },
  // commodities — near-24h lun-vie
  { symbol: 'GOLD',     name: 'Gold',             category: 'commodity', contractSize: 10    },
  { symbol: 'SILVER',   name: 'Silver',           category: 'commodity', contractSize: 10    },
  { symbol: 'OIL/USD',  name: 'Crude Oil',        category: 'commodity', contractSize: 100   },
  { symbol: 'NGAS',     name: 'Natural Gas',      category: 'commodity', contractSize: 100   },
  { symbol: 'COPPER',   name: 'Copper',           category: 'commodity', contractSize: 100   },
  // stocks — lun-vie, 13:30-20:00 UTC
  { symbol: 'AAPL',     name: 'Apple',            category: 'stock',     contractSize: 10    },
  { symbol: 'TSLA',     name: 'Tesla',            category: 'stock',     contractSize: 10    },
  { symbol: 'MSFT',     name: 'Microsoft',        category: 'stock',     contractSize: 10    },
  { symbol: 'AMZN',     name: 'Amazon',           category: 'stock',     contractSize: 10    },
  { symbol: 'GOOGL',    name: 'Alphabet',         category: 'stock',     contractSize: 10    },
  { symbol: 'META',     name: 'Meta',             category: 'stock',     contractSize: 10    },
  { symbol: 'NVDA',     name: 'NVIDIA',           category: 'stock',     contractSize: 10    },
];

// ── Market hours helpers ──────────────────────────────────────────────────────

function isWeekday() {
  const day = new Date().getUTCDay();
  return day >= 1 && day <= 5;
}

function isStockMarketOpen() {
  if (!isWeekday()) return false;
  const now  = new Date();
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  return mins >= 13 * 60 + 30 && mins < 20 * 60;
}

function isSymbolTradeable(symbol) {
  const entry = SYMBOL_CATALOG.find(s => s.symbol === symbol);
  if (!entry) return false;
  if (entry.category === 'crypto') return true;
  if (!isWeekday()) return false;
  if (entry.category === 'stock' || entry.category === 'index') return isStockMarketOpen();
  return true; // forex and commodities: lun-vie, near-24h
}

// ── Provider router ───────────────────────────────────────────────────────────

class PriceRouter {
  constructor() {
    this._providers = new Map(); // name → PriceProvider instance
    this._default   = null;
  }

  register(name, provider) {
    this._providers.set(name, provider);
    if (!this._default) this._default = name;
  }

  setDefault(name) {
    if (!this._providers.has(name)) throw new Error(`Provider '${name}' not registered`);
    this._default = name;
  }

  _resolveProvider(/* symbol */) {
    // Future: route specific symbols to specific providers.
    // Currently all symbols → default provider.
    return this._providers.get(this._default);
  }

  async getPrice(symbol) {
    const provider = this._resolveProvider(symbol);
    if (!provider) throw new Error('No price provider registered');
    return provider.getPrice(symbol);
  }

  async getCandles(symbol, interval) {
    const provider = this._resolveProvider(symbol);
    if (!provider) throw new Error('No price provider registered');
    return provider.getCandles(symbol, interval);
  }
}

// Singleton router — importado por routes y por el worker de liquidación
const priceRouter = new PriceRouter();

module.exports = { PriceProvider, PriceRouter, priceRouter, SYMBOL_CATALOG, isSymbolTradeable, isWeekday, isStockMarketOpen };
