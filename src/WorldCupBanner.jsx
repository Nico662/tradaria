import { useState } from 'react';

const STORAGE_KEY = 'worldcup_banner_closed';
const EXPIRY = new Date('2026-07-25T23:59:59');

export default function WorldCupBanner() {
  const [closed, setClosed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

  if (closed || Date.now() > EXPIRY.getTime()) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setClosed(true);
  }

  return (
    <>
      <style>{`
        @keyframes wcFadeIn {
          from { opacity: 0; transform: translateY(-100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{
        background: '#c60b1e',
        color: '#fff',
        fontFamily: 'var(--font-body, sans-serif)',
        fontWeight: 700,
        fontSize: '13px',
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        animation: 'wcFadeIn 0.3s ease both',
      }}>
        <span style={{ flex: 1, textAlign: 'center', letterSpacing: '0.02em' }}>
          🏆 ¡España Campeona! 🇪🇸
        </span>
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#fff',
            fontSize: '14px',
            lineHeight: 1,
            padding: '0 2px',
            opacity: 0.6,
            flexShrink: 0,
          }}
        >×</button>
      </div>
    </>
  );
}
