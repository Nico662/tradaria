import { useState } from 'react';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';

export default function AgeConfirmModal({ onDone, onNavigate }) {
  const { t } = useLang();
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving]       = useState(false);

  async function handleConfirm() {
    if (!confirmed || saving) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('tradaria_token');
      await fetch(`${SERVER}/user/confirm-age`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ accept: true }),
      });
      onDone();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '12px', padding: '32px 28px', width: '100%', maxWidth: '380px' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '18px', color: 'var(--t1)', marginBottom: '12px' }}>
          {t.username.ageConfirmTitle}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--t4)', lineHeight: 1.7, marginBottom: '24px', fontFamily: 'var(--font-body)' }}>
          {t.username.ageConfirmText}
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            style={{ marginTop: '2px', flexShrink: 0, accentColor: 'var(--green)', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px', color: 'var(--t4)', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
            {t.username.ageConfirm}{' '}
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('legal')}
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--green)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-body)' }}
            >
              {t.username.terms}
            </button>
            {' '}{t.username.and}{' '}
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('privacy')}
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--green)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-body)' }}
            >
              {t.username.privacyPolicy}
            </button>
          </span>
        </label>

        <button
          onClick={handleConfirm}
          disabled={!confirmed || saving}
          style={{ width: '100%', padding: '14px', background: confirmed ? 'rgba(0,229,160,0.08)' : 'var(--bg-page)', border: `1px solid ${confirmed ? 'var(--green)' : 'var(--bd2)'}`, borderRadius: '6px', color: confirmed ? 'var(--green)' : 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: confirmed && !saving ? 'pointer' : 'not-allowed' }}>
          {saving ? '...' : t.username.ageConfirmButton}
        </button>
      </div>
    </div>
  );
}
