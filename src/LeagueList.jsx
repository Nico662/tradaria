import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import { SERVER } from './config.js';
import CodeErrorBlock from './components/CodeErrorBlock.jsx';
import BottomSheet from './components/BottomSheet.jsx';
import { Trophy, Plus, ChevronRight, X } from 'lucide-react';

function formatCash(n) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

const SWATCH = ['#22d3a5', '#ff7eb3', '#f5c842', '#7c3aed', '#0ea5e9', '#f97316'];

function AvatarStack({ seed, count }) {
  const n = Math.min(count, 3);
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{
          width: 26, height: 26, borderRadius: '50%',
          background: SWATCH[(hashStr(seed) + i) % SWATCH.length],
          border: '2px solid var(--bg-surface)',
          marginLeft: i > 0 ? -9 : 0,
          zIndex: n - i,
          position: 'relative',
        }} />
      ))}
    </div>
  );
}

export default function LeagueList({ onOpenLeague, onBack }) {
  const { user } = useAuth();
  const { t } = useLang();
  const tl = t.leagues;
  const [leagues, setLeagues]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sheet, setSheet]         = useState(null); // null | 'create' | 'join'
  const [name, setName]           = useState('');
  const [endDate, setEndDate]     = useState('');
  const [joinCode, setJoinCode]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]             = useState(null);
  const [joinErr, setJoinErr]     = useState(null);

  const tok = localStorage.getItem('tradaria_token');

  async function loadLeagues() {
    if (!tok) return;
    const r = await fetch(`${SERVER}/leagues/mine`, { headers: { Authorization: `Bearer ${tok}` } }).catch(() => null);
    if (!r?.ok) return;
    const data = await r.json();
    if (Array.isArray(data)) setLeagues(data);
  }

  useEffect(() => {
    loadLeagues().finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openSheet(view) {
    setSheet(view);
    setMsg(null);
    setJoinErr(null);
    setName('');
    setJoinCode('');
    setEndDate('');
  }

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
      await loadLeagues();
      setTimeout(() => { setSheet(null); onOpenLeague(data.leagueId); }, 1500);
    } catch { setMsg({ text: tl.errorCreate, ok: false }); }
    setSubmitting(false);
  }

  async function joinLeague() {
    if (joinCode.trim().length < 6) return setMsg({ text: tl.codeRequired, ok: false });
    setSubmitting(true);
    setMsg(null);
    setJoinErr(null);
    try {
      const r = await fetch(`${SERVER}/leagues/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 404) setJoinErr('code_not_found');
        else if (r.status === 429) setJoinErr('rate_limit');
        else setMsg({ text: tl.errorJoin, ok: false });
        setSubmitting(false);
        return;
      }
      setMsg({ text: tl.joined.replace('{name}', data.name), ok: true });
      await loadLeagues();
      setTimeout(() => { setSheet(null); onOpenLeague(data.leagueId); }, 1500);
    } catch { setMsg({ text: tl.errorJoin, ok: false }); }
    setSubmitting(false);
  }

  if (!tok || !user) return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <Trophy size={32} strokeWidth={2} style={{ stroke: 'var(--text-muted)', display: 'block', margin: '0 auto 12px' }} />
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>{tl.signIn}</div>
    </div>
  );

  const subtitle = leagues.length === 1
    ? tl.subtitle
    : tl.subtitlePlural.replace('{n}', leagues.length);

  return (
    <div style={{ padding: '16px 16px 100px', fontFamily: 'var(--font-body)', background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '22px', color: 'var(--text-primary)' }}>{tl.title}</div>
        <button onClick={() => openSheet('create')} aria-label="new league"
          style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,229,160,0.1)', border: '1px solid var(--border-green)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>{subtitle}</div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '12px' }}>...</div>
      ) : leagues.length === 0 ? (
        <div className="animate-fade-in-up" style={{ textAlign: 'center', padding: '48px 0 32px' }}>
          <Trophy size={40} strokeWidth={1.5} style={{ stroke: 'var(--text-muted)', display: 'block', margin: '0 auto 16px' }} />
          <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>{tl.noLeague}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '28px' }}>{tl.noLeagueSub}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {leagues.map((l, idx) => {
            const rankColor = l.myRank === 1 ? 'var(--color-neutral)' : l.myRank === 2 ? 'var(--text-secondary)' : l.myRank === 3 ? '#cd7f32' : 'var(--text-primary)';
            return (
              <div key={l._id} onClick={() => onOpenLeague(l._id)}
                className={`animate-fade-in-up stagger-${Math.min(idx + 1, 6)}`}
                style={{ padding: '14px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,229,160,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              >
                <AvatarStack seed={l._id} count={l.memberCount} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{l.name}</div>
                    {l.isOwner && <span style={{ fontSize: '11px', color: 'var(--color-neutral)', padding: '1px 5px', background: 'rgba(232,184,75,0.1)', border: '0.5px solid rgba(232,184,75,0.25)', borderRadius: '3px', flexShrink: 0, letterSpacing: '0.04em' }}>{tl.owner}</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '9px' }}>{l.memberCount} {l.memberCount === 1 ? tl.member : tl.members}</div>
                  <div style={{ display: 'flex', gap: '14px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>{tl.yourRank}</div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: rankColor }}>
                        #{l.myRank}<span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 400 }}>/{l.memberCount}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>{tl.profitability}</div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: l.myReturnPct >= 0 ? 'var(--green)' : 'var(--pink)' }}>
                        {l.myReturnPct >= 0 ? '+' : ''}{l.myReturnPct.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>{tl.balance}</div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-primary)' }}>{formatCash(l.myTotalValue)}</div>
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} strokeWidth={2} style={{ stroke: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button onClick={() => openSheet('create')}
          style={{ width: '100%', padding: '13px', background: 'rgba(0,229,160,0.08)', border: '1.5px solid var(--border-green)', borderRadius: 'var(--radius-full)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', cursor: 'pointer' }}>
          {tl.createLeague}
        </button>
        <button onClick={() => openSheet('join')}
          style={{ width: '100%', padding: '13px', background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-full)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
          {tl.joinWithCode}
        </button>
      </div>

      {/* Bottom sheet — rendered above BottomNav via BottomSheet component */}
      {sheet && (
        <BottomSheet onClose={() => setSheet(null)}>
          <div style={{ padding: '20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '16px', color: 'var(--text-primary)' }}>
                {sheet === 'create' ? tl.createLeague : tl.joinWithCode}
              </div>
              <button onClick={() => setSheet(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex' }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {sheet === 'create' && (<>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{tl.nameLabel}</div>
                <input value={name} onChange={e => setName(e.target.value)} maxLength={30} placeholder={tl.namePlaceholder}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{tl.endDateLabel}</div>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', boxSizing: 'border-box', outline: 'none', colorScheme: 'dark' }} />
              </div>
              {msg && <div style={{ fontSize: '12px', color: msg.ok ? 'var(--green)' : 'var(--pink)' }}>{msg.text}</div>}
              <button onClick={createLeague} disabled={submitting}
                style={{ width: '100%', padding: '13px', background: 'rgba(0,229,160,0.08)', border: '1.5px solid var(--border-green)', borderRadius: 'var(--radius-full)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? '...' : tl.createBtn}
              </button>
            </>)}

            {sheet === 'join' && (<>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{tl.codeLabel}</div>
                <input value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinErr(null); }} maxLength={6} placeholder="XXXXXX"
                  style={{ width: '100%', padding: '14px', background: 'var(--bg-surface)', border: `0.5px solid ${joinErr ? 'var(--pink)' : 'var(--border-default)'}`, borderRadius: 'var(--radius-md)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '22px', fontWeight: 700, letterSpacing: '0.22em', textAlign: 'center', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s' }} />
              </div>
              {joinErr === 'code_not_found' && <CodeErrorBlock title={tl.codeNotFoundTitle} hint={tl.codeNotFoundHint} />}
              {joinErr === 'rate_limit' && <CodeErrorBlock title={tl.codeTooMany} />}
              {msg && !joinErr && <div style={{ fontSize: '12px', color: msg.ok ? 'var(--green)' : 'var(--pink)' }}>{msg.text}</div>}
              <button onClick={joinLeague} disabled={submitting}
                style={{ width: '100%', padding: '13px', background: 'rgba(0,229,160,0.08)', border: '1.5px solid var(--border-green)', borderRadius: 'var(--radius-full)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? '...' : tl.joinBtn}
              </button>
            </>)}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
