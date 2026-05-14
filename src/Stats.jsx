import { useState, useEffect } from 'react';
import { SERVER } from './config.js';
import { getUnlocked, BADGES } from './badges.js';
import { useLang } from './LangContext.jsx';

function StatCard({ label, value, color = '#f0f0f0', sub }) {
  return (
    <div style={{ background: '#0a0c0f', border: '1px solid #1e2530', borderRadius: '10px', padding: '16px 12px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color, lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: '8px', color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '4px' }}>{label}</div>
      {sub && <div style={{ fontSize: '8px', color: '#3a4455', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function AccuracyGraph({ trend }) {
  if (!trend || trend.length < 2) return null;
  const W = 260, H = 60, pad = 8;
  const max = Math.max(...trend, 100);
  const min = Math.min(...trend, 0);
  const range = max - min || 1;
  const pts = trend.map((v, i) => {
    const x = pad + (i / (trend.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });
  const path = 'M' + pts.join('L');
  const area = `${path}L${W - pad},${H - pad}L${pad},${H - pad}Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3a5" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22d3a5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#trendGrad)" />
      <path d={path} fill="none" stroke="#22d3a5" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {trend.map((v, i) => {
        const [x, y] = pts[i].split(',');
        return <circle key={i} cx={x} cy={y} r="3" fill="#22d3a5" />;
      })}
    </svg>
  );
}

const MODE_LABELS = { guess: 'Guess', survival: 'Survival', daily: 'Daily', arena: 'Arena', tournament: 'Tournament' };
const MODE_ICONS  = { guess: '🎯', survival: '☠️', daily: '⚡', arena: '⚔️', tournament: '🏆' };

export default function Stats({ onBack }) {
  const { t } = useLang();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('tradara_token');
    if (!token) { setLoading(false); setError('login'); return; }
    fetch(`${SERVER}/stats/personal`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const recentBadges = getUnlocked()
    .map(id => BADGES.find(b => b.id === id))
    .filter(Boolean)
    .slice(-3)
    .reverse();

  return (
    <div id="gtm-root" style={{ position: 'relative', minHeight: '100vh', background: '#0a0c0f' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 28px 48px', position: 'relative', zIndex: 2 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <button onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.color = '#3a4455'}
          >← back</button>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#f0f0f0' }}>
            📊 Mis Stats
          </div>
          <div style={{ width: '40px' }} />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: '#3a4455', fontSize: '11px', marginTop: '60px', fontFamily: "'Space Mono', monospace" }}>loading...</div>
        )}

        {error === 'login' && (
          <div style={{ textAlign: 'center', color: '#4a5568', fontSize: '11px', marginTop: '60px', fontFamily: "'Space Mono', monospace" }}>
            <div style={{ marginBottom: '8px' }}>Sign in to track your stats</div>
            <div style={{ fontSize: '9px', color: '#3a4455' }}>Your progress is saved automatically once you log in</div>
          </div>
        )}

        {error === true && (
          <div style={{ textAlign: 'center', color: '#f05454', fontSize: '11px', marginTop: '60px', fontFamily: "'Space Mono', monospace" }}>
            Error loading stats. Try again later.
          </div>
        )}

        {data && (
          <>
            {/* Summary grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
              <StatCard label="Partidas"      value={data.totalGames}       color="#f0f0f0" />
              <StatCard label="Precisión media" value={`${data.avgAccuracy}%`} color="#22d3a5" />
              <StatCard label="Mejor racha"   value={`${data.bestStreak}x`} color="#f5c842" />
              <StatCard label="Mejor score"   value={data.bestScore}        color="#f0f0f0" />
            </div>

            {/* Accuracy trend */}
            {data.accuracyTrend?.length >= 2 && (
              <div style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px', fontFamily: "'Space Mono', monospace" }}>
                  Últimas {data.accuracyTrend.length} partidas — accuracy
                </div>
                <AccuracyGraph trend={data.accuracyTrend} />
              </div>
            )}

            {/* Per mode */}
            {data.modeCounts && Object.keys(data.modeCounts).length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>
                  Por modo
                </div>
                {Object.entries(data.modeCounts).sort((a, b) => b[1] - a[1]).map(([mode, count]) => (
                  <div key={mode} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px' }}>{MODE_ICONS[mode] || '🎮'}</span>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: '#f0f0f0' }}>{MODE_LABELS[mode] || mode}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: '#22d3a5' }}>{count}</div>
                      <div style={{ fontSize: '8px', color: '#3a4455' }}>partidas</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent badges */}
            {recentBadges.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>
                  Logros recientes
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {recentBadges.map(b => (
                    <div key={b.id} style={{ flex: 1, background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', marginBottom: '4px' }}>{b.icon}</div>
                      <div style={{ fontSize: '8px', color: '#f0f0f0', fontFamily: "'Space Mono', monospace", lineHeight: 1.3 }}>{b.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Global comparison */}
            <div style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>
                Comparativa global
              </div>
              {data.totalGames > 0 ? (
                <>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: '#22d3a5' }}>
                    Top {100 - (data.betterThan || 50)}%
                  </div>
                  <div style={{ fontSize: '10px', color: '#5a6a7d', marginTop: '4px', fontFamily: "'Space Mono', monospace" }}>
                    Tu precisión supera al {data.betterThan}% de jugadores
                  </div>
                  {data.winRate > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '9px', color: '#3a4455' }}>
                      Arena win rate: {data.winRate}%
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '10px', color: '#3a4455', fontFamily: "'Space Mono', monospace" }}>
                  Juega más partidas para ver tu comparativa
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
