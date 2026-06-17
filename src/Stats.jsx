import { useState, useEffect } from 'react';
import { SERVER } from './config.js';
import { getUnlocked, BADGES } from './badges.js';
import { useLang } from './LangContext.jsx';
import { useAuth } from './AuthContext';

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

export default function Stats({ onBack, onSelect }) {
  const { t } = useLang();
  const { user, activeCosmetics } = useAuth();
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
    <div id="gtm-root" style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)', padding: '0 0 24px', fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '22px', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{t.stats.title2}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '2px' }}>{t.stats.subtitle}</div>
        </div>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)' }}>
            {user?.customAvatar || user?.avatar ? (
              <img
                src={user.customAvatar || user.avatar}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt="foto de perfil"
              />
            ) : (
              <span style={{ fontSize: '24px' }}>👤</span>
            )}
          </div>
          {user?.username && (
            <div style={{ position: 'absolute', bottom: '-16px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
              @{user.username}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: '20px' }} />

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <div className="spinner" />
        </div>
      )}

      {error === 'login' && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', marginTop: '60px', padding: '0 24px' }}>
          <div style={{ marginBottom: '8px' }}>{t.stats.signIn}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{t.stats.signInSub}</div>
        </div>
      )}

      {error === true && (
        <div style={{ textAlign: 'center', color: 'var(--pink)', fontSize: '11px', marginTop: '60px' }}>
          {t.stats.error}
        </div>
      )}

      {data && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '0 16px 16px' }}>
            {[
              { label: t.stats.games,       value: data.totalGames,           color: 'var(--text-primary)' },
              { label: t.stats.accuracy,    value: `${data.avgAccuracy}%`,    color: data.avgAccuracy >= 50 ? 'var(--green)' : 'var(--pink)' },
              { label: t.stats.bestStreak,  value: data.bestStreak,           color: 'var(--pink)'  },
              { label: t.stats.bestScore,   value: data.bestScore,            color: 'var(--green)' },
            ].map(({ label, value, color }, i) => (
              <div key={label} className={`animate-fade-in-up stagger-${i + 1}`} style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '14px 12px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '26px', fontWeight: 900, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{value ?? '—'}</div>
              </div>
            ))}
          </div>

          {/* Accuracy trend */}
          {data.accuracyTrend?.length >= 2 && (
            <div style={{ margin: '0 16px 16px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>{t.stats.trend}</div>
              <AccuracyGraph trend={data.accuracyTrend} />
            </div>
          )}

          {/* Mode breakdown */}
          {data.modeCounts && Object.keys(data.modeCounts).length > 0 && (() => {
            const total = Object.values(data.modeCounts).reduce((s, v) => s + v, 0) || 1;
            return (
              <div style={{ margin: '0 16px 16px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>{t.stats.byMode}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(data.modeCounts).sort((a, b) => b[1] - a[1]).map(([mode, count]) => {
                    const pct = Math.round(count / total * 100);
                    return (
                      <div key={mode} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>{MODE_ICONS[mode] || '🎮'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>{MODE_LABELS[mode] || mode}</div>
                          <div style={{ height: '3px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', borderRadius: 'var(--radius-full)', transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{count}p</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Recent badges */}
          {recentBadges.length > 0 && (
            <div style={{ margin: '0 16px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t.stats.recentBadges}</div>
                <button onClick={() => onSelect?.('badges')}
                  style={{ background: 'transparent', border: 'none', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, color: 'var(--green)', cursor: 'pointer', letterSpacing: '0.06em' }}>
                  {t.stats.seeAll}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
                {recentBadges.map(badge => (
                  <div key={badge.id} style={{ flexShrink: 0, background: 'var(--bg-surface)', border: '0.5px solid var(--border-green)', borderRadius: 'var(--radius-md)', padding: '10px', textAlign: 'center', minWidth: '72px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{badge.icon}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800, color: 'var(--green)', letterSpacing: '0.06em', lineHeight: 1.3 }}>{badge.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Global comparison */}
          <div style={{ margin: '0 16px 16px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-pink)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>{t.stats.vsGlobal}</div>
            {data.totalGames > 0 ? (
              <>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '28px', color: 'var(--green)', letterSpacing: '-0.5px', lineHeight: 1 }}>
                  Top {100 - (data.betterThan || 50)}%
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
                  {t.stats.betterThan} {data.betterThan}{t.stats.betterThanSuffix}
                </div>
                {data.winRate > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '9px', color: 'var(--text-muted)' }}>
                    {t.stats.arenaWinRate}: <span style={{ color: data.winRate >= 50 ? 'var(--green)' : 'var(--pink)', fontWeight: 900 }}>{data.winRate}%</span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {t.stats.playMore}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
