import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import UserAvatar from './UserAvatar.jsx';
import SpecialBadge, { getSpecialUserByUsername } from './SpecialBadge.jsx';
import { SERVER } from './config.js';
import { getUsernameColor } from './cosmeticColors';
import TitleBadge from './components/TitleBadge';
import VerifiedBadge from './VerifiedBadge';
import EquippedBadge from './components/EquippedBadge';
import { Trophy } from 'lucide-react';

function formatCash(n) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const MEDAL_COLORS = {
  0: { color: 'var(--color-neutral)' },
  1: { color: 'var(--t3)' },
  2: { color: '#cd7f32' },
};

export default function League({ leagueId, onBack, onViewProfile, onJoined }) {
  const { user } = useAuth();
  const { t } = useLang();
  const tl = t.leagues;
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(!!leagueId);
  const [copied, setCopied]   = useState(false);
  const [busy, setBusy]       = useState(false);

  // empty-state form
  const [emptyView, setEmptyView]   = useState('');
  const [name, setName]             = useState('');
  const [endDate, setEndDate]       = useState('');
  const [joinCode, setJoinCode]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]               = useState(null);

  const tok = localStorage.getItem('tradaria_token');

  useEffect(() => {
    if (!leagueId) return;
    setLoading(true);
    fetch(`${SERVER}/leagues/${leagueId}/ranking`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => {
        if (r.status === 403 || r.status === 404) { onJoined?.(null); return null; }
        return r.json();
      })
      .then(d => { if (d !== null) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  function copyCode() {
    if (!data) return;
    navigator.clipboard.writeText(data.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function share() {
    if (!data) return;
    const text = tl.shareText.replace('{name}', data.name).replace('{code}', data.code);
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function leave() {
    if (!window.confirm(tl.confirmLeave)) return;
    setBusy(true);
    try {
      await fetch(`${SERVER}/leagues/${leagueId}/leave`, {
        method: 'POST', headers: { Authorization: `Bearer ${tok}` },
      });
      onBack();
    } catch {}
    setBusy(false);
  }

  async function deleteLeague() {
    if (!window.confirm(tl.confirmDelete)) return;
    setBusy(true);
    try {
      await fetch(`${SERVER}/leagues/${leagueId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${tok}` },
      });
      onBack();
    } catch {}
    setBusy(false);
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
      const d = await r.json();
      if (!r.ok) { setMsg({ text: tl.errorCreate, ok: false }); setSubmitting(false); return; }
      setMsg({ text: tl.created.replace('{code}', d.code), ok: true });
      setTimeout(() => onJoined && onJoined(d.leagueId), 1500);
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
      const d = await r.json();
      if (!r.ok) { setMsg({ text: tl.errorJoin, ok: false }); setSubmitting(false); return; }
      setMsg({ text: tl.joined.replace('{name}', d.name), ok: true });
      setTimeout(() => onJoined && onJoined(d.leagueId), 1500);
    } catch { setMsg({ text: tl.errorJoin, ok: false }); }
    setSubmitting(false);
  }

  const daysLeft = data?.endDate
    ? Math.max(0, Math.ceil((new Date(data.endDate) - new Date()) / 86400000))
    : null;

  if (!leagueId) return (
    <div style={{ padding: '16px 16px 24px', fontFamily: 'var(--font-body)', background: 'var(--bg-base)', minHeight: '100vh' }}>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, padding: '0 0 12px 0' }}>{t.league.back}</button>

      {emptyView === '' && (
        <div className="animate-fade-in-up" style={{ textAlign: 'center', padding: '48px 0 32px' }}>
          <div style={{ marginBottom: '16px' }}>
            <Trophy size={40} strokeWidth={1.5} aria-hidden style={{ stroke: 'var(--text-muted)', display: 'inline-block' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>{tl.noLeague}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '28px' }}>{tl.noLeagueSub}</div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => { setEmptyView('create'); setMsg(null); }}
              style={{ padding: '11px 22px', background: 'rgba(0,229,160,0.08)', border: '1.5px solid var(--green)', borderRadius: 'var(--radius-full)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', cursor: 'pointer' }}>
              {tl.create}
            </button>
            <button onClick={() => { setEmptyView('join'); setMsg(null); }}
              style={{ padding: '11px 22px', background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-full)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
              {tl.joinTab}
            </button>
          </div>
        </div>
      )}

      {emptyView === 'create' && (
        <div className="animate-slide-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button onClick={() => { setEmptyView(''); setMsg(null); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, padding: '0 0 4px 0', textAlign: 'left' }}>
            ← {tl.back}
          </button>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '6px', textTransform: 'uppercase' }}>{tl.nameLabel}</div>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={30} placeholder={tl.namePlaceholder}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '6px', textTransform: 'uppercase' }}>{tl.endDateLabel}</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', boxSizing: 'border-box', outline: 'none', colorScheme: 'dark' }} />
          </div>
          {msg && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: msg.ok ? 'var(--green)' : 'var(--pink)' }}>{msg.text}</div>}
          <button onClick={createLeague} disabled={submitting}
            style={{ width: '100%', padding: '13px', background: 'rgba(0,229,160,0.08)', border: '1.5px solid var(--green)', borderRadius: 'var(--radius-full)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? '...' : tl.createBtn}
          </button>
        </div>
      )}

      {emptyView === 'join' && (
        <div className="animate-slide-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button onClick={() => { setEmptyView(''); setMsg(null); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, padding: '0 0 4px 0', textAlign: 'left' }}>
            ← {tl.back}
          </button>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '6px', textTransform: 'uppercase' }}>{tl.codeLabel}</div>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} placeholder="XXXXXX"
              style={{ width: '100%', padding: '14px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '22px', fontWeight: 700, letterSpacing: '0.22em', textAlign: 'center', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          {msg && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: msg.ok ? 'var(--green)' : 'var(--pink)' }}>{msg.text}</div>}
          <button onClick={joinLeague} disabled={submitting}
            style={{ width: '100%', padding: '13px', background: 'rgba(0,229,160,0.08)', border: '1.5px solid var(--green)', borderRadius: 'var(--radius-full)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? '...' : tl.joinBtn}
          </button>
        </div>
      )}
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
      <div className="spinner" />
    </div>
  );

  if (!data || data.error) return (
    <div style={{ padding: '16px 16px 24px', fontFamily: 'var(--font-body)', background: 'var(--bg-base)', minHeight: '100vh' }}>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, padding: '0 0 12px 0' }}>{t.league.back}</button>
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px' }}>{tl.notFound}</div>
    </div>
  );

  return (
    <div style={{ padding: '16px 16px 24px', fontFamily: 'var(--font-body)', background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* Header card */}
      <div className="animate-slide-in-up" style={{ background: 'var(--gradient-surface)', border: '0.5px solid var(--border-pink)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,126,179,0.15), transparent 70%)' }} />
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, padding: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {t.league.back}
        </button>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>{data.name}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {daysLeft !== null && (
            <span style={{ background: 'var(--pink-dim)', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, padding: '3px 10px', borderRadius: 'var(--radius-full)', letterSpacing: '0.08em' }}>
              {daysLeft > 0 ? `${daysLeft} ${t.league.daysLeft}` : t.league.finished}
            </span>
          )}
          <span style={{ background: 'var(--green-dim)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, padding: '3px 10px', borderRadius: 'var(--radius-full)', letterSpacing: '0.08em' }}>
            {data.ranking?.length ?? 0} {t.league.players}
          </span>
        </div>
      </div>

      {/* Ranking label */}
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
        {tl.rankingLabel} · {data.ranking.length} {tl.participants}
      </div>

      {/* Ranking rows */}
      {data.ranking.map((entry, i) => {
        const isMe = entry.isYou;
        const name = entry.username ? `@${entry.username}` : entry.name;
        return (
          <div key={String(entry.userId)} className={`animate-fade-in-up stagger-${Math.min(i + 1, 7)}`}
            onClick={() => !isMe && entry.username && onViewProfile && onViewProfile(entry.username)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: isMe ? 'rgba(255,126,179,0.06)' : 'var(--bg-surface)',
              border: `0.5px solid ${isMe ? 'var(--border-pink)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px', marginBottom: '6px',
              cursor: !isMe && entry.username && onViewProfile ? 'pointer' : 'default',
            }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: isMe ? 'var(--pink)' : 'var(--text-muted)', width: '20px', textAlign: 'center', flexShrink: 0 }}>
              {i < 3 ? <span style={{ color: MEDAL_COLORS[i].color }}>{i + 1}</span> : i + 1}
            </div>
            <UserAvatar user={entry} size={24} showBadge />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: isMe ? 'var(--pink)' : (getUsernameColor(entry.activeCosmetics) || 'var(--text-primary)'), display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flexWrap: 'wrap' }}>
                <span style={{ flex: '1 1 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{name}</span>
                <SpecialBadge specialUser={getSpecialUserByUsername(entry.username)} size={10} />
                {entry.hasVerifiedBadge && <VerifiedBadge size={10} />}
                <EquippedBadge id={entry.activeCosmetics?.badge} size={10} />
                {isMe && <span style={{ fontSize: '12px', color: 'var(--pink)', flexShrink: 0 }}>{t.league.you}</span>}
                <TitleBadge title={entry.activeCosmetics?.title} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatCash(entry.totalValue)}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: entry.returnPct >= 0 ? 'var(--green)' : 'var(--pink)', flexShrink: 0 }}>
              {entry.returnPct >= 0 ? '+' : ''}{entry.returnPct.toFixed(2)}%
            </div>
          </div>
        );
      })}

      {/* YOU row (outside top) */}
      {data.userPosition && (() => {
        const up   = data.userPosition;
        const name = up.username ? `@${up.username}` : up.name;
        return (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', margin: '4px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>···</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'rgba(255,126,179,0.06)',
              border: '0.5px solid var(--border-pink)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px', marginBottom: '6px',
            }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: 'var(--pink)', width: '20px', textAlign: 'center', flexShrink: 0 }}>
                #{up.rank}
              </div>
              <UserAvatar user={up} size={24} showBadge />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--pink)', display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flexWrap: 'wrap' }}>
                  <span style={{ flex: '1 1 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{name}</span>
                  {up.hasVerifiedBadge && <VerifiedBadge size={10} />}
                  <EquippedBadge id={up.activeCosmetics?.badge} size={10} />
                  <span style={{ fontSize: '12px', color: 'var(--pink)', flexShrink: 0 }}>{t.league.you}</span>
                  <TitleBadge title={up.activeCosmetics?.title} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatCash(up.totalValue)}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: up.returnPct >= 0 ? 'var(--green)' : 'var(--pink)', flexShrink: 0 }}>
                {up.returnPct >= 0 ? '+' : ''}{up.returnPct.toFixed(2)}%
              </div>
            </div>
          </>
        );
      })()}

      {/* Footer */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '20px', paddingBottom: '16px' }}>
        <button onClick={copyCode}
          style={{ flex: 1, background: 'var(--green-dim)', border: '1.5px solid var(--border-green)', borderRadius: 'var(--radius-full)', padding: '12px', fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '12px', color: 'var(--green)', cursor: 'pointer', transition: 'transform 0.1s' }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {copied ? t.league.copied : t.league.shareCode}
        </button>
        {data.isOwner ? (
          <button onClick={deleteLeague} disabled={busy}
            style={{ background: 'var(--pink-dim)', border: '1.5px solid var(--border-pink)', borderRadius: 'var(--radius-full)', padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '12px', color: 'var(--pink)', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
            {t.league.delete}
          </button>
        ) : (
          <button onClick={leave} disabled={busy}
            style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-full)', padding: '12px 16px', fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
            {t.league.leave}
          </button>
        )}
      </div>
    </div>
  );
}
