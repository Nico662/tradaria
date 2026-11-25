import { User } from 'lucide-react';
import { AvatarSVG } from './components/AvatarSVGs.jsx';

export const FRAME_STYLES = {
  frame_gold:    { border: '2px solid var(--color-neutral)', boxShadow: '0 0 8px rgba(232,184,75,0.6)' },
  frame_neon:    { border: '2px solid var(--green)', boxShadow: '0 0 8px rgba(0,229,160,0.6)' },
  frame_fire:    { border: '2px solid var(--color-down)', boxShadow: '0 0 8px rgba(255,126,179,0.6)' },
  frame_diamond: { border: '2px solid var(--t3)', boxShadow: '0 0 8px rgba(136,153,176,0.6)' },
  frame_season1: { border: '2px solid var(--color-neutral)', boxShadow: '0 0 10px rgba(245,200,66,0.7), 0 0 20px rgba(34,211,165,0.35)' },
};

export default function UserAvatar({ user, size = 32, showBadge = false, style }) {
  const cosmetics  = user?.activeCosmetics || {};
  const frameStyle = FRAME_STYLES[cosmetics.frame] || {};
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
        <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-card2)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...frameStyle }}>
          <User size={Math.round(size * 0.55)} strokeWidth={1.5} aria-hidden />
        </div>
      )}
      {showBadge && cosmetics.avatar && (
        <span style={{ position: 'absolute', bottom: '-3px', right: '-3px', lineHeight: 1, pointerEvents: 'none' }}>
          <AvatarSVG id={cosmetics.avatar} size={badgeSize} />
        </span>
      )}
    </div>
  );
}
