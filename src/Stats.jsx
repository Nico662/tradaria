import { useState, useEffect } from 'react';
import { SERVER } from './config.js';
import { getUnlocked, BADGES } from './badges.js';
import { useLang } from './LangContext.jsx';

function StatCard({ label, value, color = 'var(--t1)', sub }) {
  return (
    <div style={{ background: 'var(--bg-page)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '16px 12px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color, lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: '8px', color: 'var(--t5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '4px' }}>{label}</div>
      {sub && <div style={{ fontSize: '8px', color: 'var(--t6)', marginTop: '2px' }}>{sub}</div>}
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
          <stop offset="0%" stopColor="var(--green)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#trendGrad)" />
      <path d={path} fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {trend.map((v, i) => {
        const [x, y] = pts[i].split(',');
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--green)" />;
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
    const token = localStorage.getItem('tradaria_token');
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
    <div id="gtm-root" style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="scanlines" />
      <div style={{ padding: '0 0 48px', position: 'relative', zIndex: 2 }}>

        {/* Header */}
        <div className="header" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', alignItems: 'center', padding: '12px 20px 10px' }}>
          <button onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0, textAlign: 'left', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--t2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t6)'}
          >{t.stats.back}</button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--green)', letterSpacing: '0.08em', lineHeight: 1, textShadow: '0 0 10px rgba(0,229,160,0.2)' }}>
              📊 {t.stats.title}
            </div>
            <div style={{ fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '3px', fontFamily: "'Space Mono', monospace" }}>
              STATS MODE
            </div>
          </div>

          <div />
        </div>

        <div style={{ padding: '20px 28px 0' }}>
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--t6)', fontSize: '11px', marginTop: '60px', fontFamily: "'Space Mono', monospace" }}>loading...</div>
          )}

          {error === 'login' && (
            <div style={{ textAlign: 'center', color: 'var(--t5)', fontSize: '11px', marginTop: '60px', fontFamily: "'Space Mono', monospace" }}>
              <div style={{ marginBottom: '8px' }}>{t.stats.signIn}</div>
              <div style={{ fontSize: '9px', color: 'var(--t6)' }}>{t.stats.signInSub}</div>
            </div>
          )}

          {error === true && (
            <div style={{ textAlign: 'center', color: 'var(--color-down)', fontSize: '11px', marginTop: '60px', fontFamily: "'Space Mono', monospace" }}>
              {t.stats.error}
            </div>
          )}

          {data && (
            <>
              {/* Summary grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
                <StatCard label={t.stats.games}       value={data.totalGames}       color="var(--t1)" />
                <StatCard label={t.stats.avgAccuracy} value={`${data.avgAccuracy}%`} color="var(--green)" />
                <StatCard label={t.stats.bestStreak}  value={`${data.bestStreak}x`} color="var(--color-neutral)" />
                <StatCard label={t.stats.bestScore}   value={data.bestScore}        color="var(--t1)" />
              </div>

              {/* Accuracy trend */}
              {data.accuracyTrend?.length >= 2 && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px', fontFamily: "'Space Mono', monospace" }}>
                    {t.stats.lastGames} {data.accuracyTrend.length} {t.stats.lastGamesSuffix}
                  </div>
                  <AccuracyGraph trend={data.accuracyTrend} />
                </div>
              )}

              {/* Per mode */}
              {data.modeCounts && Object.keys(data.modeCounts).length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>
                    {t.stats.byMode}
                  </div>
                  {Object.entries(data.modeCounts).sort((a, b) => b[1] - a[1]).map(([mode, count]) => (
                    <div key={mode} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px' }}>{MODE_ICONS[mode] || '🎮'}</span>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: 'var(--t1)' }}>{MODE_LABELS[mode] || mode}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--green)' }}>{count}</div>
                        <div style={{ fontSize: '8px', color: 'var(--t6)' }}>{t.stats.plays}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent badges */}
              {recentBadges.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>
                    {t.stats.recentBadges}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {recentBadges.map(b => (
                      <div key={b.id} style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '12px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', marginBottom: '4px' }}>{b.icon}</div>
                        <div style={{ fontSize: '8px', color: 'var(--t1)', fontFamily: "'Space Mono', monospace", lineHeight: 1.3 }}>{b.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Global comparison */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>
                  {t.stats.globalComparison}
                </div>
                {data.totalGames > 0 ? (
                  <>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: 'var(--green)' }}>
                      Top {100 - (data.betterThan || 50)}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#5a6a7d', marginTop: '4px', fontFamily: "'Space Mono', monospace" }}>
                      {t.stats.betterThan} {data.betterThan}{t.stats.betterThanSuffix}
                    </div>
                    {data.winRate > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '9px', color: 'var(--t6)' }}>
                        {t.stats.arenaWinRate}: {data.winRate}%
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: '10px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace" }}>
                    {t.stats.playMore}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
