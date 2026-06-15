import { useState } from 'react';
import { useLang } from './LangContext.jsx';

const ENABLED = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

export default function MaintenanceBanner() {
  const { t } = useLang();
  const [dismissed, setDismissed] = useState(false);

  if (!ENABLED || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'var(--color-neutral)',
      color: 'var(--bg-base)',
      fontFamily: "'Space Mono', monospace",
      fontSize: '12px',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    }}>
      <span style={{ flex: 1, textAlign: 'center', letterSpacing: '0.02em' }}>
        {t.maintenance.banner}
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Cerrar"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--bg-base)',
          fontSize: '16px',
          lineHeight: 1,
          padding: '0 4px',
          opacity: 0.6,
          flexShrink: 0,
        }}
      >×</button>
    </div>
  );
}
