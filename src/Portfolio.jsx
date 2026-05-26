import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import Chart from './Chart.jsx';
import { ASSET_INFO } from './assetInfo.js';

import { SERVER } from './config.js';
import UserAvatar from './UserAvatar.jsx';
import { incrementMission, recordModePlayed, incrementWeeklyMission, recordWeeklyModePlayed } from './missions.js';
import MissionNotification from './MissionNotification.jsx';
import { unlockBadge, BADGES } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import FounderBadge, { isFounder } from './FounderBadge.jsx';
import PortfolioTutorial from './PortfolioTutorial.jsx';
import Leagues from './Leagues.jsx';

const TYPE_COLORS = {
  stock:     '#378ADD',
  crypto:    '#f5c842',
  index:     '#22d3a5',
  commodity: '#f05454',
};

const TYPE_EMOJIS = {
  stock:     '📈',
  crypto:    '₿',
  index:     '📊',
  commodity: '🪙',
};

const RISK_DOT = {
  crypto:    { color: '#f05454', label: '●' },
  stock:     { color: '#f5c842', label: '●' },
  index:     { color: '#22d3a5', label: '●' },
  commodity: { color: '#f5c842', label: '●' },
};

function formatPrice(price, type) {
  if (!price) return '—';
  if (type === 'crypto' && price > 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatChange(change) {
  if (change == null) return '—';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

function formatCash(amount) {
  return `$${(amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isMarketOpen() {
  const now  = new Date();
  const day  = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  const time = now.getUTCHours() * 60 + now.getUTCMinutes();
  return time >= 13 * 60 + 30 && time < 20 * 60;
}

function getMarketStatus(type, t) {
  if (type === 'crypto') return { open: true, label: t.portfolio.market247 };
  if (type === 'commodity') {
    const day = new Date().getUTCDay();
    if (day === 0 || day === 6) return { open: false, label: t.portfolio.marketClosed };
    return { open: true, label: t.portfolio.marketOpen };
  }
  const open = isMarketOpen();
  return { open, label: open ? t.portfolio.marketOpen : t.portfolio.marketClosed };
}

function getWeekStart() {
  const now  = new Date();
  const day  = now.getUTCDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  const mon  = new Date(now);
  mon.setUTCDate(now.getUTCDate() + diff);
  return `${mon.getUTCDate().toString().padStart(2, '0')}/${(mon.getUTCMonth() + 1).toString().padStart(2, '0')}`;
}

export default function Portfolio({ onBack, onViewProfile, onOpenLeague }) {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [screen, setScreen]                 = useState('loading');
  const [prices, setPrices]                 = useState([]);
  const [portfolio, setPortfolio]           = useState(null);
  const [selected, setSelected]             = useState(null);
  const [action, setAction]                 = useState('buy');
  const [qty, setQty]                       = useState('');
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [filter, setFilter]                 = useState('all');
  const [tab, setTab]                       = useState('market');
  const [tradeMsg, setTradeMsg]             = useState('');
  const [factMsg, setFactMsg]               = useState('');
  const [missionToast, setMissionToast]     = useState([]);
  const pushMission = data => setMissionToast(q => [...q, data]);
  const [newBadge, setNewBadge]             = useState(null);
  const [hoveredSymbol, setHoveredSymbol]   = useState(null);
  const [assetCandles, setAssetCandles]     = useState(null);
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [leaderboard, setLeaderboard]       = useState([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState([]);
  const [userPositionGlobal, setUserPositionGlobal] = useState(null);
  const [userPositionWeekly, setUserPositionWeekly] = useState(null);
  const [weeklyWeekId, setWeeklyWeekId]     = useState('');
  const [lbTab, setLbTab]                   = useState('global');
  const [activeDuel, setActiveDuel]         = useState(null);
  const [pendingDuels, setPendingDuels]     = useState([]);
  const [duelFriends, setDuelFriends]       = useState([]);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [duelLoading, setDuelLoading]       = useState(false);
  const [duelMsg, setDuelMsg]               = useState('');
  const [showWelcome, setShowWelcome]       = useState(false);
  const [inputMode, setInputMode]           = useState(() => localStorage.getItem('tradara_portfolio_input_mode') || 'units');
  const chartRef = useRef(null);

  const token = localStorage.getItem('tradara_token');

  function dismissWelcome() {
    localStorage.setItem('tradara_portfolio_welcomed', 'true');
    setShowWelcome(false);
    const tok = localStorage.getItem('tradara_token');
    if (tok) {
      fetch(`${SERVER}/portfolio/tutorial-seen`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
      }).catch(() => {});
    }
  }

  function tryUnlockPortfolioBadge(id) {
    const unlocked = unlockBadge(id);
    if (unlocked) {
      const badge = BADGES.find(b => b.id === id);
      if (badge) setNewBadge(badge);
    }
  }

  const loadAll = useCallback(async () => {
    const tok = localStorage.getItem('tradara_token');
    try {
      const [pricesRes, portfolioRes] = await Promise.all([
        fetch(`${SERVER}/portfolio/prices`),
        fetch(`${SERVER}/portfolio`, { headers: { Authorization: `Bearer ${tok}` } }),
      ]);
      const pricesData    = await pricesRes.json();
      const portfolioData = await portfolioRes.json();
      setPrices(pricesData);
      setPortfolio(portfolioData);
      if (!portfolioData.tutorialSeen && !localStorage.getItem('tradara_portfolio_welcomed')) {
        setShowWelcome(true);
        return;
      }
      setScreen('main');

      const tv = portfolioData.cash + (portfolioData.positions || []).reduce((s, pos) => {
        const p = pricesData.find(p => p.symbol === pos.symbol);
        return s + (p?.price || pos.avgPrice) * pos.qty;
      }, 0);

      fetch(`${SERVER}/portfolio/snapshot`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalValue: tv }),
      }).catch(() => {});

      fetch(`${SERVER}/portfolio/weekly/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: tv }),
      }).catch(() => {});

      fetch(`${SERVER}/portfolio/history`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => r.json()).then(data => {
        if (Array.isArray(data)) setPortfolioHistory(data);
      }).catch(() => {});

      const uid = user?._id || user?.id || '';
      fetch(`${SERVER}/portfolio/leaderboard${uid ? `?userId=${uid}` : ''}`)
        .then(r => r.json())
        .then(data => {
          if (data.leaderboard) {
            setLeaderboard(data.leaderboard);
            setUserPositionGlobal(data.userPosition || null);
          }
        })
        .catch(() => {});

      fetch(`${SERVER}/portfolio/weekly/leaderboard${uid ? `?userId=${uid}` : ''}`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => r.json()).then(data => {
        if (data.leaderboard) {
          setWeeklyLeaderboard(data.leaderboard);
          setWeeklyWeekId(data.weekId || '');
          setUserPositionWeekly(data.userPosition || null);
        }
      }).catch(() => {});

      fetch(`${SERVER}/portfolio/duel/active`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => r.json()).then(data => {
        setActiveDuel(data.id ? data : null);
      }).catch(() => {});

      fetch(`${SERVER}/portfolio/duel/pending`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => r.json()).then(data => {
        if (Array.isArray(data)) setPendingDuels(data);
      }).catch(() => {});

    } catch {
      setScreen('error');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDuelFriends() {
    try {
      const res  = await fetch(`${SERVER}/friends/list`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setDuelFriends(data);
    } catch {}
  }

  async function challengeFriendDuel(friendUsername) {
    setDuelLoading(true);
    setDuelMsg('');
    try {
      const res  = await fetch(`${SERVER}/portfolio/duel/challenge`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: friendUsername }),
      });
      const data = await res.json();
      if (data.ok) {
        setDuelMsg(t.portfolio.duelSent);
        setShowFriendPicker(false);
      } else {
        setDuelMsg(data.error || t.portfolio.duelError);
      }
    } catch {
      setDuelMsg('Error de conexión');
    }
    setDuelLoading(false);
    setTimeout(() => setDuelMsg(''), 3000);
  }

  async function acceptDuel(duelId) {
    setDuelLoading(true);
    try {
      await fetch(`${SERVER}/portfolio/duel/accept/${duelId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      await loadAll();
    } catch {}
    setDuelLoading(false);
  }

  async function rejectDuel(duelId) {
    setDuelLoading(true);
    try {
      await fetch(`${SERVER}/portfolio/duel/reject/${duelId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      setPendingDuels(prev => prev.filter(d => d.id !== duelId));
    } catch {}
    setDuelLoading(false);
  }

  useEffect(() => {
    if (!user) { setScreen('login'); return; }
    loadAll();
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, [user, loadAll]);

  useEffect(() => {
    if (!portfolio || !prices.length) return;
    const tv = (portfolio.cash || 0) + (portfolio.positions || []).reduce((s, pos) => {
      const p = prices.find(p => p.symbol === pos.symbol);
      return s + (p?.price || pos.avgPrice) * pos.qty;
    }, 0);
    if (tv >= 55000)  tryUnlockPortfolioBadge('portfolio_profit');
    if (tv >= 100000) tryUnlockPortfolioBadge('portfolio_10x');
    if (tv <= 40000)  tryUnlockPortfolioBadge('portfolio_loss');
    if (tv <= 0)      tryUnlockPortfolioBadge('secret_broke');
    if ((portfolio.positions || []).length >= 5) tryUnlockPortfolioBadge('portfolio_diverse');
  }, [portfolio, prices]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCandles(symbol) {
    setLoadingCandles(true);
    setAssetCandles(null);
    try {
      const res  = await fetch(`${SERVER}/portfolio/candles/${symbol}`);
      const data = await res.json();
      if (!data.error) setAssetCandles(data);
    } catch {}
    setLoadingCandles(false);
  }

  function openAsset(asset) {
    setSelected(asset);
    setQty('');
    setError('');
    setAction('buy');
    loadCandles(asset.symbol);
  }

  async function handleTrade() {
    if (!selected || !qty || parseFloat(qty) <= 0) return;
    setLoading(true);
    setError('');
    try {
      const finalQty = inputMode === 'amount'
        ? Math.round((parseFloat(qty) / (selectedPrice?.price || 1)) * 10000) / 10000
        : parseFloat(qty);
      const res  = await fetch(`${SERVER}/portfolio/${action}`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symbol: selected.symbol, qty: finalQty }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); setLoading(false); return; }
      setTradeMsg(action === 'buy' ? '✓ ' + t.portfolio.purchase : '✓ ' + t.portfolio.sale);
      setTimeout(() => setTradeMsg(''), 2000);
      const trades = parseInt(localStorage.getItem('tradara_portfolio_trades') || '0') + 1;
      localStorage.setItem('tradara_portfolio_trades', String(trades));
      if (trades >= 50) tryUnlockPortfolioBadge('portfolio_trader');
      const mKey = action === 'buy' ? 'portfolio_buy' : 'portfolio_sell';
      const mr = incrementMission(mKey);
      if (mr.completed) pushMission({ xpEarned: mr.xpEarned, title: mr.mission.title });
      const tvNow = (data.cash || 0) + (portfolio?.positions || []).reduce((s, pos) => {
        const p = prices.find(p => p.symbol === pos.symbol);
        return s + (p?.price || pos.avgPrice) * pos.qty;
      }, 0);
      if (tvNow > 50000) {
        const ppr = incrementMission('portfolio_profit');
        if (ppr.completed) pushMission({ xpEarned: ppr.xpEarned, title: ppr.mission.title });
      }
      const wpr = incrementWeeklyMission('weekly_portfolio');
      if (wpr.completed) pushMission({ xpEarned: wpr.xpEarned, title: wpr.mission.title });
      const modeR = recordModePlayed('portfolio');
      if (modeR.completed) pushMission({ xpEarned: modeR.xpEarned, title: modeR.mission.title });
      recordWeeklyModePlayed('portfolio');
      if (action === 'buy') {
        const info = ASSET_INFO[selected.symbol];
        if (info?.fact) {
          const factLang = t.portfolio.buy === 'Buy' ? 'en' : t.portfolio.buy === 'Comprar' ? 'es' : 'de';
          setFactMsg(info.fact[factLang] || info.fact.en);
          setTimeout(() => setFactMsg(''), 3500);
        }
      }
      setQty('');
      await loadAll();
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  }

  // ── Tutorial (first visit) ───────────────────────────────────────
  if (showWelcome) return (
    <div id="gtm-root" style={{ position: 'relative', minHeight: '100dvh', background: 'var(--bg-page)' }}>
      <div className="scanlines" />
      <PortfolioTutorial onDone={dismissWelcome} />
    </div>
  );

  // ── Login ────────────────────────────────────────────────────────
  if (screen === 'login') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 28px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '16px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>{t.game.menu}</button>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: 'var(--t1)', marginBottom: '8px' }}>{t.portfolio.title}</div>
        <div style={{ fontSize: '11px', color: 'var(--t5)', marginBottom: '32px' }}>{t.portfolio.signIn}</div>
        <a href={`${SERVER}/auth/google`} style={{ display: 'inline-block', padding: '12px 24px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', textDecoration: 'none', fontWeight: 700 }}>
          {t.portfolio.signInGoogle}
        </a>
      </div>
    </div>
  );

  if (screen === 'loading') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 28px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: '11px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace" }}>{t.portfolio.loading}</div>
      </div>
    </div>
  );

  if (screen === 'error') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 28px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '16px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>{t.game.menu}</button>
        <div style={{ fontSize: '11px', color: '#f05454', fontFamily: "'Space Mono', monospace" }}>{t.portfolio.errorLoading}</div>
      </div>
    </div>
  );

  // ── Calcular valor total ──────────────────────────────────────────
  const positionsWithValue = (portfolio?.positions || []).map(pos => {
    const priceData    = prices.find(p => p.symbol === pos.symbol);
    const currentPrice = priceData?.price || pos.avgPrice;
    const value        = currentPrice * pos.qty;
    const cost         = pos.avgPrice * pos.qty;
    const pnl          = value - cost;
    const pnlPct       = (pnl / cost) * 100;
    return { ...pos, currentPrice, value, cost, pnl, pnlPct, priceData };
  });

  const totalInvested = positionsWithValue.reduce((s, p) => s + p.cost, 0);
  // P&L no realizado (posiciones abiertas)
 const unrealizedPnl = positionsWithValue.reduce((s, p) => s + p.pnl, 0);

 // P&L realizado (ventas cerradas)
 const realizedPnl = (portfolio?.transactions || [])
  .filter(tx => tx.action === 'sell')
  .reduce((s, tx) => {
    const avgCost = tx.avgPrice ?? tx.price;
    return s + (tx.price - avgCost) * tx.qty;
  }, 0);

 const totalPnl = unrealizedPnl + realizedPnl;
  const totalValue    = (portfolio?.cash || 0) + positionsWithValue.reduce((s, p) => s + p.value, 0);

  const filterMap = {
    all:         null,
    stocks:      'stock',
    indices:     'index',
    crypto:      'crypto',
    commodities: 'commodity',
  };

  const filteredPrices = filter === 'all' ? prices : prices.filter(p => p.type === filterMap[filter]);
  const selectedPrice  = selected ? prices.find(p => p.symbol === selected.symbol) : null;
  const selectedPos    = selected ? positionsWithValue.find(p => p.symbol === selected.symbol) : null;
  const tradeTotal     = selectedPrice && qty
    ? (inputMode === 'amount' ? parseFloat(qty) : selectedPrice.price * parseFloat(qty))
    : 0;

  const stableAsset = selected ? {
    name:         selected.symbol,
    tf:           '1d',
    vol:          0.02,
    cat:          selected.type,
    binance:      null,
    yahoo:        null,
    alphavantage: null,
    base:         () => selectedPrice?.price || 100,
  } : null;

  // ── Asset screen ─────────────────────────────────────────────────
  if (selected) {
    const marketStatus = getMarketStatus(selected.type, t);
    const info         = ASSET_INFO[selected.symbol];
    const lang         = t.portfolio.buy === 'Buy' ? 'en' : t.portfolio.buy === 'Comprar' ? 'es' : 'de';

    return (
      <div id="gtm-root" style={{ position: 'relative', animation: 'none' }}>
        <div className="scanlines" />

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 2 }}>
          <button onClick={() => { setSelected(null); setAssetCandles(null); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}
            onMouseEnter={e => e.target.style.color = 'var(--t2)'}
            onMouseLeave={e => e.target.style.color = 'var(--t6)'}
          >{t.portfolio.back}</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t1)' }}>{selected.name}</div>
            <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {selected.symbol} · {t.portfolio.types[selected.type]}
              <span style={{ fontSize: '8px', color: marketStatus.open ? '#22d3a5' : '#f05454', background: marketStatus.open ? 'rgba(34,211,165,0.1)' : 'rgba(240,84,84,0.1)', padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                {marketStatus.label}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--t1)' }}>{formatPrice(selectedPrice?.price, selected.type)}</div>
            <div style={{ fontSize: '11px', color: selectedPrice?.change >= 0 ? '#22d3a5' : '#f05454', fontWeight: 700 }}>{formatChange(selectedPrice?.change)}</div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ position: 'relative', zIndex: 2, height: '220px', overflow: 'hidden' }}>
          {loadingCandles ? (
            <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace" }}>
              {t.portfolio.loadingChart}
            </div>
          ) : assetCandles && stableAsset ? (
            <Chart ref={chartRef} asset={stableAsset} externalCandles={assetCandles} />
          ) : (
            <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace" }}>
              {t.portfolio.noChartData}
            </div>
          )}
        </div>

        {/* Info del activo */}
        {info && (
          <div style={{ margin: '12px 20px 0', padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '9px', color: '#378ADD', background: 'rgba(55,138,221,0.1)', padding: '3px 10px', borderRadius: '4px', letterSpacing: '0.04em' }}>📊 {info.sector}</span>
              <span style={{ fontSize: '9px', color: 'var(--t5)', background: 'var(--bg-page)', padding: '3px 10px', borderRadius: '4px', letterSpacing: '0.04em' }}>🌍 {info.country}</span>
              <span style={{ fontSize: '9px', color: '#f5c842', background: 'rgba(245,200,66,0.08)', padding: '3px 10px', borderRadius: '4px', letterSpacing: '0.04em' }}>💰 {info.cap}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t4)', lineHeight: 1.7 }}>{info[lang]}</div>
          </div>
        )}

        {/* Posición actual */}
        {selectedPos && (
          <div style={{ margin: '12px 20px 0', padding: '16px', background: 'var(--bg-card)', border: `1px solid ${selectedPos.pnl >= 0 ? 'rgba(34,211,165,0.3)' : 'rgba(240,84,84,0.3)'}`, borderRadius: '10px', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>{t.portfolio.yourPosition}</div>
                <div style={{ fontSize: '16px', color: 'var(--t1)', fontFamily: "'Syne', sans-serif", fontWeight: 800 }}>{parseFloat(selectedPos.qty.toFixed(4))} {t.portfolio.units}</div>
                <div style={{ fontSize: '10px', color: 'var(--t5)', marginTop: '4px' }}>{t.portfolio.avgPrice} {formatPrice(selectedPos.avgPrice, selected.type)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontFamily: "'Syne', sans-serif", fontWeight: 800, color: 'var(--t1)' }}>{formatCash(selectedPos.value)}</div>
                <div style={{ fontSize: '13px', color: selectedPos.pnl >= 0 ? '#22d3a5' : '#f05454', fontWeight: 700, marginTop: '4px' }}>
                  {selectedPos.pnl >= 0 ? '+' : ''}{formatCash(selectedPos.pnl)} ({formatChange(selectedPos.pnlPct)})
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Panel compra/venta */}
        <div style={{ margin: '12px 20px 20px', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', position: 'relative', zIndex: 20 }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            <button onClick={() => setAction('buy')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${action === 'buy' ? '#22d3a5' : 'var(--bd2)'}`, background: action === 'buy' ? 'rgba(34,211,165,0.08)' : 'transparent', color: action === 'buy' ? '#22d3a5' : 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>{t.portfolio.buy}</button>
            <button onClick={() => setAction('sell')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${action === 'sell' ? '#f05454' : 'var(--bd2)'}`, background: action === 'sell' ? 'rgba(240,84,84,0.08)' : 'transparent', color: action === 'sell' ? '#f05454' : 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>{t.portfolio.sell}</button>
          </div>

          {/* Input mode toggle */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
            {[
              { id: 'units',  label: t.portfolio.inputUnits  || 'Units' },
              { id: 'amount', label: t.portfolio.inputAmount || '$ Amount' },
            ].map(m => (
              <button key={m.id} onClick={() => {
                setInputMode(m.id);
                localStorage.setItem('tradara_portfolio_input_mode', m.id);
                setQty('');
              }} style={{ flex: 1, padding: '6px 8px', borderRadius: '5px', border: `1px solid ${inputMode === m.id ? '#378ADD' : 'var(--bd)'}`, background: inputMode === m.id ? 'rgba(55,138,221,0.08)' : 'transparent', color: inputMode === m.id ? '#378ADD' : 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: inputMode === 'amount' && qty && parseFloat(qty) > 0 ? '4px' : '10px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              {inputMode === 'amount' && (
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', fontFamily: "'Space Mono', monospace", fontSize: '12px', pointerEvents: 'none' }}>$</span>
              )}
              <input
                type="number" value={qty} onChange={e => {
                  if (inputMode === 'units') {
                    const parts = e.target.value.split('.');
                    if (parts.length > 1 && parts[1].length > 4) return;
                  }
                  setQty(e.target.value);
                }}
                placeholder="0.00" min="0" step={inputMode === 'units' ? '0.0001' : '0.01'}
                style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: inputMode === 'amount' ? '10px 12px 10px 24px' : '10px 12px', color: 'var(--t2)', fontFamily: "'Space Mono', monospace", fontSize: '12px', outline: 'none', position: 'relative', zIndex: 100, touchAction: 'auto', pointerEvents: 'all', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={() => {
              if (action === 'buy' && selectedPrice?.price) {
                if (inputMode === 'amount') {
                  setQty((Math.floor(portfolio.cash * 100) / 100).toString());
                } else {
                  setQty((Math.floor((portfolio.cash / selectedPrice.price) * 100) / 100).toString());
                }
              } else if (action === 'sell' && selectedPos) {
                if (inputMode === 'amount') {
                  setQty((Math.floor(selectedPos.qty * selectedPrice.price * 100) / 100).toString());
                } else {
                  setQty(selectedPos.qty.toString());
                }
              }
            }} style={{ padding: '10px 14px', background: 'var(--bg-page)', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t.portfolio.max}
            </button>
          </div>

          {inputMode === 'amount' && qty && parseFloat(qty) > 0 && selectedPrice?.price && (
            <div style={{ fontSize: '9px', color: 'var(--t5)', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>
              ≈ {(parseFloat(qty) / selectedPrice.price).toFixed(4)} {t.portfolio.inputUnits || 'units'}
            </div>
          )}

          {qty && parseFloat(qty) > 0 && (
            <div style={{ fontSize: '10px', color: 'var(--t4)', marginBottom: '10px' }}>
              {t.portfolio.total}: <span style={{ color: 'var(--t1)', fontWeight: 700 }}>{formatCash(tradeTotal)}</span>
              {action === 'buy' && <span style={{ color: 'var(--t5)', marginLeft: '8px' }}>{t.portfolio.cashLeft}: {formatCash((portfolio?.cash || 0) - tradeTotal)}</span>}
            </div>
          )}

          <div style={{ fontSize: '10px', color: 'var(--t5)', marginBottom: '10px' }}>
            {t.portfolio.cashAvailable}: <span style={{ color: 'var(--t1)' }}>{formatCash(portfolio?.cash || 0)}</span>
          </div>

          {error    && <div style={{ fontSize: '10px', color: '#f05454', marginBottom: '10px' }}>{error}</div>}
          {tradeMsg && <div style={{ fontSize: '10px', color: '#22d3a5', marginBottom: '10px' }}>{tradeMsg}</div>}
          {factMsg  && <div style={{ fontSize: '9px', color: 'var(--t4)', marginBottom: '10px', padding: '6px 10px', background: 'rgba(55,138,221,0.05)', border: '1px solid rgba(55,138,221,0.12)', borderRadius: '6px', letterSpacing: '0.02em' }}>💡 {factMsg}</div>}

          <button onClick={handleTrade} disabled={loading || !qty || parseFloat(qty) <= 0}
            style={{ width: '100%', padding: '14px', background: loading ? 'var(--bg-card)' : action === 'buy' ? 'rgba(34,211,165,0.08)' : 'rgba(240,84,84,0.08)', border: `1px solid ${action === 'buy' ? '#22d3a5' : '#f05454'}`, borderRadius: '6px', color: action === 'buy' ? '#22d3a5' : '#f05454', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || !qty || parseFloat(qty) <= 0 ? 0.4 : 1 }}>
            {loading ? '...' : `${action === 'buy' ? t.portfolio.buy : t.portfolio.sell} ${selected.name}`}
          </button>
        </div>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────
  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />

      <div className="header" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', alignItems: 'center', padding: '12px 20px 10px' }}>
        <button onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0, textAlign: 'left', transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color = 'var(--t2)'}
          onMouseLeave={e => e.target.style.color = 'var(--t6)'}
        >{t.game.menu}</button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#22d3a5', letterSpacing: '0.08em', lineHeight: 1, textShadow: '0 0 10px rgba(34,211,165,0.2)' }}>
            💼 {t.portfolio.title}
          </div>
          <div style={{ fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '3px', fontFamily: "'Space Mono', monospace" }}>
            PORTFOLIO MODE
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontSize: '8px', color: 'var(--t5)', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace" }}>TOTAL</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: '#22d3a5', textShadow: '0 0 14px rgba(34,211,165,0.35)' }}>{formatCash(totalValue)}</span>
        </div>
      </div>

      {/* Summary */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bd)', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '8px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>{t.portfolio.cash}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--t1)' }}>{formatCash(portfolio?.cash || 0)}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '8px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>{t.portfolio.invested}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--t1)' }}>{formatCash(totalInvested)}</div>
          </div>
        </div>
        {(() => {
          const pnl    = totalValue - 50000;
          const pnlPct = (pnl / 50000) * 100;
          const color  = pnl >= 0 ? '#22d3a5' : '#f05454';
          return (
            <div style={{ background: 'var(--bg-card)', border: `1px solid ${pnl >= 0 ? 'rgba(34,211,165,0.3)' : 'rgba(240,84,84,0.3)'}`, borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '8px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>P&L total</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '15px', color }}>{pnl >= 0 ? '+' : ''}{formatCash(pnl)}</div>
                <div style={{ fontSize: '8px', color, fontFamily: "'Space Mono', monospace", marginTop: '1px' }}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Gráfico histórico */}
      {portfolioHistory.length > 1 && (
        <div style={{ padding: '16px 20px 0', position: 'relative', zIndex: 2 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t.portfolio.totalValue}</div>
              <div style={{ fontSize: '9px', color: portfolioHistory[portfolioHistory.length - 1].totalValue >= 50000 ? '#22d3a5' : '#f05454', fontWeight: 700 }}>
                {portfolioHistory[portfolioHistory.length - 1].totalValue >= 50000 ? '+' : ''}
                {((portfolioHistory[portfolioHistory.length - 1].totalValue - 50000) / 50000 * 100).toFixed(2)}% {t.portfolio.vsInitial}
              </div>
            </div>
            <svg width="100%" height="80" viewBox={`0 0 ${portfolioHistory.length * 20} 80`} preserveAspectRatio="none">
              {(() => {
                const values     = portfolioHistory.map(h => h.totalValue);
                const min        = Math.min(...values) * 0.998;
                const max        = Math.max(...values) * 1.002;
                const range      = max - min || 1;
                const w          = portfolioHistory.length * 20;
                const points     = values.map((v, i) => `${i * 20},${80 - ((v - min) / range) * 72}`).join(' ');
                const isUp       = values[values.length - 1] >= values[0];
                const color      = isUp ? '#22d3a5' : '#f05454';
                const fillPoints = `0,80 ${points} ${w},80`;
                return (
                  <>
                    <polygon points={fillPoints} fill={isUp ? 'rgba(34,211,165,0.08)' : 'rgba(240,84,84,0.08)'} />
                    <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                );
              })()}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <div style={{ fontSize: '8px', color: 'var(--t6)' }}>{portfolioHistory[0]?.date}</div>
              <div style={{ fontSize: '8px', color: 'var(--t6)' }}>{portfolioHistory[portfolioHistory.length - 1]?.date}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)', position: 'relative', zIndex: 2, marginTop: '16px' }}>
        {[
          ['market',      t.portfolio.market],
          ['portfolio',   t.portfolio.positions],
          ['leaderboard', t.portfolio.ranking],
          ['duel',        t.portfolio.duelTab],
          ['history',     t.portfolio.history],
          ['leagues',     t.portfolio.leagues],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: '12px 4px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === id ? '#22d3a5' : 'transparent'}`, color: tab === id ? '#22d3a5' : 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Mercado ── */}
      {tab === 'market' && (
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', gap: '6px', padding: '12px 20px', overflowX: 'auto' }}>
            {[
              ['all',         t.portfolio.all],
              ['stocks',      t.portfolio.stocks],
              ['indices',     t.portfolio.indices],
              ['crypto',      t.portfolio.crypto],
              ['commodities', t.portfolio.commodities],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)}
                style={{ padding: '5px 12px', borderRadius: '20px', whiteSpace: 'nowrap', border: `1px solid ${filter === id ? '#22d3a5' : 'var(--bd2)'}`, background: filter === id ? 'rgba(34,211,165,0.08)' : 'transparent', color: filter === id ? '#22d3a5' : 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '0 20px 40px' }}>
            {filteredPrices.map(asset => {
              const status    = getMarketStatus(asset.type, t);
              const info      = ASSET_INFO[asset.symbol];
              const riskDot   = RISK_DOT[asset.type];
              const infoLang  = t.portfolio.buy === 'Buy' ? 'en' : t.portfolio.buy === 'Comprar' ? 'es' : 'de';
              const tooltip   = info?.[infoLang]?.split('.')[0];
              const isHovered = hoveredSymbol === asset.symbol;
              return (
                <div key={asset.symbol} style={{ position: 'relative', marginBottom: '6px' }}>
                  <div onClick={() => openAsset(asset)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = TYPE_COLORS[asset.type]; setHoveredSymbol(asset.symbol); }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; setHoveredSymbol(null); }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${TYPE_COLORS[asset.type]}15`, border: `1px solid ${TYPE_COLORS[asset.type]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                      {TYPE_EMOJIS[asset.type]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--t1)' }}>{asset.name}</div>
                      <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {asset.symbol} · {t.portfolio.types[asset.type]}
                        <span style={{ fontSize: '8px', color: status.open ? '#22d3a5' : '#f05454', background: status.open ? 'rgba(34,211,165,0.1)' : 'rgba(240,84,84,0.1)', padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                          {status.label}
                        </span>
                        {riskDot && <span style={{ fontSize: '8px', color: riskDot.color, lineHeight: 1 }} title="Risk">{riskDot.label}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--t1)' }}>{formatPrice(asset.price, asset.type)}</div>
                      <div style={{ fontSize: '10px', color: asset.change >= 0 ? '#22d3a5' : '#f05454', fontWeight: 700 }}>{formatChange(asset.change)}</div>
                    </div>
                  </div>
                  {isHovered && tooltip && (
                    <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '7px 12px', fontSize: '9px', color: 'var(--t3)', lineHeight: 1.5, zIndex: 50, pointerEvents: 'none' }}>
                      {tooltip}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Posiciones ── */}
      {tab === 'portfolio' && (
        <div style={{ padding: '16px 20px 40px', position: 'relative', zIndex: 2 }}>
          {positionsWithValue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
              <div style={{ fontSize: '11px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace" }}>{t.portfolio.noPositions}</div>
              <button onClick={() => setTab('market')} style={{ marginTop: '16px', padding: '10px 20px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                {t.portfolio.goToMarket}
              </button>
            </div>
          ) : (
            positionsWithValue.map(pos => (
              <div key={pos.symbol} onClick={() => openAsset(prices.find(p => p.symbol === pos.symbol))}
                style={{ background: 'var(--bg-card)', border: `1px solid ${pos.pnl >= 0 ? 'rgba(34,211,165,0.3)' : 'rgba(240,84,84,0.3)'}`, borderRadius: '8px', padding: '14px', marginBottom: '8px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--t1)' }}>{pos.name}</div>
                    <div style={{ fontSize: '9px', color: 'var(--t5)' }}>{parseFloat(pos.qty.toFixed(4))} {t.portfolio.units} · {t.portfolio.avgPrice} {formatPrice(pos.avgPrice, pos.type)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: 'var(--t1)' }}>{formatCash(pos.value)}</div>
                    <div style={{ fontSize: '10px', color: pos.pnl >= 0 ? '#22d3a5' : '#f05454', fontWeight: 700 }}>
                      {pos.pnl >= 0 ? '+' : ''}{formatCash(pos.pnl)} ({formatChange(pos.pnlPct)})
                    </div>
                  </div>
                </div>
                <div style={{ height: '3px', background: 'var(--bd)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Math.abs(pos.pnlPct) * 5)}%`, background: pos.pnl >= 0 ? '#22d3a5' : '#f05454', borderRadius: '2px' }} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Leaderboard ── */}
      {tab === 'leaderboard' && (
        <div style={{ padding: '16px 20px 40px', position: 'relative', zIndex: 2 }}>
          {/* Global / Semanal subtabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
            {[['global', t.portfolio.global], ['weekly', t.portfolio.weekly]].map(([id, label]) => (
              <button key={id} onClick={() => setLbTab(id)}
                style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${lbTab === id ? '#22d3a5' : 'var(--bd2)'}`, background: lbTab === id ? 'rgba(34,211,165,0.08)' : 'transparent', color: lbTab === id ? '#22d3a5' : 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          {lbTab === 'weekly' && weeklyWeekId && (
            <div style={{ fontSize: '9px', color: 'var(--t5)', letterSpacing: '0.06em', marginBottom: '10px', textAlign: 'center' }}>
              {t.portfolio.weekOf} {getWeekStart()}
            </div>
          )}

          {lbTab === 'global' ? (
            leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
                <div style={{ fontSize: '11px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace" }}>{t.portfolio.noLeaderboard}</div>
              </div>
            ) : (
              <>
                {leaderboard.map((entry, i) => {
                  const myId = String(user?._id || user?.id || '');
                  const isMe = myId && String(entry.userId) === myId;
                  return (
                    <div key={i} onClick={() => !isMe && entry.username && onViewProfile && onViewProfile(entry.username)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: isMe ? 'rgba(34,211,165,0.07)' : 'var(--bg-card)', border: `1px solid ${i === 0 ? '#f5c842' : i === 1 ? 'var(--t3)' : i === 2 ? '#cd7f32' : isMe ? 'rgba(34,211,165,0.6)' : 'var(--bd)'}`, borderLeft: isMe ? '2px solid rgba(34,211,165,0.6)' : undefined, borderRadius: '8px', marginBottom: '8px', cursor: !isMe && entry.username && onViewProfile ? 'pointer' : 'default' }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: i === 0 ? '#f5c842' : i === 1 ? 'var(--t3)' : i === 2 ? '#cd7f32' : 'var(--t6)', width: '24px', flexShrink: 0 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </div>
                      <UserAvatar user={entry} size={24} showBadge />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: isMe ? '#22d3a5' : 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                          {entry.username ? `@${entry.username}` : entry.name}
                          {isFounder(entry.username) && <FounderBadge size={11} />}
                          {isMe && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: 'rgba(34,211,165,0.6)', marginLeft: '6px', flexShrink: 0 }}>YOU</span>}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--t5)' }}>{formatCash(entry.totalValue)}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: entry.returnPct >= 0 ? '#22d3a5' : '#f05454' }}>
                          {entry.returnPct >= 0 ? '+' : ''}{entry.returnPct.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
                {userPositionGlobal && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', margin: '4px 0' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t6)' }}>···</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(34,211,165,0.07)', border: '1px solid rgba(34,211,165,0.6)', borderLeft: '2px solid rgba(34,211,165,0.6)', borderRadius: '8px', marginBottom: '8px' }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t6)', width: '24px', flexShrink: 0 }}>#{userPositionGlobal.rank}</div>
                      <UserAvatar user={userPositionGlobal} size={24} showBadge />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: '#22d3a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                          {userPositionGlobal.username ? `@${userPositionGlobal.username}` : userPositionGlobal.name}
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: 'rgba(34,211,165,0.6)', marginLeft: '6px', flexShrink: 0 }}>YOU</span>
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--t5)' }}>{formatCash(userPositionGlobal.totalValue)}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: userPositionGlobal.returnPct >= 0 ? '#22d3a5' : '#f05454' }}>
                          {userPositionGlobal.returnPct >= 0 ? '+' : ''}{userPositionGlobal.returnPct.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )
          ) : (
            weeklyLeaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
                <div style={{ fontSize: '11px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace" }}>{t.portfolio.noWeeklyData}</div>
              </div>
            ) : (
              <>
                {weeklyLeaderboard.map((entry, i) => {
                  const myId = String(user?._id || user?.id || '');
                  const isMe = myId && String(entry.userId) === myId;
                  return (
                    <div key={i} onClick={() => !isMe && entry.username && onViewProfile && onViewProfile(entry.username)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: isMe ? 'rgba(34,211,165,0.07)' : 'var(--bg-card)', border: `1px solid ${i === 0 ? '#f5c842' : i === 1 ? 'var(--t3)' : i === 2 ? '#cd7f32' : isMe ? 'rgba(34,211,165,0.6)' : 'var(--bd)'}`, borderLeft: isMe ? '2px solid rgba(34,211,165,0.6)' : undefined, borderRadius: '8px', marginBottom: '8px', cursor: !isMe && entry.username && onViewProfile ? 'pointer' : 'default' }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: i === 0 ? '#f5c842' : i === 1 ? 'var(--t3)' : i === 2 ? '#cd7f32' : 'var(--t6)', width: '24px', flexShrink: 0 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </div>
                      <UserAvatar user={entry} size={24} showBadge />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: isMe ? '#22d3a5' : 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                          {entry.username ? `@${entry.username}` : entry.name}
                          {isFounder(entry.username) && <FounderBadge size={11} />}
                          {isMe && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: 'rgba(34,211,165,0.6)', marginLeft: '6px', flexShrink: 0 }}>YOU</span>}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--t5)' }}>{formatCash(entry.totalValue ?? 0)}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: (entry.weeklyReturn ?? 0) >= 0 ? '#22d3a5' : '#f05454' }}>
                          {(entry.weeklyReturn ?? 0) >= 0 ? '+' : ''}{(entry.weeklyReturn ?? 0).toFixed(2)}%
                        </div>
                        <div style={{ fontSize: '8px', color: 'var(--t5)' }}>{t.portfolio.thisWeek}</div>
                      </div>
                    </div>
                  );
                })}
                {userPositionWeekly && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', margin: '4px 0' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t6)' }}>···</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(34,211,165,0.07)', border: '1px solid rgba(34,211,165,0.6)', borderLeft: '2px solid rgba(34,211,165,0.6)', borderRadius: '8px', marginBottom: '8px' }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t6)', width: '24px', flexShrink: 0 }}>#{userPositionWeekly.rank}</div>
                      <UserAvatar user={userPositionWeekly} size={24} showBadge />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: '#22d3a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                          {userPositionWeekly.username ? `@${userPositionWeekly.username}` : userPositionWeekly.name}
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: 'rgba(34,211,165,0.6)', marginLeft: '6px', flexShrink: 0 }}>YOU</span>
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--t5)' }}>{formatCash(userPositionWeekly.totalValue ?? 0)}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: (userPositionWeekly.weeklyReturn ?? 0) >= 0 ? '#22d3a5' : '#f05454' }}>
                          {(userPositionWeekly.weeklyReturn ?? 0) >= 0 ? '+' : ''}{(userPositionWeekly.weeklyReturn ?? 0).toFixed(2)}%
                        </div>
                        <div style={{ fontSize: '8px', color: 'var(--t5)' }}>{t.portfolio.thisWeek}</div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )
          )}
        </div>
      )}

      {/* ── Duelo ── */}
      {tab === 'duel' && (
        <div style={{ padding: '16px 20px 40px', position: 'relative', zIndex: 2 }}>

          {/* Duel activo */}
          {activeDuel && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(34,211,165,0.3)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '9px', color: '#22d3a5', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{t.portfolio.activeDuel} · {activeDuel.daysLeft}{t.portfolio.daysLeft}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[activeDuel.challenger, activeDuel.opponent].map((p, i) => (
                  <div key={i} style={{ flex: 1, background: 'var(--bg-page)', border: `1px solid ${p.returnPct >= 0 ? 'rgba(34,211,165,0.2)' : 'rgba(240,84,84,0.2)'}`, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: 'var(--t5)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.username || p.name}{isFounder(p.username) && <FounderBadge size={9} />}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: p.returnPct >= 0 ? '#22d3a5' : '#f05454' }}>
                      {p.returnPct >= 0 ? '+' : ''}{p.returnPct.toFixed(2)}%
                    </div>
                    <div style={{ fontSize: '8px', color: 'var(--t5)', marginTop: '2px' }}>{formatCash(p.currentValue)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '8px', color: 'var(--t6)' }}>
                <span>{t.portfolio.start} {activeDuel.startDate}</span>
                <span>{t.portfolio.end} {activeDuel.endDate}</span>
              </div>
            </div>
          )}

          {/* Retos pendientes */}
          {pendingDuels.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '9px', color: '#f5c842', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>{t.portfolio.pendingDuels}</div>
              {pendingDuels.map(d => (
                <div key={d.id} style={{ background: 'var(--bg-card)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: 'var(--t1)' }}>{d.challengerName}</div>
                    <div style={{ fontSize: '9px', color: 'var(--t5)' }}>{t.portfolio.duelChallenge}</div>
                  </div>
                  <button onClick={() => acceptDuel(d.id)} disabled={duelLoading}
                    style={{ padding: '7px 12px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, cursor: 'pointer', opacity: duelLoading ? 0.5 : 1 }}>
                    {t.challenge.accept}
                  </button>
                  <button onClick={() => rejectDuel(d.id)} disabled={duelLoading}
                    style={{ padding: '7px 12px', background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, cursor: 'pointer', opacity: duelLoading ? 0.5 : 1 }}>
                    {t.challenge.reject}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty state / challenge button */}
          {!activeDuel && (
            <div style={{ textAlign: 'center', padding: '32px 0 16px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚔️</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t1)', marginBottom: '6px' }}>{t.portfolio.duelTitle}</div>
              <div style={{ fontSize: '10px', color: 'var(--t5)', marginBottom: '24px', lineHeight: 1.6 }}>{t.portfolio.duelDesc}</div>
              <button onClick={() => { setShowFriendPicker(true); loadDuelFriends(); }}
                style={{ padding: '12px 24px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}>
                {t.portfolio.challengeFriend}
              </button>
            </div>
          )}

          {duelMsg && (
            <div style={{ fontSize: '11px', color: duelMsg.includes('✓') ? '#22d3a5' : '#f05454', textAlign: 'center', marginTop: '12px' }}>{duelMsg}</div>
          )}

          {/* Friend picker */}
          {showFriendPicker && (
            <div style={{ marginTop: '16px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--t1)', fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>{t.portfolio.chooseFriend}</div>
                <button onClick={() => setShowFriendPicker(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--t5)', fontSize: '16px', cursor: 'pointer', padding: '0' }}>×</button>
              </div>
              {duelFriends.length === 0 ? (
                <div style={{ fontSize: '10px', color: 'var(--t5)', textAlign: 'center', padding: '16px 0' }}>{t.portfolio.noFriendsYet}</div>
              ) : (
                duelFriends.map(f => (
                  <div key={f.username} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '6px', marginBottom: '4px', background: 'var(--bg-page)' }}>
                    <UserAvatar user={f} size={28} showBadge />
                    <div style={{ flex: 1, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: 'var(--t1)', display: 'flex', alignItems: 'center' }}>{f.username || f.name}{isFounder(f.username) && <FounderBadge size={11} />}</div>
                    <button onClick={() => challengeFriendDuel(f.username)} disabled={duelLoading}
                      style={{ padding: '6px 12px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, cursor: 'pointer', opacity: duelLoading ? 0.5 : 1 }}>
                      {t.portfolio.challengeBtn}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Historial ── */}
      {tab === 'history' && (
        <div style={{ padding: '16px 20px 40px', position: 'relative', zIndex: 2 }}>
          {(!portfolio?.transactions || portfolio.transactions.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
              <div style={{ fontSize: '11px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace" }}>{t.portfolio.noHistory}</div>
            </div>
          ) : (
            [...portfolio.transactions].reverse().map((tx, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', marginBottom: '6px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: tx.action === 'buy' ? 'rgba(34,211,165,0.1)' : 'rgba(240,84,84,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>
                  {tx.action === 'buy' ? '▲' : '▼'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '11px', color: 'var(--t1)' }}>{tx.name}</div>
                  <div style={{ fontSize: '9px', color: 'var(--t5)' }}>
                    {parseFloat(tx.qty.toFixed(4))} × {formatPrice(tx.price, tx.type)} · {new Date(tx.date).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: tx.action === 'buy' ? '#f05454' : '#22d3a5' }}>
                    {tx.action === 'buy' ? '-' : '+'}{formatCash(tx.total)}
                  </div>
                  <div style={{ fontSize: '9px', color: tx.action === 'buy' ? '#22d3a5' : '#f05454', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {tx.action === 'buy' ? t.portfolio.purchase : t.portfolio.sale}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Ligas ── */}
      {tab === 'leagues' && (
        <Leagues onOpenLeague={onOpenLeague} />
      )}

      {missionToast[0] && <MissionNotification data={missionToast[0]} onDone={() => setMissionToast(q => q.slice(1))} />}
      {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
    </div>
  );
}