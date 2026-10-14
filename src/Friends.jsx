import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext.jsx';
import { getLevel } from './levels.js';
import { SERVER } from './config.js';
import UserAvatar from './UserAvatar.jsx';
import { unlockBadge, BADGES } from './badges.js';
import BadgeNotification from './BadgeNotification.jsx';
import SpecialBadge, { getSpecialUserByUsername } from './SpecialBadge.jsx';
import { LevelIcon } from './components/AppIcons';
import { Handshake, Link, Swords, Clock, MoreVertical } from 'lucide-react';
import { getUsernameColor } from './cosmeticColors';
import TitleBadge from './components/TitleBadge';
import VerifiedBadge from './VerifiedBadge';
import EquippedBadge from './components/EquippedBadge';

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('tradaria_token')}`,
    'Content-Type': 'application/json',
  };
}

function RemoveFriendModal({ friend, onConfirm, onCancel, t }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '0 20px', boxSizing: 'border-box' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '12px', padding: '24px 20px', width: '100%', maxWidth: '320px', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--t1)', fontWeight: 700, marginBottom: '10px' }}>
          {t.friends.removeTitle}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--t4)', marginBottom: '22px', lineHeight: 1.55 }}>
          {t.friends.removeConfirm.replace('{username}', `@${friend.username || friend.name}`)}
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--bd)', borderRadius: '6px', color: 'var(--t4)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.04em' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bd2)'; e.currentTarget.style.color = 'var(--t2)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.color = 'var(--t4)'; }}
          >
            {t.friends.removeCancel}
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '8px 16px', background: 'rgba(255,126,179,0.1)', border: '1px solid var(--color-down)', borderRadius: '6px', color: 'var(--color-down)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.04em' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,126,179,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,126,179,0.1)'}
          >
            {t.friends.removeConfirmBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

function FriendCard({ f, onChallenge, isChallenging, challengeStatus, onViewProfile, onRemove }) {
  const { t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const level = getLevel(f.xp || 0);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const btnLabel = isChallenging
    ? (challengeStatus === 'unavailable'
        ? t.friends.unavailable
        : <><Clock size={14} strokeWidth={2} aria-hidden style={{ verticalAlign: 'middle', marginRight: '4px' }} />{t.friends.waiting}</>)
    : <><Swords size={14} strokeWidth={2} aria-hidden style={{ verticalAlign: 'middle', marginRight: '4px' }} />{t.friends.challenge}</>;
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
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: getUsernameColor(f.activeCosmetics) || 'var(--t1)', fontWeight: 700, display: 'flex', alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{f.username ? `@${f.username}` : f.name}</span>
          <SpecialBadge specialUser={getSpecialUserByUsername(f.username)} size={11} />
          {f.hasVerifiedBadge && <VerifiedBadge size={11} />}
          <EquippedBadge id={f.activeCosmetics?.badge} size={11} />
          <TitleBadge title={f.activeCosmetics?.title} />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)', marginTop: '2px' }}>
          <LevelIcon id={level.id} size={12} style={{ verticalAlign: 'middle' }} /> {level.name} · {f.xp || 0} XP
        </div>
        {f.username && onViewProfile && (
          <button onClick={() => onViewProfile(f.username)}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', padding: '2px 0', letterSpacing: '0.04em' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--t3)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t6)'}
          >
            {t.friends.viewProfile}
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={t.friends.removeFriend}
            style={{ background: 'transparent', border: '1px solid transparent', borderRadius: '6px', color: 'var(--t6)', cursor: 'pointer', padding: '5px 6px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.color = 'var(--t3)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--t6)'; }}
          >
            <MoreVertical size={14} strokeWidth={2} aria-hidden />
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', zIndex: 20, minWidth: '148px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
              <button
                onClick={() => { setMenuOpen(false); onRemove(f); }}
                style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: 'var(--color-down)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', textAlign: 'left', letterSpacing: '0.04em', borderRadius: '8px' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,126,179,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {t.friends.removeFriend}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => !isChallenging && onChallenge && onChallenge(f.username || f.name)}
          disabled={isChallenging}
          style={{ flexShrink: 0, padding: '7px 11px', background: btnBg, border: `1px solid ${btnColor}`, borderRadius: '6px', color: btnColor, fontFamily: 'var(--font-body)', fontSize: '12px', cursor: isChallenging ? 'default' : 'pointer', letterSpacing: '0.04em', whiteSpace: 'nowrap', transition: 'all 0.2s', minWidth: '90px', textAlign: 'center' }}
          onMouseEnter={e => { if (!isChallenging) e.currentTarget.style.background = 'rgba(0,229,160,0.18)'; }}
          onMouseLeave={e => { if (!isChallenging) e.currentTarget.style.background = btnBg; }}
        >
          {btnLabel}
        </button>
      </div>
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
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: getUsernameColor(req.activeCosmetics) || 'var(--t1)', fontWeight: 700, display: 'flex', alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{req.username ? `@${req.username}` : req.name}</span>
          <SpecialBadge specialUser={getSpecialUserByUsername(req.username)} size={11} />
          {req.hasVerifiedBadge && <VerifiedBadge size={11} />}
          <EquippedBadge id={req.activeCosmetics?.badge} size={11} />
          <TitleBadge title={req.activeCosmetics?.title} />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)', marginTop: '2px' }}>
          <LevelIcon id={level.id} size={12} style={{ verticalAlign: 'middle' }} /> {level.name}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button
          onClick={() => onAccept(req.friendshipId)}
          style={{ padding: '6px 12px', background: 'rgba(0,229,160,0.1)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.04em' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,160,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,160,0.1)'}
        >
          {t.friends.accept}
        </button>
        <button
          onClick={() => onReject(req.friendshipId)}
          style={{ padding: '6px 10px', background: 'rgba(255,126,179,0.1)', border: '1px solid var(--color-down)', borderRadius: '6px', color: 'var(--color-down)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}
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
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: getUsernameColor(profile.activeCosmetics) || 'var(--t1)', fontWeight: 700, display: 'flex', alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>@{profile.username}</span>
            <SpecialBadge specialUser={getSpecialUserByUsername(profile.username)} size={12} />
            {profile.hasVerifiedBadge && <VerifiedBadge size={12} />}
            <EquippedBadge id={profile.activeCosmetics?.badge} size={12} />
            <TitleBadge title={profile.activeCosmetics?.title} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)', marginTop: '2px' }}>
            <LevelIcon id={level.id} size={12} style={{ verticalAlign: 'middle' }} /> {level.name} · {profile.xp || 0} XP
          </div>
          {profile.portfolioReturn !== null && profile.portfolioReturn !== undefined && (
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-body)', marginTop: '2px', color: profile.portfolioReturn >= 0 ? 'var(--green)' : 'var(--color-down)' }}>
              portfolio {profile.portfolioReturn >= 0 ? '+' : ''}{profile.portfolioReturn.toFixed(1)}%
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0 }}>
          {alreadyFriends ? (
            <span style={{ fontSize: '12px', color: 'var(--green)', fontFamily: 'var(--font-body)' }}>{t.friends.alreadyFriends}</span>
          ) : sentRequest ? (
            <span style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)' }}>{t.friends.pending}</span>
          ) : (
            <button
              onClick={() => onSendRequest(profile.username)}
              style={{ padding: '7px 14px', background: 'rgba(0,229,160,0.1)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.04em' }}
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
  const [removingFriend, setRemovingFriend]       = useState(null);

  function tryUnlockSocialBadge(id) {
    const unlocked = unlockBadge(id);
    if (unlocked) {
      const badge = BADGES.find(b => b.id === id);
      if (badge) setNewBadge(badge);
    }
  }

  function copyInviteLink() {
    if (!user?.username) return;
    navigator.clipboard.writeText(`https://tradiko.dev?ref=@${user.username}`);
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
    if (type === 'ok') setTimeout(() => setMsg(null), 3000);
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
        flash('err', t.friends.networkError);
      }
    } catch { flash('err', t.friends.networkError); }
  }

  async function acceptRequest(friendshipId) {
    try {
      const res  = await fetch(`${SERVER}/friends/accept`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ friendshipId }) });
      const data = await res.json();
      if (data.ok) { flash('ok', t.friends.nowFriends); fetchAll(); }
      else flash('err', t.friends.networkError);
    } catch { flash('err', t.friends.networkError); }
  }

  async function rejectRequest(friendshipId) {
    try {
      const res  = await fetch(`${SERVER}/friends/reject`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ friendshipId }) });
      const data = await res.json();
      if (data.ok) setPending(p => p.filter(r => String(r.friendshipId) !== String(friendshipId)));
      else flash('err', t.friends.networkError);
    } catch { flash('err', t.friends.networkError); }
  }

  async function confirmRemove() {
    const f = removingFriend;
    setRemovingFriend(null);
    setFriends(prev => prev.filter(fr => String(fr.id) !== String(f.id)));
    try {
      const res  = await fetch(`${SERVER}/friends/${f.id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFriends(prev => [...prev, f]);
        flash('err', t.friends.removeError);
      }
    } catch {
      setFriends(prev => [...prev, f]);
      flash('err', t.friends.networkError);
    }
  }

  const sectionLabel = {
    fontSize: '12px', color: 'var(--t6)', letterSpacing: '0.14em',
    textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: '8px',
  };

  return (
    <div id="gtm-root">
      <div className="scanlines" />
      <div style={{ padding: '48px 20px 48px', position: 'relative', zIndex: 2, maxWidth: '480px', margin: '0 auto', overflowX: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.06em', padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--t2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t6)'}
          >
            {t.friends.back}
          </button>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '22px', color: 'var(--t1)' }}>
            {t.friends.title}
          </div>
          {pending.length > 0 && (
            <div style={{ background: 'var(--color-down)', borderRadius: '10px', padding: '2px 8px', fontSize: '12px', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
              {pending.length}
            </div>
          )}
        </div>

        {/* Flash message */}
        {msg && (
          <div style={{ marginBottom: '14px', padding: '10px 14px', background: msg.type === 'ok' ? 'rgba(0,229,160,0.1)' : 'rgba(255,126,179,0.1)', border: `1px solid ${msg.type === 'ok' ? 'var(--green)' : 'var(--color-down)'}`, borderRadius: '8px', fontSize: '12px', color: msg.type === 'ok' ? 'var(--green)' : 'var(--color-down)', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span>{msg.text}</span>
            {msg.type === 'err' && (
              <button onClick={() => setMsg(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>✕</button>
            )}
          </div>
        )}

        {!user ? (
          <div style={{ textAlign: 'center', color: 'var(--t6)', fontFamily: 'var(--font-body)', fontSize: '12px', padding: '60px 0' }}>
            {t.friends.signIn}
          </div>
        ) : (
          <>
            {/* Invite link */}
            {user?.username && (
              <div style={{ marginBottom: '24px', padding: '14px 16px', background: 'rgba(0,229,160,0.03)', border: '1px dashed var(--bd2)', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: 'var(--t6)', fontFamily: 'var(--font-body)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '6px' }}>{t.friends.inviteTitle}</div>
                <div style={{ fontSize: '12px', color: 'var(--t5)', fontFamily: 'var(--font-body)', marginBottom: '10px', lineHeight: 1.6 }}>{t.friends.inviteSub}</div>
                <button
                  onClick={copyInviteLink}
                  style={{ width: '100%', padding: '9px', background: copiedInvite ? 'rgba(0,229,160,0.12)' : 'rgba(0,229,160,0.06)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', transition: 'background 0.15s' }}
                >
                  {copiedInvite ? t.friends.inviteCopied : <><Link size={14} strokeWidth={2} aria-hidden style={{ verticalAlign: 'middle', marginRight: '4px' }} />{t.friends.inviteCopy}</>}
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
                style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '10px 14px', color: 'var(--t1)', fontFamily: 'var(--font-body)', fontSize: '12px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--green)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--bd)'}
              />
              {searchLoading && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--t6)', fontFamily: 'var(--font-body)' }}>{t.friends.searching}</div>
              )}
              {searchResult && !searchLoading && (
                <div style={{ marginTop: '8px' }}>
                  {searchResult.found ? (
                    <SearchResultCard profile={searchResult.user} onSendRequest={sendRequest} />
                  ) : (
                    <div style={{ padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '8px', fontSize: '12px', color: 'var(--t6)', fontFamily: 'var(--font-body)' }}>
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
                <div style={{ fontSize: '12px', color: 'var(--t6)', fontFamily: 'var(--font-body)' }}>{t.friends.loading}</div>
              ) : friends.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--bd)', borderRadius: '10px' }}>
                  <Handshake size={32} strokeWidth={1.5} aria-hidden style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '12px', color: 'var(--t6)', fontFamily: 'var(--font-body)', lineHeight: 1.6, marginBottom: '12px' }}>
                    {t.friends.noFriends}<br />{t.friends.noFriendsSub}
                  </div>
                  {user?.username && (
                    <button
                      onClick={copyInviteLink}
                      style={{ padding: '8px 16px', background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
                    >
                      {copiedInvite ? t.friends.inviteCopied : <><Link size={14} strokeWidth={2} aria-hidden style={{ verticalAlign: 'middle', marginRight: '4px' }} />{t.friends.inviteCopy}</>}
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
                      onRemove={setRemovingFriend}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {removingFriend && (
        <RemoveFriendModal
          friend={removingFriend}
          t={t}
          onConfirm={confirmRemove}
          onCancel={() => setRemovingFriend(null)}
        />
      )}
      {newBadge && <BadgeNotification badge={newBadge} onDone={() => setNewBadge(null)} />}
    </div>
  );
}
