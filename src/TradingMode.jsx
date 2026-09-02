import { useState, useEffect, useCallback, useRef } from 'react';
import { useLang } from './LangContext';
import { ASSETS } from './assets.js';
import {
  ChevronLeft, Lock, TrendingUp, TrendingDown, X, Info,
  Trophy, Users, BarChart3, CandlestickChart, Activity, FileText,
  ChevronRight, Minus, Plus, Pencil, PlusCircle, List,
} from 'lucide-react';

// ── Mock initial prices ───────────────────────────────────────────────────────
const INITIAL_PRICES = {
  'BTC/USD':  { price: 64872.50, change: +2.34 },
  'ETH/USD':  { price: 3215.80,  change: +1.87 },
  'SOL/USD':  { price: 152.40,   change: +4.21 },
  'XRP/USD':  { price: 0.61240,  change: -0.92 },
  'BNB/USD':  { price: 582.30,   change: +1.10 },
  'DOGE/USD': { price: 0.13420,  change: +3.20 },
  'LINK/USD': { price: 14.820,   change: -1.45 },
  'AVAX/USD': { price: 38.600,   change: +2.80 },
  'ADA/USD':  { price: 0.45200,  change: +0.95 },
  'DOT/USD':  { price: 7.3400,   change: -0.62 },
  'EUR/USD':  { price: 1.08520,  change: +0.12 },
  'GBP/USD':  { price: 1.27410,  change: -0.08 },
  'USD/JPY':  { price: 155.420,  change: +0.23 },
  'USD/CHF':  { price: 0.89320,  change: -0.15 },
  'AUD/USD':  { price: 0.65840,  change: +0.31 },
  'USD/CAD':  { price: 1.36500,  change: -0.10 },
  'S&P 500':  { price: 5280.40,  change: +0.45 },
  'NASDAQ':   { price: 18420.30, change: +0.82 },
  'DOW':      { price: 39540.20, change: +0.31 },
  'GER40':    { price: 18105.80, change: +0.28 },
  'UK100':    { price: 8185.40,  change: -0.15 },
  'JPN225':   { price: 38240.50, change: +0.62 },
  'GOLD':     { price: 2284.50,  change: -0.43 },
  'SILVER':   { price: 28.540,   change: -0.67 },
  'OIL/USD':  { price: 78.320,   change: +1.12 },
  'NGAS':     { price: 2.8420,   change: -2.14 },
  'COPPER':   { price: 4.5200,   change: +0.87 },
  'AAPL':     { price: 189.50,   change: +0.73 },
  'TSLA':     { price: 178.20,   change: -1.24 },
  'MSFT':     { price: 415.30,   change: +0.95 },
  'AMZN':     { price: 183.70,   change: +1.42 },
  'GOOGL':    { price: 172.40,   change: +0.84 },
  'META':     { price: 508.60,   change: +2.15 },
  'NVDA':     { price: 875.30,   change: +3.82 },
};

// ── Mock spreads (points) and day ranges ─────────────────────────────────────
const SPREADS = {
  'BTC/USD': 25,  'ETH/USD': 8,   'SOL/USD': 3,  'XRP/USD': 2,  'BNB/USD': 4,
  'DOGE/USD': 2,  'LINK/USD': 2,  'AVAX/USD': 2, 'ADA/USD': 1,  'DOT/USD': 1,
  'EUR/USD': 2,   'GBP/USD': 3,   'USD/JPY': 2,  'USD/CHF': 3,  'AUD/USD': 2, 'USD/CAD': 3,
  'S&P 500': 40,  'NASDAQ': 60,   'DOW': 80,     'GER40': 50,   'UK100': 50,  'JPN225': 70,
  'GOLD': 15,     'SILVER': 20,   'OIL/USD': 6,  'NGAS': 3,     'COPPER': 4,
  'AAPL': 5,      'TSLA': 8,      'MSFT': 5,     'AMZN': 6,     'GOOGL': 5, 'META': 8, 'NVDA': 10,
};

const DAY_RANGES = Object.fromEntries(
  Object.entries(INITIAL_PRICES).map(([name, { price }]) => {
    const d = price * 0.014;
    return [name, { low: price - d * 0.6, high: price + d * 0.4 }];
  })
);

// ── Mock market open status ───────────────────────────────────────────────────
const MARKET_OPEN = {
  crypto: true, forex: true,
  commodities: true,  // gold/silver/oil trade near-24h
  indices: false, stocks: false,
};

// ── Contract sizes (units per 1 lot, used for margin calc) ───────────────────
function getContractSize(cat, name) {
  if (cat === 'forex')       return 100000;
  if (cat === 'stocks')      return 10;
  if (cat === 'indices')     return 1;
  if (cat === 'commodities') {
    if (name === 'GOLD' || name === 'SILVER') return 10;
    return 100;
  }
  // crypto
  if (name === 'BTC/USD') return 1;
  if (name === 'ETH/USD') return 10;
  return 100;
}

// ── Price formatting ──────────────────────────────────────────────────────────
function fmtPrice(price) {
  if (!price) return '—';
  if (price >= 10000)  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 100)    return price.toFixed(2);
  if (price >= 1)      return price.toFixed(4);
  return price.toFixed(5);
}

function fmtPnl(n) {
  const s = n >= 0 ? '+' : '';
  return `${s}$${Math.abs(n).toFixed(2)}`;
}

// ── Big-digit split for MT5-style price display ───────────────────────────────
function splitPrice(price) {
  if (price >= 10000) {
    const int = Math.floor(price);
    const intStr = String(int);
    const dec = '.' + price.toFixed(2).split('.')[1];
    const prefixNum = parseInt(intStr.slice(0, -2), 10);
    return { prefix: prefixNum.toLocaleString('en-US'), big: intStr.slice(-2), sup: dec };
  }
  if (price >= 1000) {
    const int = Math.floor(price);
    const intStr = String(int);
    const dec = '.' + price.toFixed(2).split('.')[1];
    return { prefix: intStr.slice(0, -2), big: intStr.slice(-2), sup: dec };
  }
  if (price >= 100) {
    const [int, dec] = price.toFixed(2).split('.');
    return { prefix: int + '.', big: dec, sup: '' };
  }
  if (price >= 10) {
    const s = price.toFixed(3);
    const [int, dec] = s.split('.');
    return { prefix: int + '.', big: dec.slice(0, 2), sup: dec.slice(2) };
  }
  if (price >= 1) {
    const s = price.toFixed(4);
    const [int, dec] = s.split('.');
    return { prefix: int + '.' + dec.slice(0, 2), big: dec.slice(2, 4), sup: '' };
  }
  const s = price.toFixed(5);
  const [int, dec] = s.split('.');
  return { prefix: int + '.' + dec.slice(0, 3), big: dec.slice(3, 5), sup: '' };
}

function fmtPoints(price, changePct, cat) {
  const diff = price * Math.abs(changePct) / 100;
  if (cat === 'forex') return Math.round(diff * 10000).toString();
  if (diff >= 10) return Math.round(diff).toString();
  if (diff >= 1)  return diff.toFixed(1);
  return Math.round(diff * 10000).toString();
}

// ── Seeded random walk for deterministic mock candles ────────────────────────
function strHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33 + str.charCodeAt(i)) & 0x7fffffff;
  return h;
}
function makePRNG(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}

function generateCandles(symbol, tf, count = 60) {
  const rng = makePRNG(strHash(symbol + tf));
  const base = INITIAL_PRICES[symbol]?.price ?? 100;
  const vol   = ASSETS.find(a => a.name === symbol)?.vol ?? 0.02;
  let price = base * (0.90 + rng() * 0.20);
  return Array.from({ length: count }, () => {
    const dir    = (rng() - 0.49) * 2;
    const body   = rng() * vol * price * 0.8;
    const open   = price;
    const close  = price + dir * body;
    const wkUp   = rng() * vol * price * 0.4;
    const wkDn   = rng() * vol * price * 0.4;
    const high   = Math.max(open, close) + wkUp;
    const low    = Math.min(open, close) - wkDn;
    price = close;
    return { open, close, high, low };
  });
}

// ── Initial mock positions ────────────────────────────────────────────────────
const INITIAL_POSITIONS = [
  { id: 1, symbol: 'BTC/USD', dir: 'BUY',  lots: 0.10, entry: 64250.00, sl: 63000.00, tp: 66500.00 },
  { id: 2, symbol: 'GOLD',    dir: 'SELL', lots: 0.05, entry: 2290.00,  sl: 2310.00,  tp: 2250.00  },
  { id: 3, symbol: 'EUR/USD', dir: 'BUY',  lots: 0.10, entry: 1.08200,  sl: 1.07800,  tp: 1.08800  },
];

// ── SVG Candlestick chart ─────────────────────────────────────────────────────
// positionsOnSymbol: [{ id, dir, lots, entry, sl, tp, pnl }] — already live-P&L from parent
// onUpdateSL/onUpdateTP: (posId, newPrice) => void — today: update mock; later: call backend
function CandleChart({ symbol, timeframe, width, height, positionsOnSymbol = [], onUpdateSL, onUpdateTP }) {
  const svgRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  // dragState: { type:'sl'|'tp', posId, currentPrice } | null

  const candles = generateCandles(symbol, timeframe);
  const PAD = { t: 12, b: 22, l: 2, r: 58 };
  const W = width - PAD.l - PAD.r;
  const H = height - PAD.t - PAD.b;

  if (W <= 0 || H <= 0) return null;

  // Include position prices in range so lines are always visible
  const posPrices = positionsOnSymbol.flatMap(p => [
    p.entry,
    ...(p.sl != null ? [p.sl] : []),
    ...(p.tp != null ? [p.tp] : []),
  ]);
  const allP  = [...candles.flatMap(c => [c.high, c.low]), ...posPrices];
  const minP  = Math.min(...allP);
  const maxP  = Math.max(...allP);
  const range = maxP - minP || 1;

  const py = p => PAD.t + H - ((p - minP) / range) * H;
  const yp = y => minP + (1 - (y - PAD.t) / H) * range;
  const cw = Math.max(2, W / candles.length - 1.2);
  const cx = i => PAD.l + (i + 0.5) * (W / candles.length);

  const lastCandle = candles[candles.length - 1];
  const lastPrice  = lastCandle.close;
  const lastUp     = lastCandle.close >= lastCandle.open;
  const priceColor = lastUp ? '#00c087' : '#e05585';
  const lastY      = py(lastPrice);

  const gridLevels = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    p: minP + t * range,
    y: PAD.t + H * (1 - t),
  }));
  const timeIdxs = [0, 1, 2, 3, 4].map(i => Math.round(i * (candles.length - 1) / 4));

  function priceFmt(p) {
    if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (p >= 1000)  return p.toFixed(0);
    if (p >= 100)   return p.toFixed(1);
    if (p >= 1)     return p.toFixed(3);
    return p.toFixed(5);
  }

  function timeFmt(idx) {
    const msMap = { M1: 60e3, M5: 300e3, M15: 900e3, H1: 3600e3, H4: 14400e3, D1: 86400e3 };
    const ms = msMap[timeframe] ?? 3600e3;
    const t  = new Date(Date.now() - (candles.length - 1 - idx) * ms);
    if (timeframe === 'D1') return t.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    return t.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // ── Drag gesture logic ────────────────────────────────────────────────────────
  // Disambiguation: pointerdown ON a drag zone → capture → drag the line.
  //                 pointerdown on chart background → future pan (no capture set here).
  function clientYtoPrice(clientY) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const y = clientY - rect.top;
    return yp(Math.max(PAD.t, Math.min(PAD.t + H, y)));
  }

  function onDragZoneDown(e, type, posId, linePrice) {
    e.stopPropagation();
    e.preventDefault();
    // Redirect all future pointer events for this pointer to the SVG element
    svgRef.current?.setPointerCapture(e.pointerId);
    setDragState({ type, posId, currentPrice: linePrice });
  }

  function onSvgMove(e) {
    if (!dragState) return;
    const price = clientYtoPrice(e.clientY);
    if (price !== null) setDragState(d => d ? { ...d, currentPrice: price } : null);
  }

  function onSvgUp(e) {
    if (!dragState) return;
    // TODO: conectar al backend del Trading Mode cuando exista
    if (dragState.type === 'sl') onUpdateSL?.(dragState.posId, dragState.currentPrice);
    else                         onUpdateTP?.(dragState.posId, dragState.currentPrice);
    setDragState(null);
  }

  // ── Position overlay renderer ────────────────────────────────────────────────
  function renderPositionLines() {
    return positionsOnSymbol.map(pos => {
      const dirColor  = pos.dir === 'BUY' ? '#00c087' : '#e05585';
      const pnlColor  = pos.pnl >= 0 ? '#00c087' : '#e05585';
      const pnlStr    = fmtPnl(pos.pnl);

      // Dragged price overrides committed price during drag
      const displaySL = dragState?.posId === pos.id && dragState.type === 'sl'
        ? dragState.currentPrice : pos.sl;
      const displayTP = dragState?.posId === pos.id && dragState.type === 'tp'
        ? dragState.currentPrice : pos.tp;

      const entryY = py(pos.entry);

      return (
        <g key={pos.id}>
          {/* ── Entry line ── */}
          <line x1={PAD.l} y1={entryY} x2={width - PAD.r} y2={entryY}
            stroke={dirColor} strokeWidth={1} strokeDasharray="6,3" opacity={0.9} />
          {/* Entry info badge (left) */}
          <rect x={PAD.l + 2} y={entryY - 10} width={86} height={19}
            fill="rgba(0,0,0,0.72)" rx={3} />
          <text x={PAD.l + 7} y={entryY + 2}
            fill={dirColor} fontSize={8} fontFamily="monospace" fontWeight="bold">
            {pos.dir}
          </text>
          <text x={PAD.l + 28} y={entryY + 2}
            fill="#aaa" fontSize={8} fontFamily="monospace">
            {pos.lots}L
          </text>
          <text x={PAD.l + 88} y={entryY + 2}
            fill={pnlColor} fontSize={8} fontFamily="monospace" fontWeight="bold" textAnchor="end">
            {pnlStr}
          </text>
          {/* Entry price chip (right axis) */}
          <rect x={width - PAD.r} y={entryY - 9} width={PAD.r} height={18}
            fill={dirColor} opacity={0.9} rx={2} />
          <text x={width - PAD.r / 2} y={entryY + 3.8}
            fill="#080808" fontSize={8} fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            {priceFmt(pos.entry)}
          </text>

          {/* ── SL line ── */}
          {displaySL != null && (
            <g>
              <line x1={PAD.l} y1={py(displaySL)} x2={width - PAD.r} y2={py(displaySL)}
                stroke="#e05585" strokeWidth={1} strokeDasharray="3,3" opacity={0.85} />
              {/* SL badge */}
              <rect x={PAD.l + 2} y={py(displaySL) - 8} width={20} height={15}
                fill="rgba(224,85,133,0.18)" rx={2} />
              <text x={PAD.l + 12} y={py(displaySL) + 3}
                fill="#e05585" fontSize={8} fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                SL
              </text>
              {/* SL price chip */}
              <rect x={width - PAD.r} y={py(displaySL) - 8} width={PAD.r} height={15}
                fill="rgba(224,85,133,0.14)" stroke="#e05585" strokeWidth={0.5} rx={2} />
              <text x={width - PAD.r / 2} y={py(displaySL) + 3}
                fill="#e05585" fontSize={8} fontFamily="monospace" textAnchor="middle">
                {priceFmt(displaySL)}
              </text>
              {/* Drag handle indicator */}
              <circle cx={PAD.l + W * 0.65} cy={py(displaySL)} r={4}
                fill="#e05585" opacity={0.6} style={{ pointerEvents: 'none' }} />
              {/* Drag zone — 24px tall invisible touch target */}
              <rect
                x={PAD.l} y={py(displaySL) - 12} width={W} height={24}
                fill="transparent"
                style={{ cursor: 'ns-resize', touchAction: 'none' }}
                onPointerDown={e => onDragZoneDown(e, 'sl', pos.id, displaySL)}
              />
            </g>
          )}

          {/* ── TP line ── */}
          {displayTP != null && (
            <g>
              <line x1={PAD.l} y1={py(displayTP)} x2={width - PAD.r} y2={py(displayTP)}
                stroke="#00c087" strokeWidth={1} strokeDasharray="3,3" opacity={0.85} />
              {/* TP badge */}
              <rect x={PAD.l + 2} y={py(displayTP) - 8} width={20} height={15}
                fill="rgba(0,192,135,0.15)" rx={2} />
              <text x={PAD.l + 12} y={py(displayTP) + 3}
                fill="#00c087" fontSize={8} fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                TP
              </text>
              {/* TP price chip */}
              <rect x={width - PAD.r} y={py(displayTP) - 8} width={PAD.r} height={15}
                fill="rgba(0,192,135,0.12)" stroke="#00c087" strokeWidth={0.5} rx={2} />
              <text x={width - PAD.r / 2} y={py(displayTP) + 3}
                fill="#00c087" fontSize={8} fontFamily="monospace" textAnchor="middle">
                {priceFmt(displayTP)}
              </text>
              {/* Drag handle indicator */}
              <circle cx={PAD.l + W * 0.65} cy={py(displayTP)} r={4}
                fill="#00c087" opacity={0.6} style={{ pointerEvents: 'none' }} />
              {/* Drag zone */}
              <rect
                x={PAD.l} y={py(displayTP) - 12} width={W} height={24}
                fill="transparent"
                style={{ cursor: 'ns-resize', touchAction: 'none' }}
                onPointerDown={e => onDragZoneDown(e, 'tp', pos.id, displayTP)}
              />
            </g>
          )}
        </g>
      );
    });
  }

  return (
    <svg
      ref={svgRef}
      width={width} height={height}
      style={{ display: 'block', touchAction: dragState ? 'none' : 'pan-x pan-y' }}
      onPointerMove={onSvgMove}
      onPointerUp={onSvgUp}
      onPointerLeave={onSvgUp}
    >
      <rect width={width} height={height} fill="#080808" />

      {/* Horizontal grid */}
      {gridLevels.map((l, i) => (
        <line key={`gh${i}`} x1={PAD.l} y1={l.y} x2={width - PAD.r} y2={l.y}
          stroke="rgba(255,255,255,0.045)" strokeWidth={1} strokeDasharray="3,5" />
      ))}
      {/* Vertical grid */}
      {timeIdxs.map(idx => (
        <line key={`gv${idx}`} x1={cx(idx)} y1={PAD.t} x2={cx(idx)} y2={PAD.t + H}
          stroke="rgba(255,255,255,0.025)" strokeWidth={1} strokeDasharray="3,5" />
      ))}

      {/* Candles */}
      {candles.map((c, i) => {
        const up    = c.close >= c.open;
        const color = up ? '#00c087' : '#e05585';
        const x     = cx(i);
        const bTop  = py(Math.max(c.open, c.close));
        const bBot  = py(Math.min(c.open, c.close));
        const bH    = Math.max(1, bBot - bTop);
        return (
          <g key={i}>
            <line x1={x} y1={py(c.high)} x2={x} y2={py(c.low)} stroke={color} strokeWidth={1} />
            <rect x={x - cw / 2} y={bTop} width={cw} height={bH} fill={color} />
          </g>
        );
      })}

      {/* Last-price dashed line */}
      <line x1={PAD.l} y1={lastY} x2={width - PAD.r} y2={lastY}
        stroke={priceColor} strokeWidth={1} strokeDasharray="4,3" opacity={0.8} />

      {/* Axis separators */}
      <line x1={width - PAD.r} y1={PAD.t} x2={width - PAD.r} y2={PAD.t + H}
        stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      <line x1={PAD.l} y1={PAD.t + H} x2={width - PAD.r} y2={PAD.t + H}
        stroke="rgba(255,255,255,0.07)" strokeWidth={1} />

      {/* Price labels */}
      {gridLevels.map((l, i) => (
        <text key={`pl${i}`} x={width - PAD.r + 5} y={l.y + 3.5}
          fill="#555" fontSize={9} fontFamily="monospace" textAnchor="start">
          {priceFmt(l.p)}
        </text>
      ))}

      {/* Current-price chip */}
      <rect x={width - PAD.r} y={lastY - 9} width={PAD.r} height={18}
        fill={priceColor} rx={2} />
      <text x={width - PAD.r / 2} y={lastY + 3.8}
        fill="#080808" fontSize={9} fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {priceFmt(lastPrice)}
      </text>

      {/* Time labels */}
      {timeIdxs.map(idx => (
        <text key={`tl${idx}`} x={cx(idx)} y={height - 5}
          fill="#444" fontSize={8} fontFamily="monospace" textAnchor="middle">
          {timeFmt(idx)}
        </text>
      ))}

      {/* Position overlays — rendered last so they sit on top of candles */}
      {renderPositionLines()}
    </svg>
  );
}

// ── ResizeObserver wrapper ────────────────────────────────────────────────────
function ChartContainer({ symbol, timeframe, positionsOnSymbol, onUpdateSL, onUpdateTP }) {
  const ref  = useRef(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setDims({ width: Math.floor(r.width), height: Math.floor(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#080808' }}>
      {dims.width > 0 && dims.height > 0 && (
        <CandleChart
          symbol={symbol} timeframe={timeframe}
          width={dims.width} height={dims.height}
          positionsOnSymbol={positionsOnSymbol}
          onUpdateSL={onUpdateSL} onUpdateTP={onUpdateTP}
        />
      )}
    </div>
  );
}

// ── Tutorial overlay ─────────────────────────────────────────────────────────
function TradingTutorial({ t, onClose }) {
  const [step, setStep] = useState(0);
  const tr = t.trading;
  const steps = [
    { title: tr.tutStep1title, body: tr.tutStep1 },
    { title: tr.tutStep2title, body: tr.tutStep2 },
    { title: tr.tutStep3title, body: tr.tutStep3 },
    { title: tr.tutStep4title, body: tr.tutStep4 },
    { title: tr.tutStep5title, body: tr.tutStep5 },
  ];
  const isLast = step === steps.length - 1;
  const icons = ['📦', '⚡', '🏦', '📊', '🛑'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: 'var(--bg-elevated)', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px', border: '0.5px solid var(--border-default)', borderBottom: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 17, color: 'var(--text-primary)' }}>{tr.tutTitle}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? 'var(--green)' : 'var(--border-default)', transition: 'background 0.3s' }} />
          ))}
        </div>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{icons[step]}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 18, color: 'var(--text-primary)', marginBottom: 10 }}>
            {steps[step].title}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {steps[step].body}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '12px', background: 'transparent', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            {tr.tutSkip}
          </button>
          <button
            onClick={() => { if (isLast) { onClose(); } else setStep(s => s + 1); }}
            style={{ flex: 2, padding: '12px', background: 'var(--gradient-brand)', border: 'none', borderRadius: 'var(--radius-md)', color: '#0d0d0d', fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
            {isLast ? tr.tutDone : tr.tutNext}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TradingMode({ onBack }) {
  const { t } = useLang();
  const tr = t.trading ?? {};

  const [tab,            setTab]            = useState('symbols');
  const [catFilter,      setCatFilter]      = useState('all');
  const [prices,         setPrices]         = useState(INITIAL_PRICES);
  const [blinks,         setBlinks]         = useState({});
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [timeframe,      setTimeframe]      = useState('H1');
  const [side,           setSide]           = useState('BUY');
  const [lots,           setLots]           = useState(0.10);
  const [useStopLoss,    setUseStopLoss]    = useState(false);
  const [useTakeProfit,  setUseTakeProfit]  = useState(false);
  const [slPrice,        setSlPrice]        = useState('');
  const [tpPrice,        setTpPrice]        = useState('');
  const [positions,      setPositions]      = useState(INITIAL_POSITIONS);
  const [showTutorial,   setShowTutorial]   = useState(
    () => !localStorage.getItem('tradaria_trading_tutorial_seen')
  );
  const [updateTimes,    setUpdateTimes]    = useState({});
  const [blinkSeq,       setBlinkSeq]       = useState({});

  // ── Mock price blinking ───────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const keys = Object.keys(prices);
      const pick = [...keys].sort(() => Math.random() - 0.5).slice(0, 4);
      const newBlinks = {};
      setPrices(prev => {
        const next = { ...prev };
        pick.forEach(name => {
          const asset = ASSETS.find(a => a.name === name);
          const vol = (asset?.vol ?? 0.015) * 0.12;
          const delta = (Math.random() - 0.5) * 2 * vol * prev[name].price;
          newBlinks[name] = delta >= 0 ? 'up' : 'down';
          next[name] = { ...prev[name], price: Math.max(0.00001, prev[name].price + delta) };
        });
        return next;
      });
      setBlinks(newBlinks);
      const ts = new Date().toLocaleTimeString('es-ES', { hour12: false });
      setUpdateTimes(prev => { const n = { ...prev }; pick.forEach(k => { n[k] = ts; }); return n; });
      setBlinkSeq(prev => { const n = { ...prev }; pick.forEach(k => { n[k] = (n[k] ?? 0) + 1; }); return n; });
      setTimeout(() => setBlinks({}), 400);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  // ── Derived: P&L for each position ───────────────────────────────────────
  const positionsLive = positions.map(p => {
    const curr  = prices[p.symbol]?.price ?? p.entry;
    const cs    = getContractSize(ASSETS.find(a => a.name === p.symbol)?.cat ?? 'crypto', p.symbol);
    const pnl   = p.dir === 'BUY'
      ? (curr - p.entry) * cs * p.lots
      : (p.entry - curr) * cs * p.lots;
    const liq   = p.dir === 'BUY'
      ? p.entry * (1 - 0.9 / 100)
      : p.entry * (1 + 0.9 / 100);
    return { ...p, curr, pnl, liq };
  });

  const totalPnl = positionsLive.reduce((sum, p) => sum + p.pnl, 0);

  // ── Ticket calculations ───────────────────────────────────────────────────
  const selAsset   = ASSETS.find(a => a.name === selectedSymbol);
  const selPrice   = selectedSymbol ? (prices[selectedSymbol]?.price ?? 0) : 0;
  const cs         = selAsset ? getContractSize(selAsset.cat, selAsset.name) : 1;
  const posValue   = lots * cs * selPrice;
  const marginReq  = posValue / 100;

  function handleSelectFromSymbols(name) {
    setSelectedSymbol(name);
    setSlPrice('');
    setTpPrice('');
    setTab('chart');
  }

  function handleOpenTicketFrom(name) {
    setSelectedSymbol(name);
    setSlPrice('');
    setTpPrice('');
    setTab('ticket');
  }

  function handleClosePosition(id) {
    setPositions(prev => prev.filter(p => p.id !== id));
  }

  // TODO: conectar al backend del Trading Mode cuando exista
  function handleUpdateStopLoss(positionId, newPrice) {
    setPositions(prev => prev.map(p => p.id === positionId ? { ...p, sl: newPrice } : p));
  }
  function handleUpdateTakeProfit(positionId, newPrice) {
    setPositions(prev => prev.map(p => p.id === positionId ? { ...p, tp: newPrice } : p));
  }

  function handleConfirmOrder() {
    if (!selectedSymbol || !selPrice) return;
    const newPos = {
      id: Date.now(),
      symbol: selectedSymbol,
      dir:    side,
      lots,
      entry:  selPrice,
    };
    setPositions(prev => [newPos, ...prev]);
    setTab('positions');
  }

  function closeTutorial() {
    localStorage.setItem('tradaria_trading_tutorial_seen', '1');
    setShowTutorial(false);
  }

  // ── Style helpers ─────────────────────────────────────────────────────────
  const tabStyle = (id) => ({
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 3, padding: '6px 0 4px',
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: tab === id ? 'var(--green)' : 'var(--text-hint)',
    fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 9,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    transition: 'color 0.15s',
  });

  const filterStyle = (active) => ({
    padding: '5px 12px', borderRadius: 'var(--radius-full)', border: 'none',
    background: active ? 'var(--green-dim)' : 'transparent',
    color: active ? 'var(--green)' : 'var(--text-muted)',
    fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 11,
    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    letterSpacing: '0.06em',
    outline: active ? '1.5px solid var(--border-green)' : '1px solid transparent',
    transition: 'all 0.15s',
  });

  // ── Cat filters ───────────────────────────────────────────────────────────
  const CATS = [
    { id: 'all',         label: tr.filterAll      ?? 'All'         },
    { id: 'crypto',      label: tr.filterCrypto   ?? 'Crypto'      },
    { id: 'forex',       label: tr.filterForex    ?? 'Forex'       },
    { id: 'commodities', label: tr.filterCommod   ?? 'Commod.'     },
    { id: 'indices',     label: tr.filterIndices  ?? 'Indices'     },
    { id: 'stocks',      label: tr.filterStocks   ?? 'Stocks'      },
  ];

  const TIMEFRAMES = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];

  const filteredAssets = catFilter === 'all'
    ? ASSETS
    : ASSETS.filter(a => a.cat === catFilter);

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: SYMBOLS
  // ─────────────────────────────────────────────────────────────────────────────
  function renderSymbols() {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px 9px', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 19, color: 'var(--text-primary)' }}>
            {tr.tabSymbols ?? 'Cotizaciones'}
          </span>
          <div style={{ display: 'flex', gap: 14 }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <Pencil size={17} />
            </button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <PlusCircle size={17} />
            </button>
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, padding: '7px 12px', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          {CATS.map(c => (
            <button key={c.id} onClick={() => setCatFilter(c.id)} style={filterStyle(catFilter === c.id)}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Asset rows */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredAssets.map(asset => {
            const priceData = prices[asset.name];
            if (!priceData) return null;
            const blink    = blinks[asset.name];
            const seq      = blinkSeq[asset.name] ?? 0;
            const isOpen   = MARKET_OPEN[asset.cat] ?? false;
            const is247    = asset.cat === 'crypto';
            const canTrade = isOpen || is247;
            const up       = priceData.change >= 0;
            const chgColor = up ? 'var(--green)' : 'var(--pink)';
            const { prefix, big, sup } = splitPrice(priceData.price);
            const range    = DAY_RANGES[asset.name] ?? { low: priceData.price * 0.988, high: priceData.price * 1.012 };
            const timeStr  = updateTimes[asset.name] ?? new Date().toLocaleTimeString('es-ES', { hour12: false });
            const spread   = SPREADS[asset.name] ?? 5;
            const pts      = fmtPoints(priceData.price, priceData.change, asset.cat);
            const pctStr   = (up ? '+' : '') + priceData.change.toFixed(2) + '%';

            return (
              <button
                key={asset.name}
                onClick={() => canTrade && handleSelectFromSymbols(asset.name)}
                style={{
                  display: 'flex', alignItems: 'center', width: '100%',
                  padding: '9px 14px', background: 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border-subtle)',
                  cursor: canTrade ? 'pointer' : 'default', textAlign: 'left',
                }}
              >
                {/* Left column: change + name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: chgColor, marginBottom: 1, opacity: canTrade ? 1 : 0.4 }}>
                    {up ? '+' : '-'}{pts}&nbsp;&nbsp;{pctStr}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 14, color: canTrade ? 'var(--text-primary)' : '#555', lineHeight: 1.15 }}>
                    {asset.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-hint)' }}>{timeStr}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-hint)' }}>⊨</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-hint)' }}>{spread}</span>
                  </div>
                </div>

                {/* Right column: price or closed */}
                {canTrade ? (
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                    <div
                      key={`p-${asset.name}-${seq}`}
                      style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', animation: blink ? 'qt-flash 0.35s ease-out' : 'none' }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 400, color: chgColor, opacity: 0.7 }}>
                        {prefix}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: chgColor, lineHeight: 1 }}>
                        {big}
                      </span>
                      <sup style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, color: chgColor, marginTop: 4, lineHeight: 1 }}>
                        {sup}
                      </sup>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-hint)', marginTop: 1 }}>
                      L:&nbsp;{fmtPrice(range.low)}&nbsp;&nbsp;H:&nbsp;{fmtPrice(range.high)}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, marginLeft: 8 }}>
                    <Lock size={13} style={{ stroke: '#555' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#555', textAlign: 'right', lineHeight: 1.4 }}>
                      {tr.marketClosed ?? 'Cerrado'}<br />reabre 09:00
                    </span>
                  </div>
                )}
              </button>
            );
          })}
          <div style={{ height: 20 }} />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: CHART
  // ─────────────────────────────────────────────────────────────────────────────
  function renderChart() {
    if (!selectedSymbol) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
          <CandlestickChart size={40} style={{ stroke: '#333' }} />
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
            {tr.noSymbolSelected ?? 'Selecciona un símbolo en Cotizaciones'}
          </div>
          <button onClick={() => setTab('symbols')} style={{ padding: '10px 20px', background: 'var(--green-dim)', border: '1.5px solid var(--border-green)', borderRadius: 'var(--radius-md)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            {tr.tabSymbols ?? 'Cotizaciones'} →
          </button>
        </div>
      );
    }

    const priceData  = prices[selectedSymbol];
    const livePrice  = priceData?.price ?? 0;
    const up         = (priceData?.change ?? 0) >= 0;
    const chgColor   = up ? 'var(--green)' : 'var(--pink)';
    const selCat     = ASSETS.find(a => a.name === selectedSymbol)?.cat ?? 'crypto';

    // Mock bid / ask from spread
    const spreadPts  = SPREADS[selectedSymbol] ?? 5;
    const tick       = selCat === 'forex' ? 0.0001 : livePrice > 1000 ? 1 : livePrice > 100 ? 0.1 : 0.01;
    const halfSpread = (spreadPts * tick) / 2;
    const bid        = livePrice - halfSpread;
    const ask        = livePrice + halfSpread;
    const { prefix: bidPfx, big: bidBig, sup: bidSup } = splitPrice(bid);
    const { prefix: askPfx, big: askBig, sup: askSup } = splitPrice(ask);

    function openTrade(dir) {
      const newPos = { id: Date.now(), symbol: selectedSymbol, dir, lots, entry: dir === 'BUY' ? ask : bid };
      setSide(dir);
      setPositions(prev => [newPos, ...prev]);
      setTab('positions');
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Header: symbol info + timeframe selector ── */}
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', padding: '7px 14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{selectedSymbol}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: chgColor }}>{fmtPrice(livePrice)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: chgColor }}>
                {up ? '+' : ''}{(priceData?.change ?? 0).toFixed(2)}%
              </span>
            </div>
            {/* Timeframe selector inline */}
            <div style={{ display: 'flex' }}>
              {TIMEFRAMES.map(tf => (
                <button key={tf} onClick={() => setTimeframe(tf)} style={{
                  padding: '4px 9px', background: 'transparent', border: 'none',
                  borderBottom: timeframe === tf ? '2px solid var(--green)' : '2px solid transparent',
                  color: timeframe === tf ? 'var(--green)' : 'var(--text-hint)',
                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11,
                  cursor: 'pointer', flexShrink: 0, transition: 'color 0.15s',
                }}>
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Chart — elastic, fills all remaining height ── */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ChartContainer
            symbol={selectedSymbol} timeframe={timeframe}
            positionsOnSymbol={positionsLive.filter(p => p.symbol === selectedSymbol)}
            onUpdateSL={handleUpdateStopLoss}
            onUpdateTP={handleUpdateTakeProfit}
          />
        </div>

        {/* ── Execution panel: SELL | lots | BUY ── */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-default)', background: 'var(--bg-surface)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* SELL */}
          <button onClick={() => openTrade('SELL')} style={{
            flex: 1, background: 'rgba(224,85,133,0.10)', border: '1px solid var(--border-pink)',
            borderRadius: 8, padding: '9px 6px', cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 11, color: 'var(--pink)', letterSpacing: '0.1em', marginBottom: 4 }}>SELL</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--pink)', opacity: 0.65 }}>{bidPfx}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 19, fontWeight: 700, color: 'var(--pink)', lineHeight: 1 }}>{bidBig}</span>
              <sup style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--pink)', marginTop: 3 }}>{bidSup}</sup>
            </div>
          </button>

          {/* Volume */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 60 }}>
            <button
              onClick={() => setLots(l => Math.min(5, +(l + 0.01).toFixed(2)))}
              style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)', borderRadius: 4, width: 28, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1 }}>
              ▲
            </button>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1 }}>
              {lots.toFixed(2)}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-hint)', letterSpacing: '0.07em', lineHeight: 1 }}>LOTS</div>
            <button
              onClick={() => setLots(l => Math.max(0.01, +(l - 0.01).toFixed(2)))}
              style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)', borderRadius: 4, width: 28, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1 }}>
              ▼
            </button>
          </div>

          {/* BUY */}
          <button onClick={() => openTrade('BUY')} style={{
            flex: 1, background: 'rgba(0,192,135,0.09)', border: '1px solid var(--border-green)',
            borderRadius: 8, padding: '9px 6px', cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 11, color: 'var(--green)', letterSpacing: '0.1em', marginBottom: 4 }}>BUY</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', opacity: 0.65 }}>{askPfx}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 19, fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>{askBig}</span>
              <sup style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--green)', marginTop: 3 }}>{askSup}</sup>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: POSITIONS
  // ─────────────────────────────────────────────────────────────────────────────
  function renderPositions() {
    return (
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* P&L header */}
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {tr.totalPnl ?? 'Total P&L'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 20, color: totalPnl >= 0 ? 'var(--green)' : 'var(--color-down)' }}>
            {fmtPnl(totalPnl)}
          </div>
        </div>

        {positionsLive.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Activity size={36} style={{ stroke: '#333', marginBottom: 12 }} />
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 15, color: 'var(--text-muted)', marginBottom: 6 }}>
              {tr.noPositions ?? 'No open positions'}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, color: '#444' }}>
              {tr.noPositionsSub ?? 'Open a position from the Ticket tab'}
            </div>
            <button onClick={() => setTab('ticket')} style={{ marginTop: 16, padding: '10px 20px', background: 'var(--green-dim)', border: '1.5px solid var(--border-green)', borderRadius: 'var(--radius-md)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              {tr.tabTicket ?? 'Ticket'} →
            </button>
          </div>
        ) : (
          <div>
            {positionsLive.map(pos => {
              const pnlColor = pos.pnl >= 0 ? 'var(--green)' : 'var(--color-down)';
              const dirColor = pos.dir === 'BUY' ? 'var(--green)' : 'var(--color-down)';
              return (
                <div key={pos.id} style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{pos.symbol}</span>
                      <span style={{ fontSize: 10, fontWeight: 900, color: dirColor, background: pos.dir === 'BUY' ? 'var(--green-dim)' : 'var(--pink-dim)', border: `1px solid ${pos.dir === 'BUY' ? 'var(--border-green)' : 'var(--border-pink)'}`, borderRadius: 4, padding: '1px 6px', letterSpacing: '0.08em' }}>
                        {pos.dir}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#666' }}>{pos.lots} {tr.lotsLabel ?? 'lots'}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: pnlColor }}>
                        {fmtPnl(pos.pnl)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                    {[
                      { label: tr.entryLabel ?? 'Entry',   value: fmtPrice(pos.entry) },
                      { label: tr.currentLabel ?? 'Curr.', value: fmtPrice(pos.curr)  },
                      { label: tr.liqLabel ?? 'Liq.',      value: fmtPrice(pos.liq)   },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', padding: '6px 8px' }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 800, color: 'var(--text-hint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleClosePosition(pos.id)}
                    style={{ width: '100%', padding: '8px', background: 'rgba(224,85,133,0.08)', border: '0.5px solid var(--border-pink)', borderRadius: 'var(--radius-sm)', color: 'var(--color-down)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 12, cursor: 'pointer', letterSpacing: '0.08em' }}>
                    {tr.closeBtn ?? 'Close position'}
                  </button>
                </div>
              );
            })}
            <div style={{ height: 16 }} />
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: TICKET
  // ─────────────────────────────────────────────────────────────────────────────
  function renderTicket() {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 24px' }}>
        {/* Symbol selector */}
        <button
          onClick={() => setTab('symbols')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', marginBottom: 16, cursor: 'pointer' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
              {tr.tabSymbols ?? 'Symbol'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: selectedSymbol ? 'var(--text-primary)' : '#444' }}>
              {selectedSymbol ?? (tr.noSymbolSelected ?? 'Select a symbol →')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {selectedSymbol && (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                  {fmtPrice(selPrice)}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: (prices[selectedSymbol]?.change ?? 0) >= 0 ? 'var(--green)' : 'var(--color-down)' }}>
                  {(prices[selectedSymbol]?.change ?? 0) >= 0 ? '+' : ''}{(prices[selectedSymbol]?.change ?? 0).toFixed(2)}%
                </div>
              </>
            )}
            {!selectedSymbol && <ChevronRight size={18} style={{ stroke: '#444' }} />}
          </div>
        </button>

        {/* BUY / SELL */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setSide('BUY')} style={{ padding: '14px', borderRadius: 'var(--radius-md)', border: side === 'BUY' ? '2px solid var(--green)' : '1px solid var(--border-default)', background: side === 'BUY' ? 'var(--green)' : 'var(--bg-elevated)', color: side === 'BUY' ? '#0d0d0d' : '#555', fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}>
            <TrendingUp size={16} /> {tr.buy ?? 'BUY'}
          </button>
          <button onClick={() => setSide('SELL')} style={{ padding: '14px', borderRadius: 'var(--radius-md)', border: side === 'SELL' ? '2px solid var(--color-down)' : '1px solid var(--border-default)', background: side === 'SELL' ? 'var(--color-down)' : 'var(--bg-elevated)', color: side === 'SELL' ? '#0d0d0d' : '#555', fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}>
            <TrendingDown size={16} /> {tr.sell ?? 'SELL'}
          </button>
        </div>

        {/* Lot size */}
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {tr.volumeLabel ?? 'Volume (Lots)'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setLots(l => Math.max(0.01, +(l - 0.01).toFixed(2)))} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-subtle)', border: '0.5px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Minus size={12} />
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', minWidth: 48, textAlign: 'center' }}>{lots.toFixed(2)}</span>
              <button onClick={() => setLots(l => Math.min(5, +(l + 0.01).toFixed(2)))} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-subtle)', border: '0.5px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={12} />
              </button>
            </div>
          </div>
          <input type="range" min={0.01} max={5} step={0.01} value={lots}
            onChange={e => setLots(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--green)', cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555' }}>0.01</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555' }}>5.00</span>
          </div>
        </div>

        {/* SL / TP */}
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            {tr.optionals ?? 'Optional'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: tr.slLabel ?? 'Stop Loss',   key: 'sl', val: slPrice, set: setSlPrice, use: useStopLoss,   setUse: setUseStopLoss },
              { label: tr.tpLabel ?? 'Take Profit', key: 'tp', val: tpPrice, set: setTpPrice, use: useTakeProfit, setUse: setUseTakeProfit },
            ].map(({ label, key, val, set, use, setUse }) => (
              <div key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div onClick={() => setUse(u => !u)} style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${use ? 'var(--green)' : '#444'}`, background: use ? 'var(--green)' : 'transparent', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: use ? 'var(--text-primary)' : '#555' }}>{label}</span>
                </div>
                <input
                  type="number" value={val} disabled={!use}
                  onChange={e => set(e.target.value)}
                  placeholder={fmtPrice(selPrice)}
                  style={{ width: '100%', padding: '8px 10px', background: use ? 'var(--bg-subtle)' : 'rgba(255,255,255,0.02)', border: `0.5px solid ${use ? 'var(--border-default)' : '#222'}`, borderRadius: 'var(--radius-sm)', color: use ? 'var(--text-primary)' : '#444', fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Calculations */}
        {selectedSymbol && (
          <div style={{ background: 'rgba(0,192,135,0.04)', border: '0.5px solid var(--border-green)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: tr.posSize ?? 'Position', value: `$${posValue >= 1000 ? (posValue / 1000).toFixed(1) + 'K' : posValue.toFixed(2)}` },
                { label: tr.marginReq ?? 'Margin', value: `$${marginReq.toFixed(2)}` },
                { label: tr.leverage ?? '1:100', value: '1 : 100' },
                { label: 'Lev. Type', value: 'CFD' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 800, color: 'var(--text-hint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirm */}
        <button
          disabled={!selectedSymbol}
          onClick={handleConfirmOrder}
          style={{ width: '100%', padding: '16px', background: selectedSymbol ? (side === 'BUY' ? 'var(--green)' : 'var(--color-down)') : '#222', border: 'none', borderRadius: 'var(--radius-md)', color: selectedSymbol ? '#0d0d0d' : '#444', fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 15, cursor: selectedSymbol ? 'pointer' : 'not-allowed', letterSpacing: '0.04em', transition: 'all 0.15s' }}>
          {tr.confirmOrder ?? 'Open Position'}
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: SOCIAL (Ranking / Duel / Ligas placeholders)
  // ─────────────────────────────────────────────────────────────────────────────
  function renderSocial() {
    const sections = [
      { icon: <Trophy size={22} style={{ stroke: 'var(--color-neutral)' }} />, title: tr.ranking ?? 'Trading Ranking',  color: 'var(--color-neutral)', border: 'var(--color-neutral-border)' },
      { icon: <Users size={22} style={{ stroke: 'var(--pink)' }} />,          title: tr.duel ?? 'Trading Duel',         color: 'var(--pink)', border: 'var(--border-pink)' },
      { icon: <BarChart3 size={22} style={{ stroke: 'var(--green)' }} />,      title: tr.leagues ?? 'Trading Leagues',   color: 'var(--green)', border: 'var(--border-green)' },
    ];
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {sections.map(s => (
          <div key={s.title} style={{ background: 'var(--bg-elevated)', border: `0.5px solid ${s.border}`, borderRadius: 'var(--radius-lg)', padding: '20px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {s.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, color: '#555' }}>{tr.comingSoonSub ?? 'Coming soon for Trading Mode'}</div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#555', background: 'rgba(255,255,255,0.04)', border: '0.5px solid #333', borderRadius: 'var(--radius-full)', padding: '3px 8px', letterSpacing: '0.1em', flexShrink: 0 }}>
              SOON
            </span>
          </div>
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Account header
  // ─────────────────────────────────────────────────────────────────────────────
  const MOCK_EQUITY   = 10000 + totalPnl;
  const MOCK_MARGIN   = 482.00;
  const MOCK_FREE     = MOCK_EQUITY - MOCK_MARGIN;
  const MOCK_LEVEL    = (MOCK_EQUITY / MOCK_MARGIN) * 100;
  const levelColor    = MOCK_LEVEL > 200 ? 'var(--green)' : MOCK_LEVEL > 100 ? 'var(--color-neutral)' : 'var(--color-down)';

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'symbols',   label: tr.tabSymbols   ?? 'Cotizaciones', icon: <List size={17} />           },
    { id: 'chart',     label: tr.tabChart     ?? 'Chart',        icon: <CandlestickChart size={17} /> },
    { id: 'positions', label: tr.tabPositions ?? 'Positions',    icon: <Activity size={17} />       },
    { id: 'ticket',    label: tr.tabTicket    ?? 'Ticket',       icon: <FileText size={17} />       },
    { id: 'social',    label: tr.tabSocial    ?? 'Social',       icon: <Trophy size={17} />         },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 480, margin: '0 auto', background: 'var(--bg-base)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      <style>{`@keyframes qt-flash { 0%,100%{opacity:1} 25%{opacity:0.1} }`}</style>

      {/* ── Account Header ─────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '0.5px solid var(--border-default)', padding: '10px 14px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 12, letterSpacing: '0.06em' }}>
            <ChevronLeft size={16} /> {tr.back ?? 'Back'}
          </button>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 13, color: 'var(--text-primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {tr.title ?? 'Trading Mode'}
          </div>
          <button onClick={() => setShowTutorial(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-hint)', cursor: 'pointer', padding: 4 }}>
            <Info size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 4 }}>
          {[
            { label: tr.balance ?? 'Balance', value: `$${(10000).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: 'var(--text-primary)' },
            { label: tr.equity  ?? 'Equity',  value: `$${MOCK_EQUITY.toFixed(2)}`,  color: MOCK_EQUITY >= 10000 ? 'var(--green)' : 'var(--color-down)' },
            { label: tr.margin  ?? 'Margin',  value: `$${MOCK_MARGIN.toFixed(2)}`,  color: 'var(--text-secondary)' },
            { label: tr.free    ?? 'Free',    value: `$${MOCK_FREE.toFixed(2)}`,    color: 'var(--text-secondary)' },
            { label: tr.level   ?? 'Level',   value: `${MOCK_LEVEL.toFixed(0)}%`,   color: levelColor },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--text-hint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tab === 'symbols'   && renderSymbols()}
        {tab === 'chart'     && renderChart()}
        {tab === 'positions' && renderPositions()}
        {tab === 'ticket'    && renderTicket()}
        {tab === 'social'    && renderSocial()}
      </div>

      {/* ── Bottom tab bar ──────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, display: 'flex', background: 'var(--bg-surface)', borderTop: '0.5px solid var(--border-default)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {TABS.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setTab(id)} style={tabStyle(id)}>
            <div style={{ position: 'relative' }}>
              {icon}
              {id === 'positions' && positionsLive.length > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -6, background: 'var(--green)', color: '#0d0d0d', borderRadius: '50%', width: 13, height: 13, fontSize: 8, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {positionsLive.length}
                </span>
              )}
            </div>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tutorial ────────────────────────────────────────────────────── */}
      {showTutorial && <TradingTutorial t={t} onClose={closeTutorial} />}
    </div>
  );
}
