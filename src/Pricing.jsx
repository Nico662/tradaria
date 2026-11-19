import { useState } from 'react';
import { useAuth, isIOSApp } from './AuthContext';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';
import { purchaseWithStoreKit, canPurchaseIAP } from './iap.js';
import { Check } from 'lucide-react';
import { ScreenHeader, FlatRow, StatusText } from './components/ui';

export default function Pricing({ onBack, fromTournament }) {
  const { user, isPro, refreshUser } = useAuth();
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
    if (!canPurchaseIAP()) { setMsg(t.pricing.updateRequired); return; }
    if (loading) return;
    setLoading(true);
    if (isIOSApp()) {
      try {
        const { receiptData, _iapKeys } = await purchaseWithStoreKit('dev.tradiko.pro.monthly');
        const token = localStorage.getItem('tradaria_token');
        const confirmRes = await fetch(`${SERVER}/shop/iap-confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ itemId: 'pro', receiptData }),
        });
        if (!confirmRes.ok) {
          let detail = '';
          try {
            const body = await confirmRes.json();
            detail = body.error ? ` (${body.error}` : ' (error';
            if (body.appleStatus != null) detail += `; apple:${body.appleStatus}`;
            if (!receiptData && _iapKeys) detail += `; keys:${_iapKeys.join(',')}`;
            detail += ')';
          } catch { /* ignore parse errors */ }
          setMsg(`${t.pricing.iapError}${detail}`);
          return;
        }
        await refreshUser();
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
    <div id="gtm-root" style={{ minHeight: '100dvh', background: 'var(--bg-base)', fontFamily: 'var(--font-body)' }}>

      <ScreenHeader title={t.pricing.title} onBack={onBack} />

      <div style={{ padding: '0 16px 48px' }}>

        {isPro && (
          <div style={{ marginBottom: '16px' }}>
            <StatusText color="var(--green)" icon={<Check size={13} strokeWidth={2.5} style={{ stroke: 'var(--green)' }} />}>
              {t.pricing.alreadyPro}
            </StatusText>
          </div>
        )}

        {/* Pro plan card */}
        <div style={{
          marginBottom: '16px',
          padding: '20px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '14px',
        }}>

          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '20px', color: 'var(--text-primary)', marginBottom: '12px' }}>
            Pro
          </div>

          {/* Price */}
          <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '32px', color: 'var(--text-primary)', lineHeight: 1 }}>€3.99</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.pricing.perMonth}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            {t.pricing.priceHook}
          </div>

          {/* Feature list */}
          <div style={{ marginBottom: '20px' }}>
            {PRO_FEATURES.map(f => (
              <FlatRow
                key={f}
                icon={<Check size={15} strokeWidth={2.5} style={{ stroke: 'var(--green)', flexShrink: 0 }} />}
                title={f}
                chevron={false}
              />
            ))}
          </div>

          {/* CTA */}
          {!isPro && (
            <button
              onClick={handleUpgrade}
              disabled={loading || !canPurchaseIAP()}
              style={{
                width: '100%', padding: '14px',
                background: (loading || !canPurchaseIAP()) ? 'var(--bg-elevated)' : 'var(--green)',
                border: 'none', borderRadius: '8px',
                color: (loading || !canPurchaseIAP()) ? 'var(--text-hint)' : '#060b10',
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 800,
                cursor: (loading || !canPurchaseIAP()) ? 'default' : 'pointer',
              }}
            >
              {loading ? t.pricing.redirecting : !canPurchaseIAP() ? t.pricing.updateRequired : t.pricing.upgradeBtn}
            </button>
          )}
          {msg && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-down)', textAlign: 'center' }}>{msg}</div>
          )}
          {!isPro && (
            <p style={{ fontSize: '11px', color: 'var(--text-hint)', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 }}>
              {t.pricing.legalAgree}{' '}
              <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-hint)', textDecoration: 'underline' }}>
                {t.pricing.termsOfUse}
              </a>
              {' '}{t.pricing.legalAnd}{' '}
              <a href="https://www.tradiko.dev/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-hint)', textDecoration: 'underline' }}>
                {t.pricing.privacyPolicy}
              </a>
            </p>
          )}
        </div>

        {/* Free plan — compact */}
        <div style={{
          padding: '14px 16px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          opacity: 0.65,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--text-muted)' }}>{t.pricing.planFree}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', color: 'var(--text-hint)' }}>€0</div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-hint)', lineHeight: '1.6' }}>
            {FREE_FEATURES.join(' · ')}
          </div>
        </div>

      </div>
    </div>
  );
}
