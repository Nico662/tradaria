import { BADGES, getUnlocked } from './badges.js';
import { useLang } from './LangContext.jsx';


export default function Badges({ onBack }) {
  const unlocked = getUnlocked();
  const { lang, t } = useLang();

  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 24px 32px', position: 'relative', zIndex: 2 }}>

        <button onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', marginBottom: '24px', display: 'block', transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color = 'var(--t2)'}
          onMouseLeave={e => e.target.style.color = 'var(--t6)'}
        >
          {t.badges.back}
        </button>

        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: 'var(--t1)', marginBottom: '4px' }}>
          {t.badges.title}
        </div>
        <div style={{ fontSize: '9px', color: 'var(--t6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px' }}>
          {unlocked.length} / {BADGES.length} {t.badges.unlocked}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {BADGES.map(badge => {
            const isUnlocked = unlocked.includes(badge.id);
            return (
              <div key={badge.id} style={{
                background: isUnlocked ? 'rgba(0,229,160,0.05)' : 'var(--bg-card)',
                border: `1px solid ${isUnlocked ? 'var(--green)' : 'var(--bd)'}`,
                borderRadius: '10px',
                padding: '16px 12px',
                textAlign: 'center',
                opacity: isUnlocked ? 1 : 0.4,
                transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px', filter: isUnlocked ? 'none' : 'grayscale(1)' }}>
                  {badge.icon}
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '11px', color: isUnlocked ? 'var(--t1)' : 'var(--t5)', marginBottom: '4px', lineHeight: 1.3 }}>
                  {t.badges.items?.[badge.id]?.name ?? badge.name}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--t6)', lineHeight: 1.5 }}>
                  {t.badges.items?.[badge.id]?.desc ?? badge.desc}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}