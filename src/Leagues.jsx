import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { SERVER } from './config.js';

export default function Leagues({ onOpenLeague, onBack }) {
  const { user } = useAuth();
  const [leagues, setLeagues]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState('list');
  const [name, setName]           = useState('');
  const [endDate, setEndDate]     = useState('');
  const [joinCode, setJoinCode]   = useState('');
  const [msg, setMsg]             = useState(null); // { text, ok }
  const [submitting, setSubmitting] = useState(false);

  const tok = localStorage.getItem('tradara_token');

  async function loadLeagues() {
    if (!tok) return;
    const r = await fetch(`${SERVER}/leagues/mine`, { headers: { Authorization: `Bearer ${tok}` } }).catch(() => null);
    if (!r) return;
    const data = await r.json();
    if (Array.isArray(data)) setLeagues(data);
  }

  useEffect(() => {
    loadLeagues().finally(() => setLoading(false));
  }, []);

  async function createLeague() {
    if (!name.trim()) return setMsg({ text: 'Ponle un nombre a la liga', ok: false });
    setSubmitting(true);
    setMsg(null);
    try {
      const r = await fetch(`${SERVER}/leagues/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), endDate: endDate || undefined }),
      });
      const data = await r.json();
      if (!r.ok) { setMsg({ text: data.error || 'Error al crear', ok: false }); setSubmitting(false); return; }
      setMsg({ text: `Liga creada · código: ${data.code}`, ok: true });
      setName(''); setEndDate('');
      await loadLeagues();
      setTimeout(() => { setView('list'); setMsg(null); }, 2000);
    } catch { setMsg({ text: 'Error al crear la liga', ok: false }); }
    setSubmitting(false);
  }

  async function joinLeague() {
    if (joinCode.trim().length < 6) return setMsg({ text: 'Introduce el código de 6 letras', ok: false });
    setSubmitting(true);
    setMsg(null);
    try {
      const r = await fetch(`${SERVER}/leagues/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      const data = await r.json();
      if (!r.ok) { setMsg({ text: data.error || 'Error al unirse', ok: false }); setSubmitting(false); return; }
      setMsg({ text: `Te uniste a "${data.name}"`, ok: true });
      setJoinCode('');
      await loadLeagues();
      setTimeout(() => { setView('list'); setMsg(null); }, 2000);
    } catch { setMsg({ text: 'Error al unirse', ok: false }); }
    setSubmitting(false);
  }

  if (!tok || !user) return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#4a5568' }}>Inicia sesión para usar las ligas</div>
    </div>
  );

  const viewBtn = (v, label) => (
    <button key={v} onClick={() => { setView(v); setMsg(null); }}
      style={{ flex: 1, padding: '8px 4px', background: view === v ? 'rgba(34,211,165,0.08)' : 'transparent', border: `1px solid ${view === v ? '#22d3a5' : '#2a3345'}`, borderRadius: '6px', color: view === v ? '#22d3a5' : '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer' }}>
      {label}
    </button>
  );

  return (
    <div style={{ padding: '16px 20px 60px' }}>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {[['list', 'Mis ligas'], ['create', 'Crear'], ['join', 'Unirse']].map(([v, l]) => viewBtn(v, l))}
      </div>

      {/* ── Mis ligas ── */}
      {view === 'list' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#3a4455', fontFamily: "'Space Mono', monospace", fontSize: '10px' }}>...</div>
        ) : leagues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#4a5568' }}>No tienes ligas aún</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#3a4455', marginTop: '6px' }}>Crea una o únete con un código</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {leagues.map(l => (
              <div key={l._id} onClick={() => onOpenLeague(l._id)}
                style={{ padding: '14px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#22d3a540'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2530'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: '#f0f0f0' }}>{l.name}</div>
                  {l.isOwner && (
                    <span style={{ fontSize: '8px', fontFamily: "'Space Mono', monospace", color: '#f5c842', letterSpacing: '0.06em', padding: '2px 6px', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '4px' }}>owner</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#4a5568' }}>{l.memberCount} {l.memberCount === 1 ? 'miembro' : 'miembros'}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#22d3a560', letterSpacing: '0.12em' }}>{l.code}</span>
                  {l.endDate && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#4a5568' }}>hasta {new Date(l.endDate + 'T00:00:00').toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Crear ── */}
      {view === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#6b7a8d', letterSpacing: '0.1em', marginBottom: '6px', textTransform: 'uppercase' }}>Nombre de la liga</div>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={30} placeholder="Mi liga privada..."
              style={{ width: '100%', padding: '12px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '6px', color: '#f0f0f0', fontFamily: "'Space Mono', monospace", fontSize: '12px', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#6b7a8d', letterSpacing: '0.1em', marginBottom: '6px', textTransform: 'uppercase' }}>Fecha de fin (opcional)</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '12px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '6px', color: '#f0f0f0', fontFamily: "'Space Mono', monospace", fontSize: '12px', boxSizing: 'border-box', outline: 'none', colorScheme: 'dark' }} />
          </div>
          {msg && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: msg.ok ? '#22d3a5' : '#f05454' }}>{msg.text}</div>}
          <button onClick={createLeague} disabled={submitting}
            style={{ width: '100%', padding: '13px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? '...' : 'Crear liga →'}
          </button>
        </div>
      )}

      {/* ── Unirse ── */}
      {view === 'join' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#6b7a8d', letterSpacing: '0.1em', marginBottom: '6px', textTransform: 'uppercase' }}>Código de 6 letras</div>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} placeholder="XXXXXX"
              style={{ width: '100%', padding: '14px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '22px', fontWeight: 700, letterSpacing: '0.22em', textAlign: 'center', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          {msg && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: msg.ok ? '#22d3a5' : '#f05454' }}>{msg.text}</div>}
          <button onClick={joinLeague} disabled={submitting}
            style={{ width: '100%', padding: '13px', background: 'rgba(34,211,165,0.08)', border: '1px solid #22d3a5', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? '...' : 'Unirse →'}
          </button>
        </div>
      )}
    </div>
  );
}
