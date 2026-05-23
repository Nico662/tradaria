import { useState } from 'react';
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';

export default function UsernameModal({ onDone }) {
  const { t } = useLang();
  const [username, setUsername]   = useState('');
  const [status,   setStatus]     = useState('');
  const [checking, setChecking]   = useState(false);
  const [available, setAvailable] = useState(null);
  const [saving,   setSaving]     = useState(false);

  async function checkUsername(val) {
    setUsername(val);
    setAvailable(null);
    if (val.length < 3) return;
    setChecking(true);
    try {
      const res  = await fetch(`${SERVER}/auth/username/check/${val}`);
      const data = await res.json();
      setAvailable(data.available);
      setStatus(data.error || (data.available ? t.username.available : t.username.taken));
    } catch {
      setStatus(t.username.errorCheck);
    }
    setChecking(false);
  }

  async function save() {
    if (!available || saving) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('tradara_token');
      const res   = await fetch(`${SERVER}/auth/username/set`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.ok) onDone(username);
      else setStatus(data.error);
    } catch {
      setStatus(t.username.errorSave);
    }
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '12px', padding: '32px 28px', width: '100%', maxWidth: '380px' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--t1)', marginBottom: '8px' }}>
          {t.username.title}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--t5)', letterSpacing: '0.06em', marginBottom: '24px' }}>
          {t.username.hint}
        </div>

        <input
          type="text"
          value={username}
          onChange={e => checkUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder={t.username.placeholder}
          maxLength={16}
          style={{ width: '100%', background: 'var(--bg-page)', border: `1px solid ${available === true ? '#22d3a5' : available === false ? '#f05454' : 'var(--bd2)'}`, borderRadius: '6px', padding: '12px 14px', color: 'var(--t2)', fontFamily: "'Space Mono', monospace", fontSize: '14px', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
        />

        {status && (
          <div style={{ fontSize: '10px', color: available ? '#22d3a5' : '#f05454', marginBottom: '16px', fontFamily: "'Space Mono', monospace" }}>
            {checking ? t.username.checking : status}
          </div>
        )}

        <button
          onClick={save}
          disabled={!available || saving}
          style={{ width: '100%', padding: '14px', background: available ? 'rgba(34,211,165,0.08)' : 'var(--bg-page)', border: `1px solid ${available ? '#22d3a5' : 'var(--bd2)'}`, borderRadius: '6px', color: available ? '#22d3a5' : 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: available ? 'pointer' : 'not-allowed' }}>
          {saving ? '...' : t.username.confirm}
        </button>
      </div>
    </div>
  );
}