'use strict';

/**
 * Tests de UpscalePriceProvider.
 * Todas las llamadas HTTP se mockean — no se necesita clave real.
 */

const {
  UpscalePriceProvider,
  fp9ToDecimal,
  TICKER_MAP,
  NO_UPSCALE_SYMBOLS,
  POLL_INTERVAL_MS,
} = require('../trading/upscaleProvider');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFallback(prices = {}) {
  return {
    getPrice: jest.fn(symbol => Promise.resolve({
      symbol,
      price:  prices[symbol] ?? 100,
      bid:    (prices[symbol] ?? 100) - 1,
      ask:    (prices[symbol] ?? 100) + 1,
      ts:     Date.now(),
      source: 'stub',
    })),
    getCandles: jest.fn(() => Promise.resolve([])),
  };
}

// Codifica un precio decimal a string fp9 (igual que Upscale)
function fp9Encode(price) {
  return String(BigInt(Math.round(price * 1_000_000_000)));
}

const MOCK_ACCOUNTS = [
  { accountId: 'acc-abc-123', status: 'active', apiTrading: true },
];

const MOCK_MARKETS = [
  { config: { ticker: 'BTC'    }, state: { indexPrice: fp9Encode(65000)  } },
  { config: { ticker: 'ETH'    }, state: { indexPrice: fp9Encode(3200)   } },
  { config: { ticker: 'EURUSD' }, state: { indexPrice: fp9Encode(1.0855) } },
  { config: { ticker: 'XAU'    }, state: { indexPrice: fp9Encode(2300)   } },
  { config: { ticker: 'AAPL'   }, state: { indexPrice: fp9Encode(195)    } },
  { config: { ticker: 'US500'  }, state: { indexPrice: fp9Encode(5300)   } },
  { config: { ticker: 'NATGAS' }, state: { indexPrice: fp9Encode(2.84)   } },
];

// Construye un provider ya iniciado con fetch mockeado
async function makeStarted(fetchImpl) {
  const fallback = makeFallback();
  const provider = new UpscalePriceProvider({
    apiKey:        'test-key',
    fallback,
    pollIntervalMs: 999_999, // deshabilita repolling en tests
    _fetch:        fetchImpl,
  });
  await provider.start();
  return { provider, fallback };
}

// Fetch que devuelve accounts en la primera llamada y markets en las siguientes
function buildFetch(markets = MOCK_MARKETS) {
  return jest.fn()
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_ACCOUNTS) })
    .mockResolvedValue(   { ok: true, json: () => Promise.resolve(markets) });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('fp9ToDecimal', () => {
  test('1 USD', ()     => expect(fp9ToDecimal('1000000000')).toBe(1));
  test('60000 USD',()  => expect(fp9ToDecimal('60000000000000')).toBe(60000));
  test('1.0855',  ()   => expect(fp9ToDecimal('1085500000')).toBeCloseTo(1.0855, 6));
  test('2300',    ()   => expect(fp9ToDecimal('2300000000000')).toBeCloseTo(2300, 2));
  test('0.6124',  ()   => expect(fp9ToDecimal('612400000')).toBeCloseTo(0.6124, 8));
  test('cero',    ()   => expect(fp9ToDecimal('0')).toBe(0));

  test('roundtrip encode→decode dentro de tolerancia float', () => {
    const prices = [65000, 1.0855, 0.6124, 2284.5, 195, 0.13420];
    for (const p of prices) {
      expect(fp9ToDecimal(fp9Encode(p))).toBeCloseTo(p, 6);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('TICKER_MAP', () => {
  test('cubre todos los símbolos del catálogo excepto los excluidos', () => {
    const { SYMBOL_CATALOG } = require('../trading/priceProvider');
    const values = new Set(Object.values(TICKER_MAP));
    for (const { symbol } of SYMBOL_CATALOG) {
      if (NO_UPSCALE_SYMBOLS.has(symbol)) continue;
      expect(values.has(symbol)).toBe(true);
    }
  });

  test('NO_UPSCALE_SYMBOLS contiene UK100 y JPN225', () => {
    expect(NO_UPSCALE_SYMBOLS.has('UK100')).toBe(true);
    expect(NO_UPSCALE_SYMBOLS.has('JPN225')).toBe(true);
    expect(NO_UPSCALE_SYMBOLS.size).toBe(2);
  });

  test('variante sin slash y con slash mapean al mismo símbolo (forex)', () => {
    expect(TICKER_MAP['EURUSD']).toBe(TICKER_MAP['EUR/USD']);
    expect(TICKER_MAP['USDJPY']).toBe(TICKER_MAP['USD/JPY']);
    expect(TICKER_MAP['GBPUSD']).toBe(TICKER_MAP['GBP/USD']);
  });

  test('variante sin slash y con slash mapean al mismo símbolo (índices)', () => {
    expect(TICKER_MAP['US500']).toBe(TICKER_MAP['US500/USD']);
    expect(TICKER_MAP['NAS100']).toBe(TICKER_MAP['NAS100/USD']);
    expect(TICKER_MAP['GER40']).toBe(TICKER_MAP['GER40/EUR']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Constructor', () => {
  test('lanza error si falta apiKey', () => {
    expect(() => new UpscalePriceProvider({ fallback: makeFallback() }))
      .toThrow('UPSCALE_API_KEY is required');
  });

  test('lanza error si falta fallback', () => {
    expect(() => new UpscalePriceProvider({ apiKey: 'k' }))
      .toThrow('fallback provider is required');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('start()', () => {
  test('resuelve accountId del primer account activo', async () => {
    const { provider } = await makeStarted(buildFetch());
    expect(provider._accountId).toBe('acc-abc-123');
    provider.stop();
  });

  test('soporta respuesta envuelta en { accounts: [...] }', async () => {
    const wrapped = { accounts: MOCK_ACCOUNTS };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(wrapped) })
      .mockResolvedValue(   { ok: true, json: () => Promise.resolve(MOCK_MARKETS) });
    const { provider } = await makeStarted(fetchMock);
    expect(provider._accountId).toBe('acc-abc-123');
    provider.stop();
  });

  test('lanza error si no hay account activo', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(
        [{ accountId: 'x', status: 'inactive' }]
      )});
    const provider = new UpscalePriceProvider({
      apiKey: 'k', fallback: makeFallback(), pollIntervalMs: 99999, _fetch: fetchMock,
    });
    await expect(provider.start()).rejects.toThrow('No active account found');
  });

  test('lanza error si la API devuelve HTTP 401', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    const provider = new UpscalePriceProvider({
      apiKey: 'bad', fallback: makeFallback(), pollIntervalMs: 99999, _fetch: fetchMock,
    });
    await expect(provider.start()).rejects.toThrow('HTTP 401');
  });

  test('lanza error si la API no responde (network error)', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const provider = new UpscalePriceProvider({
      apiKey: 'k', fallback: makeFallback(), pollIntervalMs: 99999, _fetch: fetchMock,
    });
    await expect(provider.start()).rejects.toThrow('ECONNREFUSED');
  });

  test('el cache se rellena durante start() con el primer poll', async () => {
    const { provider } = await makeStarted(buildFetch());
    expect(provider._cache.has('BTC/USD')).toBe(true);
    expect(provider._cache.has('EUR/USD')).toBe(true);
    provider.stop();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getPrice() — precios reales', () => {
  test('devuelve precio de Upscale para BTC/USD', async () => {
    const { provider } = await makeStarted(buildFetch());
    const r = await provider.getPrice('BTC/USD');
    expect(r.symbol).toBe('BTC/USD');
    expect(r.price).toBeCloseTo(65000, 0);
    expect(r.bid).toBeLessThan(r.price);
    expect(r.ask).toBeGreaterThan(r.price);
    expect(r.source).toBe('upscale');
    provider.stop();
  });

  test('devuelve precio de Upscale para EUR/USD (ticker EURUSD)', async () => {
    const { provider } = await makeStarted(buildFetch());
    const r = await provider.getPrice('EUR/USD');
    expect(r.price).toBeCloseTo(1.0855, 4);
    expect(r.source).toBe('upscale');
    provider.stop();
  });

  test('devuelve precio de Upscale para GOLD (ticker XAU)', async () => {
    const { provider } = await makeStarted(buildFetch());
    const r = await provider.getPrice('GOLD');
    expect(r.price).toBeCloseTo(2300, 0);
    expect(r.source).toBe('upscale');
    provider.stop();
  });

  test('devuelve precio de Upscale para S&P 500 (ticker US500)', async () => {
    const { provider } = await makeStarted(buildFetch());
    const r = await provider.getPrice('S&P 500');
    expect(r.price).toBeCloseTo(5300, 0);
    expect(r.source).toBe('upscale');
    provider.stop();
  });

  test('el spread bid/ask es simétrico alrededor del mid price', async () => {
    const { provider } = await makeStarted(buildFetch());
    const r = await provider.getPrice('AAPL');
    const half = (r.ask - r.bid) / 2;
    expect(r.price).toBeCloseTo(r.bid + half, 10);
    expect(r.price).toBeCloseTo(r.ask - half, 10);
    provider.stop();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getPrice() — fallback', () => {
  test('UK100 siempre va al fallback (no está en Upscale)', async () => {
    const { provider, fallback } = await makeStarted(buildFetch());
    const r = await provider.getPrice('UK100');
    expect(fallback.getPrice).toHaveBeenCalledWith('UK100');
    expect(r.source).toBe('stub');
    provider.stop();
  });

  test('JPN225 siempre va al fallback (no está en Upscale)', async () => {
    const { provider, fallback } = await makeStarted(buildFetch());
    await provider.getPrice('JPN225');
    expect(fallback.getPrice).toHaveBeenCalledWith('JPN225');
    provider.stop();
  });

  test('símbolo conocido pero no en primer poll → fallback', async () => {
    // Primer poll devuelve markets vacíos → cache vacío
    const { provider, fallback } = await makeStarted(buildFetch([]));
    await provider.getPrice('BTC/USD');
    expect(fallback.getPrice).toHaveBeenCalledWith('BTC/USD');
    provider.stop();
  });

  test('símbolo en cache → no usa fallback', async () => {
    const { provider, fallback } = await makeStarted(buildFetch());
    await provider.getPrice('BTC/USD');
    expect(fallback.getPrice).not.toHaveBeenCalled();
    provider.stop();
  });

  test('precio cacheado persiste después de un fallo de poll', async () => {
    const { provider } = await makeStarted(buildFetch());
    const r1 = await provider.getPrice('BTC/USD');
    expect(r1.source).toBe('upscale');
    expect(r1.price).toBeCloseTo(65000, 0);

    // Simula fallo de poll: incrementa contador pero NO borra el cache
    provider._pollFailures = 3;

    const r2 = await provider.getPrice('BTC/USD');
    expect(r2.source).toBe('upscale'); // cache intacto
    expect(r2.price).toBeCloseTo(65000, 0);
    provider.stop();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getCandles()', () => {
  test('siempre delega al fallback', async () => {
    const { provider, fallback } = await makeStarted(buildFetch());
    await provider.getCandles('BTC/USD', 'H1');
    expect(fallback.getCandles).toHaveBeenCalledWith('BTC/USD', 'H1');
    provider.stop();
  });

  test('delega candles incluso para símbolos con precio real en cache', async () => {
    const { provider, fallback } = await makeStarted(buildFetch());
    await provider.getPrice('BTC/USD');   // llena cache
    await provider.getCandles('BTC/USD', 'M15');
    expect(fallback.getCandles).toHaveBeenCalledWith('BTC/USD', 'M15');
    provider.stop();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('_poll() — resiliencia', () => {
  test('un fallo de poll no borra el cache ni lanza excepción', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_ACCOUNTS) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_MARKETS) })
      .mockRejectedValue(new Error('network timeout'));

    const { provider } = await makeStarted(fetchMock);
    const before = provider._cache.get('BTC/USD');

    await provider._poll(); // este poll falla

    const after = provider._cache.get('BTC/USD');
    expect(after).toEqual(before); // cache no modificado
    expect(provider._pollFailures).toBe(1);
    provider.stop();
  });

  test('poll HTTP 429 incrementa failureCount', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_ACCOUNTS) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_MARKETS) })
      .mockResolvedValue({ ok: false, status: 429 });

    const { provider } = await makeStarted(fetchMock);
    await provider._poll();
    expect(provider._pollFailures).toBe(1);
    provider.stop();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Rate limit', () => {
  test('POLL_INTERVAL_MS ≥ 6000ms (≤ 10 polls/min dentro del límite de 60/min)', () => {
    expect(POLL_INTERVAL_MS).toBeGreaterThanOrEqual(6_000);
    expect(60_000 / POLL_INTERVAL_MS).toBeLessThanOrEqual(10);
  });
});
