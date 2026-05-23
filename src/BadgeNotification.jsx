import { useState, useEffect } from 'react';

export default function BadgeNotification({ badge, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 3000);
  }, []);

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
      border: '1px solid #22d3a5',
      borderRadius: '12px',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 0 24px rgba(34,211,165,0.2)',
      minWidth: '220px',
    }}>
      <div style={{ fontSize: '28px', lineHeight: 1 }}>{badge.icon}</div>
      <div>
        <div style={{ fontSize: '8px', color: '#22d3a5', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>
          badge unlocked
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: 'var(--t1)' }}>
          {badge.name}
        </div>
        <div style={{ fontSize: '9px', color: 'var(--t5)', marginTop: '2px' }}>
          {badge.desc}
        </div>
      </div>
    </div>
  );
}