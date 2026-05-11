import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLang } from './LangContext.jsx';

if (!document.getElementById('challenge-notif-css')) {
  const el = document.createElement('style');
  el.id = 'challenge-notif-css';
  el.textContent = `
    @keyframes challenge-slide-down {
      from { transform: translate(-50%, -140%); opacity: 0; }
      to   { transform: translate(-50%, 0);    opacity: 1; }
    }
  `;
  document.head.appendChild(el);
}

export default function ChallengeNotification({ challenge, onAccept, onReject }) {
  const { t } = useLang();
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(id); onReject?.(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!challenge) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: '80px',
      left: '50%',
      zIndex: 99999,
      background: '#0f141b',
      border: '1px solid #22d3a5',
      borderRadius: '12px',
      padding: '16px 20px',
      minWidth: '280px',
      maxWidth: '320px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(34,211,165,0.15)',
      animation: 'challenge-slide-down 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
          ⚔️
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#f0f0f0', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            @{challenge.challengerUsername}
          </div>
          <div style={{ fontSize: '10px', color: '#4a5568', fontFamily: "'Space Mono', monospace", marginTop: '2px' }}>
            {t.challenge.challenges}
          </div>
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: timeLeft <= 10 ? '#f05454' : '#f5c842', minWidth: '34px', textAlign: 'right' }}>
          {timeLeft}
        </div>
      </div>

      <div style={{ height: '2px', background: '#1e2530', borderRadius: '1px', marginBottom: '14px', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: timeLeft <= 10 ? '#f05454' : '#22d3a5', borderRadius: '1px', width: `${(timeLeft / 30) * 100}%`, transition: 'width 1s linear, background 0.3s' }} />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onAccept}
          style={{ flex: 1, padding: '10px', background: 'rgba(34,211,165,0.1)', border: '1px solid #22d3a5', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,211,165,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,211,165,0.1)'}
        >
          {t.challenge.accept}
        </button>
        <button
          onClick={onReject}
          style={{ flex: 1, padding: '10px', background: 'rgba(240,84,84,0.08)', border: '1px solid #f05454', borderRadius: '8px', color: '#f05454', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,84,84,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(240,84,84,0.08)'}
        >
          {t.challenge.reject}
        </button>
      </div>
    </div>,
    document.body
  );
}
