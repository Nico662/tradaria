import { useState, useEffect } from 'react';
import { SERVER } from './config.js';
import { getUnlocked, BADGES } from './badges.js';
import { useLang } from './LangContext.jsx';
import { useAuth } from './AuthContext';
import { ModeIcon, LevelIcon, StreakIcon } from './components/AppIcons';
import { User, Backpack, Diamond } from 'lucide-react';
import { getUsernameColor } from './cosmeticColors';
import TitleBadge from './components/TitleBadge';
import VerifiedBadge from './VerifiedBadge';
import EquippedBadge from './components/EquippedBadge';
import SpecialBadge, { getSpecialUserByUsername } from './SpecialBadge.jsx';
import BadgeIcon, { RARITY_COLORS } from './BadgeIcon.jsx';
import { getXP, getLevel } from './levels.js';

function AccuracyGraph({ trend }) {
  if (!trend || trend.length < 2) return null;
  const W = 260, H = 72, padL = 26, padR = 8, padT = 8, padB = 8;
  const toY = v => padT + ((100 - v) / 100) * (H - padT - padB);
  const pts = trend.map((v, i) => {
    const x = padL + (i / (trend.length - 1)) * (W - padL - padR);
    const y = toY(v);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = 'M' + pts.join('L');
  const y0 = toY(0), y50 = toY(50);
  const area = `${path}L${(W - padR).toFixed(1)},${y0.toFixed(1)}L${padL},${y0.toFixed(1)}Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--green)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <text x="0" y={padT + 3} fontSize="7" fill="var(--text-muted)" fontFamily="var(--font-body)" opacity="0.7">100</text>
      <text x="2" y={y50 + 3} fontSize="7" fill="var(--text-muted)" fontFamily="var(--font-body)" opacity="0.7">50</text>
      <text x="4" y={H - padB + 2} fontSize="7" fill="var(--text-muted)" fontFamily="var(--font-body)" opacity="0.7">0</text>
      <line x1={padL} y1={y50} x2={W - padR} y2={y50} stroke="var(--text-muted)" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.35" />
      <path d={area} fill="url(#trendGrad)" />
      <path d={path} fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {trend.map((v, i) => {
        const [x, y] = pts[i].split(',');
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--green)" />;
      })}
    </svg>
  );
}

const ICON_MODE_ID = { guess: 'game' };

export default function Stats({ onBack, onSelect }) {
  const { t } = useLang();
  const { user, activeCosmetics } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const dailyStreak = parseInt(localStorage.getItem('tradaria_daily_streak') || '0');
  const xp          = getXP();
  const level       = getLevel(xp);

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

  const getModeLabel = (mode) =>
    t.stats['mode' + mode.charAt(0).toUpperCase() + mode.slice(1)] || mode;

  const nGamesLabel = (n) =>
    (t.stats.nGames || '{n} games').replace('{n}', n);

  return (
    <div id="gtm-root" style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)', padding: '0 0 24px', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '22px', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{t.stats.title2}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '2px' }}>{t.stats.subtitle}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {user?.username && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0, maxWidth: '130px' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '2px', width: '100%' }}>
                <span style={{ wordBreak: 'break-word', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, color: getUsernameColor(activeCosmetics) || 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  @{user.username}
                </span>
                <SpecialBadge specialUser={getSpecialUserByUsername(user.username)} size={11} />
                {user?.battlePassMechanics?.includes('mechanic_verified_badge') && <VerifiedBadge size={11} />}
                <EquippedBadge id={activeCosmetics?.badge} size={11} />
              </div>
              <TitleBadge title={activeCosmetics?.title} />
            </div>
          )}
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', flexShrink: 0 }}>
            {user?.customAvatar || user?.avatar ? (
              <img
                src={user.customAvatar || user.avatar}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt="profile"
              />
            ) : (
              <User size={24} strokeWidth={1.5} aria-hidden style={{ stroke: 'var(--text-muted)' }} />
            )}
          </div>
        </div>
      </div>

      {/* Chips: streak + level/XP */}
      <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {dailyStreak > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--pink-dim)', border: '0.5px solid var(--border-pink)', borderRadius: 'var(--radius-full)', padding: '4px 10px' }}>
            <StreakIcon size={12} style={{ stroke: 'var(--pink)' }} />
            <span style={{ fontSize: '12px', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontWeight: 800, letterSpacing: '0.06em' }}>
              {dailyStreak} {dailyStreak === 1 ? (t.common.day ?? t.common.days) : t.common.days}
            </span>
          </div>
        )}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--green-dim)', border: '0.5px solid var(--border-green)', borderRadius: 'var(--radius-full)', padding: '4px 10px' }}>
          <LevelIcon id={level.id} size={12} style={{ stroke: 'var(--green)' }} />
          <span style={{ fontSize: '12px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontWeight: 800, letterSpacing: '0.06em' }}>
            {level.name} · {xp} XP
          </span>
        </div>
      </div>

      {/* Inventory + Trader Pass */}
      <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button
          onClick={() => onSelect?.('inventory')}
          style={{ padding: '13px 16px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Backpack size={18} strokeWidth={1.8} color="var(--text-muted)" aria-hidden />
            <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>{t.inventory.inventoryBtn}</span>
          </div>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>›</span>
        </button>
        <button
          onClick={() => onSelect?.('battle_pass')}
          style={{ padding: '13px 16px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Diamond size={18} strokeWidth={1.8} color="var(--text-muted)" aria-hidden />
            <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>{t.home.traderPass}</span>
          </div>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>›</span>
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <div className="spinner" />
        </div>
      )}

      {error === 'login' && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '60px', padding: '0 24px' }}>
          <div style={{ marginBottom: '8px' }}>{t.stats.signIn}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.stats.signInSub}</div>
        </div>
      )}

      {error === true && (
        <div style={{ textAlign: 'center', color: 'var(--pink)', fontSize: '12px', marginTop: '60px' }}>
          {t.stats.error}
        </div>
      )}

      {data && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '0 16px 16px' }}>
            {[
              {
                label: t.stats.games,
                value: data.totalGames,
                color: 'var(--text-primary)',
                sub: t.stats.gamesSubLabel,
              },
              {
                label: t.stats.accuracy,
                value: `${data.avgAccuracy}%`,
                color: data.avgAccuracy >= 50 ? 'var(--green)' : 'var(--pink)',
                sub: data.totalGames > 0 && data.betterThan != null
                  ? `Top ${100 - data.betterThan}%`
                  : t.stats.accuracySubLabel,
              },
              {
                label: t.stats.bestStreak,
                value: data.bestStreak,
                color: 'var(--pink)',
                sub: t.stats.bestStreakSubLabel,
              },
              {
                label: t.stats.bestScore,
                value: data.bestScore,
                color: 'var(--green)',
                sub: t.stats.bestScoreSubLabel,
              },
            ].map(({ label, value, color, sub }, i) => (
              <div key={label} className={`animate-fade-in-up stagger-${i + 1}`} style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '14px 12px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '26px', fontWeight: 900, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{value ?? '—'}</div>
                {sub && <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.04em' }}>{sub}</div>}
              </div>
            ))}
          </div>

          {/* Accuracy trend */}
          {data.accuracyTrend?.length >= 2 && (
            <div style={{ margin: '0 16px 16px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
                {(t.stats.trendLastN || 'Last {n} games').replace('{n}', data.accuracyTrend.length)}
              </div>
              <AccuracyGraph trend={data.accuracyTrend} />
            </div>
          )}

          {/* Mode breakdown */}
          {data.modeCounts && Object.keys(data.modeCounts).length > 0 && (() => {
            const maxCount = Math.max(...Object.values(data.modeCounts));
            return (
              <div style={{ margin: '0 16px 16px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>{t.stats.byMode}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(data.modeCounts).sort((a, b) => b[1] - a[1]).map(([mode, count]) => {
                    const pct  = Math.round(count / maxCount * 100);
                    const iconId = ICON_MODE_ID[mode] || mode;
                    return (
                      <div key={mode} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                        <span style={{ flexShrink: 0, display: 'flex', width: '16px', justifyContent: 'center' }}>
                          <ModeIcon id={iconId} size={16} style={{ stroke: 'var(--text-muted)' }} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>{getModeLabel(mode)}</div>
                          <div style={{ height: '3px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', borderRadius: 'var(--radius-full)', transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>{nGamesLabel(count)}</div>
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
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t.stats.recentBadges}</div>
                <button onClick={() => onSelect?.('badges')}
                  style={{ background: 'transparent', border: 'none', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, color: 'var(--green)', cursor: 'pointer', letterSpacing: '0.06em' }}>
                  {t.stats.seeAll}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
                {recentBadges.map(badge => {
                  const color     = RARITY_COLORS[badge.rarity] ?? RARITY_COLORS.common;
                  const badgeName = t.achievements?.items?.[badge.id]?.name ?? badge.name;
                  return (
                    <div key={badge.id} style={{ flexShrink: 0, background: `radial-gradient(ellipse at 90% 10%, ${color}18 0%, transparent 60%), var(--bg-surface)`, border: `0.5px solid ${color}55`, borderRadius: 'var(--radius-md)', padding: '10px', textAlign: 'center', minWidth: '72px' }}>
                      <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'center', color }}>
                        <BadgeIcon id={badge.id} size={24} />
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, color, letterSpacing: '0.04em', lineHeight: 1.3 }}>{badgeName}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Global comparison */}
          <div style={{ margin: '0 16px 16px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-pink)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>{t.stats.vsGlobal}</div>
            {data.totalGames > 0 ? (
              <>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '28px', color: 'var(--green)', letterSpacing: '-0.5px', lineHeight: 1 }}>
                  Top {100 - (data.betterThan || 50)}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
                  {t.stats.betterThan} {data.betterThan}{t.stats.betterThanSuffix}
                </div>
                {data.winRate > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {t.stats.arenaWinRate}: <span style={{ color: data.winRate >= 50 ? 'var(--green)' : 'var(--pink)', fontWeight: 900 }}>{data.winRate}%</span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {t.stats.playMore}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
