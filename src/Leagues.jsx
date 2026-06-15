import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import { SERVER } from './config.js';

export default function Leagues({ onOpenLeague, onBack }) {
  const { user } = useAuth();
  const { t } = useLang();
  const tl = t.leagues;
  const [leagues, setLeagues]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState('list');
  const [name, setName]           = useState('');
  const [endDate, setEndDate]     = useState('');
  const [joinCode, setJoinCode]   = useState('');
  const [msg, setMsg]             = useState(null); // { text, ok }
  const [submitting, setSubmitting] = useState(false);

  const tok = localStorage.getItem('tradaria_token');

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
    if (!name.trim()) return setMsg({ text: tl.nameRequired, ok: false });
    setSubmitting(true);
    setMsg(null);
    try {
      const r = await fetch(`${SERVER}/leagues/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), endDate: endDate || undefined }),
      });
      const data = await r.json();
      if (!r.ok) { setMsg({ text: data.error || tl.errorCreate, ok: false }); setSubmitting(false); return; }
      setMsg({ text: tl.created.replace('{code}', data.code), ok: true });
      setName(''); setEndDate('');
      await loadLeagues();
      setTimeout(() => { setView('list'); setMsg(null); }, 2000);
    } catch { setMsg({ text: tl.errorCreate, ok: false }); }
    setSubmitting(false);
  }

  async function joinLeague() {
    if (joinCode.trim().length < 6) return setMsg({ text: tl.codeRequired, ok: false });
    setSubmitting(true);
    setMsg(null);
    try {
      const r = await fetch(`${SERVER}/leagues/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      const data = await r.json();
      if (!r.ok) { setMsg({ text: data.error || tl.errorJoin, ok: false }); setSubmitting(false); return; }
      setMsg({ text: tl.joined.replace('{name}', data.name), ok: true });
      setJoinCode('');
      await loadLeagues();
      setTimeout(() => { setView('list'); setMsg(null); }, 2000);
    } catch { setMsg({ text: tl.errorJoin, ok: false }); }
    setSubmitting(false);
  }

  if (!tok || !user) return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--t5)' }}>{tl.signIn}</div>
    </div>
  );

  const viewBtn = (v, label) => (
    <button key={v} onClick={() => { setView(v); setMsg(null); }}
      style={{ flex: 1, padding: '8px 4px', background: view === v ? 'rgba(0,229,160,0.08)' : 'transparent', border: `1px solid ${view === v ? 'var(--green)' : 'var(--bd2)'}`, borderRadius: '6px', color: view === v ? 'var(--green)' : 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer' }}>
      {label}
    </button>
  );

  return (
    <div style={{ padding: '16px 20px 60px' }}>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {[[  'list', tl.myLeagues], ['create', tl.create], ['join', tl.joinTab]].map(([v, l]) => viewBtn(v, l))}
      </div>

      {/* ── My leagues ── */}
      {view === 'list' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '10px' }}>...</div>
        ) : leagues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏆</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t5)' }}>{tl.empty}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t6)', marginTop: '6px' }}>{tl.emptySub}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {leagues.map(l => (
              <div key={l._id} onClick={() => onOpenLeague(l._id)}
                style={{ padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)40'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bd)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--t1)' }}>{l.name}</div>
                  {l.isOwner && (
                    <span style={{ fontSize: '8px', fontFamily: "'Space Mono', monospace", color: 'var(--color-neutral)', letterSpacing: '0.06em', padding: '2px 6px', background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: '4px' }}>{tl.owner}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t5)' }}>{l.memberCount} {l.memberCount === 1 ? tl.member : tl.members}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--green)60', letterSpacing: '0.12em' }}>{l.code}</span>
                  {l.endDate && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t5)' }}>{tl.until} {new Date(l.endDate + 'T00:00:00').toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Create ── */}
      {view === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.1em', marginBottom: '6px', textTransform: 'uppercase' }}>{tl.nameLabel}</div>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={30} placeholder={tl.namePlaceholder}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '6px', color: 'var(--t1)', fontFamily: "'Space Mono', monospace", fontSize: '12px', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.1em', marginBottom: '6px', textTransform: 'uppercase' }}>{tl.endDateLabel}</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '6px', color: 'var(--t1)', fontFamily: "'Space Mono', monospace", fontSize: '12px', boxSizing: 'border-box', outline: 'none', colorScheme: 'dark' }} />
          </div>
          {msg && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: msg.ok ? 'var(--green)' : 'var(--color-down)' }}>{msg.text}</div>}
          <button onClick={createLeague} disabled={submitting}
            style={{ width: '100%', padding: '13px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '8px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? '...' : tl.createBtn}
          </button>
        </div>
      )}

      {/* ── Join ── */}
      {view === 'join' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.1em', marginBottom: '6px', textTransform: 'uppercase' }}>{tl.codeLabel}</div>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} placeholder="XXXXXX"
              style={{ width: '100%', padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '6px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '22px', fontWeight: 700, letterSpacing: '0.22em', textAlign: 'center', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          {msg && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: msg.ok ? 'var(--green)' : 'var(--color-down)' }}>{msg.text}</div>}
          <button onClick={joinLeague} disabled={submitting}
            style={{ width: '100%', padding: '13px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '8px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? '...' : tl.joinBtn}
          </button>
        </div>
      )}
    </div>
  );
}
