import { useState } from 'react';
import { useLang } from './LangContext.jsx';
import { getConsent, saveConsent, loadAnalytics, revokeAnalytics } from './analytics.js';

const STRINGS = {
  en: {
    text: 'We use analytics cookies to improve your experience. See our ',
    privacy: 'Privacy Policy',
    textEnd: '.',
    accept: 'Accept',
    decline: 'Decline',
  },
  es: {
    text: 'Usamos cookies de analítica para mejorar tu experiencia. Consulta nuestra ',
    privacy: 'Política de Privacidad',
    textEnd: '.',
    accept: 'Aceptar',
    decline: 'Rechazar',
  },
  de: {
    text: 'Wir verwenden Analyse-Cookies zur Verbesserung deiner Erfahrung. Siehe unsere ',
    privacy: 'Datenschutzrichtlinie',
    textEnd: '.',
    accept: 'Akzeptieren',
    decline: 'Ablehnen',
  },
};

export default function CookieBanner({ onNavigatePrivacy }) {
  const { lang } = useLang();
  const s = STRINGS[lang] || STRINGS.en;

  const [visible, setVisible] = useState(() => getConsent() === null);

  if (!visible) return null;

  function handleAccept() {
    saveConsent(true);
    loadAnalytics();
    setVisible(false);
  }

  function handleDecline() {
    saveConsent(false);
    revokeAnalytics();
    setVisible(false);
  }

  return (
    <div style={{
      position: 'fixed', bottom: '64px', left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)', maxWidth: '480px', zIndex: 9000,
      background: 'var(--bg-card, #111)', border: '1px solid var(--bd, #2a2a2a)',
      borderRadius: '10px', padding: '16px', boxSizing: 'border-box',
    }}>
      <p style={{ fontSize: '12px', color: 'var(--t4)', lineHeight: 1.6, margin: '0 0 12px 0', fontFamily: 'var(--font-body)' }}>
        {s.text}
        <button
          onClick={() => onNavigatePrivacy && onNavigatePrivacy()}
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--green)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-body)' }}
        >
          {s.privacy}
        </button>
        {s.textEnd}
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleDecline}
          style={{
            flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--bd2, #333)',
            borderRadius: '6px', color: 'var(--t4)', fontFamily: 'var(--font-body)', fontSize: '12px',
            fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em',
          }}
        >
          {s.decline}
        </button>
        <button
          onClick={handleAccept}
          style={{
            flex: 1, padding: '10px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)',
            borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px',
            fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em',
          }}
        >
          {s.accept}
        </button>
      </div>
    </div>
  );
}
