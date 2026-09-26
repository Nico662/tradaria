import { useState, useEffect } from 'react';
import { useLang } from './LangContext.jsx';

export default function UpdateBanner() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener('swUpdated', handler);
    return () => window.removeEventListener('swUpdated', handler);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10000,
      background: 'var(--green)',
      color: 'var(--bg-base)',
      fontFamily: 'var(--font-body)',
      fontSize: '12px',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    }}>
      <span style={{ flex: 1, textAlign: 'center', letterSpacing: '0.02em' }}>
        {t.update.banner}
      </span>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: 'var(--bg-base)',
          color: 'var(--green)',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          fontWeight: 700,
          padding: '4px 12px',
          letterSpacing: '0.04em',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {t.update.action}
      </button>
    </div>
  );
}
