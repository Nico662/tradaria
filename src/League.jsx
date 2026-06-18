import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import UserAvatar from './UserAvatar.jsx';
import FounderBadge, { isFounder } from './FounderBadge.jsx';
import { SERVER } from './config.js';

function formatCash(n) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const MEDAL_COLORS = {
  0: { medal: '🥇' },
  1: { medal: '🥈' },
  2: { medal: '🥉' },
};

export default function League({ leagueId, onBack }) {
  const { user } = useAuth();
  const { t } = useLang();
  const tl = t.leagues;
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);
  const [busy, setBusy]       = useState(false);

  const tok = localStorage.getItem('tradaria_token');

  useEffect(() => {
    fetch(`${SERVER}/leagues/${leagueId}/ranking`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leagueId]);

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

  const daysLeft = data?.endDate
    ? Math.max(0, Math.ceil((new Date(data.endDate) - new Date()) / 86400000))
    : null;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
      <div className="spinner" />
    </div>
  );

  if (!data || data.error) return (
    <div style={{ padding: '16px 16px 24px', fontFamily: 'var(--font-body)', background: 'var(--bg-base)', minHeight: '100vh' }}>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, padding: '0 0 12px 0' }}>{t.league.back}</button>
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '11px' }}>{tl.notFound}</div>
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
            <span style={{ background: 'var(--pink-dim)', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: 'var(--radius-full)', letterSpacing: '0.08em' }}>
              {daysLeft > 0 ? `${daysLeft} ${t.league.daysLeft}` : t.league.finished}
            </span>
          )}
          <span style={{ background: 'var(--green-dim)', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: 'var(--radius-full)', letterSpacing: '0.08em' }}>
            {data.ranking?.length ?? 0} {t.league.players}
          </span>
        </div>
      </div>

      {/* Ranking label */}
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
        {tl.rankingLabel} · {data.ranking.length} {tl.participants}
      </div>

      {/* Ranking rows */}
      {data.ranking.map((entry, i) => {
        const isMe = entry.isYou;
        const name = entry.username ? `@${entry.username}` : entry.name;
        return (
          <div key={String(entry.userId)} className={`animate-fade-in-up stagger-${Math.min(i + 1, 7)}`} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: isMe ? 'rgba(255,126,179,0.06)' : 'var(--bg-surface)',
            border: `0.5px solid ${isMe ? 'var(--border-pink)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px', marginBottom: '6px',
          }}>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '13px', color: isMe ? 'var(--pink)' : 'var(--text-muted)', width: '20px', textAlign: 'center', flexShrink: 0 }}>
              {i < 3 ? MEDAL_COLORS[i].medal : i + 1}
            </div>
            <UserAvatar user={entry} size={24} showBadge />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: isMe ? 'var(--pink)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {name}
                {isFounder(entry.username) && <FounderBadge size={10} />}
                {isMe && <span style={{ fontSize: '9px', color: 'var(--pink)' }}>{t.league.you}</span>}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{formatCash(entry.totalValue)}</div>
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
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--text-muted)' }}>···</span>
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
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--pink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {name}
                  <span style={{ fontSize: '9px', color: 'var(--pink)' }}>tú</span>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{formatCash(up.totalValue)}</div>
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
