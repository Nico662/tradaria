import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import { Briefcase, Swords, Trophy, BarChart2, Globe, DollarSign, Lightbulb, Inbox, Bell, FileText, Lock, Calendar, ClipboardList, TrendingUp, Bitcoin, Wheat, Clock } from 'lucide-react';
const Chart = lazy(() => import('./Chart.jsx'));
import { ASSET_INFO } from './assetInfo.js';

import { SERVER } from './config.js';
import UserAvatar from './UserAvatar.jsx';
import { incrementMission, recordModePlayed, incrementWeeklyMission, recordWeeklyModePlayed } from './missions.js';
import MissionNotification from './MissionNotification.jsx';
import { unlockBadge, BADGES } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import FounderBadge, { isFounder } from './FounderBadge.jsx';
import { getUsernameColor } from './cosmeticColors';
import TitleBadge from './components/TitleBadge';
import PortfolioTutorial from './PortfolioTutorial.jsx';
import Leagues from './Leagues.jsx';

// Must match PORTFOLIO_ASSETS.length in server/index.js
const TOTAL_PORTFOLIO_ASSETS = 46;
const EXPECTED_COUNTS = { all: 46, stocks: 25, indices: 15, crypto: 4, commodities: 2 };

const TYPE_COLORS = {
  stock:     '#378ADD',
  crypto:    'var(--color-neutral)',
  index:     'var(--green)',
  commodity: 'var(--color-down)',
};

const TYPE_ICONS = {
  stock:     <TrendingUp size={14} strokeWidth={2} aria-hidden />,
  crypto:    <Bitcoin size={14} strokeWidth={2} aria-hidden />,
  index:     <BarChart2 size={14} strokeWidth={2} aria-hidden />,
  commodity: <Wheat size={14} strokeWidth={2} aria-hidden />,
};

const RISK_DOT = {
  crypto:    { color: 'var(--color-down)', label: '●' },
  stock:     { color: 'var(--color-neutral)', label: '●' },
  index:     { color: 'var(--green)', label: '●' },
  commodity: { color: 'var(--color-neutral)', label: '●' },
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

const LB_MEDALS = [
  <span style={{ color: '#FFD700', fontWeight: 900 }}>1</span>,
  <span style={{ color: '#C0C0C0', fontWeight: 900 }}>2</span>,
  <span style={{ color: '#CD7F32', fontWeight: 900 }}>3</span>,
];

function LeaderboardList({ entries, userPosition, user, onViewProfile, t }) {
  const myId = String(user?._id || user?.id || '');
  return (
    <>
      {entries.map((entry, i) => {
        const isMe = myId && String(entry.userId) === myId;
        return (
          <div key={i}
            onClick={() => !isMe && entry.username && onViewProfile && onViewProfile(entry.username)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: isMe ? 'rgba(255,126,179,0.06)' : 'var(--bg-surface)',
              border: `0.5px solid ${isMe ? 'var(--border-pink)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px', marginBottom: '6px',
              cursor: !isMe && entry.username && onViewProfile ? 'pointer' : 'default',
              overflow: 'hidden', width: '100%',
            }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: isMe ? 'var(--pink)' : 'var(--text-muted)', width: '20px', textAlign: 'center', flexShrink: 0 }}>
              {i < 3 ? LB_MEDALS[i] : i + 1}
            </div>
            <UserAvatar user={entry} size={24} showBadge style={{ marginLeft: '4px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: isMe ? 'var(--pink)' : (getUsernameColor(entry.activeCosmetics) || 'var(--text-primary)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {entry.username ? `@${entry.username}` : entry.name}{entry.slot === 1 ? ' (2)' : ''}
                {isFounder(entry.username) && <FounderBadge size={11} />}
                {isMe && <span style={{ fontSize: '12px', color: 'var(--pink)', flexShrink: 0 }}>{t.common.you}</span>}
                <TitleBadge title={entry.activeCosmetics?.title} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatCash(entry.totalValue)}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: entry.returnPct >= 0 ? 'var(--green)' : 'var(--pink)', flexShrink: 0 }}>
              {entry.returnPct >= 0 ? '+' : ''}{entry.returnPct.toFixed(2)}%
            </div>
          </div>
        );
      })}
      {userPosition && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', margin: '4px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>···</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(255,126,179,0.06)',
            border: '0.5px solid var(--border-pink)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px', marginBottom: '6px', overflow: 'hidden', width: '100%',
          }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: 'var(--pink)', width: '20px', textAlign: 'center', flexShrink: 0 }}>#{userPosition.rank}</div>
            <UserAvatar user={userPosition} size={24} showBadge style={{ marginLeft: '4px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--pink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {userPosition.username ? `@${userPosition.username}` : userPosition.name}{userPosition.slot === 1 ? ' (2)' : ''}
                <span style={{ fontSize: '12px', color: 'var(--pink)', flexShrink: 0 }}>{t.common.you}</span>
                <TitleBadge title={userPosition.activeCosmetics?.title} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatCash(userPosition.totalValue)}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: userPosition.returnPct >= 0 ? 'var(--green)' : 'var(--pink)', flexShrink: 0 }}>
              {userPosition.returnPct >= 0 ? '+' : ''}{userPosition.returnPct.toFixed(2)}%
            </div>
          </div>
        </>
      )}
    </>
  );
}

function PortfolioTabSwitcher({ activeSlot, setActiveSlot }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
      {[0, 1].map(s => (
        <button
          key={s}
          onClick={() => setActiveSlot(s)}
          style={{
            flex: 1, padding: '8px', borderRadius: 'var(--radius-md)',
            border: `1px solid ${activeSlot === s ? 'var(--pink)' : 'var(--border-default)'}`,
            background: activeSlot === s ? 'rgba(255,126,179,0.10)' : 'var(--bg-surface)',
            color: activeSlot === s ? 'var(--pink)' : 'var(--text-muted)',
            fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Portfolio {s === 0 ? 'A' : 'B'}
        </button>
      ))}
    </div>
  );
}

export default function Portfolio({ onBack, onViewProfile, onOpenLeague, onGoPricing }) {
  const { user, login } = useAuth();
  const { t, lang } = useLang();
  const [screen, setScreen]                 = useState('main');
  const [prices, setPrices]                 = useState([]);
  const [pricesReady, setPricesReady]       = useState(false);
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
  const [activeSlot, setActiveSlot]             = useState(0);
  const [leaderboard, setLeaderboard]           = useState([]);
  const [userPositionGlobal, setUserPositionGlobal] = useState(null);
  const [leaderboardTab, setLeaderboardTab]     = useState('global');
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState([]);
  const [userPositionWeekly, setUserPositionWeekly] = useState(null);
  const [weeklyLoading, setWeeklyLoading]       = useState(false);
  const [activeDuel, setActiveDuel]         = useState(null);
  const [pendingDuels, setPendingDuels]     = useState([]);
  const [duelFriends, setDuelFriends]       = useState([]);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [duelLoading, setDuelLoading]       = useState(false);
  const [duelMsg, setDuelMsg]               = useState('');
  const [showWelcome, setShowWelcome]       = useState(false);
  const [inputMode, setInputMode]           = useState(() => localStorage.getItem('tradaria_portfolio_input_mode') || 'units');
  const [alerts, setAlerts]                 = useState([]);
  const [alertModal, setAlertModal]         = useState(null);
  const [alertPrice, setAlertPrice]         = useState('');
  const [alertCondition, setAlertCondition] = useState('above');
  const [notes, setNotes]                   = useState({});
  const [noteModal, setNoteModal]           = useState(null);
  const [noteText, setNoteText]             = useState('');
  const [noteSaving, setNoteSaving]         = useState(false);
  const [compareData, setCompareData]       = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareExpanded, setCompareExpanded] = useState(false);
  const [pendingOrders, setPendingOrders]   = useState([]);
  const [orderModal, setOrderModal]         = useState(null);
  const [orderMsg, setOrderMsg]             = useState('');
  const chartRef   = useRef(null);
  const tabBarRef  = useRef(null);
  const [tabsAtEnd, setTabsAtEnd] = useState(true);

  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    function check() {
      setTabsAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    }
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check, { passive: true });
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, []);

  const token = localStorage.getItem('tradaria_token');
  const hasDualPortfolio = user?.battlePassMechanics?.includes('mechanic_portfolio_double') || false;

  // ── Price alerts ──────────────────────────────────────────────────
  async function fetchAlerts() {
    const tok = localStorage.getItem('tradaria_token');
    try {
      const res = await fetch(`${SERVER}/api/alerts`, { headers: { Authorization: `Bearer ${tok}` } });
      if (res.ok) setAlerts(await res.json());
    } catch {}
  }

  async function saveAlert(ticker, targetPrice, condition) {
    if (!targetPrice || isNaN(targetPrice) || targetPrice <= 0) return;
    const tok = localStorage.getItem('tradaria_token');
    const res = await fetch(`${SERVER}/api/alerts`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ticker, targetPrice, condition }),
    });
    const data = await res.json();
    if (data.ok) {
      setAlerts(prev => [...prev.filter(a => a.ticker !== ticker), data.alert]);
      setAlertModal(null);
    }
  }

  async function deleteAlert(alertId) {
    const tok = localStorage.getItem('tradaria_token');
    await fetch(`${SERVER}/api/alerts/${alertId}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${tok}` },
    });
    setAlerts(prev => prev.filter(a => a._id !== alertId));
  }

  function openAlertModal(pos) {
    setAlertPrice(pos.currentPrice.toFixed(2));
    setAlertCondition('above');
    setAlertModal({ ticker: pos.symbol, name: pos.name, currentPrice: pos.currentPrice, type: pos.type });
  }

  useEffect(() => {
    if (user?.isPro) fetchAlerts();
  }, [user?.isPro]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user?.isPro) fetchNotes();
  }, [user?.isPro]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Position notes ────────────────────────────────────────────────
  async function fetchNotes() {
    const tok = localStorage.getItem('tradaria_token');
    try {
      const res = await fetch(`${SERVER}/api/portfolio/notes`, { headers: { Authorization: `Bearer ${tok}` } });
      if (res.ok) {
        const data = await res.json();
        const map = {};
        data.forEach(n => { map[n.ticker] = n.note; });
        setNotes(map);
      }
    } catch {}
  }

  async function saveNote(ticker, text) {
    if (!text.trim()) return;
    setNoteSaving(true);
    const tok = localStorage.getItem('tradaria_token');
    try {
      const res = await fetch(`${SERVER}/api/portfolio/note`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ticker, note: text.trim() }),
      });
      if (res.ok) {
        setNotes(prev => ({ ...prev, [ticker]: text.trim() }));
        setNoteModal(null);
      }
    } catch {}
    setNoteSaving(false);
  }

  async function deleteNote(ticker) {
    const tok = localStorage.getItem('tradaria_token');
    try {
      await fetch(`${SERVER}/api/portfolio/note/${ticker}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tok}` } });
      setNotes(prev => { const n = { ...prev }; delete n[ticker]; return n; });
      setNoteModal(null);
    } catch {}
  }

  // ── Compare vs #1 ─────────────────────────────────────────────────
  async function loadCompare() {
    if (compareLoading) return;
    setCompareLoading(true);
    const tok = localStorage.getItem('tradaria_token');
    try {
      const res = await fetch(`${SERVER}/api/portfolio/compare`, { headers: { Authorization: `Bearer ${tok}` } });
      if (res.ok) setCompareData(await res.json());
    } catch {}
    setCompareLoading(false);
  }

  function dismissWelcome() {
    localStorage.setItem('tradaria_portfolio_welcomed', 'true');
    setShowWelcome(false);
    const tok = localStorage.getItem('tradaria_token');
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
    const tok = localStorage.getItem('tradaria_token');
    let pricesData, portfolioData;
    try {
      const [pricesRes, portfolioRes] = await Promise.all([
        fetch(`${SERVER}/portfolio/prices`),
        fetch(`${SERVER}/portfolio?slot=${activeSlot}`, { headers: { Authorization: `Bearer ${tok}` } }),
      ]);
      pricesData    = await pricesRes.json();
      portfolioData = await portfolioRes.json();
    } catch {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const [pricesRes, portfolioRes] = await Promise.all([
          fetch(`${SERVER}/portfolio/prices`),
          fetch(`${SERVER}/portfolio?slot=${activeSlot}`, { headers: { Authorization: `Bearer ${tok}` } }),
        ]);
        pricesData    = await pricesRes.json();
        portfolioData = await portfolioRes.json();
      } catch {
        setScreen('error');
        return;
      }
    }
    setPrices(pricesData);
    if (pricesData.length >= TOTAL_PORTFOLIO_ASSETS) setPricesReady(true);
    setPortfolio(portfolioData);
    if (!portfolioData.tutorialSeen && !localStorage.getItem('tradaria_portfolio_welcomed')) {
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
      body: JSON.stringify({ totalValue: tv, slot: activeSlot }),
    }).catch(() => {});

    fetch(`${SERVER}/portfolio/history?slot=${activeSlot}`, {
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

    fetch(`${SERVER}/portfolio/orders`, {
      headers: { Authorization: `Bearer ${tok}` },
    }).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setPendingOrders(data);
    }).catch(() => {});
  }, [activeSlot]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadWeeklyLeaderboard() {
    if (weeklyLoading) return;
    setWeeklyLoading(true);
    try {
      const uid = user?._id || user?.id || '';
      const res  = await fetch(`${SERVER}/portfolio/weekly/leaderboard${uid ? `?userId=${uid}` : ''}`);
      const data = await res.json();
      if (data.leaderboard) {
        setWeeklyLeaderboard(data.leaderboard);
        setUserPositionWeekly(data.userPosition || null);
      }
    } catch {} finally {
      setWeeklyLoading(false);
    }
  }

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
      setDuelMsg(t.common.error);
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
  }, [user, loadAll, activeSlot]);

  useEffect(() => {
    if (pricesReady) return;
    const start = Date.now();
    let timer;
    async function poll() {
      if (Date.now() - start >= 15000) { setPricesReady(true); return; }
      try {
        const data = await fetch(`${SERVER}/portfolio/prices`).then(r => r.json());
        setPrices(data);
        if (data.length >= TOTAL_PORTFOLIO_ASSETS) { setPricesReady(true); return; }
      } catch {}
      timer = setTimeout(poll, 2000);
    }
    timer = setTimeout(poll, 2000);
    return () => clearTimeout(timer);
  }, [pricesReady]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handlePlaceOrder() {
    if (!orderModal || !user) return;
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/portfolio/order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: orderModal.symbol, type: orderModal.action, qty: orderModal.qty, slot: activeSlot }),
      });
      const data = await res.json();
      setOrderModal(null);
      if (!data.ok) { setError(data.error); setLoading(false); return; }
      setQty('');
      setOrderMsg('✓ ' + t.portfolio.orderPending);
      setTimeout(() => setOrderMsg(''), 2500);
      await loadAll();
    } catch {
      setError(t.common.error);
    }
    setLoading(false);
  }

  async function handleCancelOrder(orderId) {
    try {
      const res = await fetch(`${SERVER}/portfolio/order/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) await loadAll();
    } catch {}
  }

  async function handleTrade() {
    if (!selected || !qty || parseFloat(qty) <= 0) return;
    const finalQty = inputMode === 'amount'
      ? Math.round((parseFloat(qty) / (selectedPrice?.price || 1)) * 10000) / 10000
      : parseFloat(qty);
    const marketStatus = getMarketStatus(selected.type, t);
    if (!marketStatus.open) {
      setOrderModal({ action, symbol: selected.symbol, name: selected.name, type: selected.type, qty: finalQty });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${SERVER}/portfolio/${action}`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symbol: selected.symbol, qty: finalQty, slot: activeSlot }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); setLoading(false); return; }
      setTradeMsg(action === 'buy' ? '✓ ' + t.portfolio.purchase : '✓ ' + t.portfolio.sale);
      setTimeout(() => setTradeMsg(''), 2000);
      const trades = parseInt(localStorage.getItem('tradaria_portfolio_trades') || '0') + 1;
      localStorage.setItem('tradaria_portfolio_trades', String(trades));
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
      fetch(`${SERVER}/stats/game`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'portfolio', score: 0, correct: 0, wrong: 0, accuracy: 0, streak: 0, rounds: 1, gameId: crypto.randomUUID() }),
      }).catch(() => {});
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
      setError(t.common.error);
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
        <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '16px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}>{t.game.menu}</button>
        <div style={{ marginBottom: '16px' }}><Briefcase size={48} strokeWidth={2} aria-hidden style={{ stroke: 'var(--green)' }} /></div>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '24px', color: 'var(--t1)', marginBottom: '8px' }}>{t.portfolio.title}</div>
        <div style={{ fontSize: '12px', color: 'var(--t5)', marginBottom: '32px' }}>{t.portfolio.signIn}</div>
        <button onClick={login} style={{ display: 'inline-block', padding: '12px 24px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '8px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', textDecoration: 'none', fontWeight: 700, cursor: 'pointer' }}>
          {t.portfolio.signInGoogle}
        </button>
      </div>
    </div>
  );

  if (screen === 'loading') return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
      <div className="spinner" />
    </div>
  );

  if (screen === 'error') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 28px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '16px', background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}>{t.game.menu}</button>
        <div style={{ fontSize: '12px', color: 'var(--color-down)', fontFamily: 'var(--font-body)' }}>{t.portfolio.errorLoading}</div>
      </div>
    </div>
  );

  // ── Calcular valor total ──────────────────────────────────────────
  const positionsWithValue = (portfolio?.positions || []).map(pos => {
    const priceData    = prices.find(p => p.symbol === pos.symbol);
    const livePrice    = priceData?.price > 0 ? priceData.price : null;
    const stalePrice   = livePrice === null;
    const currentPrice = livePrice ?? pos.avgPrice;
    const value        = currentPrice * pos.qty;
    const cost         = pos.avgPrice * pos.qty;
    const pnl          = stalePrice ? null : value - cost;
    const pnlPct       = stalePrice ? null : (pnl / cost) * 100;
    return { ...pos, currentPrice, stalePrice, value, cost, pnl, pnlPct, priceData };
  });

  const totalInvested = positionsWithValue.reduce((s, p) => s + p.cost, 0);
  // P&L no realizado (posiciones abiertas)
 const unrealizedPnl = positionsWithValue.reduce((s, p) => s + (p.pnl ?? 0), 0);

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
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}
            onMouseEnter={e => e.target.style.color = 'var(--t2)'}
            onMouseLeave={e => e.target.style.color = 'var(--t6)'}
          >{t.portfolio.back}</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--t1)' }}>{selected.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--t5)', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {selected.symbol} · {t.portfolio.types[selected.type]}
              <span style={{ fontSize: '12px', color: marketStatus.open ? 'var(--green)' : 'var(--color-down)', background: marketStatus.open ? 'rgba(0,229,160,0.1)' : 'rgba(255,126,179,0.1)', padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                {marketStatus.label}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--t1)' }}>{formatPrice(selectedPrice?.price, selected.type)}</div>
            <div style={{ fontSize: '12px', color: selectedPrice?.change >= 0 ? 'var(--green)' : 'var(--color-down)', fontWeight: 700 }}>{formatChange(selectedPrice?.change)}</div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ position: 'relative', zIndex: 2, height: '220px', overflow: 'hidden' }}>
          {loadingCandles ? (
            <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--t6)', fontFamily: 'var(--font-body)' }}>
              {t.portfolio.loadingChart}
            </div>
          ) : assetCandles && stableAsset ? (
            <Suspense fallback={<div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--t6)', fontFamily: 'var(--font-body)' }}>{t.portfolio.loadingChart}</div>}>
              <Chart ref={chartRef} asset={stableAsset} externalCandles={assetCandles} />
            </Suspense>
          ) : (
            <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--t6)', fontFamily: 'var(--font-body)' }}>
              {t.portfolio.noChartData}
            </div>
          )}
        </div>

        {/* Info del activo */}
        {info && (
          <div style={{ margin: '12px 20px 0', padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#378ADD', background: 'rgba(55,138,221,0.1)', padding: '3px 10px', borderRadius: '4px', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><BarChart2 size={12} strokeWidth={2} aria-hidden /> {info.sector}</span>
              <span style={{ fontSize: '12px', color: 'var(--t5)', background: 'var(--bg-page)', padding: '3px 10px', borderRadius: '4px', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Globe size={12} strokeWidth={2} aria-hidden /> {info.country}</span>
              <span style={{ fontSize: '12px', color: 'var(--color-neutral)', background: 'rgba(232,184,75,0.08)', padding: '3px 10px', borderRadius: '4px', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><DollarSign size={12} strokeWidth={2} aria-hidden /> {info.cap}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--t4)', lineHeight: 1.7 }}>{info[lang]}</div>
          </div>
        )}

        {/* Posición actual */}
        {selectedPos && (
          <div style={{ margin: '12px 20px 0', padding: '16px', background: 'var(--bg-card)', border: `1px solid ${selectedPos.pnl >= 0 ? 'rgba(0,229,160,0.3)' : 'rgba(255,126,179,0.3)'}`, borderRadius: '10px', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>{t.portfolio.yourPosition}</div>
                <div style={{ fontSize: '16px', color: 'var(--t1)', fontFamily: 'var(--font-body)', fontWeight: 800 }}>{parseFloat(selectedPos.qty.toFixed(4))} {t.portfolio.units}</div>
                <div style={{ fontSize: '12px', color: 'var(--t5)', marginTop: '4px' }}>{t.portfolio.avgPrice} {formatPrice(selectedPos.avgPrice, selected.type)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontFamily: 'var(--font-body)', fontWeight: 800, color: 'var(--t1)' }}>{formatCash(selectedPos.value)}</div>
                <div style={{ fontSize: '13px', color: selectedPos.pnl >= 0 ? 'var(--green)' : 'var(--color-down)', fontWeight: 700, marginTop: '4px' }}>
                  {selectedPos.pnl >= 0 ? '+' : ''}{formatCash(selectedPos.pnl)} ({formatChange(selectedPos.pnlPct)})
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Panel compra/venta */}
        <div style={{ margin: '12px 20px 20px', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', position: 'relative', zIndex: 20 }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            <button onClick={() => setAction('buy')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${action === 'buy' ? 'var(--green)' : 'var(--bd2)'}`, background: action === 'buy' ? 'rgba(0,229,160,0.08)' : 'transparent', color: action === 'buy' ? 'var(--green)' : 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>{t.portfolio.buy}</button>
            <button onClick={() => setAction('sell')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${action === 'sell' ? 'var(--color-down)' : 'var(--bd2)'}`, background: action === 'sell' ? 'rgba(255,126,179,0.08)' : 'transparent', color: action === 'sell' ? 'var(--color-down)' : 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>{t.portfolio.sell}</button>
          </div>

          {/* Input mode toggle */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
            {[
              { id: 'units',  label: t.portfolio.inputUnits  || 'Units' },
              { id: 'amount', label: t.portfolio.inputAmount || '$ Amount' },
            ].map(m => (
              <button key={m.id} onClick={() => {
                setInputMode(m.id);
                localStorage.setItem('tradaria_portfolio_input_mode', m.id);
                setQty('');
              }} style={{ flex: 1, padding: '6px 8px', borderRadius: '5px', border: `1px solid ${inputMode === m.id ? '#378ADD' : 'var(--bd)'}`, background: inputMode === m.id ? 'rgba(55,138,221,0.08)' : 'transparent', color: inputMode === m.id ? '#378ADD' : 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: inputMode === 'amount' && qty && parseFloat(qty) > 0 ? '4px' : '10px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              {inputMode === 'amount' && (
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', fontFamily: 'var(--font-body)', fontSize: '12px', pointerEvents: 'none' }}>$</span>
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
                style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: inputMode === 'amount' ? '10px 12px 10px 24px' : '10px 12px', color: 'var(--t2)', fontFamily: 'var(--font-body)', fontSize: '12px', outline: 'none', position: 'relative', zIndex: 100, touchAction: 'auto', pointerEvents: 'all', boxSizing: 'border-box' }}
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
            }} style={{ padding: '10px 14px', background: 'var(--bg-page)', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t3)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t.portfolio.max}
            </button>
          </div>

          {inputMode === 'amount' && qty && parseFloat(qty) > 0 && selectedPrice?.price && (
            <div style={{ fontSize: '12px', color: 'var(--t5)', marginBottom: '10px', fontFamily: 'var(--font-body)' }}>
              ≈ {(parseFloat(qty) / selectedPrice.price).toFixed(4)} {t.portfolio.inputUnits || 'units'}
            </div>
          )}

          {qty && parseFloat(qty) > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--t4)', marginBottom: '10px' }}>
              {t.portfolio.total}: <span style={{ color: 'var(--t1)', fontWeight: 700 }}>{formatCash(tradeTotal)}</span>
              {action === 'buy' && <span style={{ color: 'var(--t5)', marginLeft: '8px' }}>{t.portfolio.cashLeft}: {formatCash((portfolio?.cash || 0) - tradeTotal)}</span>}
            </div>
          )}

          <div style={{ fontSize: '12px', color: 'var(--t5)', marginBottom: '10px' }}>
            {t.portfolio.cashAvailable}: <span style={{ color: 'var(--t1)' }}>{formatCash(portfolio?.cash || 0)}</span>
          </div>

          {error    && <div style={{ fontSize: '12px', color: 'var(--color-down)', marginBottom: '10px' }}>{error}</div>}
          {tradeMsg && <div style={{ fontSize: '12px', color: 'var(--green)', marginBottom: '10px' }}>{tradeMsg}</div>}
          {orderMsg && <div style={{ fontSize: '12px', color: 'var(--green)', marginBottom: '10px' }}>{orderMsg}</div>}
          {factMsg  && <div style={{ fontSize: '12px', color: 'var(--t4)', marginBottom: '10px', padding: '6px 10px', background: 'rgba(55,138,221,0.05)', border: '1px solid rgba(55,138,221,0.12)', borderRadius: '6px', letterSpacing: '0.02em', display: 'flex', alignItems: 'flex-start', gap: '6px' }}><Lightbulb size={14} strokeWidth={2} aria-hidden style={{ flexShrink: 0, marginTop: '1px' }} /> {factMsg}</div>}

          <button onClick={handleTrade} disabled={loading || !qty || parseFloat(qty) <= 0}
            style={{ width: '100%', padding: '14px', background: loading ? 'var(--bg-card)' : action === 'buy' ? 'rgba(0,229,160,0.08)' : 'rgba(255,126,179,0.08)', border: `1px solid ${action === 'buy' ? 'var(--green)' : 'var(--color-down)'}`, borderRadius: '6px', color: action === 'buy' ? 'var(--green)' : 'var(--color-down)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || !qty || parseFloat(qty) <= 0 ? 0.4 : 1 }}>
            {loading ? '...' : `${action === 'buy' ? t.portfolio.buy : t.portfolio.sell} ${selected.name}`}
          </button>
        </div>

        {/* ── Pending order confirmation modal (asset screen) ── */}
        {orderModal && (
          <div
            onClick={() => setOrderModal(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '340px' }}
            >
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--t1)', marginBottom: '6px' }}>{t.portfolio.orderModalTitle}</div>
              <div style={{ fontSize: '12px', color: 'var(--t5)', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
                {orderModal.name} · {orderModal.action === 'buy' ? t.portfolio.buy : t.portfolio.sell} {parseFloat(orderModal.qty.toFixed(4))} {t.portfolio.units}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--t4)', marginBottom: '20px', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                {t.portfolio.orderModalBody}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setOrderModal(null)}
                  style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--bd)', borderRadius: '6px', color: 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}
                >{t.portfolio.orderModalCancel}</button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  style={{ flex: 2, padding: '10px', background: orderModal.action === 'buy' ? 'rgba(0,229,160,0.1)' : 'rgba(255,126,179,0.1)', border: `1px solid ${orderModal.action === 'buy' ? 'var(--green)' : 'var(--color-down)'}`, borderRadius: '6px', color: orderModal.action === 'buy' ? 'var(--green)' : 'var(--color-down)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.04em', opacity: loading ? 0.5 : 1 }}
                >{loading ? '···' : t.portfolio.orderModalConfirm}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────
  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />

      <div className="header" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', alignItems: 'center', padding: '12px 20px 10px' }}>
        <button onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0, textAlign: 'left', transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color = 'var(--t2)'}
          onMouseLeave={e => e.target.style.color = 'var(--t6)'}
        >{t.game.menu}</button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--green)', letterSpacing: '0.08em', lineHeight: 1, textShadow: '0 0 10px rgba(0,229,160,0.2)' }}>
            {t.portfolio.title}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontSize: '12px', color: 'var(--t5)', letterSpacing: '0.06em', fontFamily: 'var(--font-body)' }}>{t.portfolio.total.toUpperCase()}</span>
          {portfolio === null
            ? <div className="skeleton-bar" style={{ height: '16px', width: '80px' }} />
            : <span style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--green)', textShadow: '0 0 14px rgba(0,229,160,0.35)' }}>{formatCash(totalValue)}</span>}
        </div>
      </div>

      {/* Portfolio slot switcher */}
      {hasDualPortfolio && (
        <div style={{ padding: '12px 20px 0', position: 'relative', zIndex: 2 }}>
          <PortfolioTabSwitcher activeSlot={activeSlot} setActiveSlot={setActiveSlot} />
        </div>
      )}

      {/* Summary */}
      <div style={{ padding: '16px 20px 20px', borderBottom: '1px solid var(--bd)', position: 'relative', zIndex: 2, textAlign: 'center' }}>
        {portfolio === null ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
              <div className="skeleton-bar" style={{ height: '32px', width: '160px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <div className="skeleton-bar" style={{ height: '18px', width: '70px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="skeleton-bar" style={{ height: '12px', width: '200px' }} />
            </div>
          </>
        ) : (() => {
          const pnl    = totalValue - 50000;
          const pnlPct = (pnl / 50000) * 100;
          const color  = pnl >= 0 ? 'var(--green)' : 'var(--color-down)';
          const arrow  = pnl >= 0 ? '↑' : '↓';
          return (
            <>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '28px', color, letterSpacing: '-0.01em', lineHeight: 1, marginBottom: '5px' }}>
                {arrow} {pnl >= 0 ? '+' : ''}{formatCash(pnl)}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '16px', color, marginBottom: '12px' }}>
                {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--t5)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {t.portfolio.cash} {formatCash(portfolio.cash)} · {t.portfolio.invested} {formatCash(totalInvested)}
              </div>
            </>
          );
        })()}
      </div>

      {/* Gráfico histórico */}
      {portfolioHistory.length > 1 && (() => {
        const values    = portfolioHistory.map(h => h.totalValue);
        const min       = Math.min(...values) * 0.998;
        const max       = Math.max(...values) * 1.002;
        const range     = max - min || 1;
        const n         = values.length;
        const w         = n * 20;
        const toY       = v => 80 - ((v - min) / range) * 72;
        const points    = values.map((v, i) => `${i * 20},${toY(v)}`).join(' ');
        const isUp      = values[n - 1] >= values[0];
        const color     = isUp ? 'var(--green)' : 'var(--color-down)';
        const colorRgba = isUp ? 'rgba(0,229,160,' : 'rgba(255,126,179,';
        const fillPts   = `0,80 ${points} ${w},80`;
        // x as CSS % relative to SVG width: point i sits at (i/n)*100% of the viewBox
        const toXPct    = i => `${(i / n) * 100}%`;
        const lastIdx   = n - 1;
        const maxIdx    = values.reduce((best, v, i) => v > values[best] ? i : best, 0);
        const lastY     = toY(values[lastIdx]);
        const maxY      = toY(values[maxIdx]);
        return (
          <div style={{ padding: '16px 20px 0', position: 'relative', zIndex: 2 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t.portfolio.totalValue}</div>
                <div style={{ fontSize: '12px', color: isUp ? 'var(--green)' : 'var(--color-down)', fontWeight: 700 }}>
                  {isUp ? '+' : ''}{((values[n - 1] - 50000) / 50000 * 100).toFixed(2)}% {t.portfolio.vsInitial}
                </div>
              </div>

              {/* SVG + overlay markers */}
              <div style={{ position: 'relative' }}>
                <svg width="100%" height="80" viewBox={`0 0 ${w} 80`} preserveAspectRatio="none" style={{ display: 'block' }}>
                  {/* Horizontal guide lines — horizontal lines are unaffected by x-distortion */}
                  <line x1="0" y1={80 / 3}  x2={w} y2={80 / 3}  stroke="white" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4,4" />
                  <line x1="0" y1={160 / 3} x2={w} y2={160 / 3} stroke="white" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4,4" />
                  <polygon points={fillPts} fill={`${colorRgba}0.08)`} />
                  <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* Max point — CSS div avoids SVG circle distortion from preserveAspectRatio:none */}
                {maxIdx !== lastIdx && (
                  <div style={{ position: 'absolute', left: toXPct(maxIdx), top: `${maxY}px`, transform: 'translate(-50%, -50%)', width: '4px', height: '4px', borderRadius: '50%', background: color, opacity: 0.5, pointerEvents: 'none' }} />
                )}

                {/* Last point halo */}
                <div style={{ position: 'absolute', left: toXPct(lastIdx), top: `${lastY}px`, transform: 'translate(-50%, -50%)', width: '12px', height: '12px', borderRadius: '50%', border: `1px solid ${colorRgba}0.4)`, pointerEvents: 'none' }} />
                {/* Last point dot */}
                <div style={{ position: 'absolute', left: toXPct(lastIdx), top: `${lastY}px`, transform: 'translate(-50%, -50%)', width: '6px', height: '6px', borderRadius: '50%', background: color, pointerEvents: 'none' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <div style={{ fontSize: '12px', color: 'var(--t6)' }}>{portfolioHistory[0]?.date}</div>
                <div style={{ fontSize: '12px', color: 'var(--t6)' }}>{portfolioHistory[n - 1]?.date}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <style>{`
        .portfolio-tab-bar::-webkit-scrollbar { display: none; }
        @media (max-width: 600px) {
          .portfolio-tab-btn { padding: 10px 8px !important; font-size: 11px !important; }
        }
      `}</style>
      <div style={{ position: 'relative', zIndex: 2, marginTop: '16px' }}>
        <div
          ref={tabBarRef}
          className="portfolio-tab-bar"
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--bd)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {[
            ['market',      t.portfolio.market],
            ['portfolio',   t.portfolio.positions],
            ['leaderboard', t.portfolio.ranking],
            ['duel',        t.portfolio.duelTab],
            ['history',     t.portfolio.history],
            ['orders',      t.portfolio.ordersTab],
            ['leagues',     t.portfolio.leagues],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="portfolio-tab-btn"
              style={{ flexShrink: 0, padding: '12px 10px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === id ? 'var(--green)' : 'transparent'}`, color: tab === id ? 'var(--green)' : 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>
        {!tabsAtEnd && (
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: '1px',
            width: '48px', pointerEvents: 'none',
            background: 'linear-gradient(to right, transparent, var(--bg-page, #060b10) 80%)',
            zIndex: 3,
          }} />
        )}
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
                style={{ padding: '5px 12px', borderRadius: '20px', whiteSpace: 'nowrap', border: `1px solid ${filter === id ? 'var(--green)' : 'var(--bd2)'}`, background: filter === id ? 'rgba(0,229,160,0.08)' : 'transparent', color: filter === id ? 'var(--green)' : 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '0 20px 40px' }}>
            {!pricesReady
              ? Array.from({ length: EXPECTED_COUNTS[filter] }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', marginBottom: '6px' }}>
                    <div className="skeleton-bar" style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton-bar" style={{ height: '12px', width: '80px', marginBottom: '6px' }} />
                      <div className="skeleton-bar" style={{ height: '10px', width: '120px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div className="skeleton-bar" style={{ height: '13px', width: '60px' }} />
                      <div className="skeleton-bar" style={{ height: '10px', width: '40px' }} />
                    </div>
                  </div>
                ))
              : filteredPrices.map(asset => {
                  const status    = getMarketStatus(asset.type, t);
                  const info      = ASSET_INFO[asset.symbol];
                  const riskDot   = RISK_DOT[asset.type];
                  const infoLang  = t.portfolio.buy === 'Buy' ? 'en' : t.portfolio.buy === 'Comprar' ? 'es' : 'de';
                  const tooltip   = info?.[infoLang]?.split('.')[0];
                  const isHovered = hoveredSymbol === asset.symbol;
                  const hasPendingOrder = pendingOrders.some(o => o.status === 'pending' && o.symbol === asset.symbol);
                  return (
                    <div key={asset.symbol} style={{ position: 'relative', marginBottom: '6px' }}>
                      <div onClick={() => openAsset(asset)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = TYPE_COLORS[asset.type]; setHoveredSymbol(asset.symbol); }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; setHoveredSymbol(null); }}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${TYPE_COLORS[asset.type]}15`, border: `1px solid ${TYPE_COLORS[asset.type]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: TYPE_COLORS[asset.type] }}>
                          {TYPE_ICONS[asset.type]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '12px', color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {asset.name}
                            {hasPendingOrder && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color: 'var(--color-neutral)', background: 'rgba(232,184,75,0.12)', padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
                                <Clock size={11} strokeWidth={2} aria-hidden />
                                {t.portfolio.pendingOrderBadge}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--t5)', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {asset.symbol} · {t.portfolio.types[asset.type]}
                            <span style={{ fontSize: '12px', color: status.open ? 'var(--green)' : 'var(--color-down)', background: status.open ? 'rgba(0,229,160,0.1)' : 'rgba(255,126,179,0.1)', padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                              {status.label}
                            </span>
                            {riskDot && <span style={{ fontSize: '12px', color: riskDot.color, lineHeight: 1 }} title="Risk">{riskDot.label}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--t1)' }}>{formatPrice(asset.price, asset.type)}</div>
                          <div style={{ fontSize: '12px', color: asset.change >= 0 ? 'var(--green)' : 'var(--color-down)', fontWeight: 700 }}>{formatChange(asset.change)}</div>
                        </div>
                      </div>
                      {isHovered && tooltip && (
                        <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', color: 'var(--t3)', lineHeight: 1.5, zIndex: 50, pointerEvents: 'none' }}>
                          {tooltip}
                        </div>
                      )}
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}

      {/* ── Posiciones ── */}
      {tab === 'portfolio' && (
        <div style={{ padding: '16px 20px 40px', position: 'relative', zIndex: 2 }}>
          {positionsWithValue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ marginBottom: '12px', color: 'var(--t5)' }}><Inbox size={32} strokeWidth={1.5} aria-hidden /></div>
              <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)' }}>{t.portfolio.noPositions}</div>
              <button onClick={() => setTab('market')} style={{ marginTop: '16px', padding: '10px 20px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                {t.portfolio.goToMarket}
              </button>
            </div>
          ) : (
            positionsWithValue.map(pos => {
              const existingAlert = alerts.find(a => a.ticker === pos.symbol);
              return (
                <div key={pos.symbol}
                  style={{ background: 'var(--bg-card)', border: `1px solid ${pos.stalePrice ? 'var(--bd)' : pos.pnl >= 0 ? 'rgba(0,229,160,0.3)' : 'rgba(255,126,179,0.3)'}`, borderRadius: '8px', marginBottom: '8px', overflow: 'hidden' }}>
                  {/* Clickable main area */}
                  <div onClick={() => openAsset(prices.find(p => p.symbol === pos.symbol))} style={{ padding: '14px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--t1)' }}>{pos.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--t5)' }}>{parseFloat(pos.qty.toFixed(4))} {t.portfolio.units} · {t.portfolio.avgPrice} {formatPrice(pos.avgPrice, pos.type)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: pos.stalePrice ? 'var(--t5)' : 'var(--t1)' }}>
                          {pos.stalePrice ? '~' : ''}{formatCash(pos.value)}
                        </div>
                        {!pos.stalePrice && (
                          <div style={{ fontSize: '12px', color: pos.pnl >= 0 ? 'var(--green)' : 'var(--color-down)', fontWeight: 700 }}>
                            {pos.pnl >= 0 ? '+' : ''}{formatCash(pos.pnl)} ({formatChange(pos.pnlPct)})
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ height: '3px', background: 'var(--bd)', borderRadius: '2px', overflow: 'hidden' }}>
                      {!pos.stalePrice && (
                        <div style={{ height: '100%', width: `${Math.min(100, Math.abs(pos.pnlPct) * 5)}%`, background: pos.pnl >= 0 ? 'var(--green)' : 'var(--color-down)', borderRadius: '2px' }} />
                      )}
                    </div>
                  </div>
                  {/* Alert + Note row */}
                  <div style={{ padding: '7px 14px', borderTop: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '34px' }}>
                    {/* Alert section */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {user?.isPro ? (
                        existingAlert ? (
                          <>
                            <span style={{ fontSize: '12px', color: 'var(--color-neutral)', fontFamily: 'var(--font-body)', flex: 1 }}>
                              <Bell size={12} strokeWidth={2} aria-hidden style={{ verticalAlign: 'middle' }} /> {existingAlert.condition === 'above' ? '↑' : '↓'} {formatPrice(existingAlert.targetPrice, pos.type)}
                            </span>
                            <button
                              onClick={() => deleteAlert(existingAlert._id)}
                              style={{ background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '4px', color: 'var(--t5)', fontSize: '12px', padding: '2px 8px', cursor: 'pointer', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}
                            >{t.portfolio.delete}</button>
                          </>
                        ) : (
                          <button
                            onClick={() => openAlertModal(pos)}
                            style={{ background: 'transparent', border: '1px solid rgba(232,184,75,0.3)', borderRadius: '6px', color: 'var(--color-neutral)', fontSize: '12px', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}
                          >{t.portfolio.alertBtn}</button>
                        )
                      ) : (
                        <button
                          onClick={() => onGoPricing?.()}
                          style={{ background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t6)', fontSize: '12px', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', opacity: 0.55 }}
                        >{t.portfolio.alertPro}</button>
                      )}
                    </div>
                    {/* Note button */}
                    {user?.isPro ? (
                      <button
                        onClick={e => { e.stopPropagation(); setNoteText(notes[pos.symbol] || ''); setNoteModal({ symbol: pos.symbol, name: pos.name }); }}
                        style={{ flexShrink: 0, background: notes[pos.symbol] ? 'rgba(232,184,75,0.08)' : 'transparent', border: `1px solid ${notes[pos.symbol] ? 'rgba(232,184,75,0.4)' : 'var(--bd2)'}`, borderRadius: '6px', color: notes[pos.symbol] ? 'var(--color-neutral)' : 'var(--t6)', fontSize: '12px', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}
                      ><FileText size={12} strokeWidth={2} aria-hidden style={{ verticalAlign: 'middle' }} /> {notes[pos.symbol] ? t.portfolio.noteLabel : t.portfolio.addNote}</button>
                    ) : (
                      <button
                        onClick={() => onGoPricing?.()}
                        style={{ flexShrink: 0, background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t6)', fontSize: '12px', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', opacity: 0.45 }}
                      ><FileText size={12} strokeWidth={2} aria-hidden style={{ verticalAlign: 'middle' }} /> <Lock size={12} strokeWidth={2} aria-hidden style={{ verticalAlign: 'middle' }} /></button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Compare vs #1 del ranking */}
          <div style={{ marginTop: '20px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', overflow: 'hidden' }}>
            <div
              onClick={() => {
                if (!user?.isPro) { onGoPricing?.(); return; }
                const next = !compareExpanded;
                setCompareExpanded(next);
                if (next && !compareData && !compareLoading) loadCompare();
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer' }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: user?.isPro ? 'var(--green)' : 'var(--t4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {user?.isPro ? <BarChart2 size={14} strokeWidth={2} aria-hidden style={{ verticalAlign: 'middle' }} /> : <Lock size={14} strokeWidth={2} aria-hidden style={{ verticalAlign: 'middle' }} />} {t.portfolio.vsRanking}
                  {!user?.isPro && <span style={{ fontSize: '12px', color: 'var(--color-neutral)', background: 'rgba(232,184,75,0.1)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>PRO</span>}
                </div>
                {compareData?.top1 && user?.isPro && (
                  <div style={{ fontSize: '12px', color: 'var(--t5)', marginTop: '2px', fontFamily: 'var(--font-body)' }}>
                    @{compareData.top1.username} · {compareData.top1.returnPct >= 0 ? '+' : ''}{compareData.top1.returnPct?.toFixed(2)}%
                  </div>
                )}
              </div>
              <span style={{ color: 'var(--t5)', fontSize: '12px', fontFamily: 'var(--font-body)' }}>{compareExpanded ? '▲' : '▼'}</span>
            </div>

            {!user?.isPro ? (
              <div style={{ position: 'relative' }}>
                <div style={{ filter: 'blur(5px)', pointerEvents: 'none', padding: '12px 14px', userSelect: 'none' }}>
                  {[['AAPL', 'Apple', '+12.4%', '+18.2%'], ['BTC', 'Bitcoin', '—', '+34.1%'], ['MSFT', 'Microsoft', '+5.1%', '+5.1%']].map(([sym, name, myR, top1R]) => (
                    <div key={sym} style={{ display: 'flex', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--bd)', gap: '8px' }}>
                      <div style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--t2)' }}>{name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--green)', fontFamily: 'var(--font-body)', width: '44px', textAlign: 'right' }}>{myR}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-neutral)', fontFamily: 'var(--font-body)', width: '44px', textAlign: 'right' }}>{top1R}</div>
                    </div>
                  ))}
                </div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <Lock size={20} strokeWidth={2} aria-hidden style={{ stroke: 'var(--t5)' }} />
                  <button onClick={() => onGoPricing?.()} style={{ padding: '8px 20px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '8px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>{t.portfolio.unlockPro}</button>
                </div>
              </div>
            ) : compareExpanded && (
              <div style={{ padding: '0 14px 14px' }}>
                {compareLoading ? (
                  <div style={{ textAlign: 'center', padding: '24px', fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)' }}>···</div>
                ) : !compareData?.top1 ? (
                  <div style={{ textAlign: 'center', padding: '24px', fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)' }}>{t.portfolio.noRankingData}</div>
                ) : (
                  <>
                    {/* Me vs #1 header */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', padding: '10px', background: 'var(--bg-page)', borderRadius: '8px' }}>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)', marginBottom: '3px' }}>{t.common.you}</div>
                        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: compareData.myReturnPct >= 0 ? 'var(--green)' : 'var(--color-down)' }}>
                          {compareData.myReturnPct >= 0 ? '+' : ''}{compareData.myReturnPct?.toFixed(2)}%
                        </div>
                      </div>
                      <div style={{ width: '1px', background: 'var(--bd)' }} />
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--color-neutral)', fontFamily: 'var(--font-body)', marginBottom: '3px' }}><span style={{ color: '#FFD700', fontWeight: 900 }}>#1</span> @{compareData.top1.username}</div>
                        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: 'var(--color-neutral)' }}>
                          {compareData.top1.returnPct >= 0 ? '+' : ''}{compareData.top1.returnPct?.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* Only in #1 */}
                    {compareData.onlyInTop1.length > 0 && (
                      <>
                        <div style={{ fontSize: '12px', color: 'var(--color-neutral)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: '6px' }}>{t.portfolio.onlyInTop1}</div>
                        {compareData.onlyInTop1.map(item => (
                          <div key={item.symbol} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', background: 'rgba(232,184,75,0.04)', border: '1px solid var(--color-neutral-dim)', borderRadius: '6px', marginBottom: '4px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--t1)' }}>{item.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--t5)' }}>{item.symbol}</div>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-body)', color: item.top1Return >= 0 ? 'var(--green)' : 'var(--color-down)' }}>
                              {item.top1Return >= 0 ? '+' : ''}{item.top1Return?.toFixed(2)}%
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* In common */}
                    {compareData.inCommon.length > 0 && (
                      <>
                        <div style={{ fontSize: '12px', color: 'var(--green)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginTop: '10px', marginBottom: '6px' }}>{t.portfolio.inCommon}</div>
                        {compareData.inCommon.map(item => (
                          <div key={item.symbol} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', background: 'rgba(0,229,160,0.04)', border: '1px solid rgba(0,229,160,0.12)', borderRadius: '6px', marginBottom: '4px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--t1)' }}>{item.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--t5)' }}>{item.symbol}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)' }}>{t.common.you.toLowerCase()}</div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: item.myReturn >= 0 ? 'var(--green)' : 'var(--color-down)' }}>{item.myReturn >= 0 ? '+' : ''}{item.myReturn?.toFixed(2)}%</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', color: 'var(--color-neutral)', fontFamily: 'var(--font-body)' }}>#1</div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: item.top1Return >= 0 ? 'var(--green)' : 'var(--color-down)' }}>{item.top1Return >= 0 ? '+' : ''}{item.top1Return?.toFixed(2)}%</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Only in me */}
                    {compareData.onlyInMe.length > 0 && (
                      <>
                        <div style={{ fontSize: '12px', color: '#378ADD', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginTop: '10px', marginBottom: '6px' }}>{t.portfolio.onlyYours}</div>
                        {compareData.onlyInMe.map(item => (
                          <div key={item.symbol} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', background: 'rgba(55,138,221,0.04)', border: '1px solid rgba(55,138,221,0.12)', borderRadius: '6px', marginBottom: '4px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--t1)' }}>{item.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--t5)' }}>{item.symbol}</div>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-body)', color: item.myReturn >= 0 ? 'var(--green)' : 'var(--color-down)' }}>
                              {item.myReturn >= 0 ? '+' : ''}{item.myReturn?.toFixed(2)}%
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {compareData.onlyInTop1.length === 0 && compareData.inCommon.length === 0 && compareData.onlyInMe.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)' }}>{t.portfolio.noPositionsToCompare}</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Leaderboard ── */}
      {tab === 'leaderboard' && (
        <div style={{ padding: '16px 20px 40px', position: 'relative', zIndex: 2 }}>
          {/* Global / Semanal subtabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            {[['global', t.portfolio.global], ['weekly', t.portfolio.weekly]].map(([id, label]) => (
              <button key={id} onClick={() => {
                setLeaderboardTab(id);
                if (id === 'weekly' && weeklyLeaderboard.length === 0 && !weeklyLoading) loadWeeklyLeaderboard();
              }}
                style={{ flex: 1, background: leaderboardTab === id ? 'var(--green-dim)' : 'var(--bg-elevated)', border: `1.5px solid ${leaderboardTab === id ? 'var(--green)' : 'var(--border-default)'}`, borderRadius: 'var(--radius-full)', padding: '8px', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '12px', color: leaderboardTab === id ? 'var(--green)' : 'var(--text-muted)', cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>

          {leaderboardTab === 'global' && (
            leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ marginBottom: '12px' }}><Trophy size={32} strokeWidth={2} aria-hidden style={{ stroke: 'var(--color-neutral)' }} /></div>
                <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)' }}>{t.portfolio.noLeaderboard}</div>
              </div>
            ) : (
              <LeaderboardList entries={leaderboard} userPosition={userPositionGlobal} user={user} onViewProfile={onViewProfile} t={t} />
            )
          )}

          {leaderboardTab === 'weekly' && (
            weeklyLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)' }}>···</div>
              </div>
            ) : weeklyLeaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ marginBottom: '12px', color: 'var(--t5)' }}><Calendar size={32} strokeWidth={1.5} aria-hidden /></div>
                <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)' }}>{t.portfolio.noWeeklyData}</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em', marginBottom: '12px', textAlign: 'center' }}>
                  — {t.portfolio.thisWeek} —
                </div>
                <LeaderboardList entries={weeklyLeaderboard} userPosition={userPositionWeekly} user={user} onViewProfile={onViewProfile} t={t} />
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
            <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--green)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{t.portfolio.activeDuel} · {activeDuel.daysLeft}{t.portfolio.daysLeft}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[activeDuel.challenger, activeDuel.opponent].map((p, i) => (
                  <div key={i} style={{ flex: 1, background: 'var(--bg-page)', border: `1px solid ${p.returnPct >= 0 ? 'rgba(0,229,160,0.2)' : 'rgba(255,126,179,0.2)'}`, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--t5)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.username || p.name}{isFounder(p.username) && <FounderBadge size={9} />}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: p.returnPct >= 0 ? 'var(--green)' : 'var(--color-down)' }}>
                      {p.returnPct >= 0 ? '+' : ''}{p.returnPct.toFixed(2)}%
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--t5)', marginTop: '2px' }}>{formatCash(p.currentValue)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '12px', color: 'var(--t6)' }}>
                <span>{t.portfolio.start} {activeDuel.startDate}</span>
                <span>{t.portfolio.end} {activeDuel.endDate}</span>
              </div>
            </div>
          )}

          {/* Retos pendientes */}
          {pendingDuels.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-neutral)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>{t.portfolio.pendingDuels}</div>
              {pendingDuels.map(d => (
                <div key={d.id} style={{ background: 'var(--bg-card)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--t1)' }}>{d.challengerName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--t5)' }}>{t.portfolio.duelChallenge}</div>
                  </div>
                  <button onClick={() => acceptDuel(d.id)} disabled={duelLoading}
                    style={{ padding: '7px 12px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: duelLoading ? 0.5 : 1 }}>
                    {t.challenge.accept}
                  </button>
                  <button onClick={() => rejectDuel(d.id)} disabled={duelLoading}
                    style={{ padding: '7px 12px', background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: duelLoading ? 0.5 : 1 }}>
                    {t.challenge.reject}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty state / challenge button */}
          {!activeDuel && (
            <div style={{ textAlign: 'center', padding: '32px 0 16px' }}>
              <div style={{ marginBottom: '12px' }}><Swords size={40} strokeWidth={2} aria-hidden style={{ stroke: 'var(--green)' }} /></div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--t1)', marginBottom: '6px' }}>{t.portfolio.duelTitle}</div>
              <div style={{ fontSize: '12px', color: 'var(--t5)', marginBottom: '24px', lineHeight: 1.6 }}>{t.portfolio.duelDesc}</div>
              <button onClick={() => { setShowFriendPicker(true); loadDuelFriends(); }}
                style={{ padding: '12px 24px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '8px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}>
                {t.portfolio.challengeFriend}
              </button>
            </div>
          )}

          {duelMsg && (
            <div style={{ fontSize: '12px', color: duelMsg.includes('✓') ? 'var(--green)' : 'var(--color-down)', textAlign: 'center', marginTop: '12px' }}>{duelMsg}</div>
          )}

          {/* Friend picker */}
          {showFriendPicker && (
            <div style={{ marginTop: '16px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--t1)', fontFamily: 'var(--font-body)', fontWeight: 700 }}>{t.portfolio.chooseFriend}</div>
                <button onClick={() => setShowFriendPicker(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--t5)', fontSize: '16px', cursor: 'pointer', padding: '0' }}>×</button>
              </div>
              {duelFriends.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--t5)', textAlign: 'center', padding: '16px 0' }}>{t.portfolio.noFriendsYet}</div>
              ) : (
                duelFriends.map(f => (
                  <div key={f.username} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '6px', marginBottom: '4px', background: 'var(--bg-page)' }}>
                    <UserAvatar user={f} size={28} showBadge />
                    <div style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--t1)', display: 'flex', alignItems: 'center' }}>{f.username || f.name}{isFounder(f.username) && <FounderBadge size={11} />}</div>
                    <button onClick={() => challengeFriendDuel(f.username)} disabled={duelLoading}
                      style={{ padding: '6px 12px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: duelLoading ? 0.5 : 1 }}>
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
              <div style={{ marginBottom: '12px', color: 'var(--t5)' }}><ClipboardList size={32} strokeWidth={1.5} aria-hidden /></div>
              <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)' }}>{t.portfolio.noHistory}</div>
            </div>
          ) : (
            [...portfolio.transactions].reverse().map((tx, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', marginBottom: '6px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: tx.action === 'buy' ? 'rgba(0,229,160,0.1)' : 'rgba(255,126,179,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>
                  {tx.action === 'buy' ? '▲' : '▼'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--t1)' }}>{tx.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--t5)' }}>
                    {parseFloat(tx.qty.toFixed(4))} × {formatPrice(tx.price, tx.type)} · {new Date(tx.date).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: tx.action === 'buy' ? 'var(--color-down)' : 'var(--green)' }}>
                    {tx.action === 'buy' ? '-' : '+'}{formatCash(tx.total)}
                  </div>
                  <div style={{ fontSize: '12px', color: tx.action === 'buy' ? 'var(--green)' : 'var(--color-down)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {tx.action === 'buy' ? t.portfolio.purchase : t.portfolio.sale}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Órdenes pendientes ── */}
      {tab === 'orders' && (
        <div style={{ padding: '16px 20px 40px', position: 'relative', zIndex: 2 }}>
          {pendingOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ marginBottom: '12px', color: 'var(--t5)' }}><Inbox size={32} strokeWidth={1.5} aria-hidden /></div>
              <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)' }}>{t.portfolio.noPendingOrders}</div>
            </div>
          ) : (
            pendingOrders.map(order => {
              const isPending   = order.status === 'pending';
              const isExecuted  = order.status === 'executed';
              const isCancelled = order.status === 'cancelled';
              const statusColor = isPending ? 'var(--color-neutral)' : isExecuted ? 'var(--green)' : 'var(--t6)';
              const statusLabel = isPending ? t.portfolio.orderPending : isExecuted ? t.portfolio.orderExecuted : t.portfolio.orderCancelled;
              const isBuy = order.type === 'buy';
              return (
                <div key={order._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isBuy ? 'rgba(0,229,160,0.1)' : 'rgba(255,126,179,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0, color: isBuy ? 'var(--green)' : 'var(--color-down)' }}>
                    {isBuy ? '▲' : '▼'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--t1)' }}>{order.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--t5)' }}>
                      {parseFloat(order.qty.toFixed(4))} {t.portfolio.units}
                      {isExecuted && order.executedPrice ? ` · ${formatPrice(order.executedPrice, 'stock')}` : ''}
                      {isCancelled && order.cancelReason ? ` · ${order.cancelReason.replace(/_/g, ' ')}` : ''}
                      {' · '}{new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: statusColor, background: `${statusColor}18`, padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', fontWeight: 700 }}>{statusLabel}</span>
                    {isPending && (
                      <button onClick={() => handleCancelOrder(order._id)}
                        style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '5px', color: 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.04em' }}>
                        {t.portfolio.orderModalCancel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Ligas ── */}
      {tab === 'leagues' && (
        <Leagues onOpenLeague={onOpenLeague} />
      )}

      {missionToast[0] && <MissionNotification data={missionToast[0]} onDone={() => setMissionToast(q => q.slice(1))} />}
      {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}

      {/* ── Note modal ── */}
      {noteModal && (
        <div
          onClick={() => setNoteModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '340px' }}
          >
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--t1)', marginBottom: '4px' }}>{t.portfolio.noteTitle}</div>
            <div style={{ fontSize: '12px', color: 'var(--t5)', marginBottom: '16px', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}>
              {noteModal.name} · {t.portfolio.noteRationale}
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder={t.portfolio.notePlaceholder}
              rows={4}
              maxLength={1000}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-page)', border: '1px solid var(--bd)', borderRadius: '6px', color: 'var(--t1)', fontFamily: 'var(--font-body)', fontSize: '12px', outline: 'none', resize: 'vertical', marginBottom: '16px', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              {notes[noteModal.symbol] && (
                <button
                  onClick={() => deleteNote(noteModal.symbol)}
                  style={{ padding: '10px', background: 'transparent', border: '1px solid rgba(255,126,179,0.4)', borderRadius: '6px', color: 'var(--color-down)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}
                >{t.portfolio.delete}</button>
              )}
              <button
                onClick={() => setNoteModal(null)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--bd)', borderRadius: '6px', color: 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}
              >{t.portfolio.cancel}</button>
              <button
                onClick={() => saveNote(noteModal.symbol, noteText)}
                disabled={noteSaving || !noteText.trim()}
                style={{ flex: 2, padding: '10px', background: 'rgba(0,229,160,0.1)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: noteSaving || !noteText.trim() ? 'not-allowed' : 'pointer', letterSpacing: '0.04em', opacity: noteSaving || !noteText.trim() ? 0.5 : 1 }}
              >{noteSaving ? '···' : t.portfolio.saveNote}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Alert modal ── */}
      {alertModal && (
        <div
          onClick={() => setAlertModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '340px' }}
          >
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--t1)', marginBottom: '4px' }}>{t.portfolio.priceAlertTitle}</div>
            <div style={{ fontSize: '12px', color: 'var(--t5)', marginBottom: '20px', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}>
              {alertModal.name} · {t.portfolio.currentLabel} {formatPrice(alertModal.currentPrice, alertModal.type)}
            </div>

            {/* Condition */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {[['above', t.portfolio.alertAbove], ['below', t.portfolio.alertBelow]].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setAlertCondition(val)}
                  style={{ flex: 1, padding: '8px 4px', border: `1px solid ${alertCondition === val ? (val === 'above' ? 'var(--green)' : 'var(--color-neutral)') : 'var(--bd)'}`, borderRadius: '6px', background: alertCondition === val ? (val === 'above' ? 'rgba(0,229,160,0.08)' : 'rgba(232,184,75,0.08)') : 'transparent', color: alertCondition === val ? (val === 'above' ? 'var(--green)' : 'var(--color-neutral)') : 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.04em' }}
                >{label}</button>
              ))}
            </div>

            {/* Price input */}
            <input
              type="number"
              value={alertPrice}
              onChange={e => setAlertPrice(e.target.value)}
              placeholder={t.portfolio.targetPricePlaceholder}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-page)', border: '1px solid var(--bd)', borderRadius: '6px', color: 'var(--t1)', fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none', marginBottom: '16px' }}
            />

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setAlertModal(null)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--bd)', borderRadius: '6px', color: 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}
              >{t.portfolio.cancel}</button>
              <button
                onClick={() => saveAlert(alertModal.ticker, parseFloat(alertPrice), alertCondition)}
                style={{ flex: 2, padding: '10px', background: 'rgba(0,229,160,0.1)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}
              >{t.portfolio.saveAlert}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}