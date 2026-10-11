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
import { Share2, MoreHorizontal, ChevronRight } from 'lucide-react';

function formatCash(n) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const MEDAL = { 0: 'var(--color-neutral)', 1: 'var(--text-secondary)', 2: '#cd7f32' };

export default function League({ leagueId, onBack, onSwitchLeague, onViewProfile, onLeagueClosed }) {
  const { t } = useLang();
  const tl = t.leagues;
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [myLeagues, setMyLeagues] = useState([]);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [confirm, setConfirm]     = useState(null); // 'delete' | 'leave' | null
  const [busy, setBusy]           = useState(false);
  const [copied, setCopied]       = useState(false);

  const tok = localStorage.getItem('tradaria_token');

  // Fetch chips list once on mount
  useEffect(() => {
    if (!tok) return;
    fetch(`${SERVER}/leagues/mine`, { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => r.ok ? r.json() : []).catch(() => [])
      .then(d => { if (Array.isArray(d)) setMyLeagues(d); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch ranking whenever leagueId changes
  useEffect(() => {
    if (!leagueId) return;
    setLoading(true);
    setData(null);
    setMenuOpen(false);
    setConfirm(null);
    fetch(`${SERVER}/leagues/${leagueId}/ranking`, { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => {
        if (r.status === 403 || r.status === 404) { onBack(); return null; }
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function doDelete() {
    setBusy(true);
    try {
      await fetch(`${SERVER}/leagues/${leagueId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${tok}` },
      });
      onLeagueClosed();
    } catch {}
    setBusy(false);
    setConfirm(null);
  }

  async function doLeave() {
    setBusy(true);
    try {
      await fetch(`${SERVER}/leagues/${leagueId}/leave`, {
        method: 'POST', headers: { Authorization: `Bearer ${tok}` },
      });
      onLeagueClosed();
    } catch {}
    setBusy(false);
    setConfirm(null);
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  if (!data) return null;

  const totalMembers = data.memberCount ?? data.ranking?.length ?? 0;
  const daysLeft = data.endDate
    ? Math.max(0, Math.ceil((new Date(data.endDate) - new Date()) / 86400000))
    : null;
  const myEntry    = data.ranking?.find(e => e.isYou) || data.userPosition;
  const myRank     = data.userPosition?.rank ?? (data.ranking ? data.ranking.findIndex(e => e.isYou) + 1 : 0);
  // advantage over next-ranked member (only if user is in top10 and not last)
  const nextEntry  = !data.userPosition && myRank < (data.ranking?.length ?? 0)
    ? data.ranking[myRank] : null; // myRank is 1-indexed → index of next person
  const advantage  = nextEntry ? myEntry.returnPct - nextEntry.returnPct : null;

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--bg-base)', minHeight: '100vh', paddingBottom: '32px' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 0', gap: '8px' }}>
        <button onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, padding: 0, flexShrink: 0 }}>
          {tl.backToLeagues}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={share} aria-label="share"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', display: 'flex', alignItems: 'center' }}>
          <Share2 size={16} strokeWidth={2} />
        </button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(v => !v)} aria-label="more options"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', display: 'flex', alignItems: 'center' }}>
            <MoreHorizontal size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* League chips (only when user has >1 league) */}
      {myLeagues.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', padding: '12px 16px 0', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {myLeagues.map(l => (
            <button key={l._id} onClick={() => l._id !== leagueId && onSwitchLeague(l._id)}
              style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 'var(--radius-full)', background: l._id === leagueId ? 'var(--pink-dim)' : 'var(--bg-elevated)', border: `0.5px solid ${l._id === leagueId ? 'var(--border-pink)' : 'var(--border-default)'}`, color: l._id === leagueId ? 'var(--pink)' : 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: l._id === leagueId ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
              {l.name.length > 18 ? l.name.slice(0, 16) + '…' : l.name}
            </button>
          ))}
        </div>
      )}

      {/* Hero card */}
      <div className="animate-slide-in-up" style={{ margin: '14px 16px 0', background: 'var(--gradient-surface)', border: '0.5px solid var(--border-pink)', borderRadius: 'var(--radius-lg)', padding: '16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,126,179,0.15), transparent 70%)' }} />
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '18px', color: 'var(--text-primary)', marginBottom: '10px' }}>{data.name}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <span style={{ background: 'var(--green-dim)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: 'var(--radius-full)', letterSpacing: '0.08em' }}>
            {totalMembers} {t.league.players}
          </span>
          {daysLeft !== null && (
            <span style={{ background: 'var(--pink-dim)', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: 'var(--radius-full)', letterSpacing: '0.08em' }}>
              {daysLeft > 0 ? `${daysLeft} ${t.league.daysLeft}` : t.league.finished}
            </span>
          )}
        </div>
        {myEntry && (
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>{tl.yourRank}</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: myRank === 1 ? 'var(--color-neutral)' : myRank === 2 ? 'var(--text-secondary)' : myRank === 3 ? '#cd7f32' : 'var(--text-primary)', lineHeight: 1 }}>
                #{myRank}
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>/{totalMembers}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>{tl.profitability}</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: myEntry.returnPct >= 0 ? 'var(--green)' : 'var(--pink)', lineHeight: 1 }}>
                {myEntry.returnPct >= 0 ? '+' : ''}{myEntry.returnPct.toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>{tl.balance}</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{formatCash(myEntry.totalValue)}</div>
            </div>
            {advantage !== null && (
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>{tl.advantage}</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--green)', lineHeight: 1 }}>+{advantage.toFixed(2)}%</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ranking */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
          {tl.rankingLabel} · {totalMembers} {tl.participants}
        </div>

        {data.ranking.map((entry, i) => {
          const isMe = entry.isYou;
          const displayName = entry.username ? `@${entry.username}` : entry.name;
          const canViewProfile = !isMe && !!entry.username && !!onViewProfile;
          return (
            <div key={String(entry.userId)} className={`animate-fade-in-up stagger-${Math.min(i + 1, 7)}`}
              onClick={() => canViewProfile && onViewProfile(entry.username)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: isMe ? 'rgba(255,126,179,0.06)' : 'var(--bg-surface)',
                border: `0.5px solid ${isMe ? 'var(--border-pink)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px', marginBottom: '6px',
                cursor: canViewProfile ? 'pointer' : 'default',
              }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: i < 3 ? MEDAL[i] : (isMe ? 'var(--pink)' : 'var(--text-muted)'), width: '20px', textAlign: 'center', flexShrink: 0 }}>
                {i + 1}
              </div>
              <UserAvatar user={entry} size={24} showBadge />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: isMe ? 'var(--pink)' : (getUsernameColor(entry.activeCosmetics) || 'var(--text-primary)'), display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, maxWidth: '100%' }}>{displayName}</span>
                  <SpecialBadge specialUser={getSpecialUserByUsername(entry.username)} size={10} />
                  {entry.hasVerifiedBadge && <VerifiedBadge size={10} />}
                  <EquippedBadge id={entry.activeCosmetics?.badge} size={10} />
                  {isMe && <span style={{ fontSize: '11px', color: 'var(--pink)', flexShrink: 0 }}>{t.league.you}</span>}
                  <TitleBadge title={entry.activeCosmetics?.title} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatCash(entry.totalValue)}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: entry.returnPct >= 0 ? 'var(--green)' : 'var(--pink)', flexShrink: 0 }}>
                {entry.returnPct >= 0 ? '+' : ''}{entry.returnPct.toFixed(2)}%
              </div>
              {canViewProfile && <ChevronRight size={14} strokeWidth={2} style={{ stroke: 'var(--text-muted)', flexShrink: 0 }} />}
            </div>
          );
        })}

        {/* User outside top 10 */}
        {data.userPosition && (() => {
          const up = data.userPosition;
          const displayName = up.username ? `@${up.username}` : up.name;
          return (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', margin: '4px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>···</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,126,179,0.06)', border: '0.5px solid var(--border-pink)', borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: '6px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: 'var(--pink)', width: '20px', textAlign: 'center', flexShrink: 0 }}>#{up.rank}</div>
              <UserAvatar user={up} size={24} showBadge />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--pink)', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{displayName}</span>
                  {up.hasVerifiedBadge && <VerifiedBadge size={10} />}
                  <EquippedBadge id={up.activeCosmetics?.badge} size={10} />
                  <span style={{ fontSize: '11px', color: 'var(--pink)', flexShrink: 0 }}>{t.league.you}</span>
                  <TitleBadge title={up.activeCosmetics?.title} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatCash(up.totalValue)}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: up.returnPct >= 0 ? 'var(--green)' : 'var(--pink)', flexShrink: 0 }}>
                {up.returnPct >= 0 ? '+' : ''}{up.returnPct.toFixed(2)}%
              </div>
            </div>
          </>);
        })()}
      </div>

      {/* Invite code block */}
      <div style={{ margin: '20px 16px 0', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>{tl.inviteCode}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '26px', fontWeight: 900, color: 'var(--green)', letterSpacing: '0.2em', marginBottom: '12px' }}>{data.code}</div>
        <button onClick={share}
          style={{ width: '100%', padding: '12px', background: 'var(--green-dim)', border: '1.5px solid var(--border-green)', borderRadius: 'var(--radius-full)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 900, cursor: 'pointer' }}>
          {copied ? t.league.copied : tl.shareLeague}
        </button>
      </div>

      {/* ⋯ Menu overlay */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 48, right: 16, background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '4px 0', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <button onClick={() => { setMenuOpen(false); share(); }}
              style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, textAlign: 'left', cursor: 'pointer' }}>
              {tl.shareLeague}
            </button>
            <div style={{ height: '0.5px', background: 'var(--border-default)', margin: '0 8px' }} />
            {data.isOwner ? (
              <button onClick={() => { setMenuOpen(false); setConfirm('delete'); }}
                style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, textAlign: 'left', cursor: 'pointer' }}>
                {tl.confirmDeleteBtn}
              </button>
            ) : (
              <button onClick={() => { setMenuOpen(false); setConfirm('leave'); }}
                style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, textAlign: 'left', cursor: 'pointer' }}>
                {tl.confirmLeaveBtn}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: '20px' }}>
          <div style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px 20px', maxWidth: '320px', width: '100%' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '10px' }}>
              {confirm === 'delete'
                ? tl.confirmDeleteTitle.replace('{name}', data.name)
                : tl.confirmLeaveTitle.replace('{name}', data.name)}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
              {confirm === 'delete'
                ? tl.confirmDeleteMsg.replace('{n}', totalMembers)
                : tl.confirmLeaveMsg}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirm(null)}
                style={{ flex: 1, padding: '12px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-full)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
                {tl.cancelBtn}
              </button>
              <button onClick={confirm === 'delete' ? doDelete : doLeave} disabled={busy}
                style={{ flex: 1, padding: '12px', background: 'var(--pink-dim)', border: '1.5px solid var(--border-pink)', borderRadius: 'var(--radius-full)', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? '...' : (confirm === 'delete' ? tl.confirmDeleteBtn : tl.confirmLeaveBtn)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
