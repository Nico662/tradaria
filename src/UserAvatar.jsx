export const AVATAR_EMOJIS = {
  avatar_bull:  '🐂',
  avatar_bear:  '🐻',
  avatar_whale: '🐋',
  avatar_robot: '🤖',
};

export const FRAME_STYLES = {
  frame_gold:    { border: '2px solid #f5c842', boxShadow: '0 0 8px rgba(245,200,66,0.6)' },
  frame_neon:    { border: '2px solid #22d3a5', boxShadow: '0 0 8px rgba(34,211,165,0.6)' },
  frame_fire:    { border: '2px solid #f05454', boxShadow: '0 0 8px rgba(240,84,84,0.6)' },
  frame_diamond: { border: '2px solid #8899b0', boxShadow: '0 0 8px rgba(136,153,176,0.6)' },
};

export default function UserAvatar({ user, size = 32, showBadge = false }) {
  const cosmetics  = user?.activeCosmetics || {};
  const frameStyle = FRAME_STYLES[cosmetics.frame] || {};
  const badge      = cosmetics.avatar
    ? AVATAR_EMOJIS[cosmetics.avatar]
    : (user?.cosmeticAvatar || null);

  const badgeSize  = Math.max(10, Math.round(size * 0.42));

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      {(user?.customAvatar || user?.avatar) ? (
        <img
          src={user.customAvatar || user.avatar}
          alt=""
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '1px solid #1e2530', ...frameStyle }}
        />
      ) : (
        <div style={{ width: size, height: size, borderRadius: '50%', background: '#1a2030', border: '1px solid #1e2530', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.45) + 'px', flexShrink: 0, ...frameStyle }}>
          👤
        </div>
      )}
      {showBadge && badge && (
        <span style={{ position: 'absolute', bottom: '-3px', right: '-3px', fontSize: badgeSize + 'px', lineHeight: 1, pointerEvents: 'none' }}>
          {badge}
        </span>
      )}
    </div>
  );
}
