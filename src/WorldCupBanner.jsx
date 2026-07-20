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
        background: 'linear-gradient(90deg, #c60b1e 0%, #ffc400 100%)',
        color: '#fff',
        fontFamily: 'var(--font-body, sans-serif)',
        fontWeight: 700,
        fontSize: '14px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        animation: 'wcFadeIn 0.4s ease both',
      }}>
        <span style={{ flex: 1, textAlign: 'center', letterSpacing: '0.03em' }}>
          🏆 ¡España Campeona del Mundo! 🇪🇸 #Campeones
        </span>
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#fff',
            fontSize: '18px',
            lineHeight: 1,
            padding: '0 4px',
            opacity: 0.8,
            flexShrink: 0,
          }}
        >×</button>
      </div>
    </>
  );
}
