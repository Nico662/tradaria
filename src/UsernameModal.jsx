import { useState } from 'react';
import { SERVER } from './config.js';

export default function UsernameModal({ onDone }) {
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
      setStatus(data.error || (data.available ? '✓ disponible' : '✗ ya en uso'));
    } catch {
      setStatus('error comprobando');
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
      setStatus('error guardando');
    }
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#0f141b', border: '1px solid #1e2530', borderRadius: '12px', padding: '32px 28px', width: '100%', maxWidth: '380px' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#f0f0f0', marginBottom: '8px' }}>
          Elige tu username
        </div>
        <div style={{ fontSize: '10px', color: '#4a5568', letterSpacing: '0.06em', marginBottom: '24px' }}>
          Solo letras, números y _ · 3-16 caracteres
        </div>

        <input
          type="text"
          value={username}
          onChange={e => checkUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder="tu_username"
          maxLength={16}
          style={{ width: '100%', background: '#0a0c0f', border: `1px solid ${available === true ? '#22d3a5' : available === false ? '#f05454' : '#2a3345'}`, borderRadius: '6px', padding: '12px 14px', color: '#e2e8f0', fontFamily: "'Space Mono', monospace", fontSize: '14px', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
        />

        {status && (
          <div style={{ fontSize: '10px', color: available ? '#22d3a5' : '#f05454', marginBottom: '16px', fontFamily: "'Space Mono', monospace" }}>
            {checking ? 'comprobando...' : status}
          </div>
        )}

        <button
          onClick={save}
          disabled={!available || saving}
          style={{ width: '100%', padding: '14px', background: available ? 'rgba(34,211,165,0.08)' : '#0a0c0f', border: `1px solid ${available ? '#22d3a5' : '#2a3345'}`, borderRadius: '6px', color: available ? '#22d3a5' : '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: available ? 'pointer' : 'not-allowed' }}>
          {saving ? '...' : 'Confirmar →'}
        </button>
      </div>
    </div>
  );
}