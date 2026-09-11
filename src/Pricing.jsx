import { useState } from 'react';
import { useAuth, isIOSApp } from './AuthContext';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';
import { purchaseWithStoreKit } from './iap.js';
import { Star, Heart, Ban, Medal, Bell, FileText, TrendingUp } from 'lucide-react';

const PRO_ICONS = [Star, Heart, Ban, Medal, Bell, FileText, TrendingUp];

export default function Pricing({ onBack, fromTournament }) {
  const { user, isPro, updateUser } = useAuth();
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
    if (isIOSApp()) {
      try {
        await purchaseWithStoreKit('dev.tradiko.pro.monthly');
        const token = localStorage.getItem('tradaria_token');
        await fetch(`${SERVER}/shop/iap-confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ itemId: 'pro' }),
        });
        updateUser({ isPro: true });
      } catch (err) {
        if (err.message !== 'Purchase cancelled') setMsg(t.pricing.networkError);
      } finally {
        setLoading(false);
      }
      return;
    }
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
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}
            onMouseEnter={e => e.target.style.color = 'var(--t2)'}
            onMouseLeave={e => e.target.style.color = 'var(--t6)'}
          >{t.pricing.back}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--t1)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="13" height="26" style={{ flexShrink: 0 }}>
              <defs>
                <linearGradient id="candleGradPlans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e05585"/>
                  <stop offset="100%" stopColor="#00c087"/>
                </linearGradient>
              </defs>
              <line x1="50" y1="10" x2="50" y2="40" stroke="#e05585" strokeWidth="8" strokeLinecap="round"/>
              <rect x="25" y="40" width="50" height="110" rx="6" fill="url(#candleGradPlans)"/>
              <line x1="50" y1="150" x2="50" y2="190" stroke="#00c087" strokeWidth="8" strokeLinecap="round"/>
            </svg>
            {t.pricing.title}
          </div>
        </div>

        {isPro && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '8px', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--green)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}>
              {t.pricing.alreadyPro}
            </span>
          </div>
        )}

        {/* Pro plan — hero */}
        <div style={{
          marginBottom: '16px',
          padding: '22px 20px 20px',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(var(--bg-card), var(--bg-card)) padding-box, linear-gradient(to bottom, #00c087, #e05585) border-box',
          border: '2px solid transparent',
          borderRadius: '14px',
          boxShadow: '0 0 28px rgba(0,192,135,0.20), 0 0 60px rgba(0,192,135,0.07)',
        }}>
          {/* Green glow — top right */}
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: '200px', height: '200px',
            background: 'radial-gradient(circle at top right, rgba(0,192,135,0.13) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          {/* Pink glow — bottom left */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            width: '180px', height: '180px',
            background: 'radial-gradient(circle at bottom left, rgba(224,85,133,0.10) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          {/* Plan name + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', position: 'relative' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--t1)' }}>Pro</div>
            <span style={{
              fontSize: '10px', color: '#fff',
              background: '#e05585',
              padding: '2px 8px', borderRadius: '4px',
              letterSpacing: '0.10em', fontFamily: 'var(--font-body)', fontWeight: 700,
              boxShadow: '0 2px 10px rgba(224,85,133,0.40)',
            }}>
              {t.pricing.popularBadge}
            </span>
          </div>

          {/* Price */}
          <div style={{ marginBottom: '4px', position: 'relative' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '30px', color: '#00c087', lineHeight: 1 }}>€3.99</span>
            <span style={{ fontSize: '12px', color: 'var(--t5)', marginLeft: '4px' }}>{t.pricing.perMonth}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--t5)', marginBottom: '20px', letterSpacing: '0.02em', position: 'relative' }}>
            <span style={{ color: '#e05585', marginRight: '5px', fontSize: '10px' }}>●</span>
            {t.pricing.priceHook}
          </div>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginBottom: '22px', position: 'relative' }}>
            {PRO_FEATURES.map((f, i) => {
              const Icon = PRO_ICONS[i];
              const iconColor = i === 3 ? '#e05585' : '#00c087';
              return (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--t2)' }}>
                  <Icon size={14} color={iconColor} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  {f}
                </div>
              );
            })}
          </div>

          {/* CTA button */}
          {!isPro && (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? 'rgba(0,192,135,0.3)' : 'linear-gradient(135deg, #00c087, #1aaa84)',
                border: 'none', borderRadius: '8px', color: '#060b10',
                fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: loading ? 'default' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 18px rgba(0,192,135,0.38)',
                position: 'relative',
              }}
            >
              {loading ? t.pricing.redirecting : t.pricing.upgradeBtn}
            </button>
          )}
          {msg && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-down)', textAlign: 'center' }}>{msg}</div>
          )}
          {!isPro && (
            <p style={{ fontSize: '11px', color: '#888', textAlign: 'center', marginTop: '8px' }}>
              {t.pricing.legalAgree}{' '}
              <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'underline' }}>
                {t.pricing.termsOfUse}
              </a>
              {' '}{t.pricing.legalAnd}{' '}
              <a href="https://www.tradiko.dev/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'underline' }}>
                {t.pricing.privacyPolicy}
              </a>
            </p>
          )}
        </div>

        {/* Free plan — compact and subdued */}
        <div style={{
          marginBottom: '24px', padding: '14px 18px',
          background: 'var(--bg-card)', border: '1px solid var(--bd)',
          borderRadius: '12px', opacity: 0.7,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--t5)' }}>{t.pricing.planFree}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', color: 'var(--t6)' }}>€0</div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--t6)', lineHeight: '1.6', letterSpacing: '0.02em' }}>
            {FREE_FEATURES.join(' · ')}
          </div>
        </div>

      </div>
    </div>
  );
}
