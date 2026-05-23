import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import UserAvatar from './UserAvatar.jsx';
import FounderBadge, { isFounder } from './FounderBadge.jsx';
import { SERVER } from './config.js';

function formatCash(n) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function League({ leagueId, onBack }) {
  const { user } = useAuth();
  const { t } = useLang();
  const tl = t.leagues;
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);
  const [busy, setBusy]       = useState(false);

  const tok = localStorage.getItem('tradara_token');

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
    <div id="gtm-root" style={{ minHeight: '100dvh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--t6)' }}>...</div>
    </div>
  );

  if (!data || data.error) return (
    <div id="gtm-root" style={{ minHeight: '100dvh', background: 'var(--bg-page)', padding: '48px 20px' }}>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer' }}>{tl.back}</button>
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '11px' }}>{tl.notFound}</div>
    </div>
  );

  return (
    <div id="gtm-root" style={{ minHeight: '100dvh', background: 'var(--bg-page)' }}>
      <div className="scanlines" />
      <div style={{ padding: '48px 20px 48px', position: 'relative', zIndex: 2 }}>

        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', marginBottom: '24px', display: 'block' }}>{tl.back}</button>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--t1)', marginBottom: '10px' }}>{data.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '6px' }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '14px', color: '#22d3a5', fontWeight: 700, letterSpacing: '0.18em' }}>{data.code}</span>
              <button onClick={copyCode} style={{ background: 'transparent', border: 'none', color: copied ? '#22d3a5' : 'var(--t6)', cursor: 'pointer', fontSize: '13px', lineHeight: 1, padding: '0 2px' }}>
                {copied ? '✓' : '⎘'}
              </button>
            </div>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t5)' }}>
              {tl.since} {new Date(data.startDate + 'T00:00:00').toLocaleDateString()}
              {daysLeft !== null && ` · ${daysLeft}${tl.daysLeft}`}
            </span>
          </div>
        </div>

        {/* Ranking */}
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>{tl.rankingLabel} · {data.ranking.length} {tl.participants}</div>

        {data.ranking.map((entry, i) => {
          const posColor = i === 0 ? '#f5c842' : i === 1 ? 'var(--t3)' : i === 2 ? '#cd7f32' : 'var(--t6)';
          const diff     = entry.totalValue - entry.startValue;
          const name     = entry.username ? `@${entry.username}` : entry.name;
          return (
            <div key={String(entry.userId)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg-card)', border: `1px solid ${entry.isYou ? '#22d3a5' : i === 0 ? '#f5c84235' : 'var(--bd)'}`, borderRadius: '8px', marginBottom: '8px', boxShadow: entry.isYou ? '0 0 0 1px #22d3a515' : 'none' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '16px', color: posColor, width: '24px', flexShrink: 0, textAlign: 'center' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </div>
              <UserAvatar user={entry} size={24} showBadge />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: entry.isYou ? '#22d3a5' : 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  {isFounder(entry.username) && <FounderBadge size={10} />}
                  {entry.isYou && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: '#22d3a560' }}>{tl.youTag}</span>}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--t5)' }}>{formatCash(entry.totalValue)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '15px', color: entry.returnPct >= 0 ? '#22d3a5' : '#f05454' }}>
                  {entry.returnPct >= 0 ? '+' : ''}{entry.returnPct.toFixed(2)}%
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: diff >= 0 ? '#22d3a570' : '#f0545470' }}>
                  {diff >= 0 ? '+' : '-'}{formatCash(diff)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={share} style={{ width: '100%', padding: '13px', background: 'rgba(34,211,165,0.06)', border: '1px solid #22d3a5', borderRadius: '8px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
            {tl.shareCode}
          </button>
          {data.isOwner ? (
            <button onClick={deleteLeague} disabled={busy} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid #f0545430', borderRadius: '8px', color: '#f05454', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', opacity: 0.65 }}>
              {busy ? '...' : tl.deleteLeague}
            </button>
          ) : (
            <button onClick={leave} disabled={busy} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '8px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {busy ? '...' : tl.leaveLeague}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
