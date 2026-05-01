import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import Chart from './Chart.jsx';

const SERVER = 'https://tradara-production.up.railway.app';

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
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export default function Portfolio({ onBack }) {
  const { user } = useAuth();
  const { t } = useLang();
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
  const [assetCandles, setAssetCandles]     = useState(null);
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [leaderboard, setLeaderboard]       = useState([]);
  const [showWelcome, setShowWelcome]       = useState(() => !localStorage.getItem('tradara_portfolio_welcomed'));
  const chartRef = useRef(null);

  const token = localStorage.getItem('tradara_token');

  function dismissWelcome() {
    localStorage.setItem('tradara_portfolio_welcomed', 'true');
    setShowWelcome(false);
  }

  const loadAll = useCallback(async () => {
    try {
      const [pricesRes, portfolioRes] = await Promise.all([
        fetch(`${SERVER}/portfolio/prices`),
        fetch(`${SERVER}/portfolio`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const pricesData    = await pricesRes.json();
      const portfolioData = await portfolioRes.json();
      setPrices(pricesData);
      setPortfolio(portfolioData);
      setScreen('main');

      const tv = portfolioData.cash + (portfolioData.positions || []).reduce((s, pos) => {
        const p = pricesData.find(p => p.symbol === pos.symbol);
        return s + (p?.price || pos.avgPrice) * pos.qty;
      }, 0);
      fetch(`${SERVER}/portfolio/snapshot`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalValue: tv }),
      }).catch(() => {});

      fetch(`${SERVER}/portfolio/history`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(data => {
        if (Array.isArray(data)) setPortfolioHistory(data);
      }).catch(() => {});

      fetch(`${SERVER}/portfolio/leaderboard`)
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setLeaderboard(data); })
        .catch(() => {});

    } catch {
      setScreen('error');
    }
  }, [token]);

  useEffect(() => {
    if (!user) { setScreen('login'); return; }
    loadAll();
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, [user, loadAll]);

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
      const res  = await fetch(`${SERVER}/portfolio/${action}`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symbol: selected.symbol, qty: parseFloat(qty) }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); setLoading(false); return; }
      setTradeMsg(action === 'buy' ? '✓ ' + t.portfolio.purchase : '✓ ' + t.portfolio.sale);
      setTimeout(() => setTradeMsg(''), 2000);
      setQty('');
      await loadAll();
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  }

  // ── Welcome ──────────────────────────────────────────────────────
  if (showWelcome) return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 28px', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', marginBottom: '32px', display: 'block' }}>
          ← menu
        </button>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>💼</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: '#f0f0f0', marginBottom: '8px' }}>
            Portfolio Mode
          </div>
          <div style={{ fontSize: '11px', color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {t.portfolio.sub}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
          {[
            { emoji: '💵', title: '$50,000', desc: t.portfolio.welcomePoint1 },
            { emoji: '📊', title: t.portfolio.welcomePoint2title, desc: t.portfolio.welcomePoint2 },
            { emoji: '📈', title: t.portfolio.welcomePoint3title, desc: t.portfolio.welcomePoint3 },
            { emoji: '🎓', title: t.portfolio.welcomePoint4title, desc: t.portfolio.welcomePoint4 },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '10px' }}>
              <div style={{ fontSize: '24px', flexShrink: 0 }}>{item.emoji}</div>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: '#f0f0f0', marginBottom: '4px' }}>{item.title}</div>
                <div style={{ fontSize: '10px', color: '#4a5568', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={dismissWelcome}
          style={{ width: '100%', padding: '16px', background: 'rgba(55,138,221,0.08)', border: '1px solid #378ADD', borderRadius: '8px', color: '#378ADD', fontFamily: "'Space Mono', monospace", fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
          {t.portfolio.welcomeStart} →
        </button>
      </div>
    </div>
  );

  // ── Login ────────────────────────────────────────────────────────
  if (screen === 'login') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 28px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '16px', background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>← menu</button>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#f0f0f0', marginBottom: '8px' }}>{t.portfolio.title}</div>
        <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '32px' }}>{t.portfolio.signIn}</div>
        <a href={`${SERVER}/auth/google`} style={{ display: 'inline-block', padding: '12px 24px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', textDecoration: 'none', fontWeight: 700 }}>
          Sign in with Google
        </a>
      </div>
    </div>
  );

  if (screen === 'loading') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 28px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: '11px', color: '#4a5568', fontFamily: "'Space Mono', monospace" }}>{t.portfolio.loading}</div>
      </div>
    </div>
  );

  if (screen === 'error') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 28px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '16px', background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>← menu</button>
        <div style={{ fontSize: '11px', color: '#f05454', fontFamily: "'Space Mono', monospace" }}>error loading portfolio</div>
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
  const totalPnl      = positionsWithValue.reduce((s, p) => s + p.pnl, 0);
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
  const tradeTotal     = selectedPrice && qty ? selectedPrice.price * parseFloat(qty) : 0;

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
    return (
      <div id="gtm-root" style={{ position: 'relative' }}>
        <div className="scanlines" />

        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2530', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 2 }}>
          <button onClick={() => { setSelected(null); setAssetCandles(null); }}
            style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}
            onMouseEnter={e => e.target.style.color = '#e2e8f0'}
            onMouseLeave={e => e.target.style.color = '#3a4455'}
          >← back</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#f0f0f0' }}>{selected.name}</div>
            <div style={{ fontSize: '9px', color: '#4a5568', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {selected.symbol} · {t.portfolio.types[selected.type]}
              <span style={{ fontSize: '8px', color: marketStatus.open ? '#22d3a5' : '#f05454', background: marketStatus.open ? 'rgba(34,211,165,0.1)' : 'rgba(240,84,84,0.1)', padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                {marketStatus.label}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#f0f0f0' }}>{formatPrice(selectedPrice?.price, selected.type)}</div>
            <div style={{ fontSize: '11px', color: selectedPrice?.change >= 0 ? '#22d3a5' : '#f05454', fontWeight: 700 }}>{formatChange(selectedPrice?.change)}</div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          {loadingCandles ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#3a4455', fontFamily: "'Space Mono', monospace" }}>
              loading chart...
            </div>
          ) : assetCandles && stableAsset ? (
            <Chart ref={chartRef} asset={stableAsset} externalCandles={assetCandles} />
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#3a4455', fontFamily: "'Space Mono', monospace" }}>
              no chart data
            </div>
          )}
        </div>

        {selectedPos && (
          <div style={{ margin: '0 20px 12px', padding: '12px', background: '#0f141b', border: `1px solid ${selectedPos.pnl >= 0 ? 'rgba(34,211,165,0.3)' : 'rgba(240,84,84,0.3)'}`, borderRadius: '8px', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '9px', color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>{t.portfolio.yourPosition}</div>
                <div style={{ fontSize: '12px', color: '#f0f0f0', fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>{selectedPos.qty} {t.portfolio.units}</div>
                <div style={{ fontSize: '9px', color: '#4a5568' }}>{t.portfolio.avgPrice} {formatPrice(selectedPos.avgPrice, selected.type)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontFamily: "'Syne', sans-serif", fontWeight: 800, color: '#f0f0f0' }}>{formatCash(selectedPos.value)}</div>
                <div style={{ fontSize: '11px', color: selectedPos.pnl >= 0 ? '#22d3a5' : '#f05454', fontWeight: 700 }}>
                  {selectedPos.pnl >= 0 ? '+' : ''}{formatCash(selectedPos.pnl)} ({formatChange(selectedPos.pnlPct)})
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ margin: '0 20px', padding: '16px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '10px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            <button onClick={() => setAction('buy')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${action === 'buy' ? '#22d3a5' : '#2a3345'}`, background: action === 'buy' ? 'rgba(34,211,165,0.08)' : 'transparent', color: action === 'buy' ? '#22d3a5' : '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>{t.portfolio.buy}</button>
            <button onClick={() => setAction('sell')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${action === 'sell' ? '#f05454' : '#2a3345'}`, background: action === 'sell' ? 'rgba(240,84,84,0.08)' : 'transparent', color: action === 'sell' ? '#f05454' : '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>{t.portfolio.sell}</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="number" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="0.00" min="0" step="0.01"
              style={{ flex: 1, background: '#0a0c0f', border: '1px solid #2a3345', borderRadius: '6px', padding: '10px 12px', color: '#e2e8f0', fontFamily: "'Space Mono', monospace", fontSize: '12px', outline: 'none' }}
            />
            <button onClick={() => {
              if (action === 'buy' && selectedPrice?.price) {
                setQty((Math.floor((portfolio.cash / selectedPrice.price) * 100) / 100).toString());
              } else if (action === 'sell' && selectedPos) {
                setQty(selectedPos.qty.toString());
              }
            }} style={{ padding: '10px 14px', background: '#0a0c0f', border: '1px solid #2a3345', borderRadius: '6px', color: '#8899b0', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t.portfolio.max}
            </button>
          </div>

          {qty && parseFloat(qty) > 0 && (
            <div style={{ fontSize: '10px', color: '#6b7a8d', marginBottom: '10px' }}>
              {t.portfolio.total}: <span style={{ color: '#f0f0f0', fontWeight: 700 }}>{formatCash(tradeTotal)}</span>
              {action === 'buy' && <span style={{ color: '#4a5568', marginLeft: '8px' }}>{t.portfolio.cashLeft}: {formatCash((portfolio?.cash || 0) - tradeTotal)}</span>}
            </div>
          )}

          <div style={{ fontSize: '10px', color: '#4a5568', marginBottom: '10px' }}>
            {t.portfolio.cashAvailable}: <span style={{ color: '#f0f0f0' }}>{formatCash(portfolio?.cash || 0)}</span>
          </div>

          {error && <div style={{ fontSize: '10px', color: '#f05454', marginBottom: '10px' }}>{error}</div>}
          {tradeMsg && <div style={{ fontSize: '10px', color: '#22d3a5', marginBottom: '10px' }}>{tradeMsg}</div>}

          <button onClick={handleTrade} disabled={loading || !qty || parseFloat(qty) <= 0}
            style={{ width: '100%', padding: '14px', background: loading ? '#0f141b' : action === 'buy' ? 'rgba(34,211,165,0.08)' : 'rgba(240,84,84,0.08)', border: `1px solid ${action === 'buy' ? '#22d3a5' : '#f05454'}`, borderRadius: '6px', color: action === 'buy' ? '#22d3a5' : '#f05454', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || !qty || parseFloat(qty) <= 0 ? 0.4 : 1 }}>
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

      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2530', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em' }}
          onMouseEnter={e => e.target.style.color = '#e2e8f0'}
          onMouseLeave={e => e.target.style.color = '#3a4455'}
        >← menu</button>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: '#f0f0f0' }}>💼 {t.portfolio.title}</div>
        <div style={{ fontSize: '10px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
          {formatCash(totalValue)}
        </div>
      </div>

      {/* Summary */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2530', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[
            { label: t.portfolio.cash,     value: formatCash(portfolio?.cash || 0), color: '#f0f0f0', border: '#1e2530' },
            { label: t.portfolio.invested, value: formatCash(totalInvested),         color: '#f0f0f0', border: '#1e2530' },
            { label: 'P&L',                value: (totalPnl >= 0 ? '+' : '') + formatCash(totalPnl), color: totalPnl >= 0 ? '#22d3a5' : '#f05454', border: totalPnl >= 0 ? 'rgba(34,211,165,0.3)' : 'rgba(240,84,84,0.3)' },
          ].map(s => (
            <div key={s.label} style={{ background: '#0f141b', border: `1px solid ${s.border}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '8px', color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico histórico */}
      {portfolioHistory.length > 1 && (
        <div style={{ padding: '16px 20px 0', position: 'relative', zIndex: 2 }}>
          <div style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '9px', color: '#6b7a8d', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Valor total</div>
              <div style={{ fontSize: '9px', color: portfolioHistory[portfolioHistory.length - 1].totalValue >= 50000 ? '#22d3a5' : '#f05454', fontWeight: 700 }}>
                {portfolioHistory[portfolioHistory.length - 1].totalValue >= 50000 ? '+' : ''}
                {((portfolioHistory[portfolioHistory.length - 1].totalValue - 50000) / 50000 * 100).toFixed(2)}% vs inicio
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
              <div style={{ fontSize: '8px', color: '#3a4455' }}>{portfolioHistory[0]?.date}</div>
              <div style={{ fontSize: '8px', color: '#3a4455' }}>{portfolioHistory[portfolioHistory.length - 1]?.date}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e2530', position: 'relative', zIndex: 2, marginTop: '16px' }}>
        {[
          ['market',     t.portfolio.market],
          ['portfolio',  t.portfolio.positions],
          ['leaderboard','🏆 Ranking'],
          ['history',    t.portfolio.history],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: '12px 4px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === id ? '#22d3a5' : 'transparent'}`, color: tab === id ? '#22d3a5' : '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Mercado ── */}
      {tab === 'market' && (
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', gap: '6px', padding: '12px 20px', overflowX: 'auto' }}>
            {[
              ['all', t.portfolio.all],
              ['stocks', t.portfolio.stocks],
              ['indices', t.portfolio.indices],
              ['crypto', t.portfolio.crypto],
              ['commodities', t.portfolio.commodities],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)}
                style={{ padding: '5px 12px', borderRadius: '20px', whiteSpace: 'nowrap', border: `1px solid ${filter === id ? '#22d3a5' : '#2a3345'}`, background: filter === id ? 'rgba(34,211,165,0.08)' : 'transparent', color: filter === id ? '#22d3a5' : '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '0 20px 40px' }}>
            {filteredPrices.map(asset => {
              const status = getMarketStatus(asset.type, t);
              return (
                <div key={asset.symbol} onClick={() => openAsset(asset)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', marginBottom: '6px', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = TYPE_COLORS[asset.type]}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2530'}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${TYPE_COLORS[asset.type]}15`, border: `1px solid ${TYPE_COLORS[asset.type]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                    {TYPE_EMOJIS[asset.type]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '12px', color: '#f0f0f0' }}>{asset.name}</div>
                    <div style={{ fontSize: '9px', color: '#4a5568', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {asset.symbol} · {t.portfolio.types[asset.type]}
                      <span style={{ fontSize: '8px', color: status.open ? '#22d3a5' : '#f05454', background: status.open ? 'rgba(34,211,165,0.1)' : 'rgba(240,84,84,0.1)', padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: '#f0f0f0' }}>{formatPrice(asset.price, asset.type)}</div>
                    <div style={{ fontSize: '10px', color: asset.change >= 0 ? '#22d3a5' : '#f05454', fontWeight: 700 }}>{formatChange(asset.change)}</div>
                  </div>
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
              <div style={{ fontSize: '11px', color: '#4a5568', fontFamily: "'Space Mono', monospace" }}>{t.portfolio.noPositions}</div>
              <button onClick={() => setTab('market')} style={{ marginTop: '16px', padding: '10px 20px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                {t.portfolio.goToMarket}
              </button>
            </div>
          ) : (
            positionsWithValue.map(pos => (
              <div key={pos.symbol} onClick={() => openAsset(prices.find(p => p.symbol === pos.symbol))}
                style={{ background: '#0f141b', border: `1px solid ${pos.pnl >= 0 ? 'rgba(34,211,165,0.3)' : 'rgba(240,84,84,0.3)'}`, borderRadius: '8px', padding: '14px', marginBottom: '8px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: '#f0f0f0' }}>{pos.name}</div>
                    <div style={{ fontSize: '9px', color: '#4a5568' }}>{pos.qty} {t.portfolio.units} · {t.portfolio.avgPrice} {formatPrice(pos.avgPrice, pos.type)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: '#f0f0f0' }}>{formatCash(pos.value)}</div>
                    <div style={{ fontSize: '10px', color: pos.pnl >= 0 ? '#22d3a5' : '#f05454', fontWeight: 700 }}>
                      {pos.pnl >= 0 ? '+' : ''}{formatCash(pos.pnl)} ({formatChange(pos.pnlPct)})
                    </div>
                  </div>
                </div>
                <div style={{ height: '3px', background: '#1e2530', borderRadius: '2px', overflow: 'hidden' }}>
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
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
              <div style={{ fontSize: '11px', color: '#4a5568', fontFamily: "'Space Mono', monospace" }}>
                aún no hay datos
              </div>
            </div>
          ) : (
            leaderboard.map((entry, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px',
                background: '#0f141b',
                border: `1px solid ${i === 0 ? '#f5c842' : i === 1 ? '#8899b0' : i === 2 ? '#cd7f32' : '#1e2530'}`,
                borderRadius: '8px', marginBottom: '8px',
              }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: i === 0 ? '#f5c842' : i === 1 ? '#8899b0' : i === 2 ? '#cd7f32' : '#3a4455', width: '24px', flexShrink: 0 }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                {entry.avatar ? (
                  <img src={entry.avatar} style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1e2530', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: '#f0f0f0' }}>{entry.name}</div>
                  <div style={{ fontSize: '9px', color: '#4a5568' }}>{formatCash(entry.totalValue)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: entry.returnPct >= 0 ? '#22d3a5' : '#f05454' }}>
                    {entry.returnPct >= 0 ? '+' : ''}{entry.returnPct.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Historial ── */}
      {tab === 'history' && (
        <div style={{ padding: '16px 20px 40px', position: 'relative', zIndex: 2 }}>
          {(!portfolio?.transactions || portfolio.transactions.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
              <div style={{ fontSize: '11px', color: '#4a5568', fontFamily: "'Space Mono', monospace" }}>{t.portfolio.noHistory}</div>
            </div>
          ) : (
            [...portfolio.transactions].reverse().map((tx, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', marginBottom: '6px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: tx.action === 'buy' ? 'rgba(34,211,165,0.1)' : 'rgba(240,84,84,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>
                  {tx.action === 'buy' ? '▲' : '▼'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '11px', color: '#f0f0f0' }}>{tx.name}</div>
                  <div style={{ fontSize: '9px', color: '#4a5568' }}>
                    {tx.qty} × {formatPrice(tx.price, tx.type)} · {new Date(tx.date).toLocaleDateString()}
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
    </div>
  );
}