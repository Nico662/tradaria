import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';

const SERVER = 'https://tradara-production.up.railway.app';

const TYPE_COLORS = {
  stock:     '#378ADD',
  crypto:    '#f5c842',
  index:     '#22d3a5',
  commodity: '#f05454',
};

const TYPE_LABELS = {
  stock:     'Acción',
  crypto:    'Cripto',
  index:     'Índice',
  commodity: 'Materia prima',
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

export default function Portfolio({ onBack }) {
  const { user } = useAuth();
  const [screen, setScreen]         = useState('loading');
  const [prices, setPrices]         = useState([]);
  const [portfolio, setPortfolio]   = useState(null);
  const [selected, setSelected]     = useState(null);
  const [action, setAction]         = useState('buy');
  const [qty, setQty]               = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [filter, setFilter]         = useState('all');
  const [tab, setTab]               = useState('market');
  const [tradeMsg, setTradeMsg]     = useState('');

  const token = localStorage.getItem('tradara_token');

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
    } catch (err) {
      setScreen('error');
    }
  }, [token]);

  useEffect(() => {
    if (!user) { setScreen('login'); return; }
    loadAll();
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, [user, loadAll]);

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
      setTradeMsg(action === 'buy' ? '✓ Compra ejecutada' : '✓ Venta ejecutada');
      setTimeout(() => setTradeMsg(''), 2000);
      setQty('');
      await loadAll();
    } catch (err) {
      setError('Error de conexión');
    }
    setLoading(false);
  }

  // ── Login ────────────────────────────────────────────────────────
  if (screen === 'login') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 28px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '16px', background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>← menu</button>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#f0f0f0', marginBottom: '8px' }}>Portfolio Mode</div>
        <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '32px' }}>Sign in to start with $50,000</div>
        <a href={`${SERVER}/auth/google`} style={{ display: 'inline-block', padding: '12px 24px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', textDecoration: 'none', fontWeight: 700 }}>
          Sign in with Google
        </a>
      </div>
    </div>
  );

  // ── Loading ──────────────────────────────────────────────────────
  if (screen === 'loading') return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 28px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: '11px', color: '#4a5568', fontFamily: "'Space Mono', monospace" }}>loading portfolio...</div>
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

  // ── Calcular valor total del portfolio ───────────────────────────
  const positionsWithValue = (portfolio?.positions || []).map(pos => {
    const priceData = prices.find(p => p.symbol === pos.symbol);
    const currentPrice = priceData?.price || pos.avgPrice;
    const value        = currentPrice * pos.qty;
    const cost         = pos.avgPrice * pos.qty;
    const pnl          = value - cost;
    const pnlPct       = (pnl / cost) * 100;
    return { ...pos, currentPrice, value, cost, pnl, pnlPct, priceData };
  });

  const totalValue     = (portfolio?.cash || 0) + positionsWithValue.reduce((s, p) => s + p.value, 0);
  const totalInvested  = positionsWithValue.reduce((s, p) => s + p.cost, 0);
  const totalPnl       = positionsWithValue.reduce((s, p) => s + p.pnl, 0);
  const totalPnlPct    = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const filteredPrices = filter === 'all' ? prices : prices.filter(p => p.type === filter);

  const selectedPrice  = selected ? prices.find(p => p.symbol === selected.symbol) : null;
  const selectedPos    = selected ? positionsWithValue.find(p => p.symbol === selected.symbol) : null;
  const tradeTotal     = selectedPrice && qty ? selectedPrice.price * parseFloat(qty) : 0;

  // ── Main ─────────────────────────────────────────────────────────
  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />

      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2530', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
        <button onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em' }}
          onMouseEnter={e => e.target.style.color = '#e2e8f0'}
          onMouseLeave={e => e.target.style.color = '#3a4455'}
        >← menu</button>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: '#f0f0f0' }}>💼 Portfolio</div>
        <div style={{ fontSize: '10px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
          {formatCash(totalValue)}
        </div>
      </div>

      {/* Portfolio summary */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2530', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '8px', color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Cash</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: '#f0f0f0' }}>{formatCash(portfolio?.cash || 0)}</div>
          </div>
          <div style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '8px', color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Invertido</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: '#f0f0f0' }}>{formatCash(totalInvested)}</div>
          </div>
          <div style={{ background: '#0f141b', border: `1px solid ${totalPnl >= 0 ? '#22d3a5' : '#f05454'}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '8px', color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>P&L</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: totalPnl >= 0 ? '#22d3a5' : '#f05454' }}>
              {totalPnl >= 0 ? '+' : ''}{formatCash(totalPnl)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e2530', position: 'relative', zIndex: 2 }}>
        {[['market', '📈 Mercado'], ['portfolio', '💼 Mis posiciones'], ['history', '📋 Historial']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: '12px 8px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === id ? '#22d3a5' : 'transparent'}`, color: tab === id ? '#22d3a5' : '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Mercado ── */}
      {tab === 'market' && (
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: '6px', padding: '12px 20px', overflowX: 'auto' }}>
            {[['all','Todo'],['stock','Acciones'],['index','Índices'],['crypto','Cripto'],['commodity','Materias']].map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)}
                style={{ padding: '5px 12px', borderRadius: '20px', whiteSpace: 'nowrap', border: `1px solid ${filter === id ? '#22d3a5' : '#2a3345'}`, background: filter === id ? 'rgba(34,211,165,0.08)' : 'transparent', color: filter === id ? '#22d3a5' : '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Lista de activos */}
          <div style={{ padding: '0 20px 100px' }}>
            {filteredPrices.map(asset => (
              <div key={asset.symbol} onClick={() => { setSelected(asset); setQty(''); setError(''); setAction('buy'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: selected?.symbol === asset.symbol ? 'rgba(34,211,165,0.04)' : '#0f141b', border: `1px solid ${selected?.symbol === asset.symbol ? '#22d3a5' : '#1e2530'}`, borderRadius: '8px', marginBottom: '6px', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${TYPE_COLORS[asset.type]}15`, border: `1px solid ${TYPE_COLORS[asset.type]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                  {TYPE_EMOJIS[asset.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '12px', color: '#f0f0f0' }}>{asset.name}</div>
                  <div style={{ fontSize: '9px', color: '#4a5568', letterSpacing: '0.06em' }}>{asset.symbol} · {TYPE_LABELS[asset.type]}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: '#f0f0f0' }}>{formatPrice(asset.price, asset.type)}</div>
                  <div style={{ fontSize: '10px', color: asset.change >= 0 ? '#22d3a5' : '#f05454', fontWeight: 700 }}>{formatChange(asset.change)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Panel de compra/venta */}
          {selected && (
            <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#0a0c0f', borderTop: '1px solid #1e2530', padding: '16px 20px', zIndex: 100 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: '#f0f0f0' }}>{selected.name}</div>
                  <div style={{ fontSize: '9px', color: '#4a5568' }}>{formatPrice(selectedPrice?.price, selected.type)}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                <button onClick={() => setAction('buy')} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${action === 'buy' ? '#22d3a5' : '#2a3345'}`, background: action === 'buy' ? 'rgba(34,211,165,0.08)' : 'transparent', color: action === 'buy' ? '#22d3a5' : '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>Comprar</button>
                <button onClick={() => setAction('sell')} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${action === 'sell' ? '#f05454' : '#2a3345'}`, background: action === 'sell' ? 'rgba(240,84,84,0.08)' : 'transparent', color: action === 'sell' ? '#f05454' : '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>Vender</button>
              </div>

              {selectedPos && (
                <div style={{ fontSize: '9px', color: '#4a5568', marginBottom: '8px' }}>
                  Posición actual: <span style={{ color: '#f0f0f0' }}>{selectedPos.qty} · {formatCash(selectedPos.value)}</span>
                  <span style={{ color: selectedPos.pnl >= 0 ? '#22d3a5' : '#f05454', marginLeft: '8px' }}>
                    {selectedPos.pnl >= 0 ? '+' : ''}{formatCash(selectedPos.pnl)} ({formatChange(selectedPos.pnlPct)})
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="number" value={qty} onChange={e => setQty(e.target.value)}
                  placeholder="Cantidad" min="0" step="0.01"
                  style={{ flex: 1, background: '#0f141b', border: '1px solid #2a3345', borderRadius: '6px', padding: '10px 12px', color: '#e2e8f0', fontFamily: "'Space Mono', monospace", fontSize: '12px', outline: 'none' }}
                />
                <button onClick={() => {
                  if (action === 'buy' && selectedPrice?.price) {
                    setQty((Math.floor((portfolio.cash / selectedPrice.price) * 100) / 100).toString());
                  } else if (action === 'sell' && selectedPos) {
                    setQty(selectedPos.qty.toString());
                  }
                }} style={{ padding: '10px 12px', background: '#0f141b', border: '1px solid #2a3345', borderRadius: '6px', color: '#8899b0', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Max
                </button>
              </div>

              {qty && parseFloat(qty) > 0 && (
                <div style={{ fontSize: '10px', color: '#6b7a8d', marginBottom: '8px' }}>
                  Total: <span style={{ color: '#f0f0f0', fontWeight: 700 }}>{formatCash(tradeTotal)}</span>
                  {action === 'buy' && <span style={{ color: '#4a5568', marginLeft: '8px' }}>Cash restante: {formatCash((portfolio?.cash || 0) - tradeTotal)}</span>}
                </div>
              )}

              {error && <div style={{ fontSize: '10px', color: '#f05454', marginBottom: '8px' }}>{error}</div>}
              {tradeMsg && <div style={{ fontSize: '10px', color: '#22d3a5', marginBottom: '8px' }}>{tradeMsg}</div>}

              <button onClick={handleTrade} disabled={loading || !qty || parseFloat(qty) <= 0}
                style={{ width: '100%', padding: '12px', background: loading ? '#0f141b' : action === 'buy' ? 'rgba(34,211,165,0.08)' : 'rgba(240,84,84,0.08)', border: `1px solid ${action === 'buy' ? '#22d3a5' : '#f05454'}`, borderRadius: '6px', color: action === 'buy' ? '#22d3a5' : '#f05454', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || !qty || parseFloat(qty) <= 0 ? 0.4 : 1 }}>
                {loading ? '...' : action === 'buy' ? `Comprar ${selected.name}` : `Vender ${selected.name}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Mis posiciones ── */}
      {tab === 'portfolio' && (
        <div style={{ padding: '16px 20px 40px', position: 'relative', zIndex: 2 }}>
          {positionsWithValue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
              <div style={{ fontSize: '11px', color: '#4a5568', fontFamily: "'Space Mono', monospace" }}>no tienes posiciones abiertas</div>
              <button onClick={() => setTab('market')} style={{ marginTop: '16px', padding: '10px 20px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                Ir al mercado →
              </button>
            </div>
          ) : (
            positionsWithValue.map(pos => (
              <div key={pos.symbol} onClick={() => { setSelected(prices.find(p => p.symbol === pos.symbol)); setTab('market'); setQty(''); setError(''); setAction('sell'); }}
                style={{ background: '#0f141b', border: `1px solid ${pos.pnl >= 0 ? 'rgba(34,211,165,0.3)' : 'rgba(240,84,84,0.3)'}`, borderRadius: '8px', padding: '14px', marginBottom: '8px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: '#f0f0f0' }}>{pos.name}</div>
                    <div style={{ fontSize: '9px', color: '#4a5568' }}>{pos.qty} unidades · precio medio {formatPrice(pos.avgPrice, pos.type)}</div>
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

      {/* ── Historial ── */}
      {tab === 'history' && (
        <div style={{ padding: '16px 20px 40px', position: 'relative', zIndex: 2 }}>
          {(!portfolio?.transactions || portfolio.transactions.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
              <div style={{ fontSize: '11px', color: '#4a5568', fontFamily: "'Space Mono', monospace" }}>sin transacciones aún</div>
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
                    {tx.qty} × {formatPrice(tx.price, tx.type)} · {new Date(tx.date).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: tx.action === 'buy' ? '#f05454' : '#22d3a5' }}>
                    {tx.action === 'buy' ? '-' : '+'}{formatCash(tx.total)}
                  </div>
                  <div style={{ fontSize: '9px', color: tx.action === 'buy' ? '#22d3a5' : '#f05454', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {tx.action === 'buy' ? 'compra' : 'venta'}
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