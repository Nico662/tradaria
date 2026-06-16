import { BADGES, getUnlocked } from './badges.js';
import { useLang } from './LangContext.jsx';

export default function Badges({ onBack }) {
  const unlocked = getUnlocked();
  const { lang, t } = useLang();

  return (
    <div id="gtm-root" style={{ padding: '16px 16px 24px', fontFamily: 'var(--font-body)', background: 'var(--bg-base)', minHeight: '100vh' }}>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '22px', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>Logros</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
          {unlocked.length} de {BADGES.length} desbloqueados
        </div>
        <div style={{ marginTop: '8px', height: '4px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(unlocked.length / BADGES.length) * 100}%`, background: 'linear-gradient(90deg, var(--pink), var(--green))', borderRadius: 'var(--radius-full)', transition: 'width 0.6s ease' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {BADGES.map(badge => {
          const isUnlocked = unlocked.includes(badge.id);
          return (
            <div key={badge.id} className="animate-fade-in" style={{
              background: isUnlocked ? 'var(--bg-surface)' : 'var(--bg-elevated)',
              border: `0.5px solid ${isUnlocked ? 'var(--border-green)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '14px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              opacity: isUnlocked ? 1 : 0.45,
              transition: 'opacity 0.2s',
            }}>
              <div style={{ fontSize: '28px', flexShrink: 0, filter: isUnlocked ? 'none' : 'grayscale(1)' }}>
                {badge.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '12px', color: isUnlocked ? 'var(--green)' : 'var(--text-muted)', marginBottom: '2px', lineHeight: 1.2 }}>
                  {t.badges.items?.[badge.id]?.name ?? badge.name}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
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
