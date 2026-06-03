import { useState } from 'react';
import { useAuth } from './AuthContext';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';

export default function Pricing({ onBack, fromTournament }) {
  const { user, isPro } = useAuth();
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState('');

  const FREE_FEATURES = [
    t.pricing.freeFeat1, t.pricing.freeFeat2, t.pricing.freeFeat3,
    t.pricing.freeFeat4, t.pricing.freeFeat5, t.pricing.freeFeat6,
  ];

  const PRO_FEATURES = [
    t.pricing.proFeat1, t.pricing.proFeat2, t.pricing.proFeat3,
    t.pricing.proFeat4, t.pricing.proFeat5, t.pricing.proFeat6, t.pricing.proFeat7,
  ];

  async function handleUpgrade() {
    if (!user) { setMsg(t.pricing.signInFirst); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('tradaria_token');
      const res   = await fetch(`${SERVER}/pro/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { setMsg(t.pricing.errorSession); setLoading(false); }
    } catch {
      setMsg(t.pricing.networkError);
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
          >{t.pricing.back}</button>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--t1)' }}>
            {t.pricing.title}
          </div>
        </div>

        {isPro && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em' }}>
              {t.pricing.alreadyPro}
            </span>
          </div>
        )}

        {/* Free plan */}
        <div style={{ marginBottom: '16px', padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: 'var(--t1)' }}>{t.pricing.planFree}</div>
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
              <span style={{ fontSize: '9px', color: '#22d3a5', background: 'rgba(34,211,165,0.1)', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace" }}>{t.pricing.recommended}</span>
            </div>
            <div>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#22d3a5' }}>€3.99</span>
              <span style={{ fontSize: '10px', color: 'var(--t5)' }}>/mes</span>
            </div>
          </div>
          <div style={{ fontSize: '9px', color: 'var(--t6)', marginBottom: '16px', letterSpacing: '0.04em' }}>
            {t.pricing.cancelAnytime}
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
              {loading ? t.pricing.redirecting : t.pricing.upgradeBtn}
            </button>
          )}
          {msg && (
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#f05454', textAlign: 'center' }}>{msg}</div>
          )}
        </div>

        {/* Paid tournaments info */}
        <div style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--bd2)', borderRadius: '10px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--t2)', marginBottom: '8px' }}>
            {t.pricing.paidSection}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--t5)', lineHeight: 1.6 }}>
            {t.pricing.paidDescPart1} <strong style={{ color: 'var(--t3)' }}>€2</strong> {t.pricing.paidDescPart2} <strong style={{ color: '#f5c842' }}>{t.pricing.paidDescPart3}</strong>{t.pricing.paidDescPart4}
          </div>
        </div>

      </div>
    </div>
  );
}
