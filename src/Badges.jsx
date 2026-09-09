import { BADGES, getUnlocked } from './badges.js';
import { useLang } from './LangContext.jsx';
import BadgeIcon, { RARITY_COLORS } from './BadgeIcon.jsx';

export default function Badges({ onBack, onSelect }) {
  const unlocked = getUnlocked();
  const { t } = useLang();

  return (
    <div id="gtm-root" style={{ padding: '16px 16px 24px', fontFamily: 'var(--font-body)', background: 'var(--bg-base)', minHeight: '100vh' }}>

      <button onClick={() => onSelect('stats')}
        style={{ background: 'transparent', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '5px 10px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.06em', marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {t.badges.back}
      </button>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '22px', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>{t.badges.title}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
          {unlocked.length} {t.badges.of} {BADGES.length} {t.badges.unlocked}
        </div>
        <div style={{ marginTop: '8px', height: '4px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(unlocked.length / BADGES.length) * 100}%`, background: 'linear-gradient(90deg, var(--pink), var(--green))', borderRadius: 'var(--radius-full)', transition: 'width 0.6s ease' }} />
        </div>
      </div>

      {/* Rarity legend */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {['common', 'rare', 'epic', 'legend'].map(r => (
          <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: RARITY_COLORS[r], boxShadow: `0 0 5px ${RARITY_COLORS[r]}` }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {t.badges.rarity[r]}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {BADGES.map(badge => {
          const isUnlocked = unlocked.includes(badge.id);
          const color = RARITY_COLORS[badge.rarity] ?? RARITY_COLORS.common;
          return (
            <div key={badge.id} className="animate-fade-in" style={{
              background: isUnlocked
                ? `radial-gradient(ellipse at 95% 8%, ${color}20 0%, transparent 55%), var(--bg-surface)`
                : 'var(--bg-elevated)',
              border: `0.5px solid ${isUnlocked ? color + '55' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '12px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              opacity: isUnlocked ? 1 : 0.4,
              transition: 'opacity 0.2s',
            }}>
              <div style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: isUnlocked ? `${color}18` : 'var(--bg-base)',
                border: `1px solid ${isUnlocked ? color + '55' : 'var(--border-default)'}`,
                boxShadow: isUnlocked ? `0 0 10px ${color}40` : 'none',
                color: isUnlocked ? color : 'var(--text-muted)',
              }}>
                <BadgeIcon id={badge.id} size={22} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '12px', color: isUnlocked ? color : 'var(--text-muted)', marginBottom: '2px', lineHeight: 1.2 }}>
                  {t.badges.items?.[badge.id]?.name ?? badge.name}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {t.badges.items?.[badge.id]?.desc ?? badge.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
