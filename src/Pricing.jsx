import { useState } from 'react';
import { useAuth } from './AuthContext';
import { SERVER } from './config.js';

const FREE_FEATURES = [
  'Guess The Market',
  'Desafío Diario',
  'Arena 1vs1',
  'Survival — 3 vidas',
  'Torneos gratuitos',
  'Portfolio virtual',
];

const PRO_FEATURES = [
  'Todo lo de Free',
  'Survival — regeneración de vidas ⚡',
  'Sin anuncios',
  'Badge Pro en el perfil',
  'Estadísticas avanzadas (próximamente)',
];

export default function Pricing({ onBack, fromTournament }) {
  const { user, isPro } = useAuth();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState('');

  async function handleUpgrade() {
    if (!user) { setMsg('Inicia sesión primero'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('tradara_token');
      const res   = await fetch(`${SERVER}/pro/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { setMsg('Error al crear sesión'); setLoading(false); }
    } catch {
      setMsg('Error de red. Inténtalo de nuevo.');
      setLoading(false);
    }
  }

  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ padding: '20px 20px 48px', position: 'relative', zIndex: 2 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <button onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}
            onMouseEnter={e => e.target.style.color = 'var(--t2)'}
            onMouseLeave={e => e.target.style.color = 'var(--t6)'}
          >← Volver</button>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--t1)' }}>
            Planes
          </div>
        </div>

        {isPro && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em' }}>
              ⚡ Ya eres usuario Pro. Gracias por apoyar Tradara.
            </span>
          </div>
        )}

        {/* Free plan */}
        <div style={{ marginBottom: '16px', padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t1)' }}>Free</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--t2)' }}>€0</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FREE_FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--t4)' }}>
                <span style={{ color: 'var(--t6)', fontSize: '10px' }}>✓</span>{f}
              </div>
            ))}
          </div>
        </div>

        {/* Pro plan */}
        <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-card)', border: '2px solid #22d3a5', borderRadius: '12px', boxShadow: '0 0 24px rgba(34,211,165,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t1)' }}>Pro</div>
              <span style={{ fontSize: '9px', color: '#22d3a5', background: 'rgba(34,211,165,0.1)', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace" }}>⚡ RECOMENDADO</span>
            </div>
            <div>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#22d3a5' }}>€3.99</span>
              <span style={{ fontSize: '10px', color: 'var(--t5)' }}>/mes</span>
            </div>
          </div>
          <div style={{ fontSize: '9px', color: 'var(--t6)', marginBottom: '16px', letterSpacing: '0.04em' }}>
            Cancela cuando quieras
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {PRO_FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--t3)' }}>
                <span style={{ color: '#22d3a5', fontSize: '10px' }}>✓</span>{f}
              </div>
            ))}
          </div>

          {!isPro && (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? 'rgba(34,211,165,0.3)' : 'linear-gradient(135deg, #22d3a5, #1aaa84)',
                border: 'none', borderRadius: '8px', color: '#0a0c0f',
                fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Redirigiendo...' : '⚡ Hazte Pro — €3.99/mes'}
            </button>
          )}
          {msg && (
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#f05454', textAlign: 'center' }}>{msg}</div>
          )}
        </div>

        {/* Torneos de pago info */}
        <div style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '10px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--t2)', marginBottom: '8px' }}>
            🏆 Torneos de Pago
          </div>
          <div style={{ fontSize: '11px', color: 'var(--t5)', lineHeight: 1.6 }}>
            Únete por <strong style={{ color: 'var(--t3)' }}>€2</strong> y compite con otros jugadores. El ganador se lleva <strong style={{ color: '#f5c842' }}>la mitad del bote</strong>. El creador elige cuántos participantes (2–10). Para todos los usuarios.
          </div>
        </div>

      </div>
    </div>
  );
}
