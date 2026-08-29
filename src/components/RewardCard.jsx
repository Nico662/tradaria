import { Lock, Zap, Award, Droplet, Tag, Ticket, CircleUser, Palette, Square, Eye, CandlestickChart } from 'lucide-react';

const REWARD_ICONS = {
  xp:             Zap,
  badge:          Award,
  username_color: Droplet,
  title:          Tag,
  ticket:         Ticket,
  avatar:         CircleUser,
  theme:          Palette,
  frame:          Square,
  mechanic:       Eye,
};

// Colores de muestra para recompensas cosméticas sin hex explícito en el config
const THEME_SWATCHES = {
  'Midnight': '#6b9fff',
  'Aurora':   '#a855f7',
  'Matrix':   '#00ff41',
  'Blood':    '#f05454',
  'Gold':     '#f5c842',
};
const AVATAR_SWATCHES = {
  'Fox':    '#f97316',
  'Dragon': '#9333ea',
};

function getSwatchHex(reward) {
  if (!reward) return null;
  if (reward.type === 'username_color') return reward.hex ?? null;
  if (reward.type === 'theme')          return THEME_SWATCHES[reward.name] ?? null;
  if (reward.type === 'avatar')         return AVATAR_SWATCHES[reward.name] ?? null;
  return null;
}

function RewardDisplay({ reward, track }) {
  if (!reward) return null;
  const Icon = REWARD_ICONS[reward.type];
  const isXp    = reward.type === 'xp';
  const isColor = reward.type === 'username_color';
  const isTheme = reward.type === 'theme';
  const isAvatar = reward.type === 'avatar';

  // Iconos en el color del carril para mayor presencia
  const iconColor = track === 'pro' ? 'var(--pink)' : 'var(--green)';

  const swatchHex = isColor
    ? reward.hex
    : isTheme
      ? THEME_SWATCHES[reward.name]
      : isAvatar
        ? AVATAR_SWATCHES[reward.name]
        : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {Icon && <Icon size={16} color={iconColor} strokeWidth={2} />}
        {swatchHex && (
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: swatchHex,
            border: '1.5px solid rgba(255,255,255,0.35)',
            flexShrink: 0,
            boxShadow: `0 0 6px ${swatchHex}66`,
          }} />
        )}
        {isXp && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '15px',
            fontWeight: 800, color: 'var(--text-primary)',
          }}>
            +{reward.amount.toLocaleString()}
          </span>
        )}
      </div>
      {isXp ? (
        <div style={{
          fontSize: '10px', color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)', letterSpacing: '0.08em', fontWeight: 700,
        }}>
          XP
        </div>
      ) : reward.name ? (
        <div style={{
          fontSize: '11px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
          fontWeight: 700, textAlign: 'center', lineHeight: 1.25,
        }}>
          {reward.name}
        </div>
      ) : null}
    </div>
  );
}

// Props:
//   reward       — reward object from season1Config, or null
//   mission      — mission object { title, desc, enabled } or null
//   state        — 'empty' | 'locked' | 'claimable' | 'claimed' | 'pro_locked'
//   track        — 'free' | 'pro'
//   isActive     — true when this card is at the user's current level
//   t            — translation object (needs t.traderPass)
//   onGoPricing  — called when free user taps the PRO lock button
export default function RewardCard({ reward, mission, state, track, isActive, t, onGoPricing }) {
  const isProTrack  = track === 'pro';
  const swatchHex   = getSwatchHex(reward);

  if (state === 'empty') {
    // Niveles impares del Free track: solo un puntito, más brillante si es el nivel actual
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 5, height: 5, borderRadius: '50%',
          background: isActive ? 'rgba(0,192,135,0.7)' : 'var(--border-default)',
          boxShadow: isActive ? '0 0 5px rgba(0,192,135,0.5)' : 'none',
          transition: 'background 0.2s',
        }} />
      </div>
    );
  }

  const isClaimable = state === 'claimable';
  const isClaimed   = state === 'claimed';
  const isLocked    = state === 'locked';
  const isProLocked = state === 'pro_locked';

  // ── Colores del carril ────────────────────────────────────────────────────
  const cardBg = isClaimable
    ? (isProTrack ? 'rgba(224,85,133,0.18)' : 'rgba(0,192,135,0.18)')
    : isClaimed
      ? (isProTrack ? 'rgba(224,85,133,0.07)' : 'rgba(0,192,135,0.07)')
      : (isProTrack ? 'rgba(224,85,133,0.13)' : 'rgba(0,192,135,0.10)');

  const cardBorder = isClaimable
    ? (isProTrack ? 'rgba(224,85,133,0.75)'  : 'rgba(0,192,135,0.75)')
    : isActive && !isClaimed
      ? (isProTrack ? 'rgba(224,85,133,0.6)'  : 'rgba(0,192,135,0.6)')
      : isClaimed
        ? (isProTrack ? 'rgba(224,85,133,0.22)' : 'rgba(0,192,135,0.22)')
        : (isProTrack ? 'rgba(224,85,133,0.42)' : 'rgba(0,192,135,0.38)');

  const cardShadow = isClaimable
    ? (isProTrack ? '0 0 16px rgba(224,85,133,0.3)'  : '0 0 16px rgba(0,192,135,0.3)')
    : isActive && !isClaimed
      ? (isProTrack ? '0 0 10px rgba(224,85,133,0.2)' : '0 0 10px rgba(0,192,135,0.2)')
      : 'none';

  const hasComingSoon = mission && mission.enabled === false;

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      borderRadius: '8px', background: cardBg,
      border: `1px solid ${cardBorder}`,
      boxShadow: cardShadow,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      opacity: isLocked ? 0.4 : 1,
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}>
      {/* Reward content */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: '100%',
        filter: isProLocked ? 'blur(9px)' : 'none',
        opacity: isProLocked ? 0.2 : 1,
        userSelect: isProLocked ? 'none' : 'auto',
        pointerEvents: isProLocked ? 'none' : 'auto',
      }}>
        <RewardDisplay reward={reward} track={track} />
        {hasComingSoon && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 5 }}>
            <CandlestickChart size={8} color="var(--text-muted)" strokeWidth={2} />
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '7px', fontWeight: 700,
              color: 'var(--text-muted)', letterSpacing: '0.04em',
            }}>
              {t.traderPass.comingSoon}
            </span>
          </div>
        )}
      </div>

      {/* Claimed badge */}
      {isClaimed && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          width: 16, height: 16, borderRadius: '50%',
          background: isProTrack ? 'var(--pink)' : 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '9px', color: '#000', fontWeight: 800, lineHeight: 1 }}>✓</span>
        </div>
      )}

      {/* Locked corner icon */}
      {isLocked && (
        <div style={{ position: 'absolute', top: 5, right: 5 }}>
          <Lock size={10} color="rgba(255,255,255,0.25)" strokeWidth={2} />
        </div>
      )}

      {/* Pro-locked overlay */}
      {isProLocked && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 4,
          background: 'rgba(13,13,13,0.72)',
        }}>
          {swatchHex && (
            <div style={{
              width: 9, height: 9, borderRadius: '50%',
              background: swatchHex,
              boxShadow: `0 0 7px ${swatchHex}bb`,
              flexShrink: 0,
            }} />
          )}
          <Lock size={11} color="var(--pink)" strokeWidth={2} />
          {onGoPricing && (
            <button
              onClick={onGoPricing}
              style={{
                fontSize: '8px', fontFamily: 'var(--font-body)', fontWeight: 800,
                color: 'var(--pink)', background: 'none',
                border: '0.5px solid var(--pink)',
                borderRadius: '4px', padding: '2px 6px',
                cursor: 'pointer', letterSpacing: '0.05em',
              }}
            >
              PRO
            </button>
          )}
        </div>
      )}
    </div>
  );
}
