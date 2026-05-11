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
          style={{ background: 'transparent', border: 'none', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', marginBottom: '24px', display: 'block', transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color = '#e2e8f0'}
          onMouseLeave={e => e.target.style.color = '#3a4455'}
        >
          {t.badges.back}
        </button>

        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#f0f0f0', marginBottom: '4px' }}>
          {t.badges.title}
        </div>
        <div style={{ fontSize: '9px', color: '#3a4455', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px' }}>
          {unlocked.length} / {BADGES.length} {t.badges.unlocked}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {BADGES.map(badge => {
            const isUnlocked = unlocked.includes(badge.id);
            return (
              <div key={badge.id} style={{
                background: isUnlocked ? 'rgba(34,211,165,0.05)' : '#0f141b',
                border: `1px solid ${isUnlocked ? '#22d3a5' : '#1e2530'}`,
                borderRadius: '10px',
                padding: '16px 12px',
                textAlign: 'center',
                opacity: isUnlocked ? 1 : 0.4,
                transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px', filter: isUnlocked ? 'none' : 'grayscale(1)' }}>
                  {badge.icon}
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '11px', color: isUnlocked ? '#f0f0f0' : '#4a5568', marginBottom: '4px', lineHeight: 1.3 }}>
                  {t.badges.items?.[badge.id]?.name ?? badge.name}
                </div>
                <div style={{ fontSize: '9px', color: '#3a4455', lineHeight: 1.5 }}>
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