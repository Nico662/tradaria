import { useState, useEffect } from 'react';
import { useLang } from './LangContext.jsx';

export default function MissionNotification({ data, onDone }) {
  const { lang } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50);
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const title   = data.title?.[lang] || data.title?.en || '';
  const subtext = lang === 'es' ? 'misión completada' : lang === 'de' ? 'mission abgeschlossen' : 'mission complete';

  return (
    <div style={{
      position: 'fixed',
      top: 'calc(20px + env(safe-area-inset-top))',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '-80px'})`,
      opacity: visible ? 1 : 0,
      transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease',
      zIndex: 9999,
      background: 'var(--bg-card)',
      border: '1px solid var(--green)',
      borderRadius: '12px',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 0 24px rgba(0,229,160,0.2)',
      minWidth: '220px',
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: '26px', lineHeight: 1 }}>🎯</div>
      <div>
        <div style={{ fontSize: '8px', color: 'var(--green)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>
          {subtext}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--t1)' }}>
          {title}
        </div>
        <div style={{ fontSize: '9px', color: 'var(--green)', marginTop: '2px', fontFamily: 'var(--font-body)' }}>
          +{data.xpEarned} XP
        </div>
      </div>
    </div>
  );
}
