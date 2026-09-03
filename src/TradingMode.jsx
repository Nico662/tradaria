import { useState, useEffect, useCallback, useRef } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { useLang } from './LangContext';
import { ASSETS } from './assets.js';
import {
  ChevronLeft, Lock, TrendingUp, TrendingDown, X, Info,
  Trophy, Users, BarChart3, CandlestickChart, Activity,
  ChevronRight, Minus, Plus, Pencil, PlusCircle, List, Clock,
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
  { id: 1, symbol: 'BTC/USD', dir: 'BUY',  lots: 0.10, entry: 64250.00 },
  { id: 2, symbol: 'GOLD',    dir: 'SELL', lots: 0.05, entry: 2290.00  },
  { id: 3, symbol: 'EUR/USD', dir: 'BUY',  lots: 0.10, entry: 1.08200  },
];

// ── Mock closed trade history ─────────────────────────────────────────────────
const MOCK_HISTORY = [
  { id: 101, symbol: 'BTC/USD', dir: 'BUY',  lots: 0.05, entry: 61200.00, close: 63850.00, closeTime: '01/09 14:32', pnl: +132.50 },
  { id: 102, symbol: 'GOLD',    dir: 'SELL', lots: 0.10, entry: 2295.00,  close: 2271.50,  closeTime: '01/09 11:20', pnl: +117.50 },
  { id: 103, symbol: 'EUR/USD', dir: 'BUY',  lots: 0.20, entry: 1.08650,  close: 1.08420,  closeTime: '31/08 18:45', pnl:  -46.00 },
  { id: 104, symbol: 'ETH/USD', dir: 'SELL', lots: 0.10, entry: 3280.00,  close: 3195.00,  closeTime: '31/08 09:12', pnl:  +85.00 },
  { id: 105, symbol: 'NVDA',    dir: 'BUY',  lots: 1.00, entry: 865.20,   close: 879.40,   closeTime: '30/08 15:58', pnl:  +14.20 },
];

// ── Lightweight Charts candlestick — replicates the Chart.jsx pattern ─────────
function TradingChart({ symbol, timeframe }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !symbol) return;
    let chart;
    let ro;

    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (!el || !el.clientWidth || !el.clientHeight) return;

      const isForex = ASSETS.find(a => a.name === symbol)?.cat === 'forex';

      chart = createChart(el, {
        width:  el.clientWidth,
        height: el.clientHeight,
        layout: {
          background: { type: 'solid', color: '#080808' },
          textColor: '#555555',
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.04)' },
          horzLines: { color: 'rgba(255,255,255,0.04)' },
        },
        rightPriceScale: { borderColor: 'transparent' },
        timeScale: {
          borderColor: 'transparent',
          barSpacing: 6,
          rightOffset: 3,
          timeVisible: timeframe !== 'D1',
          fixLeftEdge: true,
          fixRightEdge: false,
        },
        localization: {
          priceFormatter: (price) => isForex ? price.toFixed(4) : price.toFixed(2),
        },
        crosshair: {
          mode: 1,
          vertLine: { color: 'rgba(224,85,133,0.4)', labelBackgroundColor: '#e05585' },
          horzLine: { color: 'rgba(0,192,135,0.4)',  labelBackgroundColor: '#00c087' },
        },
        handleScroll: true,
        handleScale:  true,
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor:         '#00c087',
        downColor:       '#e05585',
        borderUpColor:   '#00c087',
        borderDownColor: '#e05585',
        wickUpColor:     '#00c087',
        wickDownColor:   '#e05585',
        priceFormat: isForex
          ? { type: 'price', precision: 4, minMove: 0.0001 }
          : { type: 'price', precision: 2, minMove: 0.01  },
      });

      const rawCandles = generateCandles(symbol, timeframe, 60);
      const msMap = { M1: 60e3, M5: 300e3, M15: 900e3, H1: 3600e3, H4: 14400e3, D1: 86400e3 };
      const intervalSec = (msMap[timeframe] ?? 3600e3) / 1000;
      const nowSec = Math.floor(Date.now() / 1000);
      const alignedNow = Math.floor(nowSec / intervalSec) * intervalSec;

      const chartData = rawCandles.map((c, i) => ({
        time:  alignedNow - (rawCandles.length - 1 - i) * intervalSec,
        open:  c.open,
        high:  c.high,
        low:   c.low,
        close: c.close,
      }));

      series.setData(chartData);
      chart.timeScale().fitContent();

      ro = new ResizeObserver(() => {
        if (containerRef.current) {
          chart.applyOptions({
            width:  containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      });
      ro.observe(el);
    }, 10);

    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      if (chart) chart.remove();
    };
  }, [symbol, timeframe]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

// ── Tutorial overlay ─────────────────────────────────────────────────────────
function TradingTutorial({ t, onClose }) {
  const [step, setStep] = useState(0);
  const tr = t.trading ?? {};
  if (!t.trading) return null;
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
  const [histTab,         setHistTab]        = useState('positions');
  const [closedPositions, setClosedPositions] = useState(MOCK_HISTORY);

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
    setTab('chart');
  }

  function handleClosePosition(id) {
    const pos = positionsLive.find(p => p.id === id);
    if (pos) {
      const now = new Date();
      const dd  = String(now.getDate()).padStart(2, '0');
      const mm  = String(now.getMonth() + 1).padStart(2, '0');
      const hh  = String(now.getHours()).padStart(2, '0');
      const mn  = String(now.getMinutes()).padStart(2, '0');
      setClosedPositions(prev => [{ ...pos, close: pos.curr, closeTime: `${dd}/${mm} ${hh}:${mn}` }, ...prev]);
    }
    setPositions(prev => prev.filter(p => p.id !== id));
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
          <TradingChart symbol={selectedSymbol} timeframe={timeframe} />
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
    const pnlColor    = totalPnl >= 0 ? 'var(--green)' : 'var(--pink)';
    const equityStr   = Math.abs(MOCK_EQUITY).toFixed(2);
    const [eInt, eDec] = equityStr.split('.');
    const eFormatted  = parseInt(eInt, 10).toLocaleString('en-US');

    const AccountHeader = (
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
        {/* EQUITY — largest number on screen */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 800, color: 'var(--text-hint)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 2 }}>
              {tr.equity ?? 'Equidad'}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--green)', opacity: 0.75 }}>$</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 700, color: 'var(--green)', lineHeight: 1, letterSpacing: '-0.02em' }}>{eFormatted}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 500, color: 'var(--green)', opacity: 0.8, lineHeight: 1 }}>.{eDec}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', paddingBottom: 3 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 800, color: 'var(--text-hint)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>P&L</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: pnlColor }}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </div>
          </div>
        </div>

        {/* 2×2 data matrix */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 24px', paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
          {[
            { label: tr.balance ?? 'Balance',       value: `$${(10000).toFixed(2)}`,      color: 'var(--text-primary)'   },
            { label: tr.margin  ?? 'Margen',         value: `$${MOCK_MARGIN.toFixed(2)}`,  color: 'var(--text-secondary)' },
            { label: tr.free    ?? 'Margen libre',   value: `$${MOCK_FREE.toFixed(2)}`,    color: 'var(--text-secondary)' },
            { label: tr.level   ?? 'Nivel',          value: `${MOCK_LEVEL.toFixed(0)}%`,   color: levelColor              },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 700, color: 'var(--text-hint)', letterSpacing: '0.06em' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    );

    const Separator = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', flexShrink: 0 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 800, color: 'var(--text-hint)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {tr.positionsLabel ?? 'Posiciones'}{positionsLive.length > 0 ? ` (${positionsLive.length})` : ''}
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      </div>
    );

    if (positionsLive.length === 0) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {AccountHeader}
          {Separator}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 32px 48px' }}>
            <Activity size={46} style={{ stroke: '#222' }} />
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
              {tr.noPositions ?? 'Sin posiciones abiertas'}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#444', textAlign: 'center' }}>
              {tr.noPositionsSub ?? 'Abre una posición desde el Gráfico'}
            </div>
            <button onClick={() => setTab('chart')} style={{ marginTop: 6, padding: '10px 22px', background: 'var(--green-dim)', border: '1.5px solid var(--border-green)', borderRadius: 'var(--radius-md)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              {tr.tabChart ?? 'Gráfico'} →
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {AccountHeader}
        {Separator}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {positionsLive.map(pos => {
            const posPnlColor = pos.pnl >= 0 ? 'var(--green)' : 'var(--pink)';
            const dirColor    = pos.dir === 'BUY' ? 'var(--green)' : 'var(--pink)';
            return (
              <div key={pos.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', minHeight: 66 }}>
                {/* Left: symbol + direction + lots | entry → current */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 14, color: 'var(--text-primary)' }}>{pos.symbol}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: dirColor, background: pos.dir === 'BUY' ? 'rgba(0,192,135,0.10)' : 'rgba(224,85,133,0.10)', border: `0.5px solid ${dirColor}`, borderRadius: 2, padding: '1px 5px', letterSpacing: '0.08em' }}>
                      {pos.dir.toLowerCase()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555' }}>{pos.lots.toFixed(2)}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-hint)' }}>
                    {fmtPrice(pos.entry)}&nbsp;→&nbsp;{fmtPrice(pos.curr)}
                  </div>
                </div>

                {/* Right: P&L + close button */}
                <div style={{ flexShrink: 0, textAlign: 'right', marginLeft: 14 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 19, color: posPnlColor, lineHeight: 1.1 }}>
                    {pos.pnl >= 0 ? '+' : ''}${Math.abs(pos.pnl).toFixed(2)}
                  </div>
                  <button onClick={() => handleClosePosition(pos.id)}
                    style={{ marginTop: 5, background: 'rgba(224,85,133,0.08)', border: '0.5px solid var(--border-pink)', borderRadius: 3, color: 'var(--pink)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 9, cursor: 'pointer', padding: '2px 7px', letterSpacing: '0.08em' }}>
                    {tr.closeBtn ?? 'CERRAR'}
                  </button>
                </div>
              </div>
            );
          })}
          <div style={{ height: 16 }} />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: HISTORIAL
  // ─────────────────────────────────────────────────────────────────────────────
  function renderHistorial() {
    const HIST_TABS = [
      { id: 'positions',    label: tr.histPositions    ?? 'Posiciones'    },
      { id: 'orders',       label: tr.histOrders       ?? 'Órdenes'       },
      { id: 'transactions', label: tr.histTransactions ?? 'Transacciones' },
    ];

    const totalBenefit = closedPositions.reduce((s, p) => s + Math.max(0, p.pnl), 0);
    const commission   = closedPositions.length * 2.50;
    const netPnl       = closedPositions.reduce((s, p) => s + p.pnl, 0);
    const finalBalance = 10000 + netPnl - commission;

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Sub-tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
          {HIST_TABS.map(ht => (
            <button key={ht.id} onClick={() => setHistTab(ht.id)} style={{
              flex: 1, padding: '10px 2px', background: 'transparent', border: 'none',
              borderBottom: histTab === ht.id ? '2px solid var(--green)' : '2px solid transparent',
              color: histTab === ht.id ? 'var(--green)' : 'var(--text-hint)',
              fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 10,
              cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
              transition: 'color 0.15s',
            }}>
              {ht.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {histTab === 'positions' && (
            <>
              {closedPositions.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <Clock size={38} style={{ stroke: '#222' }} />
                  <div style={{ marginTop: 12, fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 14, color: 'var(--text-muted)' }}>
                    {tr.noHistory ?? 'Sin historial'}
                  </div>
                </div>
              ) : (
                <>
                  {closedPositions.map(pos => {
                    const posPnlColor = pos.pnl >= 0 ? 'var(--green)' : 'var(--pink)';
                    const dirColor    = pos.dir === 'BUY' ? 'var(--green)' : 'var(--pink)';
                    return (
                      <div key={pos.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', minHeight: 62 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 14, color: 'var(--text-primary)' }}>{pos.symbol}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: dirColor, background: pos.dir === 'BUY' ? 'rgba(0,192,135,0.10)' : 'rgba(224,85,133,0.10)', border: `0.5px solid ${dirColor}`, borderRadius: 2, padding: '1px 5px', letterSpacing: '0.08em' }}>
                              {pos.dir.toLowerCase()}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555' }}>{pos.lots.toFixed(2)}</span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-hint)' }}>
                            {fmtPrice(pos.entry)}&nbsp;→&nbsp;{fmtPrice(pos.close)}&nbsp;&nbsp;{pos.closeTime}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right', marginLeft: 14 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 17, color: posPnlColor, lineHeight: 1 }}>
                            {pos.pnl >= 0 ? '+' : ''}${Math.abs(pos.pnl).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Summary block */}
                  <div style={{ margin: '12px 14px 24px', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 800, color: 'var(--text-hint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {tr.histBenefit ?? 'Beneficio'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                        +${totalBenefit.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 800, color: 'var(--text-hint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {tr.histCommission ?? 'Comisión'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                        -${commission.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ padding: '11px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,192,135,0.04)' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {tr.balance ?? 'Balance'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>
                        ${finalBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {(histTab === 'orders' || histTab === 'transactions') && (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, color: '#1e1e1e', marginBottom: 12, lineHeight: 1 }}>—</div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 13, color: 'var(--text-muted)' }}>
                {histTab === 'orders' ? (tr.noOrders ?? 'Sin órdenes pendientes') : (tr.noTransactions ?? 'Sin transacciones')}
              </div>
            </div>
          )}
        </div>
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
    { id: 'ticket',    label: tr.tabHistorial ?? 'Historial',    icon: <Clock size={17} />          },
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
        {tab === 'ticket'    && renderHistorial()}
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
