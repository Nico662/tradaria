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
      background: '#0f141b',
      border: '1px solid #22d3a5',
      borderRadius: '12px',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 0 24px rgba(34,211,165,0.2)',
      minWidth: '220px',
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: '26px', lineHeight: 1 }}>🎯</div>
      <div>
        <div style={{ fontSize: '8px', color: '#22d3a5', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>
          {subtext}
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: '#f0f0f0' }}>
          {title}
        </div>
        <div style={{ fontSize: '9px', color: '#22d3a5', marginTop: '2px', fontFamily: "'Space Mono', monospace" }}>
          +{data.xpEarned} XP
        </div>
      </div>
    </div>
  );
}
