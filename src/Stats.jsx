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
import { FlatRow, SectionTitle, StatusText, ScreenHeader } from './components/ui';

function AccuracyGraph({ trend }) {
  if (!trend || trend.length < 2) return null;
  const W = 280, H = 64, padL = 8, padR = 8, padT = 8, padB = 8;
  const toY = v => padT + ((100 - v) / 100) * (H - padT - padB);
  const pts = trend.map((v, i) => {
    const x = padL + (i / (trend.length - 1)) * (W - padL - padR);
    const y = toY(v);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = 'M' + pts.join('L');
  const y50 = toY(50);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <line x1={padL} y1={y50} x2={W - padR} y2={y50}
        stroke="var(--border-default)" strokeWidth="1" strokeDasharray="4 3" />
      <path d={path} fill="none" stroke="var(--green)"
        strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((pt, i) => {
        const [x, y] = pt.split(',');
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

  const avatarAction = user?.username ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0, maxWidth: '120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '2px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, color: getUsernameColor(activeCosmetics) || 'var(--text-muted)', wordBreak: 'break-word' }}>
            @{user.username}
          </span>
          <SpecialBadge specialUser={getSpecialUserByUsername(user.username)} size={11} />
          {user?.battlePassMechanics?.includes('mechanic_verified_badge') && <VerifiedBadge size={11} />}
          <EquippedBadge id={activeCosmetics?.badge} size={11} />
        </div>
        <TitleBadge title={activeCosmetics?.title} />
      </div>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--pink)', background: 'var(--bg-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {user?.customAvatar || user?.avatar ? (
          <img src={user.customAvatar || user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="profile" />
        ) : (
          <User size={22} strokeWidth={1.5} aria-hidden style={{ stroke: 'var(--text-muted)' }} />
        )}
      </div>
    </div>
  ) : null;

  return (
    <div id="gtm-root" style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)', padding: '0 0 24px', fontFamily: 'var(--font-body)' }}>

      <ScreenHeader title={t.stats.title2} subtitle={t.stats.subtitle} action={avatarAction} />

      {/* Streak + level */}
      <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {dailyStreak > 0 && (
          <StatusText color="var(--pink)" icon={<StreakIcon size={12} style={{ stroke: 'var(--pink)' }} />}>
            {dailyStreak} {dailyStreak === 1 ? (t.common.day ?? t.common.days) : t.common.days}
          </StatusText>
        )}
        <StatusText color="var(--green)" icon={<LevelIcon id={level.id} size={12} style={{ stroke: 'var(--green)' }} />}>
          {level.name} · {xp} XP
        </StatusText>
      </div>

      {/* Quick links */}
      <div style={{ padding: '0 16px 16px' }}>
        <FlatRow
          icon={<Backpack size={18} strokeWidth={1.8} style={{ stroke: 'var(--text-muted)' }} aria-hidden />}
          title={t.inventory.inventoryBtn}
          onClick={() => onSelect?.('inventory')}
        />
        <FlatRow
          icon={<Diamond size={18} strokeWidth={1.8} style={{ stroke: 'var(--text-muted)' }} aria-hidden />}
          title={t.home.traderPass}
          onClick={() => onSelect?.('battle_pass')}
        />
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
        <div style={{ padding: '0 16px' }}>

          {/* Stats section */}
          <SectionTitle style={{ marginBottom: '4px' }}>{t.stats.sectionStats}</SectionTitle>
          {[
            { label: t.stats.games,      value: data.totalGames,                    color: 'var(--text-primary)' },
            { label: t.stats.accuracy,   value: `${data.avgAccuracy}%`,             color: data.avgAccuracy >= 50 ? 'var(--green)' : 'var(--pink)' },
            { label: t.stats.bestStreak, value: data.bestStreak,                    color: 'var(--pink)' },
            { label: t.stats.bestScore,  value: data.bestScore,                     color: 'var(--green)' },
          ].map(({ label, value, color }) => (
            <FlatRow
              key={label}
              title={<span style={{ color: 'var(--text-muted)', fontWeight: 'var(--font-weight-medium)' }}>{label}</span>}
              value={<span style={{ fontWeight: 900, fontSize: '20px', color, letterSpacing: '-0.3px', lineHeight: 1 }}>{value ?? '—'}</span>}
            />
          ))}

          {/* Accuracy trend */}
          {data.accuracyTrend?.length >= 2 && (
            <div style={{ marginTop: '12px' }}>
              <SectionTitle style={{ marginBottom: '10px' }}>
                {(t.stats.trendLastN || 'Last {n} games').replace('{n}', data.accuracyTrend.length)}
              </SectionTitle>
              <AccuracyGraph trend={data.accuracyTrend} />
            </div>
          )}

          {/* Mode breakdown */}
          {data.modeCounts && Object.keys(data.modeCounts).length > 0 && (() => {
            const maxCount = Math.max(...Object.values(data.modeCounts));
            return (
              <div style={{ marginTop: '16px' }}>
                <SectionTitle style={{ marginBottom: '4px' }}>{t.stats.byMode}</SectionTitle>
                {Object.entries(data.modeCounts).sort((a, b) => b[1] - a[1]).map(([mode, count]) => {
                  const pct    = Math.round(count / maxCount * 100);
                  const iconId = ICON_MODE_ID[mode] || mode;
                  return (
                    <FlatRow
                      key={mode}
                      icon={<ModeIcon id={iconId} size={16} style={{ stroke: 'var(--text-muted)' }} />}
                      title={getModeLabel(mode)}
                      value={<span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{nGamesLabel(count)}</span>}
                    >
                      <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', borderRadius: '2px', transition: 'width 0.6s ease' }} />
                      </div>
                    </FlatRow>
                  );
                })}
              </div>
            );
          })()}

          {/* Recent badges */}
          {recentBadges.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <SectionTitle style={{ marginBottom: 0 }}>{t.stats.recentBadges}</SectionTitle>
                <button onClick={() => onSelect?.('badges')}
                  style={{ background: 'transparent', border: 'none', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, color: 'var(--green)', cursor: 'pointer' }}>
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
          <div style={{ marginTop: '16px', marginBottom: '8px' }}>
            <SectionTitle style={{ marginBottom: '4px' }}>{t.stats.vsGlobal}</SectionTitle>
            {data.totalGames > 0 ? (
              <>
                <FlatRow
                  title={<span style={{ color: 'var(--text-muted)', fontWeight: 'var(--font-weight-medium)' }}>{t.stats.betterThan} {data.betterThan}{t.stats.betterThanSuffix}</span>}
                  value={<span style={{ fontWeight: 900, fontSize: '20px', color: 'var(--green)', letterSpacing: '-0.3px' }}>Top {100 - (data.betterThan || 50)}%</span>}
                />
                {data.winRate > 0 && (
                  <FlatRow
                    title={<span style={{ color: 'var(--text-muted)', fontWeight: 'var(--font-weight-medium)' }}>{t.stats.arenaWinRate}</span>}
                    value={<span style={{ fontWeight: 900, fontSize: '16px', color: data.winRate >= 50 ? 'var(--green)' : 'var(--pink)' }}>{data.winRate}%</span>}
                  />
                )}
              </>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>
                {t.stats.playMore}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
