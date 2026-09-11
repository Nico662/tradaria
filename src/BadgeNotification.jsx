import { useState, useEffect } from 'react';
import BadgeIcon, { RARITY_COLORS } from './BadgeIcon.jsx';

export default function BadgeNotification({ badge, onDone }) {
  const [visible, setVisible] = useState(false);
  const color = RARITY_COLORS[badge.rarity] ?? RARITY_COLORS.common;

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
      border: `1px solid ${color}`,
      borderRadius: '12px',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: `0 0 24px ${color}40`,
      minWidth: '220px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: `${color}18`,
        border: `1px solid ${color}55`,
        color,
        flexShrink: 0,
      }}>
        <BadgeIcon id={badge.id} size={22} />
      </div>
      <div>
        <div style={{ fontSize: '12px', color, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>
          badge unlocked
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: 'var(--t1)' }}>
          {badge.name}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--t5)', marginTop: '2px' }}>
          {badge.desc}
        </div>
      </div>
    </div>
  );
}
