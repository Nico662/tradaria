import { useState, useEffect, useCallback, useRef } from 'react';
import TradikoCandleLogo from './components/TradikoCandleLogo';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { useLang } from './LangContext';
import { useAuth, isIOSApp } from './AuthContext';
import { SERVER } from './config';
import { ASSETS } from './assets.js';
import {
  ChevronLeft, Lock, TrendingUp, TrendingDown, X, Info,
  Trophy, Users, BarChart3, CandlestickChart, Activity,
  ChevronRight, Minus, Plus, Pencil, PlusCircle, List, Clock,
  Flame, Swords,
} from 'lucide-react';

// ── Seed prices for deterministic candle generation (not live; stays fixed) ───
const CANDLE_PRICES = {
  'BTC/USD':  64872.50, 'ETH/USD':  3215.80,  'SOL/USD':  152.40,
  'XRP/USD':  0.61240,  'BNB/USD':  582.30,   'DOGE/USD': 0.13420,
  'LINK/USD': 14.820,   'AVAX/USD': 38.600,   'ADA/USD':  0.45200,
  'DOT/USD':  7.3400,   'EUR/USD':  1.08520,  'GBP/USD':  1.27410,
  'USD/JPY':  155.420,  'USD/CHF':  0.89320,  'AUD/USD':  0.65840,
  'USD/CAD':  1.36500,  'S&P 500':  5280.40,  'NASDAQ':   18420.30,
  'DOW':      39540.20, 'GER40':    18105.80,  'UK100':    8185.40,
  'JPN225':   38240.50, 'GOLD':     2284.50,   'SILVER':   28.540,
  'OIL/USD':  78.320,   'NGAS':     2.8420,    'COPPER':   4.5200,
  'AAPL':     189.50,   'TSLA':     178.20,    'MSFT':     415.30,
  'AMZN':     183.70,   'GOOGL':    172.40,    'META':     508.60,
  'NVDA':     875.30,
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
  const base = CANDLE_PRICES[symbol] ?? 100;
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


// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL MOCK DATA — Trading Mode
// TODO: conectar al backend del Trading Mode cuando exista:
//   GET /api/trading/ranking?period=global|week  → { traders: Trader[] }
//   GET /api/trading/duel/active                  → { active, endsAt, me, rival }
//   GET /api/trading/leagues/me                   → { division, myId, myRank, total, promoteTop, relegateFrom, traders }
// ─────────────────────────────────────────────────────────────────────────────

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
  const { token, user } = useAuth();

  const [tab,            setTab]            = useState('symbols');
  const [catFilter,      setCatFilter]      = useState('all');
  const [prices,         setPrices]         = useState({});
  const [blinks,         setBlinks]         = useState({});
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [timeframe,      setTimeframe]      = useState('H1');
  const [side,           setSide]           = useState('BUY');
  const [lots,           setLots]           = useState(0.10);
  const [useStopLoss,    setUseStopLoss]    = useState(false);
  const [useTakeProfit,  setUseTakeProfit]  = useState(false);
  const [slPrice,        setSlPrice]        = useState('');
  const [tpPrice,        setTpPrice]        = useState('');
  const [positions,      setPositions]      = useState([]);
  const [showTutorial,   setShowTutorial]   = useState(
    () => !localStorage.getItem('tradaria_trading_tutorial_seen')
  );
  const [updateTimes,    setUpdateTimes]    = useState({});
  const [blinkSeq,       setBlinkSeq]       = useState({});
  const [histTab,         setHistTab]        = useState('positions');
  const [closedPositions, setClosedPositions] = useState([]);
  const [socialTab,       setSocialTab]       = useState('ranking');
  const [rankingPeriod,   setRankingPeriod]   = useState('global');
  const [splash,          setSplash]          = useState(true);
  const [catalog,         setCatalog]         = useState({});
  const [account,         setAccount]         = useState(null);
  const [orderError,      setOrderError]      = useState(null);
  const [orderPending,    setOrderPending]    = useState(false);
  const [positionsKey,    setPositionsKey]    = useState(0);
  const [ranking,         setRanking]         = useState([]);
  const [rankingPos,      setRankingPos]      = useState(null);
  const [activeDuel,      setActiveDuel]      = useState(null);
  const [pendingDuels,    setPendingDuels]    = useState([]);
  const [myLeagues,       setMyLeagues]       = useState([]);
  const [leagueView,      setLeagueView]      = useState(null);
  const [challengeInput,  setChallengeInput]  = useState('');
  const [leagueCodeInput, setLeagueCodeInput] = useState('');
  const [leagueNameInput, setLeagueNameInput] = useState('');
  const [socialError,     setSocialError]     = useState(null);
  const [socialPending,   setSocialPending]   = useState(false);
  const initPricesRef = useRef({});
  const prevPricesRef = useRef({});

  // ── Splash ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 750);
    return () => clearTimeout(t);
  }, []);

  // ── Live price polling from backend ──────────────────────────────────────
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res  = await fetch(`${SERVER}/api/trading/prices`);
        if (!res.ok) return;
        const list = await res.json();
        if (!active) return;

        const newBlinks   = {};
        const newTimes    = {};
        const newSeq      = {};
        const ts          = new Date().toLocaleTimeString('es-ES', { hour12: false });
        const isFirst     = Object.keys(prevPricesRef.current).length === 0;

        const next = {};
        for (const { symbol, price, bid, ask } of list) {
          const init   = isFirst ? price : (initPricesRef.current[symbol] ?? price);
          const change = ((price - init) / init) * 100;
          const prev   = prevPricesRef.current[symbol];
          if (prev !== undefined && price !== prev.price) {
            newBlinks[symbol] = price > prev.price ? 'up' : 'down';
            newTimes[symbol]  = ts;
            newSeq[symbol]    = (prev.blinkSeq ?? 0) + 1;
          }
          next[symbol] = { price, bid, ask, change, blinkSeq: newSeq[symbol] ?? (prevPricesRef.current[symbol]?.blinkSeq ?? 0) };
        }

        if (isFirst) initPricesRef.current = Object.fromEntries(list.map(({ symbol, price }) => [symbol, price]));
        prevPricesRef.current = next;

        setPrices(next);
        if (Object.keys(newBlinks).length > 0) {
          setBlinks(newBlinks);
          setUpdateTimes(prev => ({ ...prev, ...newTimes }));
          setBlinkSeq(prev => { const n = { ...prev }; for (const [k, v] of Object.entries(newSeq)) n[k] = v; return n; });
          setTimeout(() => setBlinks({}), 400);
        }
      } catch (_) {}
    }
    poll();
    const interval = setInterval(poll, 2000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // ── Catalog (symbol metadata + tradeable flag) ────────────────────────────
  useEffect(() => {
    fetch(`${SERVER}/api/trading/catalog`)
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const map = {};
        for (const entry of list) map[entry.symbol] = entry;
        setCatalog(map);
      })
      .catch(() => {});
  }, []);

  // ── Account summary ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let active = true;
    async function fetchAccount() {
      try {
        const res  = await fetch(`${SERVER}/api/trading/account`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok || !active) return;
        setAccount(await res.json());
      } catch (_) {}
    }
    fetchAccount();
    const interval = setInterval(fetchAccount, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [token]);

  // ── Live open positions from backend ─────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let active = true;
    async function fetchPositions() {
      try {
        const res  = await fetch(`${SERVER}/api/trading/positions`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok || !active) return;
        const list = await res.json();
        setPositions(list.map(p => ({
          id:         String(p.id),
          symbol:     p.symbol,
          dir:        p.direction === 'long' ? 'BUY' : 'SELL',
          lots:       p.lots,
          entry:      p.entryPrice,
          curr:       p.currentPrice,
          pnl:        p.pnl,
          marginUsed: p.marginUsed,
          stopLoss:   p.stopLoss,
          takeProfit: p.takeProfit,
          openedAt:   p.openedAt,
        })));
      } catch (_) {}
    }
    fetchPositions();
    const interval = setInterval(fetchPositions, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [token, positionsKey]);

  // ── Closed trade history from backend ────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let active = true;
    async function fetchHistory() {
      try {
        const res = await fetch(`${SERVER}/api/trading/history?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok || !active) return;
        const { trades } = await res.json();
        setClosedPositions(trades.map(t => ({
          id:          String(t._id),
          symbol:      t.symbol,
          dir:         t.direction === 'long' ? 'BUY' : 'SELL',
          lots:        t.lots,
          entry:       t.entryPrice,
          close:       t.closePrice,
          pnl:         t.pnl,
          pnlPct:      t.pnlPct,
          closeReason: t.closeReason,
          closeTime:   new Date(t.closedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        })));
      } catch (_) {}
    }
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000);
    return () => { active = false; clearInterval(interval); };
  }, [token, positionsKey]);

  // ── Leaderboard ───────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    async function fetchRanking() {
      try {
        const qs  = `period=${rankingPeriod}${user?.id ? `&userId=${user.id}` : ''}`;
        const res = await fetch(`${SERVER}/api/trading/leaderboard?${qs}`);
        if (!res.ok || !active) return;
        const data = await res.json();
        setRanking(data.leaderboard ?? []);
        setRankingPos(data.userPosition ?? null);
      } catch (_) {}
    }
    fetchRanking();
    const interval = setInterval(fetchRanking, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [rankingPeriod, user?.id]);

  // ── Duel (active + pending) ───────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let active = true;
    async function fetchDuel() {
      try {
        const [actRes, pendRes] = await Promise.all([
          fetch(`${SERVER}/api/trading/duel/active`,  { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${SERVER}/api/trading/duel/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!active) return;
        if (actRes.ok)  setActiveDuel(await actRes.json());
        if (pendRes.ok) setPendingDuels(await pendRes.json());
      } catch (_) {}
    }
    fetchDuel();
    const interval = setInterval(fetchDuel, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [token]);

  // ── My leagues ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    let active = true;
    async function fetchMyLeagues() {
      try {
        const res = await fetch(`${SERVER}/api/trading/leagues/mine`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok || !active) return;
        setMyLeagues(await res.json());
      } catch (_) {}
    }
    fetchMyLeagues();
    return () => { active = false; };
  }, [token]);

  // ── Derived: add liquidation price; P&L already computed by backend ──────
  const positionsLive = positions.map(p => ({
    ...p,
    liq: p.dir === 'BUY'
      ? p.entry * (1 - 0.9 / 100)
      : p.entry * (1 + 0.9 / 100),
  }));

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
    setOrderError(null);
    setTab('chart');
  }

  async function refreshAccountOnce() {
    try {
      const res = await fetch(`${SERVER}/api/trading/account`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAccount(await res.json());
    } catch (_) {}
  }

  async function handleClosePosition(id) {
    if (orderPending) return;
    setOrderPending(true);
    setOrderError(null);
    try {
      const res = await fetch(`${SERVER}/api/trading/close/${id}`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setOrderError(data.error ?? 'Error al cerrar posición');
        return;
      }
      setPositionsKey(k => k + 1);
      refreshAccountOnce();
    } catch (_) {
      setOrderError('Error de conexión');
    } finally {
      setOrderPending(false);
    }
  }

  async function handleChallenge() {
    if (!challengeInput.trim() || socialPending) return;
    setSocialPending(true); setSocialError(null);
    try {
      const res = await fetch(`${SERVER}/api/trading/duel/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: challengeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setSocialError(data.error ?? 'Error al retar'); return; }
      setChallengeInput('');
      const actRes = await fetch(`${SERVER}/api/trading/duel/active`, { headers: { Authorization: `Bearer ${token}` } });
      if (actRes.ok) setActiveDuel(await actRes.json());
    } catch (_) { setSocialError('Error de conexión'); }
    finally { setSocialPending(false); }
  }

  async function handleDuelAccept(duelId) {
    setSocialPending(true);
    try {
      const res = await fetch(`${SERVER}/api/trading/duel/accept/${duelId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setSocialError(d.error ?? 'Error'); return; }
      const [actRes, pendRes] = await Promise.all([
        fetch(`${SERVER}/api/trading/duel/active`,  { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${SERVER}/api/trading/duel/pending`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (actRes.ok)  setActiveDuel(await actRes.json());
      if (pendRes.ok) setPendingDuels(await pendRes.json());
    } catch (_) { setSocialError('Error de conexión'); }
    finally { setSocialPending(false); }
  }

  async function handleDuelReject(duelId) {
    try {
      await fetch(`${SERVER}/api/trading/duel/reject/${duelId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      setPendingDuels(prev => prev.filter(d => String(d.id) !== String(duelId)));
    } catch (_) {}
  }

  async function handleViewLeague(leagueId) {
    try {
      const res = await fetch(`${SERVER}/api/trading/leagues/${leagueId}/ranking`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setLeagueView(await res.json());
    } catch (_) {}
  }

  async function handleCreateLeague() {
    if (!leagueNameInput.trim() || socialPending) return;
    setSocialPending(true); setSocialError(null);
    try {
      const res = await fetch(`${SERVER}/api/trading/leagues/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: leagueNameInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setSocialError(data.error ?? 'Error al crear liga'); return; }
      setLeagueNameInput('');
      const mineRes = await fetch(`${SERVER}/api/trading/leagues/mine`, { headers: { Authorization: `Bearer ${token}` } });
      if (mineRes.ok) setMyLeagues(await mineRes.json());
      handleViewLeague(data.leagueId);
    } catch (_) { setSocialError('Error de conexión'); }
    finally { setSocialPending(false); }
  }

  async function handleJoinLeague() {
    if (!leagueCodeInput.trim() || socialPending) return;
    setSocialPending(true); setSocialError(null);
    try {
      const res = await fetch(`${SERVER}/api/trading/leagues/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: leagueCodeInput.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setSocialError(data.error ?? 'Error al unirse'); return; }
      setLeagueCodeInput('');
      const mineRes = await fetch(`${SERVER}/api/trading/leagues/mine`, { headers: { Authorization: `Bearer ${token}` } });
      if (mineRes.ok) setMyLeagues(await mineRes.json());
      handleViewLeague(data.leagueId);
    } catch (_) { setSocialError('Error de conexión'); }
    finally { setSocialPending(false); }
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
            const canTrade = catalog[asset.name]?.tradeable ?? asset.cat === 'crypto';
            const up       = priceData.change >= 0;
            const chgColor = up ? 'var(--green)' : 'var(--pink)';
            const { prefix, big, sup } = splitPrice(priceData.price);
            const range    = { low: priceData.price * 0.988, high: priceData.price * 1.012 };
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
          {/* ── Upscale affiliate banner ──────────────────────────────────── */}
          {/* SHOW_UPSCALE_ON_IOS = true — set to false to hide on iOS only */}
          {(true || !isIOSApp()) && (
            <div style={{
              margin: '16px 14px 4px',
              border: '1px solid rgba(34,211,165,0.25)',
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(34,211,165,0.06) 0%, rgba(34,211,165,0.02) 100%)',
              overflow: 'hidden',
            }}>
              {/* Header row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 13px 8px',
                borderBottom: '1px solid rgba(34,211,165,0.12)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 15,
                    color: 'var(--green)', letterSpacing: '0.04em',
                  }}>
                    UPSCALE
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
                    color: 'var(--text-hint)', background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid var(--border-default)',
                    borderRadius: 3, padding: '2px 5px', letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}>
                    {tr.upscaleDisclaimer ?? 'External · Real money · Affiliate'}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '9px 13px 11px' }}>
                <div style={{
                  fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 12,
                  color: 'var(--text-primary)', letterSpacing: '0.03em', marginBottom: 5,
                }}>
                  {tr.upscaleTitle ?? 'Real Funded Trading'}
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500,
                  color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 11,
                }}>
                  {tr.upscaleTagline ?? 'Tradiko is a simulator with no real money. Ready for the real thing? Upscale is an independent prop firm offering real funded trader accounts — this is a paid service, not free.'}
                </div>
                <a
                  href="https://app.upscale.trade?ref=5JYVF"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 11,
                    color: 'var(--green)', letterSpacing: '0.06em',
                    background: 'rgba(34,211,165,0.10)',
                    border: '1px solid rgba(34,211,165,0.30)',
                    borderRadius: 5, padding: '6px 12px',
                    textDecoration: 'none',
                  }}
                >
                  {tr.upscaleCta ?? 'Explore Upscale →'}
                </a>
              </div>
            </div>
          )}

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

    // Bid / ask from backend prices (fall back to spread estimate when not yet loaded)
    const bid = priceData?.bid ?? (() => {
      const spreadPts = SPREADS[selectedSymbol] ?? 5;
      const tick = selCat === 'forex' ? 0.0001 : livePrice > 1000 ? 1 : livePrice > 100 ? 0.1 : 0.01;
      return livePrice - (spreadPts * tick) / 2;
    })();
    const ask = priceData?.ask ?? (() => {
      const spreadPts = SPREADS[selectedSymbol] ?? 5;
      const tick = selCat === 'forex' ? 0.0001 : livePrice > 1000 ? 1 : livePrice > 100 ? 0.1 : 0.01;
      return livePrice + (spreadPts * tick) / 2;
    })();
    const { prefix: bidPfx, big: bidBig, sup: bidSup } = splitPrice(bid);
    const { prefix: askPfx, big: askBig, sup: askSup } = splitPrice(ask);

    async function openTrade(dir) {
      if (orderPending) return;
      setSide(dir);
      setOrderError(null);
      setOrderPending(true);
      try {
        const body = {
          symbol:    selectedSymbol,
          direction: dir === 'BUY' ? 'long' : 'short',
          lots,
        };
        if (useStopLoss  && slPrice)  body.stopLoss   = Number(slPrice);
        if (useTakeProfit && tpPrice) body.takeProfit  = Number(tpPrice);

        const res  = await fetch(`${SERVER}/api/trading/open`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setOrderError(data.error ?? 'Error al abrir posición');
          return;
        }
        setPositionsKey(k => k + 1);
        refreshAccountOnce();
        setTab('positions');
      } catch (_) {
        setOrderError('Error de conexión');
      } finally {
        setOrderPending(false);
      }
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
          <button onClick={() => openTrade('SELL')} disabled={orderPending} style={{
            flex: 1, background: 'rgba(224,85,133,0.10)', border: '1px solid var(--border-pink)',
            borderRadius: 8, padding: '9px 6px', cursor: orderPending ? 'default' : 'pointer',
            textAlign: 'center', opacity: orderPending ? 0.5 : 1,
          }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 11, color: 'var(--pink)', letterSpacing: '0.1em', marginBottom: 4 }}>
              {orderPending ? '…' : 'SELL'}
            </div>
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
          <button onClick={() => openTrade('BUY')} disabled={orderPending} style={{
            flex: 1, background: 'rgba(0,192,135,0.09)', border: '1px solid var(--border-green)',
            borderRadius: 8, padding: '9px 6px', cursor: orderPending ? 'default' : 'pointer',
            textAlign: 'center', opacity: orderPending ? 0.5 : 1,
          }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 11, color: 'var(--green)', letterSpacing: '0.1em', marginBottom: 4 }}>
              {orderPending ? '…' : 'BUY'}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)', opacity: 0.65 }}>{askPfx}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 19, fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>{askBig}</span>
              <sup style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--green)', marginTop: 3 }}>{askSup}</sup>
            </div>
          </button>
        </div>

        {/* Error from backend (insufficient margin, market closed, etc.) */}
        {orderError && (
          <div style={{ flexShrink: 0, padding: '6px 12px', background: 'rgba(224,85,133,0.08)', borderTop: '1px solid var(--border-pink)' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11, color: 'var(--pink)' }}>
              {orderError}
            </span>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB: POSITIONS
  // ─────────────────────────────────────────────────────────────────────────────
  function renderPositions() {
    const livePnl     = acctEquity - acctBalance;
    const pnlColor    = livePnl >= 0 ? 'var(--green)' : 'var(--pink)';
    const equityStr   = acctEquity.toFixed(2);
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
              {livePnl >= 0 ? '+' : ''}${livePnl.toFixed(2)}
            </div>
          </div>
        </div>

        {/* 2×2 data matrix */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 24px', paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
          {[
            { label: tr.balance ?? 'Balance',      value: `$${acctBalance.toFixed(2)}`,   color: 'var(--text-primary)'   },
            { label: tr.margin  ?? 'Margen',        value: `$${acctMargin.toFixed(2)}`,    color: 'var(--text-secondary)' },
            { label: tr.free    ?? 'Margen libre',  value: `$${acctFree.toFixed(2)}`,      color: 'var(--text-secondary)' },
            { label: tr.level   ?? 'Nivel',         value: acctLevel != null ? `${acctLevel.toFixed(0)}%` : '—', color: levelColor },
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
            <TradikoCandleLogo width={40} style={{ opacity: 0.35 }} />
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
        {orderError && (
          <div style={{ padding: '6px 14px', background: 'rgba(224,85,133,0.08)', borderBottom: '1px solid var(--border-pink)', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11, color: 'var(--pink)' }}>{orderError}</span>
          </div>
        )}
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
                  <button onClick={() => handleClosePosition(pos.id)} disabled={orderPending}
                    style={{ marginTop: 5, background: 'rgba(224,85,133,0.08)', border: '0.5px solid var(--border-pink)', borderRadius: 3, color: 'var(--pink)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 9, cursor: orderPending ? 'default' : 'pointer', padding: '2px 7px', letterSpacing: '0.08em', opacity: orderPending ? 0.5 : 1 }}>
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
    const netPnl       = closedPositions.reduce((s, p) => s + p.pnl, 0);
    const finalBalance = acctBalance + netPnl;
    const commission   = 0;

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
                <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <TradikoCandleLogo width={36} style={{ opacity: 0.35 }} />
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 14, color: 'var(--text-muted)' }}>
                    {tr.noHistory ?? 'Sin historial'}
                  </div>
                </div>
              ) : (
                <>
                  {closedPositions.map(pos => {
                    const posPnlColor = pos.pnl >= 0 ? 'var(--green)' : 'var(--pink)';
                    const dirColor    = pos.dir === 'BUY' ? 'var(--green)' : 'var(--pink)';
                    const reasonBadge = {
                      manual:      { label: '×',   bg: 'rgba(120,120,120,0.12)', border: '#555',       color: '#888'          },
                      take_profit: { label: 'TP',  bg: 'rgba(0,192,135,0.12)',  border: 'var(--green)', color: 'var(--green)'  },
                      stop_loss:   { label: 'SL',  bg: 'rgba(245,200,66,0.12)', border: '#f5c842',      color: '#f5c842'       },
                      liquidation: { label: 'LIQ', bg: 'rgba(224,85,85,0.18)',  border: 'var(--pink)',  color: 'var(--pink)'   },
                    }[pos.closeReason] ?? { label: '?', bg: 'transparent', border: '#555', color: '#888' };
                    return (
                      <div key={pos.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', minHeight: 62 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 14, color: 'var(--text-primary)' }}>{pos.symbol}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: dirColor, background: pos.dir === 'BUY' ? 'rgba(0,192,135,0.10)' : 'rgba(224,85,133,0.10)', border: `0.5px solid ${dirColor}`, borderRadius: 2, padding: '1px 5px', letterSpacing: '0.08em' }}>
                              {pos.dir.toLowerCase()}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 800, color: reasonBadge.color, background: reasonBadge.bg, border: `0.5px solid ${reasonBadge.border}`, borderRadius: 2, padding: '1px 5px', letterSpacing: '0.08em' }}>
                              {reasonBadge.label}
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
                          {pos.pnlPct != null && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: posPnlColor, opacity: 0.75, marginTop: 2 }}>
                              {pos.pnlPct >= 0 ? '+' : ''}{pos.pnlPct.toFixed(1)}%
                            </div>
                          )}
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
  // TAB: SOCIAL — Ranking / Duelo / Ligas
  // ─────────────────────────────────────────────────────────────────────────────
  function renderSocial() {
    const subTabs = [
      { id: 'ranking', label: tr.tabRanking ?? 'Ranking', icon: <Trophy size={13} /> },
      { id: 'duel',    label: tr.tabDuelSub ?? 'Duelo',   icon: <Swords size={13} /> },
      { id: 'leagues', label: tr.tabLeagues ?? 'Ligas',   icon: <BarChart3 size={13} /> },
    ];

    const inputStyle = { flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '8px 10px', outline: 'none' };
    const btnPrimary = { padding: '9px 14px', background: 'var(--green)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' };
    const btnGhost   = { padding: '9px 14px', background: 'transparent', color: 'var(--green)', border: '1px solid var(--border-green)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' };

    // ── Ranking ────────────────────────────────────────────────────────────────
    function Ranking() {
      const rows = ranking;
      return (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', padding: '10px 14px', borderBottom: '1px solid var(--border-default)' }}>
            {['global', 'week'].map((p, i) => {
              const active = rankingPeriod === p;
              return (
                <button key={p} onClick={() => setRankingPeriod(p)} style={{ flex: 1, padding: '6px 0', background: active ? 'var(--green)' : 'var(--bg-elevated)', color: active ? '#0d0d0d' : 'var(--text-muted)', border: '1px solid var(--border-default)', borderRadius: i === 0 ? 'var(--radius-sm) 0 0 var(--radius-sm)' : '0 var(--radius-sm) var(--radius-sm) 0', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {p === 'global' ? (tr.rankGlobal ?? 'Global') : (tr.rankWeek ?? 'Semana')}
                </button>
              );
            })}
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
              Sin datos aún
            </div>
          ) : rows.map((trader, idx) => {
            const rank      = idx + 1;
            const isMe      = trader.userId === user?.id;
            const rankColor = rank <= 3 ? 'var(--color-neutral)' : 'var(--text-hint)';
            const pctColor  = trader.returnPct >= 0 ? 'var(--green)' : 'var(--pink)';
            const pctSign   = trader.returnPct >= 0 ? '+' : '';
            return (
              <div key={trader.userId} style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', gap: 10, background: isMe ? 'rgba(0,192,135,0.05)' : 'transparent', borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: rankColor, minWidth: 22, textAlign: 'right', flexShrink: 0 }}>{rank}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 13, color: isMe ? 'var(--green)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {trader.name}{isMe ? ' (tú)' : ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-hint)' }}>
                      {trader.trades} ops · WR {trader.winRate}%
                    </span>
                    {trader.streak > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-neutral)' }}>
                        <Flame size={10} />{trader.streak}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: pctColor, flexShrink: 0 }}>
                  {pctSign}{trader.returnPct.toFixed(1)}%
                </span>
              </div>
            );
          })}
          {rankingPos && (
            <>
              <div style={{ padding: '4px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-hint)' }}>· · ·</div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', gap: 10, background: 'rgba(0,192,135,0.05)', borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--text-hint)', minWidth: 22, textAlign: 'right', flexShrink: 0 }}>{rankingPos.rank}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 13, color: 'var(--green)' }}>{rankingPos.name} (tú)</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-hint)' }}>{rankingPos.trades} ops · WR {rankingPos.winRate}%</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: rankingPos.returnPct >= 0 ? 'var(--green)' : 'var(--pink)', flexShrink: 0 }}>
                  {rankingPos.returnPct >= 0 ? '+' : ''}{rankingPos.returnPct.toFixed(1)}%
                </span>
              </div>
            </>
          )}
        </div>
      );
    }

    // ── Duelo ──────────────────────────────────────────────────────────────────
    function Duelo() {
      const me    = activeDuel ? (String(activeDuel.challenger.id) === user?.id ? activeDuel.challenger : activeDuel.opponent) : null;
      const rival = activeDuel ? (String(activeDuel.challenger.id) === user?.id ? activeDuel.opponent : activeDuel.challenger) : null;
      return (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Pending challenge notifications */}
          {pendingDuels.length > 0 && pendingDuels.map(d => (
            <div key={String(d.id)} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,200,66,0.06)' }}>
              <Swords size={14} style={{ color: 'var(--color-neutral)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 12, color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--color-neutral)' }}>{d.challenger.name}</span> te reta a un duelo
              </span>
              <button onClick={() => handleDuelAccept(String(d.id))} disabled={socialPending} style={{ ...btnPrimary, fontSize: 11, padding: '5px 10px' }}>Aceptar</button>
              <button onClick={() => handleDuelReject(String(d.id))} disabled={socialPending} style={{ ...btnGhost,   fontSize: 11, padding: '5px 10px' }}>Ignorar</button>
            </div>
          ))}

          {activeDuel ? (
            <>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 11, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {tr.duelTimeLeft ?? 'Tiempo restante'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--color-neutral)' }}>
                  {activeDuel.daysLeft}d
                </span>
              </div>
              <div style={{ padding: '24px 14px', display: 'flex', alignItems: 'stretch' }}>
                {[{ side: me, isMe: true }, { side: rival, isMe: false }].map((s, i) => {
                  if (!s.side) return null;
                  const winning = me && rival && me.returnPct > rival.returnPct ? s.isMe : !s.isMe;
                  const pctColor = s.side.returnPct >= 0 ? 'var(--green)' : 'var(--pink)';
                  const sign     = s.side.returnPct >= 0 ? '+' : '';
                  if (i === 1) return (
                    <div key='vs' style={{ display: 'contents' }}>
                      <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, color: 'var(--text-hint)' }}>VS</span>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 12px', background: winning ? 'rgba(0,192,135,0.07)' : 'var(--bg-elevated)', border: winning ? '1px solid var(--border-green)' : '1px solid var(--border-default)', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 13, color: 'var(--text-primary)' }}>{s.side.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: pctColor, lineHeight: 1 }}>{sign}{s.side.returnPct.toFixed(1)}%</span>
                        {winning && <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--pink)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>▲ {tr.duelWinning ?? 'Ganando'}</span>}
                      </div>
                    </div>
                  );
                  return (
                    <div key='me' style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 12px', background: winning ? 'rgba(0,192,135,0.07)' : 'var(--bg-elevated)', border: winning ? '1px solid var(--border-green)' : '1px solid var(--border-default)', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 13, color: 'var(--green)' }}>{s.side.name} (tú)</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: pctColor, lineHeight: 1 }}>{sign}{s.side.returnPct.toFixed(1)}%</span>
                      {winning && <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--green)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>▲ {tr.duelWinning ?? 'Ganando'}</span>}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <Swords size={36} style={{ color: 'var(--text-hint)' }} />
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                {tr.duelNone ?? 'Sin duelo activo'}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)', maxWidth: 260 }}>
                {tr.duelNoneSub ?? 'Reta a un amigo por su username y compite en rentabilidad durante 7 días'}
              </div>
              <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 300 }}>
                <input
                  value={challengeInput}
                  onChange={e => setChallengeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChallenge()}
                  placeholder={tr.duelInputPlaceholder ?? 'username del rival'}
                  style={inputStyle}
                />
                <button onClick={handleChallenge} disabled={socialPending} style={btnPrimary}>
                  {socialPending ? '…' : (tr.duelChallenge ?? 'Retar')}
                </button>
              </div>
              {socialError && <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--pink)' }}>{socialError}</div>}
            </div>
          )}
        </div>
      );
    }

    // ── Ligas ──────────────────────────────────────────────────────────────────
    function Ligas() {
      if (leagueView) {
        const rankers = leagueView.ranking ?? [];
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setLeagueView(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={16} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leagueView.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-hint)' }}>Código: {leagueView.code}</div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {rankers.map((trader, idx) => {
                const rank      = idx + 1;
                const isMe      = trader.isYou;
                const rankColor = rank <= 3 ? 'var(--color-neutral)' : 'var(--text-hint)';
                const pctColor  = trader.returnPct >= 0 ? 'var(--green)' : 'var(--pink)';
                const pctSign   = trader.returnPct >= 0 ? '+' : '';
                return (
                  <div key={String(trader.userId)} style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', gap: 10, background: isMe ? 'rgba(0,192,135,0.05)' : 'transparent', borderBottom: '1px solid var(--border-default)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: rankColor, minWidth: 22, textAlign: 'right', flexShrink: 0 }}>{rank}</span>
                    <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: isMe ? 900 : 700, fontSize: 13, color: isMe ? 'var(--green)' : 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {trader.name}{isMe ? ' (tú)' : ''}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: pctColor, flexShrink: 0 }}>{pctSign}{trader.returnPct.toFixed(1)}%</span>
                  </div>
                );
              })}
              {leagueView.userPosition && (
                <>
                  <div style={{ padding: '4px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-hint)' }}>· · ·</div>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', gap: 10, background: 'rgba(0,192,135,0.05)', borderBottom: '1px solid var(--border-default)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--text-hint)', minWidth: 22, textAlign: 'right', flexShrink: 0 }}>{leagueView.userPosition.rank}</span>
                    <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 13, color: 'var(--green)' }}>{leagueView.userPosition.name} (tú)</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: leagueView.userPosition.returnPct >= 0 ? 'var(--green)' : 'var(--pink)', flexShrink: 0 }}>
                      {leagueView.userPosition.returnPct >= 0 ? '+' : ''}{leagueView.userPosition.returnPct.toFixed(1)}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      }

      return (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* My leagues list */}
          {myLeagues.length > 0 && (
            <div style={{ borderBottom: '1px solid var(--border-default)' }}>
              {myLeagues.map(l => (
                <button key={String(l._id)} onClick={() => handleViewLeague(String(l._id))} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                  <Trophy size={14} style={{ color: 'var(--color-neutral)', flexShrink: 0 }} />
                  <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-hint)' }}>{l.memberCount} miembros · {l.code}</div>
                  </div>
                  <ChevronLeft size={14} style={{ color: 'var(--text-hint)', transform: 'rotate(180deg)', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}

          {/* Create league */}
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border-default)' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 11, color: 'var(--text-hint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              {tr.leagueCreate ?? 'Crear liga'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={leagueNameInput} onChange={e => setLeagueNameInput(e.target.value)} placeholder={tr.leagueNamePlaceholder ?? 'Nombre de la liga'} style={inputStyle} />
              <button onClick={handleCreateLeague} disabled={socialPending} style={btnPrimary}>
                {socialPending ? '…' : (tr.create ?? 'Crear')}
              </button>
            </div>
          </div>

          {/* Join league */}
          <div style={{ padding: '14px 14px 10px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 11, color: 'var(--text-hint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              {tr.leagueJoin ?? 'Unirse con código'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={leagueCodeInput} onChange={e => setLeagueCodeInput(e.target.value.toUpperCase())} placeholder='ABC123' style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
              <button onClick={handleJoinLeague} disabled={socialPending} style={btnGhost}>
                {socialPending ? '…' : (tr.join ?? 'Unirse')}
              </button>
            </div>
          </div>

          {socialError && (
            <div style={{ margin: '0 14px', padding: '8px 12px', background: 'rgba(224,85,85,0.08)', border: '0.5px solid var(--pink)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--pink)' }}>
              {socialError}
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px 6px', borderBottom: '0.5px solid var(--border-subtle)', flexShrink: 0 }}>
          <TradikoCandleLogo width={11} />
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 9, color: 'var(--pink)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Tradiko</span>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 9, color: 'var(--text-hint)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Social</span>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
          {subTabs.map(st => {
            const active = socialTab === st.id;
            return (
              <button key={st.id} onClick={() => setSocialTab(st.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 4px', background: 'transparent', border: 'none', borderBottom: active ? '2px solid var(--green)' : '2px solid transparent', color: active ? 'var(--green)' : 'var(--text-hint)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 11, letterSpacing: '0.04em', cursor: 'pointer', marginBottom: -1 }}>
                {st.icon} {st.label}
              </button>
            );
          })}
        </div>
        {socialTab === 'ranking' && <Ranking />}
        {socialTab === 'duel'    && <Duelo />}
        {socialTab === 'leagues' && <Ligas />}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Account values — from backend (or sensible defaults while loading)
  // ─────────────────────────────────────────────────────────────────────────────
  const acctBalance = account?.balance    ?? 50000;
  const acctEquity  = account?.equity     ?? acctBalance;
  const acctMargin  = account?.marginUsed ?? 0;
  const acctFree    = account?.freeMargin ?? acctEquity;
  const acctLevel   = account?.marginLevel;
  const levelColor  = !acctLevel         ? 'var(--text-secondary)'
                    : acctLevel > 200    ? 'var(--green)'
                    : acctLevel > 100    ? 'var(--color-neutral)'
                    : 'var(--color-down)';

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
      <style>{`
        @keyframes qt-flash { 0%,100%{opacity:1} 25%{opacity:0.1} }
        @keyframes tm-splash-in { 0%{opacity:0;transform:scale(0.88)} 60%{opacity:1;transform:scale(1.04)} 100%{opacity:1;transform:scale(1)} }
        @keyframes tm-splash-out { 0%{opacity:1} 100%{opacity:0} }
      `}</style>

      {/* ── Account Header ─────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '0.5px solid var(--border-default)', padding: '10px 14px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 12, letterSpacing: '0.06em' }}>
            <ChevronLeft size={16} /> {tr.back ?? 'Back'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TradikoCandleLogo width={14} />
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 13, color: 'var(--text-primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {tr.title ?? 'Trading Mode'}
            </span>
          </div>
          <button onClick={() => setShowTutorial(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-hint)', cursor: 'pointer', padding: 4 }}>
            <Info size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 4 }}>
          {[
            { label: tr.balance ?? 'Balance', value: `$${acctBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: 'var(--text-primary)' },
            { label: tr.equity  ?? 'Equity',  value: `$${acctEquity.toFixed(2)}`,  color: acctEquity >= acctBalance ? 'var(--green)' : 'var(--color-down)' },
            { label: tr.margin  ?? 'Margin',  value: `$${acctMargin.toFixed(2)}`,  color: 'var(--text-secondary)' },
            { label: tr.free    ?? 'Free',    value: `$${acctFree.toFixed(2)}`,    color: 'var(--text-secondary)' },
            { label: tr.level   ?? 'Level',   value: acctLevel != null ? `${acctLevel.toFixed(0)}%` : '—', color: levelColor },
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
        {splash ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, animation: 'tm-splash-out 0.3s ease 0.45s both' }}>
            <TradikoCandleLogo width={52} style={{ animation: 'tm-splash-in 0.5s ease-out forwards' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-hint)', animation: 'tm-splash-in 0.5s ease-out 0.1s both' }}>
              Trading Mode
            </span>
          </div>
        ) : (
          <>
            {tab === 'symbols'   && renderSymbols()}
            {tab === 'chart'     && renderChart()}
            {tab === 'positions' && renderPositions()}
            {tab === 'ticket'    && renderHistorial()}
            {tab === 'social'    && renderSocial()}
          </>
        )}
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
