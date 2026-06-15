import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import { getLevel } from './levels.js';
import { SERVER } from './config.js';
import UserAvatar from './UserAvatar.jsx';
import { unlockBadge, BADGES } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import FounderBadge, { isFounder } from './FounderBadge.jsx';

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('tradaria_token')}`,
    'Content-Type': 'application/json',
  };
}

function FriendCard({ f, onChallenge, isChallenging, challengeStatus, onViewProfile }) {
  const { t } = useLang();
  const level = getLevel(f.xp || 0);
  const btnLabel = isChallenging
    ? (challengeStatus === 'unavailable' ? t.friends.unavailable : t.friends.waiting)
    : t.friends.challenge;
  const btnColor = isChallenging
    ? (challengeStatus === 'unavailable' ? 'var(--color-down)' : 'var(--color-neutral)')
    : 'var(--green)';
  const btnBg = isChallenging
    ? (challengeStatus === 'unavailable' ? 'rgba(255,126,179,0.08)' : 'rgba(232,184,75,0.08)')
    : 'rgba(0,229,160,0.08)';
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <UserAvatar user={f} size={38} showBadge />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--t1)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
          {f.username ? `@${f.username}` : f.name}
          {isFounder(f.username) && <FounderBadge size={11} />}
        </div>
        <div style={{ fontSize: '9px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", marginTop: '2px' }}>
          {level.icon} {level.name} · {f.xp || 0} XP
        </div>
        {f.username && onViewProfile && (
          <button onClick={() => onViewProfile(f.username)}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', padding: '2px 0', letterSpacing: '0.04em' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--t3)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t6)'}
          >
            {t.friends.viewProfile}
          </button>
        )}
      </div>
      <button
        onClick={() => !isChallenging && onChallenge && onChallenge(f.username || f.name)}
        disabled={isChallenging}
        style={{ flexShrink: 0, padding: '7px 11px', background: btnBg, border: `1px solid ${btnColor}`, borderRadius: '6px', color: btnColor, fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: isChallenging ? 'default' : 'pointer', letterSpacing: '0.04em', whiteSpace: 'nowrap', transition: 'all 0.2s', minWidth: '90px', textAlign: 'center' }}
        onMouseEnter={e => { if (!isChallenging) e.currentTarget.style.background = 'rgba(0,229,160,0.18)'; }}
        onMouseLeave={e => { if (!isChallenging) e.currentTarget.style.background = btnBg; }}
      >
        {btnLabel}
      </button>
    </div>
  );
}

function PendingCard({ req, onAccept, onReject }) {
  const { t } = useLang();
  const level = getLevel(req.xp || 0);
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <UserAvatar user={req} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--t1)', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
          {req.username ? `@${req.username}` : req.name}
          {isFounder(req.username) && <FounderBadge size={11} />}
        </div>
        <div style={{ fontSize: '9px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", marginTop: '2px' }}>
          {level.icon} {level.name}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button
          onClick={() => onAccept(req.friendshipId)}
          style={{ padding: '6px 12px', background: 'rgba(0,229,160,0.1)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer', letterSpacing: '0.04em' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,160,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,160,0.1)'}
        >
          {t.friends.accept}
        </button>
        <button
          onClick={() => onReject(req.friendshipId)}
          style={{ padding: '6px 10px', background: 'rgba(255,126,179,0.1)', border: '1px solid var(--color-down)', borderRadius: '6px', color: 'var(--color-down)', fontFamily: "'Space Mono', monospace", fontSize: '9px', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,126,179,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,126,179,0.1)'}
        >
          ✗
        </button>
      </div>
    </div>
  );
}

function SearchResultCard({ profile, onSendRequest }) {
  const { t } = useLang();
  const level = getLevel(profile.xp || 0);
  const alreadyFriends = profile.friendshipStatus === 'accepted';
  const sentRequest    = profile.friendshipStatus === 'pending' && profile.isRequester;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--green)', borderRadius: '10px', padding: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <UserAvatar user={profile} size={42} showBadge />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: 'var(--t1)', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
            @{profile.username}
            {isFounder(profile.username) && <FounderBadge size={12} />}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", marginTop: '2px' }}>
            {level.icon} {level.name} · {profile.xp || 0} XP
          </div>
          {profile.portfolioReturn !== null && profile.portfolioReturn !== undefined && (
            <div style={{ fontSize: '9px', fontFamily: "'Space Mono', monospace", marginTop: '2px', color: profile.portfolioReturn >= 0 ? 'var(--green)' : 'var(--color-down)' }}>
              portfolio {profile.portfolioReturn >= 0 ? '+' : ''}{profile.portfolioReturn.toFixed(1)}%
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0 }}>
          {alreadyFriends ? (
            <span style={{ fontSize: '9px', color: 'var(--green)', fontFamily: "'Space Mono', monospace" }}>{t.friends.alreadyFriends}</span>
          ) : sentRequest ? (
            <span style={{ fontSize: '9px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace" }}>{t.friends.pending}</span>
          ) : (
            <button
              onClick={() => onSendRequest(profile.username)}
              style={{ padding: '7px 14px', background: 'rgba(0,229,160,0.1)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '0.04em' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,160,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,160,0.1)'}
            >
              {t.friends.add}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Friends({ onBack, challengeSocket, onViewProfile }) {
  const { user } = useAuth();
  const { t } = useLang();
  const [friends, setFriends]           = useState([]);
  const [pending, setPending]           = useState([]);
  const [searchQ, setSearchQ]           = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [msg, setMsg]                   = useState(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [newBadge, setNewBadge]         = useState(null);
  const debounceRef                     = useRef(null);
  const [challengingFriend, setChallengingFriend] = useState(null);
  const [challengeStatus, setChallengeStatus]     = useState(null);

  function tryUnlockSocialBadge(id) {
    const unlocked = unlockBadge(id);
    if (unlocked) {
      const badge = BADGES.find(b => b.id === id);
      if (badge) setNewBadge(badge);
    }
  }

  function copyInviteLink() {
    if (!user?.username) return;
    navigator.clipboard.writeText(`https://tradaria.dev?ref=@${user.username}`);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  }

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchAll();
  }, [user]);

  useEffect(() => {
    if (!challengeSocket) return;
    function onExpired() {
      setChallengeStatus('unavailable');
      setTimeout(() => { setChallengingFriend(null); setChallengeStatus(null); }, 2000);
    }
    function onRejected() {
      setChallengeStatus('unavailable');
      setTimeout(() => { setChallengingFriend(null); setChallengeStatus(null); }, 2000);
    }
    challengeSocket.on('friend:challenge:expired', onExpired);
    challengeSocket.on('friend:challenge:rejected', onRejected);
    return () => {
      challengeSocket.off('friend:challenge:expired', onExpired);
      challengeSocket.off('friend:challenge:rejected', onRejected);
    };
  }, [challengeSocket]);

  function challengeFriend(username) {
    if (!challengeSocket || challengingFriend) return;
    setChallengingFriend(username);
    setChallengeStatus('waiting');
    challengeSocket.emit('friend:challenge', { targetUsername: username });
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const [fRes, pRes] = await Promise.all([
        fetch(`${SERVER}/friends/list`,    { headers: authHeaders() }),
        fetch(`${SERVER}/friends/pending`, { headers: authHeaders() }),
      ]);
      const [fData, pData] = await Promise.all([fRes.json(), pRes.json()]);
      const friendList = Array.isArray(fData) ? fData : [];
      setFriends(friendList);
      setPending(Array.isArray(pData) ? pData : []);
      if (friendList.length >= 1) tryUnlockSocialBadge('social_first');
      if (friendList.length >= 5) tryUnlockSocialBadge('social_squad');
    } catch {}
    setLoading(false);
  }

  function flash(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  }

  function handleSearch(e) {
    const q = e.target.value;
    setSearchQ(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 3) { setSearchResult(null); setSearchLoading(false); return; }
    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${SERVER}/friends/profile/${encodeURIComponent(q.trim().toLowerCase())}`, { headers: authHeaders() });
        if (res.ok) {
          setSearchResult({ found: true, user: await res.json() });
        } else {
          setSearchResult({ found: false });
        }
      } catch { setSearchResult({ found: false }); }
      setSearchLoading(false);
    }, 400);
  }

  async function sendRequest(username) {
    try {
      const res  = await fetch(`${SERVER}/friends/request`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ username }) });
      const data = await res.json();
      if (data.ok) {
        flash('ok', t.friends.requestSent);
        setSearchResult(prev => prev?.found
          ? { ...prev, user: { ...prev.user, friendshipStatus: 'pending', isRequester: true } }
          : prev
        );
      } else {
        flash('err', data.error || 'Error');
      }
    } catch { flash('err', t.friends.networkError); }
  }

  async function acceptRequest(friendshipId) {
    try {
      const res  = await fetch(`${SERVER}/friends/accept`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ friendshipId }) });
      const data = await res.json();
      if (data.ok) { flash('ok', t.friends.nowFriends); fetchAll(); }
      else flash('err', data.error || 'Error');
    } catch { flash('err', t.friends.networkError); }
  }

  async function rejectRequest(friendshipId) {
    try {
      const res  = await fetch(`${SERVER}/friends/reject`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ friendshipId }) });
      const data = await res.json();
      if (data.ok) setPending(p => p.filter(r => String(r.friendshipId) !== String(friendshipId)));
      else flash('err', data.error || 'Error');
    } catch { flash('err', t.friends.networkError); }
  }

  const sectionLabel = {
    fontSize: '8px', color: 'var(--t6)', letterSpacing: '0.14em',
    textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", marginBottom: '8px',
  };

  return (
    <div id="gtm-root">
      <div className="scanlines" />
      <div style={{ padding: '48px 20px 48px', position: 'relative', zIndex: 2, maxWidth: '480px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--t2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t6)'}
          >
            {t.friends.back}
          </button>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--t1)' }}>
            {t.friends.title}
          </div>
          {pending.length > 0 && (
            <div style={{ background: 'var(--color-down)', borderRadius: '10px', padding: '2px 8px', fontSize: '9px', color: '#fff', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
              {pending.length}
            </div>
          )}
        </div>

        {/* Flash message */}
        {msg && (
          <div style={{ marginBottom: '14px', padding: '10px 14px', background: msg.type === 'ok' ? 'rgba(0,229,160,0.1)' : 'rgba(255,126,179,0.1)', border: `1px solid ${msg.type === 'ok' ? 'var(--green)' : 'var(--color-down)'}`, borderRadius: '8px', fontSize: '11px', color: msg.type === 'ok' ? 'var(--green)' : 'var(--color-down)', fontFamily: "'Space Mono', monospace" }}>
            {msg.text}
          </div>
        )}

        {!user ? (
          <div style={{ textAlign: 'center', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', padding: '60px 0' }}>
            {t.friends.signIn}
          </div>
        ) : (
          <>
            {/* Invite link */}
            {user?.username && (
              <div style={{ marginBottom: '24px', padding: '14px 16px', background: 'rgba(0,229,160,0.03)', border: '1px dashed var(--bd2)', borderRadius: '10px' }}>
                <div style={{ fontSize: '8px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '6px' }}>{t.friends.inviteTitle}</div>
                <div style={{ fontSize: '10px', color: 'var(--t5)', fontFamily: "'Space Mono', monospace", marginBottom: '10px', lineHeight: 1.6 }}>{t.friends.inviteSub}</div>
                <button
                  onClick={copyInviteLink}
                  style={{ width: '100%', padding: '9px', background: copiedInvite ? 'rgba(0,229,160,0.12)' : 'rgba(0,229,160,0.06)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', transition: 'background 0.15s' }}
                >
                  {copiedInvite ? t.friends.inviteCopied : t.friends.inviteCopy}
                </button>
              </div>
            )}

            {/* Buscador */}
            <div style={{ marginBottom: '28px' }}>
              <div style={sectionLabel}>{t.friends.search}</div>
              <input
                type="text"
                placeholder={t.friends.searchPlaceholder}
                value={searchQ}
                onChange={handleSearch}
                style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '10px 14px', color: 'var(--t1)', fontFamily: "'Space Mono', monospace", fontSize: '12px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--green)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--bd)'}
              />
              {searchLoading && (
                <div style={{ marginTop: '8px', fontSize: '9px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace" }}>{t.friends.searching}</div>
              )}
              {searchResult && !searchLoading && (
                <div style={{ marginTop: '8px' }}>
                  {searchResult.found ? (
                    <SearchResultCard profile={searchResult.user} onSendRequest={sendRequest} />
                  ) : (
                    <div style={{ padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', fontSize: '11px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace" }}>
                      {t.friends.notFound}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Solicitudes pendientes */}
            {pending.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <div style={sectionLabel}>{t.friends.requests}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pending.map(req => (
                    <PendingCard key={String(req.friendshipId)} req={req} onAccept={acceptRequest} onReject={rejectRequest} />
                  ))}
                </div>
              </div>
            )}

            {/* Lista de amigos */}
            <div>
              <div style={sectionLabel}>
                {t.friends.myFriends}{friends.length > 0 ? ` · ${friends.length}` : ''}
              </div>
              {loading ? (
                <div style={{ fontSize: '10px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace" }}>{t.friends.loading}</div>
              ) : friends.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤝</div>
                  <div style={{ fontSize: '10px', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", lineHeight: 1.6, marginBottom: '12px' }}>
                    {t.friends.noFriends}<br />{t.friends.noFriendsSub}
                  </div>
                  {user?.username && (
                    <button
                      onClick={copyInviteLink}
                      style={{ padding: '8px 16px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
                    >
                      {copiedInvite ? t.friends.inviteCopied : t.friends.inviteCopy}
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {friends.map(f => (
                    <FriendCard
                      key={String(f.friendshipId)}
                      f={f}
                      onChallenge={challengeFriend}
                      isChallenging={challengingFriend === (f.username || f.name)}
                      challengeStatus={challengingFriend === (f.username || f.name) ? challengeStatus : null}
                      onViewProfile={onViewProfile}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
    </div>
  );
}
