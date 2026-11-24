import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import { Briefcase, Swords, Trophy, BarChart2, Globe, DollarSign, Lightbulb, Inbox, Bell, FileText, Lock, Calendar, ClipboardList, TrendingUp, Bitcoin, Wheat, Clock, ChevronLeft, X } from 'lucide-react';
const Chart = lazy(() => import('./Chart.jsx'));
import { ASSET_INFO } from './assetInfo.js';
import BottomSheet from './components/BottomSheet.jsx';
import AssetLineChart from './AssetLineChart.jsx';
import { FlatRow, SectionTitle, PeriodSelector, TextTabs, StatusText } from './components/ui/index.js';

import { SERVER } from './config.js';
import { useBattlePass } from './BattlePassContext.jsx';
import UserAvatar from './UserAvatar.jsx';
import { incrementMission, recordModePlayed, incrementWeeklyMission, recordWeeklyModePlayed } from './missions.js';
import MissionNotification from './MissionNotification.jsx';
import { unlockBadge, BADGES } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import SpecialBadge, { getSpecialUserByUsername } from './SpecialBadge.jsx';
import { getUsernameColor } from './cosmeticColors';
import TitleBadge from './components/TitleBadge';
import VerifiedBadge from './VerifiedBadge.jsx';
import EquippedBadge from './components/EquippedBadge';
import PortfolioTutorial from './PortfolioTutorial.jsx';
import Leagues from './Leagues.jsx';
import SimulationNotice from './SimulationNotice.jsx';

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

function formatCandleDate(unixTime) {
  if (!unixTime) return '';
  return new Date(unixTime * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: isMe ? 'var(--pink)' : (getUsernameColor(entry.activeCosmetics) || 'var(--text-primary)'), display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flexWrap: 'wrap' }}>
                <span style={{ flex: '1 1 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{entry.username ? `@${entry.username}` : entry.name}{entry.slot === 1 ? ' (2)' : ''}</span>
                <SpecialBadge specialUser={getSpecialUserByUsername(entry.username)} size={11} />
                {entry.hasVerifiedBadge && <VerifiedBadge size={11} />}
                <EquippedBadge id={entry.activeCosmetics?.badge} size={11} />
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
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--pink)', display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flexWrap: 'wrap' }}>
                <span style={{ flex: '1 1 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{userPosition.username ? `@${userPosition.username}` : userPosition.name}{userPosition.slot === 1 ? ' (2)' : ''}</span>
                {userPosition.hasVerifiedBadge && <VerifiedBadge size={11} />}
                <EquippedBadge id={userPosition.activeCosmetics?.badge} size={11} />
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
  const { refreshBattlePass } = useBattlePass();
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
  const [scrubIdx, setScrubIdx]   = useState(null);
  const [activePeriod, setActivePeriod] = useState('Max');
  const [searchQuery, setSearchQuery]   = useState('');
  const [chartMode, setChartMode]           = useState('line');
  const [detailPeriod, setDetailPeriod]     = useState('Max');
  const [showTradeSheet, setShowTradeSheet] = useState(false);
  const [scrubData, setScrubData]           = useState(null);

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

  // Auto-close trade sheet after success
  useEffect(() => {
    if (!tradeMsg) return;
    const tid = setTimeout(() => setShowTradeSheet(false), 1600);
    return () => clearTimeout(tid);
  }, [tradeMsg]);

  useEffect(() => {
    if (!orderMsg) return;
    const tid = setTimeout(() => setShowTradeSheet(false), 1600);
    return () => clearTimeout(tid);
  }, [orderMsg]);

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
    setPortfolioHistory([]);
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
    setChartMode('line');
    setDetailPeriod('Max');
    setScrubData(null);
    setShowTradeSheet(false);
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
      }).then(r => r.json()).then(data => { if (data?.bpProgress) refreshBattlePass({ force: true }); }).catch(() => {});
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

  // ── Asset detail screen ──────────────────────────────────────────
  if (selected) {
    const marketStatus = getMarketStatus(selected.type, t);
    const info         = ASSET_INFO[selected.symbol];
    const lang         = t.portfolio.buy === 'Buy' ? 'en' : t.portfolio.buy === 'Comprar' ? 'es' : 'de';

    const displayPrice  = scrubData?.price  ?? selectedPrice?.price;
    const displayChange = scrubData?.change ?? selectedPrice?.change;

    const periods = [
      { value: '1D',  label: t.portfolio.period1D  },
      { value: '1W',  label: t.portfolio.period1W  },
      { value: '1M',  label: t.portfolio.period1M  },
      { value: '1Y',  label: t.portfolio.period1Y  },
      { value: 'Max', label: t.portfolio.periodMax },
    ];

    const canSell = !!(selectedPos && selectedPos.qty > 0);

    return (
      <div id="gtm-root" style={{ position: 'relative', paddingBottom: 'calc(144px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="scanlines" />

        {/* Back button */}
        <div style={{ padding: '10px 6px 0', position: 'relative', zIndex: 2 }}>
          <button
            onClick={() => { setSelected(null); setAssetCandles(null); setScrubData(null); }}
            className="screen-header__back"
            style={{ marginLeft: 6 }}
            aria-label={t.portfolio.back}
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </button>
        </div>

        {/* Identity + hero price */}
        <div style={{ padding: '4px 20px 16px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              color: TYPE_COLORS[selected.type],
              fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 10,
              letterSpacing: '-0.01em',
            }}>
              {selected.symbol.slice(0, 5)}
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                {selected.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {selected.symbol}
                {!marketStatus.open && selected.type !== 'crypto' && (
                  <span> · {t.portfolio.marketClosed}</span>
                )}
                {selected.type === 'crypto' && (
                  <span> · {t.portfolio.market247}</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 32, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1 }}>
              {formatPrice(displayPrice, selected.type)}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: (displayChange ?? 0) >= 0 ? 'var(--green)' : 'var(--pink)' }}>
              {(displayChange ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(displayChange ?? 0).toFixed(2)}%
            </span>
          </div>

          {scrubData?.date && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{scrubData.date}</div>
          )}
        </div>

        {/* Chart — full bleed */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {loadingCandles ? (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {t.portfolio.loadingChart}
            </div>
          ) : chartMode === 'line' ? (
            <AssetLineChart
              candles={assetCandles}
              period={detailPeriod}
              onScrubChange={({ candle, refPrice: ref }) => {
                const price  = parseFloat(candle.close);
                const change = ref ? ((price - ref) / ref * 100) : 0;
                setScrubData({ price, change, date: formatCandleDate(candle.time) });
              }}
              onScrubEnd={() => setScrubData(null)}
            />
          ) : assetCandles && stableAsset ? (
            <Suspense fallback={<div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{t.portfolio.loadingChart}</div>}>
              <Chart ref={chartRef} asset={stableAsset} externalCandles={assetCandles} />
            </Suspense>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {t.portfolio.noChartData}
            </div>
          )}
        </div>

        {/* Period selector + chart type toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px', position: 'relative', zIndex: 2 }}>
          {chartMode === 'line' ? (
            <PeriodSelector periods={periods} active={detailPeriod} onChange={p => { setDetailPeriod(p); setScrubData(null); }} />
          ) : (
            <div />
          )}
          <button
            onClick={() => setChartMode(m => m === 'line' ? 'candles' : 'line')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', padding: '4px 0', flexShrink: 0 }}
          >
            <span style={{ color: chartMode === 'line' ? 'var(--color-accent)' : 'var(--text-muted)' }}>{t.portfolio.chartLine}</span>
            <span style={{ color: 'var(--text-hint)', margin: '0 4px' }}>|</span>
            <span style={{ color: chartMode === 'candles' ? 'var(--color-accent)' : 'var(--text-muted)' }}>{t.portfolio.chartCandles}</span>
          </button>
        </div>

        <div style={{ height: '0.5px', background: 'var(--border-default)', margin: '0 0 4px' }} />

        {/* Your position (if any) */}
        {selectedPos && (
          <div style={{ padding: '16px 20px 0', position: 'relative', zIndex: 2 }}>
            <SectionTitle>{t.portfolio.yourPosition}</SectionTitle>
            <FlatRow chevron={false} value={`${parseFloat(selectedPos.qty.toFixed(4))} ${t.portfolio.units}`}>
              <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{t.portfolio.inputUnits}</span>
            </FlatRow>
            <FlatRow chevron={false} value={formatPrice(selectedPos.avgPrice, selected.type)}>
              <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{t.portfolio.avgPrice}</span>
            </FlatRow>
            <FlatRow chevron={false} value={formatCash(selectedPos.value)}>
              <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{t.portfolio.detailCurValue}</span>
            </FlatRow>
            <FlatRow
              chevron={false}
              value={`${selectedPos.pnl >= 0 ? '▲ +' : '▼ '}${formatCash(selectedPos.pnl)} (${formatChange(selectedPos.pnlPct)})`}
              valueColor={selectedPos.pnl >= 0 ? 'up' : 'down'}
            >
              <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>P&L</span>
            </FlatRow>
          </div>
        )}

        {/* Info + Key data */}
        {info && (
          <div style={{ padding: '16px 20px 0', position: 'relative', zIndex: 2 }}>
            <SectionTitle>{t.portfolio.detailInfo}</SectionTitle>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 20px', fontFamily: 'var(--font-body)' }}>
              {info[lang]}
            </p>

            <SectionTitle>{t.portfolio.detailKeyData}</SectionTitle>
            {info.sector && (
              <FlatRow chevron={false} value={info.sector}>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{t.portfolio.keySector}</span>
              </FlatRow>
            )}
            {info.country && (
              <FlatRow chevron={false} value={info.country}>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{t.portfolio.keyCountry}</span>
              </FlatRow>
            )}
            {info.cap && (
              <FlatRow chevron={false} value={info.cap}>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{t.portfolio.keyMarketCap}</span>
              </FlatRow>
            )}
            <FlatRow chevron={false} value={t.portfolio.types[selected.type]}>
              <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{t.portfolio.keyAssetType}</span>
            </FlatRow>
          </div>
        )}

        {/* ── Fixed bottom bar: Sell / Buy ── */}
        <div style={{
          position: 'fixed',
          bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))',
          left: 0, right: 0,
          zIndex: 101,
          background: 'var(--bg-surface)',
          borderTop: '0.5px solid var(--border-default)',
          padding: '10px 20px',
          maxWidth: '480px',
          margin: '0 auto',
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              disabled={!canSell}
              onClick={() => { setAction('sell'); setQty(''); setError(''); setShowTradeSheet(true); }}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid var(--pink)',
                background: 'transparent',
                color: canSell ? 'var(--pink)' : 'var(--text-hint)',
                borderColor: canSell ? 'var(--pink)' : 'var(--border-default)',
                fontFamily: 'var(--font-body)',
                fontWeight: 800,
                fontSize: 14,
                cursor: canSell ? 'pointer' : 'not-allowed',
                opacity: canSell ? 1 : 0.4,
                transition: 'opacity 0.15s',
              }}
            >
              {t.portfolio.sell}
            </button>
            <button
              onClick={() => { setAction('buy'); setQty(''); setError(''); setShowTradeSheet(true); }}
              style={{
                flex: 2,
                minHeight: 48,
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: 'var(--green)',
                color: '#0d0d0d',
                fontFamily: 'var(--font-body)',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {t.portfolio.buy}
            </button>
          </div>
        </div>

        {/* ── Trade bottom sheet ── */}
        {showTradeSheet && (
          <BottomSheet onClose={() => { setShowTradeSheet(false); setQty(''); setError(''); }}>
            {/* Sheet header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>
                {action === 'buy' ? t.portfolio.buy : t.portfolio.sell} {selected.name}
              </span>
              <button
                onClick={() => { setShowTradeSheet(false); setQty(''); setError(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}
                aria-label="Close"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Input mode tabs */}
            <div style={{ padding: '16px 20px 0' }}>
              <TextTabs
                tabs={[
                  { value: 'units',  label: t.portfolio.inputUnits  },
                  { value: 'amount', label: t.portfolio.inputAmount },
                ]}
                active={inputMode}
                onChange={v => { setInputMode(v); localStorage.setItem('tradaria_portfolio_input_mode', v); setQty(''); }}
              />
            </div>

            {/* Large numeric input */}
            <div style={{ padding: '20px 20px 8px', position: 'relative' }}>
              {inputMode === 'amount' && (
                <span style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', fontSize: 24, color: 'var(--text-hint)', fontFamily: 'var(--font-body)', pointerEvents: 'none' }}>$</span>
              )}
              <input
                type="number"
                value={qty}
                onChange={e => {
                  if (inputMode === 'units') {
                    const parts = e.target.value.split('.');
                    if (parts.length > 1 && parts[1].length > 4) return;
                  }
                  setQty(e.target.value);
                }}
                placeholder="0"
                min="0"
                step={inputMode === 'units' ? '0.0001' : '0.01'}
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: 32,
                  fontWeight: 900,
                  fontFamily: 'var(--font-body)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '2px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  padding: '8px 0 12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  touchAction: 'auto',
                  pointerEvents: 'all',
                }}
              />
            </div>

            {/* Amount preview */}
            {inputMode === 'amount' && qty && parseFloat(qty) > 0 && selectedPrice?.price && (
              <div style={{ padding: '0 20px 8px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', textAlign: 'center' }}>
                ≈ {(parseFloat(qty) / selectedPrice.price).toFixed(4)} {t.portfolio.inputUnits}
              </div>
            )}

            {/* Total preview */}
            {qty && parseFloat(qty) > 0 && (
              <div style={{ padding: '0 20px 8px', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', textAlign: 'center' }}>
                {t.portfolio.total}: <strong>{formatCash(tradeTotal)}</strong>
                {action === 'buy' && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{t.portfolio.cashLeft}: {formatCash((portfolio?.cash || 0) - tradeTotal)}</span>}
              </div>
            )}

            {/* Cash + Max */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 12px' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {t.portfolio.cashAvailable}: <strong style={{ color: 'var(--text-primary)' }}>{formatCash(portfolio?.cash || 0)}</strong>
              </span>
              <button
                onClick={() => {
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
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 800, color: 'var(--color-accent)' }}
              >
                {t.portfolio.max}
              </button>
            </div>

            {/* Market closed note */}
            {!marketStatus.open && (
              <div style={{ padding: '0 20px 12px' }}>
                <StatusText style={{ fontSize: 12 }}>{t.portfolio.orderOpenNote}</StatusText>
              </div>
            )}

            {/* Fact / fun fact */}
            {factMsg && (
              <div style={{ margin: '0 20px 12px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <Lightbulb size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
                {factMsg}
              </div>
            )}

            {/* Error / success messages */}
            {error    && <div style={{ padding: '0 20px 10px', fontSize: 12, color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>{error}</div>}
            {tradeMsg && <div style={{ padding: '0 20px 10px', fontSize: 12, color: 'var(--green)', fontFamily: 'var(--font-body)' }}>{tradeMsg}</div>}
            {orderMsg && <div style={{ padding: '0 20px 10px', fontSize: 12, color: 'var(--green)', fontFamily: 'var(--font-body)' }}>{orderMsg}</div>}

            {/* Confirm button */}
            <div style={{ padding: '4px 20px 20px' }}>
              <button
                onClick={handleTrade}
                disabled={loading || !qty || parseFloat(qty) <= 0}
                style={{
                  width: '100%',
                  minHeight: 52,
                  borderRadius: 'var(--radius-full)',
                  border: action === 'sell' ? '1.5px solid var(--pink)' : 'none',
                  background: action === 'buy' ? 'var(--green)' : 'transparent',
                  color: action === 'buy' ? '#0d0d0d' : 'var(--pink)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: loading || !qty || parseFloat(qty) <= 0 ? 'not-allowed' : 'pointer',
                  opacity: loading || !qty || parseFloat(qty) <= 0 ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? '···' : `${action === 'buy' ? t.portfolio.buy : t.portfolio.sell} ${selected.name}`}
              </button>
            </div>
          </BottomSheet>
        )}

        {/* ── Pending order confirmation modal ── */}
        {orderModal && (
          <div
            onClick={() => setOrderModal(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px', width: '100%', maxWidth: '340px' }}
            >
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '6px' }}>{t.portfolio.orderModalTitle}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
                {orderModal.name} · {orderModal.action === 'buy' ? t.portfolio.buy : t.portfolio.sell} {parseFloat(orderModal.qty.toFixed(4))} {t.portfolio.units}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                {t.portfolio.orderModalBody}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setOrderModal(null)}
                  style={{ flex: 1, padding: '10px', background: 'transparent', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}
                >{t.portfolio.orderModalCancel}</button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  style={{ flex: 2, padding: '10px', background: orderModal.action === 'buy' ? 'var(--green)' : 'transparent', border: orderModal.action === 'sell' ? '1.5px solid var(--pink)' : 'none', borderRadius: 'var(--radius-md)', color: orderModal.action === 'buy' ? '#0d0d0d' : 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
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

      <div style={{ padding: '14px 20px 0', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
        >{t.game.menu}</button>

        {hasDualPortfolio ? (
          <div style={{ display: 'flex', gap: '24px', marginTop: '10px' }}>
            {[0, 1].map(s => (
              <button key={s} onClick={() => setActiveSlot(s)} style={{
                background: 'transparent', border: 'none', padding: 0,
                fontFamily: 'var(--font-body)', fontWeight: 800,
                fontSize: '24px', color: activeSlot === s ? 'var(--t1)' : 'var(--t6)',
                cursor: 'pointer',
              }}>
                Portfolio {s === 0 ? 'A' : 'B'}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '28px', color: 'var(--t1)', marginTop: '10px' }}>
            {t.portfolio.title}
          </div>
        )}
      </div>

      <SimulationNotice />

      {/* Summary */}
      <div style={{ padding: '12px 20px 0', position: 'relative', zIndex: 2 }}>
        {portfolio === null ? (
          <>
            <div className="skeleton-bar" style={{ height: '36px', width: '180px', marginBottom: '6px' }} />
            <div className="skeleton-bar" style={{ height: '20px', width: '120px', marginBottom: '6px' }} />
            <div className="skeleton-bar" style={{ height: '12px', width: '220px' }} />
          </>
        ) : (() => {
          const histToRender = (() => {
            if (activePeriod === 'Max' || !portfolioHistory.length) return portfolioHistory;
            const now = new Date();
            const cutoff = new Date(now);
            if (activePeriod === '1D') cutoff.setDate(now.getDate() - 1);
            else if (activePeriod === '1W') cutoff.setDate(now.getDate() - 7);
            else if (activePeriod === '1M') cutoff.setMonth(now.getMonth() - 1);
            else if (activePeriod === '1Y') cutoff.setFullYear(now.getFullYear() - 1);
            const cutoffStr = cutoff.toISOString().split('T')[0];
            const filtered = portfolioHistory.filter(h => h.date >= cutoffStr);
            return filtered.length >= 2 ? filtered : portfolioHistory;
          })();
          const scrubEntry  = scrubIdx !== null ? histToRender[scrubIdx] : null;
          const displayVal  = scrubEntry ? scrubEntry.totalValue : totalValue;
          const displayDate = scrubEntry ? scrubEntry.date : null;
          const pnl    = displayVal - 50000;
          const pnlPct = (pnl / 50000) * 100;
          const color  = pnl >= 0 ? 'var(--green)' : 'var(--color-down)';
          const arrow  = pnl >= 0 ? '▲' : '▼';
          return (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '34px', color: 'var(--t1)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {formatCash(displayVal)}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '18px', color }}>
                  {arrow} {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--t5)', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
                {displayDate
                  ? displayDate
                  : `P&L ${pnl >= 0 ? '+' : ''}${formatCash(pnl)} · ${t.portfolio.cash} ${formatCash(portfolio.cash)} · ${t.portfolio.invested} ${formatCash(totalInvested)}`}
              </div>
            </>
          );
        })()}
      </div>

      {/* Chart — full bleed */}
      <div style={{ marginTop: '16px', position: 'relative', zIndex: 2 }}>
        {portfolio !== null && (() => {
          if (portfolioHistory.length <= 1) {
            return (
              <div style={{ position: 'relative' }}>
                <svg width="100%" height={80} viewBox="0 0 1000 80" preserveAspectRatio="none" style={{ display: 'block' }}>
                  <line x1="0" y1="40" x2="1000" y2="40" stroke="white" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="5,5" vectorEffect="non-scaling-stroke" />
                </svg>
                <div style={{ textAlign: 'center', paddingBottom: '14px', fontSize: '11px', color: 'var(--t5)', fontFamily: 'var(--font-body)' }}>
                  {t.portfolio.notEnoughHistory}
                </div>
              </div>
            );
          }

          const CHART_H = 240;
          const VW      = 1000;
          const INITIAL = 50000;

          const histToRender = (() => {
            if (activePeriod === 'Max' || !portfolioHistory.length) return portfolioHistory;
            const now = new Date();
            const cutoff = new Date(now);
            if (activePeriod === '1D') cutoff.setDate(now.getDate() - 1);
            else if (activePeriod === '1W') cutoff.setDate(now.getDate() - 7);
            else if (activePeriod === '1M') cutoff.setMonth(now.getMonth() - 1);
            else if (activePeriod === '1Y') cutoff.setFullYear(now.getFullYear() - 1);
            const cutoffStr = cutoff.toISOString().split('T')[0];
            const filtered = portfolioHistory.filter(h => h.date >= cutoffStr);
            return filtered.length >= 2 ? filtered : portfolioHistory;
          })();

          const values = histToRender.map(h => h.totalValue);
          const n      = values.length;

          const allVals    = [...values, INITIAL];
          const rawMin     = Math.min(...allVals);
          const rawMax     = Math.max(...allVals);
          const dataRange  = rawMax - rawMin || 1;
          const pad        = dataRange * 0.08;
          const minV       = rawMin - pad;
          const maxV       = rawMax + pad;
          const totalRange = maxV - minV;

          const toY = v => CHART_H - ((v - minV) / totalRange) * CHART_H;
          const toX = i => (n > 1 ? i / (n - 1) : 0.5) * VW;

          const isUp      = values[n - 1] >= INITIAL;
          const lineColor = isUp ? 'var(--green)' : 'var(--color-down)';
          const glowColor = isUp ? 'rgba(0,229,160,0.2)' : 'rgba(224,85,133,0.2)';

          const refY           = toY(INITIAL);
          const polylinePoints = values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

          const activeScrub = scrubIdx !== null && scrubIdx >= 0 && scrubIdx < n;
          const hairX       = activeScrub ? toX(scrubIdx) : null;
          const dotY        = activeScrub ? toY(values[scrubIdx]) : null;

          function getIdxFromClientX(clientX, el) {
            const rect = el.getBoundingClientRect();
            const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            return Math.round(frac * (n - 1));
          }

          const PERIOD_KEYS = ['1D', '1W', '1M', '1Y', 'Max'];
          const PERIOD_LABELS = { en: ['1D', '1W', '1M', '1Y', 'Max'], es: ['1D', '1S', '1M', '1A', 'Máx'], de: ['1T', '1W', '1M', '1J', 'Max'] };
          const pLabels = PERIOD_LABELS[lang] || PERIOD_LABELS.en;

          return (
            <>
              <div
                style={{ position: 'relative', touchAction: 'pan-y', userSelect: 'none' }}
                onMouseDown={e => setScrubIdx(getIdxFromClientX(e.clientX, e.currentTarget))}
                onMouseMove={e => { if (e.buttons === 1) setScrubIdx(getIdxFromClientX(e.clientX, e.currentTarget)); }}
                onMouseUp={() => setScrubIdx(null)}
                onMouseLeave={() => setScrubIdx(null)}
                onTouchStart={e => { e.currentTarget._tX = e.touches[0].clientX; e.currentTarget._tY = e.touches[0].clientY; setScrubIdx(getIdxFromClientX(e.touches[0].clientX, e.currentTarget)); }}
                onTouchMove={e => { const dx = Math.abs(e.touches[0].clientX - (e.currentTarget._tX || 0)); const dy = Math.abs(e.touches[0].clientY - (e.currentTarget._tY || 0)); if (dx > dy) { e.preventDefault(); setScrubIdx(getIdxFromClientX(e.touches[0].clientX, e.currentTarget)); } }}
                onTouchEnd={() => setScrubIdx(null)}
                onTouchCancel={() => setScrubIdx(null)}
              >
                <svg
                  width="100%"
                  height={CHART_H}
                  viewBox={`0 0 ${VW} ${CHART_H}`}
                  preserveAspectRatio="none"
                  style={{ display: 'block' }}
                >
                  <line
                    x1="0" y1={refY} x2={VW} y2={refY}
                    stroke="white" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="5,5"
                    vectorEffect="non-scaling-stroke"
                  />
                  <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {activeScrub && (
                    <line
                      x1={hairX} y1="0" x2={hairX} y2={CHART_H}
                      stroke="white" strokeOpacity="0.25" strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </svg>
                {activeScrub && (
                  <div style={{
                    position: 'absolute',
                    left: `${(scrubIdx / (n - 1)) * 100}%`,
                    top: `${(dotY / CHART_H) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '10px', height: '10px',
                    borderRadius: '50%',
                    background: lineColor,
                    border: '2px solid #111',
                    boxShadow: `0 0 0 3px ${glowColor}`,
                    pointerEvents: 'none',
                    zIndex: 2,
                  }} />
                )}
              </div>
              {/* Period selector */}
              <div style={{ display: 'flex', justifyContent: 'space-around', padding: '6px 20px 2px' }}>
                {PERIOD_KEYS.map((key, idx) => (
                  <button
                    key={key}
                    onClick={() => { setActivePeriod(key); setScrubIdx(null); }}
                    style={{
                      background: 'transparent', border: 'none', padding: '4px 8px',
                      fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer',
                      fontWeight: activePeriod === key ? 800 : 400,
                      color: activePeriod === key ? 'var(--t1)' : 'var(--t5)',
                    }}
                  >
                    {pLabels[idx]}
                  </button>
                ))}
              </div>
            </>
          );
        })()}
      </div>

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
              style={{ flexShrink: 0, padding: '12px 10px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === id ? 'var(--green)' : 'transparent'}`, color: tab === id ? 'var(--t1)' : 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: tab === id ? 800 : 400, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
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
          <div style={{ display: 'flex', gap: '4px', padding: '10px 20px', overflowX: 'auto' }}>
            {[
              ['all',         t.portfolio.all],
              ['stocks',      t.portfolio.stocks],
              ['indices',     t.portfolio.indices],
              ['crypto',      t.portfolio.crypto],
              ['commodities', t.portfolio.commodities],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)}
                style={{ padding: '5px 12px', borderRadius: '6px', whiteSpace: 'nowrap', border: 'none', background: filter === id ? 'rgba(255,255,255,0.08)' : 'transparent', color: filter === id ? 'var(--t1)' : 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: filter === id ? 800 : 400, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '0 20px 40px' }}>
            {/* Search bar */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t5)', pointerEvents: 'none', fontSize: '14px' }}>⌕</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.portfolio.searchAsset}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 16px 9px 32px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '20px', color: 'var(--t1)', fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none' }}
              />
            </div>
            {!pricesReady
              ? Array.from({ length: EXPECTED_COUNTS[filter] }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', marginBottom: '8px' }}>
                    <div className="skeleton-bar" style={{ width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0 }} />
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
              : (() => {
                  const q = searchQuery.trim().toLowerCase();
                  const displayPrices = q
                    ? prices.filter(p => p.name.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q))
                    : filteredPrices;

                  const renderRow = asset => {
                    const status    = getMarketStatus(asset.type, t);
                    const info      = ASSET_INFO[asset.symbol];
                    const infoLang  = t.portfolio.buy === 'Buy' ? 'en' : t.portfolio.buy === 'Comprar' ? 'es' : 'de';
                    const tooltip   = info?.[infoLang]?.split('.')[0];
                    const isHovered = hoveredSymbol === asset.symbol;
                    const hasPendingOrder = pendingOrders.some(o => o.status === 'pending' && o.symbol === asset.symbol);
                    return (
                      <div key={asset.symbol} style={{ position: 'relative', marginBottom: '0' }}>
                        <div onClick={() => openAsset(asset)}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredSymbol(asset.symbol)}
                          onMouseLeave={() => setHoveredSymbol(null)}
                        >
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: TYPE_COLORS[asset.type], fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '10px', letterSpacing: '-0.01em' }}>
                            {asset.symbol.slice(0, 5)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {asset.name}
                              {hasPendingOrder && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color: 'var(--color-neutral)', background: 'rgba(232,184,75,0.12)', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                                  <Clock size={11} strokeWidth={2} aria-hidden />
                                  {t.portfolio.pendingOrderBadge}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--t5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {asset.symbol}
                              {!status.open && asset.type !== 'crypto' && <span style={{ fontSize: '11px', color: 'var(--t6)' }}>{t.portfolio.marketClosed}</span>}
                              {asset.type === 'crypto' && <span style={{ fontSize: '11px', color: 'var(--t6)' }}>{t.portfolio.market247}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--t1)' }}>{formatPrice(asset.price, asset.type)}</div>
                            <div style={{ fontSize: '12px', color: asset.change >= 0 ? 'var(--green)' : 'var(--color-down)', fontWeight: 700 }}>{asset.change >= 0 ? '▲' : '▼'} {Math.abs(asset.change ?? 0).toFixed(2)}%</div>
                          </div>
                        </div>
                        {isHovered && tooltip && (
                          <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', color: 'var(--t3)', lineHeight: 1.5, zIndex: 50, pointerEvents: 'none' }}>
                            {tooltip}
                          </div>
                        )}
                      </div>
                    );
                  };

                  if (filter === 'all' && !q) {
                    const groups = [
                      { key: 'stock',     label: t.portfolio.stocks },
                      { key: 'index',     label: t.portfolio.indices },
                      { key: 'crypto',    label: t.portfolio.crypto },
                      { key: 'commodity', label: t.portfolio.commodities },
                    ];
                    return groups.map(group => {
                      const items = displayPrices.filter(p => p.type === group.key);
                      if (!items.length) return null;
                      return (
                        <div key={group.key} style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)', fontWeight: 700, padding: '8px 0 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{group.label}</span>
                            <span style={{ fontSize: '14px' }}>›</span>
                          </div>
                          {items.map(renderRow)}
                        </div>
                      );
                    });
                  }
                  return displayPrices.map(renderRow);
                })()
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
                  style={{ marginBottom: '4px', overflow: 'hidden' }}>
                  {/* Clickable main area */}
                  <div onClick={() => openAsset(prices.find(p => p.symbol === pos.symbol))} style={{ padding: '10px 0', cursor: 'pointer' }}>
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
                            {pos.pnl >= 0 ? '▲' : '▼'} {pos.pnl >= 0 ? '+' : ''}{formatCash(pos.pnl)} ({formatChange(pos.pnlPct)})
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
                  <div style={{ padding: '4px 0 10px', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '34px' }}>
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
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ marginBottom: '12px' }}><Trophy size={32} strokeWidth={2} aria-hidden style={{ stroke: 'var(--color-neutral)' }} /></div>
              <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)' }}>{t.portfolio.noLeaderboard}</div>
            </div>
          ) : (
            <LeaderboardList entries={leaderboard} userPosition={userPositionGlobal} user={user} onViewProfile={onViewProfile} t={t} />
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
                    <div style={{ fontSize: '12px', color: 'var(--t5)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.username || p.name}<SpecialBadge specialUser={getSpecialUserByUsername(p.username)} size={9} /></div>
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
                    <div style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--t1)', display: 'flex', alignItems: 'center' }}>{f.username || f.name}<SpecialBadge specialUser={getSpecialUserByUsername(f.username)} size={11} /></div>
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
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--bd)', marginBottom: '0' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: tx.action === 'buy' ? 'rgba(0,229,160,0.08)' : 'rgba(255,126,179,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0, color: tx.action === 'buy' ? 'var(--green)' : 'var(--color-down)' }}>
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
                <div key={order._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--bd)', marginBottom: '0' }}>
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