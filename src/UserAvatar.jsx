export const AVATAR_EMOJIS = {
  avatar_bull:  '🐂',
  avatar_bear:  '🐻',
  avatar_whale: '🐋',
  avatar_robot: '🤖',
};

export const FRAME_STYLES = {
  frame_gold:    { border: '2px solid var(--color-neutral)', boxShadow: '0 0 8px rgba(232,184,75,0.6)' },
  frame_neon:    { border: '2px solid var(--green)', boxShadow: '0 0 8px rgba(0,229,160,0.6)' },
  frame_fire:    { border: '2px solid var(--color-down)', boxShadow: '0 0 8px rgba(255,126,179,0.6)' },
  frame_diamond: { border: '2px solid var(--t3)', boxShadow: '0 0 8px rgba(136,153,176,0.6)' },
};

export default function UserAvatar({ user, size = 32, showBadge = false, style }) {
  const cosmetics  = user?.activeCosmetics || {};
  const frameStyle = FRAME_STYLES[cosmetics.frame] || {};
  const badge      = cosmetics.avatar
    ? AVATAR_EMOJIS[cosmetics.avatar]
    : (user?.cosmeticAvatar || null);

  const badgeSize  = Math.max(10, Math.round(size * 0.42));

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, ...style }}>
      {(user?.customAvatar || user?.avatar) ? (
        <img
          src={user.customAvatar || user.avatar}
          alt=""
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '1px solid var(--bd)', ...frameStyle }}
        />
      ) : (
        <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-card2)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.45) + 'px', flexShrink: 0, ...frameStyle }}>
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
