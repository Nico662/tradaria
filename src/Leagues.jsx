import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import { SERVER } from './config.js';
import { Trophy } from 'lucide-react';
import { TextTabs } from './components/ui';

export default function Leagues({ onOpenLeague, onBack }) {
  const { user } = useAuth();
  const { t } = useLang();
  const tl = t.leagues;
  const [leagues, setLeagues]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState('list');
  const [name, setName]             = useState('');
  const [endDate, setEndDate]       = useState('');
  const [joinCode, setJoinCode]     = useState('');
  const [msg, setMsg]               = useState(null); // { text, ok }
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
      <div style={{ marginBottom: '12px' }}><Trophy size={32} strokeWidth={2} aria-hidden style={{ stroke: 'var(--color-neutral)' }} /></div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>{tl.signIn}</div>
    </div>
  );

  return (
    <div style={{ padding: '16px 20px 60px' }}>

      <TextTabs
        tabs={[
          { value: 'list',   label: tl.myLeagues },
          { value: 'create', label: tl.create },
          { value: 'join',   label: tl.joinTab },
        ]}
        active={view}
        onChange={v => { setView(v); setMsg(null); }}
        style={{ marginBottom: '20px' }}
      />

      {/* ── My leagues ── */}
      {view === 'list' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px' }}>...</div>
        ) : leagues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ marginBottom: '12px' }}><Trophy size={32} strokeWidth={2} aria-hidden style={{ stroke: 'var(--color-neutral)' }} /></div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>{tl.empty}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-hint)', marginTop: '6px' }}>{tl.emptySub}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {leagues.map(l => (
              <div key={l._id} onClick={() => onOpenLeague(l._id)}
                style={{ padding: '14px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,229,160,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)' }}>{l.name}</div>
                  {l.isOwner && (
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--color-neutral)', padding: '2px 6px', background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.2)', borderRadius: '4px' }}>{tl.owner}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>{l.memberCount} {l.memberCount === 1 ? tl.member : tl.members}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--green)', opacity: 0.5 }}>{l.code}</span>
                  {l.endDate && <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>{tl.until} {new Date(l.endDate + 'T00:00:00').toLocaleDateString()}</span>}
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
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{tl.nameLabel}</div>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={30} placeholder={tl.namePlaceholder}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{tl.endDateLabel}</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', boxSizing: 'border-box', outline: 'none', colorScheme: 'dark' }} />
          </div>
          {msg && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: msg.ok ? 'var(--green)' : 'var(--color-down)' }}>{msg.text}</div>}
          <button onClick={createLeague} disabled={submitting}
            style={{ width: '100%', padding: '13px', background: 'rgba(0,229,160,0.08)', border: '1.5px solid var(--border-green)', borderRadius: 'var(--radius-full)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? '...' : tl.createBtn}
          </button>
        </div>
      )}

      {/* ── Join ── */}
      {view === 'join' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{tl.codeLabel}</div>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} placeholder="XXXXXX"
              style={{ width: '100%', padding: '14px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '22px', fontWeight: 700, letterSpacing: '0.22em', textAlign: 'center', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          {msg && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: msg.ok ? 'var(--green)' : 'var(--color-down)' }}>{msg.text}</div>}
          <button onClick={joinLeague} disabled={submitting}
            style={{ width: '100%', padding: '13px', background: 'rgba(0,229,160,0.08)', border: '1.5px solid var(--border-green)', borderRadius: 'var(--radius-full)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? '...' : tl.joinBtn}
          </button>
        </div>
      )}
    </div>
  );
}
