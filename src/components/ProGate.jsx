import { useState } from 'react';
import { useAuth, isIOSApp } from '../AuthContext';
import { SERVER } from '../config.js';

export default function ProGate({ children, feature = '' }) {
  const { isPro, user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (isPro) return children;

  if (isIOSApp()) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', fontSize: '14px' }}>
        This feature is available at tradiko.dev
      </div>
    );
  }

  async function handleUpgrade() {
    if (!user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('tradaria_token');
      const res   = await fetch(`${SERVER}/pro/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4 }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,12,15,0.75)', borderRadius: '10px', gap: '12px', padding: '24px',
        backdropFilter: 'blur(4px)',
      }}>
        <div style={{ fontSize: '28px' }}>⚡</div>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--t1)', textAlign: 'center' }}>
          Función Pro
        </div>
        {feature && (
          <div style={{ fontSize: '12px', color: 'var(--t5)', textAlign: 'center', lineHeight: 1.5 }}>{feature}</div>
        )}
        <button
          onClick={handleUpgrade}
          disabled={loading || !user}
          style={{
            padding: '12px 28px', background: 'linear-gradient(135deg, var(--green), #1aaa84)',
            border: 'none', borderRadius: '8px', color: 'var(--bg-base)',
            fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Cargando...' : !user ? 'Inicia sesión primero' : 'Hazte Pro — €3.99/mes'}
        </button>
      </div>
    </div>
  );
}
