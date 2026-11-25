import { useState, useRef } from 'react';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';

export default function UsernameModal({ onDone, onNavigate }) {
  const { t } = useLang();
  const [username, setUsername]       = useState('');
  const [status,   setStatus]         = useState('');
  const [checking, setChecking]       = useState(false);
  const [available, setAvailable]     = useState(null);
  const [saving,   setSaving]         = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const debounceRef = useRef(null);

  function checkUsername(val) {
    setUsername(val);
    setAvailable(null);
    setStatus('');
    clearTimeout(debounceRef.current);
    if (val.length < 3) return;
    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`${SERVER}/auth/username/check/${val}`);
        const data = await res.json();
        setAvailable(data.available);
        setStatus(data.error || (data.available ? t.username.available : t.username.taken));
      } catch {
        setStatus(t.username.errorCheck);
      }
      setChecking(false);
    }, 500);
  }

  async function save() {
    if (!available || saving || !ageConfirmed) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('tradaria_token');
      const [usernameRes, ageRes] = await Promise.all([
        fetch(`${SERVER}/auth/username/set`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ username }),
        }),
        fetch(`${SERVER}/user/confirm-age`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ accept: true }),
        }),
      ]);
      const data = await usernameRes.json();
      if (data.ok) onDone(username);
      else setStatus(data.error);
    } catch {
      setStatus(t.username.errorSave);
    }
    setSaving(false);
  }

  const canSubmit = available && ageConfirmed && !saving;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '12px', padding: '32px 28px', width: '100%', maxWidth: '380px' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '22px', color: 'var(--t1)', marginBottom: '8px' }}>
          {t.username.title}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--t5)', letterSpacing: '0.06em', marginBottom: '24px' }}>
          {t.username.hint}
        </div>

        <input
          type="text"
          value={username}
          onChange={e => checkUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder={t.username.placeholder}
          maxLength={16}
          style={{ width: '100%', background: 'var(--bg-page)', border: `1px solid ${available === true ? 'var(--green)' : available === false ? 'var(--color-down)' : 'var(--bd2)'}`, borderRadius: '6px', padding: '12px 14px', color: 'var(--t2)', fontFamily: 'var(--font-body)', fontSize: '14px', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
        />

        {status && (
          <div style={{ fontSize: '12px', color: available ? 'var(--green)' : 'var(--color-down)', marginBottom: '16px', fontFamily: 'var(--font-body)' }}>
            {checking ? t.username.checking : status}
          </div>
        )}

        {/* Age confirmation checkbox */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={e => setAgeConfirmed(e.target.checked)}
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
          onClick={save}
          disabled={!canSubmit}
          style={{ width: '100%', padding: '14px', background: canSubmit ? 'rgba(0,229,160,0.08)' : 'var(--bg-page)', border: `1px solid ${canSubmit ? 'var(--green)' : 'var(--bd2)'}`, borderRadius: '6px', color: canSubmit ? 'var(--green)' : 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
          {saving ? '...' : t.username.confirm}
        </button>
      </div>
    </div>
  );
}
