'use strict';

/**
 * upscalePricesCheck.js — prueba LOCAL del UpscalePriceProvider con la API real.
 *
 * Solo para uso local. Aborta si NODE_ENV=production o falta UPSCALE_API_KEY.
 * No modifica ningún estado del servidor; solo lectura.
 *
 * Uso:
 *   node server/scripts/upscalePricesCheck.js
 *
 * Requiere que server/.env tenga UPSCALE_API_KEY=<tu_clave> y USE_UPSCALE_PRICES=true.
 */

const path   = require('path');
const dotenv = require('dotenv');

// Carga server/.env (una carpeta arriba de scripts/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Guardas de seguridad ──────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Este script no puede ejecutarse en NODE_ENV=production.');
  process.exit(1);
}

const API_KEY = process.env.UPSCALE_API_KEY;
if (!API_KEY) {
  console.error(
    'ERROR: UPSCALE_API_KEY no está definida.\n' +
    'Añade UPSCALE_API_KEY=<tu_clave> a server/.env y vuelve a ejecutar.'
  );
  process.exit(1);
}

// ── Importar mapa y funciones del provider (sin instanciarlo) ─────────────────
const { TICKER_MAP, NO_UPSCALE_SYMBOLS, fp9ToDecimal } = require('../trading/upscaleProvider');

const API_BASE = 'https://api.upscale.trade';

// ── Categorización heurística de tickers no mapeados ─────────────────────────
const KNOWN_FOREX_BASES = new Set([
  'EUR','GBP','AUD','NZD','USD','USDJPY','USDCHF','USDCAD','EURUSD','GBPUSD',
  'AUDUSD','NZDUSD','EURGBP','EURJPY','GBPJPY','CADJPY',
]);
const KNOWN_COMMODITIES = new Set([
  'XAU','XAG','WTI','BRENT','NATGAS','HG','USOIL','UKOIL','NG','XPT','XPD',
]);
const KNOWN_INDICES = new Set([
  'US500','NAS100','US30','GER40','UK100','JP225','AUS200','HK50','EU50',
  'FRA40','SWI20','CHINA50','NL25','SPA35',
]);
const CRYPTO_QUOTES = new Set(['USDT','BTC','ETH','BNB','USDC']);

function guessCategory(ticker) {
  const [base, quote] = ticker.split('/');
  if (!quote) return 'desconocido';
  if (CRYPTO_QUOTES.has(quote) && !KNOWN_FOREX_BASES.has(base)) return 'crypto';
  if (KNOWN_COMMODITIES.has(base)) return 'commodity';
  if (KNOWN_INDICES.has(base)) return 'index';
  if (KNOWN_FOREX_BASES.has(base) || quote === 'USD' && base.length <= 6 && !base.includes('0'))
    return 'forex';
  return 'stock';
}

// ── Helpers de formato ────────────────────────────────────────────────────────
function col(str, width) {
  const s = String(str ?? '');
  return s.length >= width ? s.slice(0, width - 1) + '…' : s.padEnd(width);
}

function fmtPrice(n) {
  if (!isFinite(n)) return 'N/A';
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1)    return n.toFixed(4);
  return n.toFixed(6);
}

// ── Petición HTTP (nunca imprime la clave) ────────────────────────────────────
async function apiFetch(url) {
  const res = await fetch(url, {
    headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json' },
  });
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(  '║     Upscale Price Check — prueba LOCAL               ║');
  console.log(  '╚══════════════════════════════════════════════════════╝\n');

  // ── 1. Resolver accountId ─────────────────────────────────────────────────
  console.log('▸ GET /accounts/with-risk-status ...');
  let accountId;
  {
    const res = await apiFetch(`${API_BASE}/accounts/with-risk-status`);
    console.log(`  HTTP ${res.status}`);

    if (!res.ok) {
      const body = await res.text().catch(() => '(sin cuerpo)');
      console.error(`  ERROR: la API devolvió ${res.status}. Comprueba la clave y el estado de la cuenta.`);
      console.error(`  Detalle: ${body.slice(0, 200)}`);
      process.exit(1);
    }

    const data     = await res.json();
    const list     = Array.isArray(data) ? data : (data?.accounts ?? []);
    const active   = list.find(a => a.status === 'active');

    if (!active) {
      console.error('  ERROR: no hay ninguna cuenta activa. Revisa el estado de tu cuenta en Upscale.');
      process.exit(1);
    }

    accountId = active.accountId;
    console.log(`  accountId activo: ${accountId}`);
    console.log(`  Cuentas recibidas: ${list.length} (${list.map(a => a.status).join(', ')})\n`);

    // Campos inesperados de la respuesta de accounts
    const EXPECTED_ACCOUNT_FIELDS = new Set([
      'accountId','status','apiTrading','balance','equity','marginUsed',
      'marginLevel','freeMargin','unrealizedPnl','realizedPnl',
    ]);
    const unexpected = Object.keys(active).filter(k => !EXPECTED_ACCOUNT_FIELDS.has(k));
    if (unexpected.length) {
      console.log(`  ⚠ Campos nuevos en account: ${unexpected.join(', ')}`);
    }
  }

  // ── 2. Pedir precios de mercado ───────────────────────────────────────────
  console.log(`▸ GET /v2/markets?accountId=${accountId} ...`);
  let markets;
  {
    const res = await apiFetch(`${API_BASE}/v2/markets?accountId=${accountId}`);
    console.log(`  HTTP ${res.status}`);

    if (!res.ok) {
      const body = await res.text().catch(() => '(sin cuerpo)');
      console.error(`  ERROR: ${res.status}. Detalle: ${body.slice(0, 200)}`);
      process.exit(1);
    }

    const body = await res.json();
    markets    = Array.isArray(body) ? body : (body?.markets ?? []);
    console.log(`  Mercados recibidos: ${markets.length}\n`);
  }

  // ── 3. Tabla de TICKER_MAP: estado de cada símbolo ───────────────────────
  const marketByTicker = new Map();
  for (const m of markets) {
    const ticker = m?.config?.ticker;
    if (ticker) marketByTicker.set(ticker, m);
  }

  console.log('═══ Símbolos de TICKER_MAP ═══════════════════════════════════════');
  console.log(
    col('Upscale ticker', 18) +
    col('Tradiko symbol', 18) +
    col('Bid', 14) +
    col('Ask', 14) +
    'Estado'
  );
  console.log('─'.repeat(72));

  let found = 0, missing = 0;
  for (const [ticker, tradikoSymbol] of Object.entries(TICKER_MAP)) {
    const m       = marketByTicker.get(ticker);
    const fp9Str  = m?.state?.indexPrice;

    if (!m || !fp9Str) {
      console.log(
        col(ticker, 18) + col(tradikoSymbol, 18) +
        col('—', 14) + col('—', 14) + 'NO ENCONTRADO'
      );
      missing++;
      continue;
    }

    const mid   = fp9ToDecimal(fp9Str);
    const half  = (mid > 1000 ? 1 : mid > 100 ? 0.1 : mid > 1 ? 0.0001 : 0.00001) / 2;
    const bid   = mid - half;
    const ask   = mid + half;
    console.log(
      col(ticker, 18) + col(tradikoSymbol, 18) +
      col(fmtPrice(bid), 14) + col(fmtPrice(ask), 14) + 'OK'
    );
    found++;

    // Verifica campos inesperados del estado
    const EXPECTED_STATE_FIELDS = new Set(['indexPrice','bidPrice','askPrice','spread','status','timestamp']);
    const unexpState = Object.keys(m.state || {}).filter(k => !EXPECTED_STATE_FIELDS.has(k));
    if (unexpState.length) {
      console.log(`  ⚠ Campos nuevos en state de ${ticker}: ${unexpState.join(', ')}`);
    }
  }

  console.log('─'.repeat(72));
  console.log(`Total mapeados: ${found} OK, ${missing} NO ENCONTRADO`);

  // UK100 siempre usa fallback — informativo
  if (NO_UPSCALE_SYMBOLS.size > 0) {
    console.log(`Fallback permanente (no en Upscale): ${[...NO_UPSCALE_SYMBOLS].join(', ')}`);
  }
  console.log();

  // ── 4. Símbolos Upscale fuera del mapa ───────────────────────────────────
  const mappedTickers = new Set(Object.keys(TICKER_MAP));
  const unmapped      = markets
    .map(m => m?.config?.ticker)
    .filter(t => t && !mappedTickers.has(t));

  if (unmapped.length === 0) {
    console.log('═══ Símbolos Upscale fuera del mapa: ninguno\n');
  } else {
    console.log(`═══ Símbolos Upscale fuera del mapa (${unmapped.length}) ══════════════════`);

    const groups = { crypto: [], forex: [], index: [], commodity: [], stock: [], desconocido: [] };
    for (const t of unmapped) {
      const cat = guessCategory(t);
      (groups[cat] || groups.desconocido).push(t);
    }

    for (const [cat, tickers] of Object.entries(groups)) {
      if (tickers.length === 0) continue;
      const label = { crypto: 'Crypto', forex: 'Forex', index: 'Índices',
                      commodity: 'Materias primas', stock: 'Acciones', desconocido: 'Desconocido' }[cat];
      console.log(`  ${label}: ${tickers.join(', ')}`);
    }
    console.log();
  }

  // ── 5. Resumen final ──────────────────────────────────────────────────────
  console.log('═══ Resumen ══════════════════════════════════════════════════════');
  console.log(`  Mercados totales recibidos:  ${markets.length}`);
  console.log(`  Símbolos mapeados (OK):      ${found}`);
  console.log(`  Símbolos mapeados (ausentes): ${missing}`);
  console.log(`  Símbolos Upscale sin mapear: ${unmapped.length}`);
  if (missing > 0) {
    console.log('\n  ⚠ Algunos tickers del TICKER_MAP no llegaron en este poll.');
    console.log('    Puede ser mercado cerrado, ticker renombrado, o clave sin acceso a ese instrumento.');
  }
  if (unmapped.length > 0) {
    console.log('\n  ℹ Hay símbolos de Upscale no mapeados. Evalúa añadirlos a TICKER_MAP si son relevantes.');
  }
  console.log();
}

main().catch(err => {
  console.error('\nERROR inesperado:', err.message);
  process.exit(1);
});
