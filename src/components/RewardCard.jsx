import { Lock, Award, Droplet, Tag, Ticket, CircleUser, Palette, Square, Eye, TrendingUp, Clock } from 'lucide-react';

const REWARD_ICONS = {
  xp:             TrendingUp,
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

// Props:
//   reward          — reward object from season1Config, or null
//   mission         — mission object { title, desc, enabled } or null
//   state           — 'empty' | 'locked' | 'claimable' | 'claimed' | 'pro_locked'
//   track           — 'free' | 'pro'
//   isActive        — true when this card is at the user's current level
//   missionProgress — { current, target } | null — shows progress bar when non-null
//   isClaiming      — true while the claim request is in-flight
//   onClaim         — called when the user taps the ribbon
//   t               — translation object (needs t.traderPass)
//   onGoPricing     — called when free user taps the PRO lock button
export default function RewardCard({
  reward, mission, state, track, missionProgress,
  animate, isClaiming, onClaim, t, onGoPricing,
}) {
  const isProTrack = track === 'pro';
  const swatchHex  = getSwatchHex(reward);

  if (state === 'empty') {
    return <div style={{ flex: 1, width: '100%', minHeight: 68 }} />;
  }

  const isClaimable = state === 'claimable';
  const isClaimed   = state === 'claimed';
  const isLocked    = state === 'locked';
  const isProLocked = state === 'pro_locked';

  const trackColor = isProTrack ? '#e05585' : '#00c087';

  // Fondo de tarjeta — tintado suave, menos oscuro que antes
  const cardBg = isClaimable
    ? (isProTrack ? 'rgba(224,85,133,0.13)' : 'rgba(0,192,135,0.12)')
    : isClaimed
      ? (isProTrack ? 'rgba(224,85,133,0.05)' : 'rgba(0,192,135,0.05)')
      : (isLocked || isProLocked)
        ? 'var(--bg-elevated)'
        : (isProTrack ? 'rgba(224,85,133,0.08)' : 'rgba(0,192,135,0.07)');

  // Fondo del cuadrado de icono — un poco más saturado que el fondo de la tarjeta
  const iconBg = isProTrack
    ? 'rgba(224,85,133,0.22)'
    : 'rgba(0,192,135,0.18)';

  const cardBorder = isClaimable
    ? (isProTrack ? 'rgba(224,85,133,0.6)'  : 'rgba(0,192,135,0.6)')
    : isClaimed
      ? (isProTrack ? 'rgba(224,85,133,0.15)' : 'rgba(0,192,135,0.15)')
      : (isProTrack ? 'rgba(224,85,133,0.25)' : 'rgba(0,192,135,0.22)');

  const hasComingSoon = mission && mission.enabled === false;
  const showProgress  = !!missionProgress && !hasComingSoon;
  const showRibbon    = isClaimable && !hasComingSoon;

  const Icon = reward ? REWARD_ICONS[reward.type] : null;
  const isXp = reward?.type === 'xp';

  return (
    <div style={{
      flex: 1,
      width: '100%',
      position: 'relative',
      borderRadius: '12px',
      background: cardBg,
      border: `1px ${hasComingSoon ? 'dashed' : 'solid'} ${cardBorder}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      opacity: isLocked ? 0.45 : 1,
      transition: 'border-color 0.2s, box-shadow 0.2s',
      '--anim-glow': isProTrack ? 'rgba(224,85,133,0.8)' : 'rgba(0,192,135,0.8)',
      animation: animate ? 'claimPop 0.55s ease-out' : 'none',
    }}>

      {/* Contenido principal — difuminado cuando pro_locked */}
      <div style={{
        padding: '8px 8px 8px 8px',
        filter: isProLocked ? 'blur(9px)' : 'none',
        opacity: isProLocked ? 0.2 : 1,
        userSelect: isProLocked ? 'none' : 'auto',
        pointerEvents: isProLocked ? 'none' : 'auto',
      }}>
        {/* Fila: cuadrado de icono + contenido */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>

          {/* Cuadrado de icono */}
          <div style={{
            width: 32, height: 32, flexShrink: 0,
            borderRadius: '8px',
            background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {swatchHex ? (
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: swatchHex,
                border: '1.5px solid rgba(255,255,255,0.3)',
                boxShadow: `0 0 6px ${swatchHex}88`,
              }} />
            ) : Icon ? (
              <Icon size={15} color={trackColor} strokeWidth={2.5} />
            ) : null}
          </div>

          {/* Texto */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Recompensa: cantidad/nombre */}
            {isXp ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, lineHeight: 1 }}>
                <span style={{
                  fontFamily: 'var(--font-body)', fontWeight: 900,
                  fontSize: '15px', color: 'var(--text-primary)',
                }}>
                  +{reward.amount.toLocaleString()}
                </span>
                <span style={{
                  fontFamily: 'var(--font-body)', fontWeight: 800,
                  fontSize: '10px', color: trackColor,
                }}>
                  XP
                </span>
              </div>
            ) : reward?.name ? (
              <div style={{
                fontFamily: 'var(--font-body)', fontWeight: 800,
                fontSize: '11px', color: 'var(--text-primary)', lineHeight: 1.2,
              }}>
                {reward.name}
              </div>
            ) : null}

            {/* Descripción de misión */}
            {mission && (
              <p style={{
                margin: '4px 0 0',
                fontFamily: 'var(--font-body)', fontSize: '9px',
                color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.35,
              }}>
                {mission.desc}
              </p>
            )}

            {/* Barra de progreso — solo nivel activo con misión habilitada */}
            {showProgress && (
              <div style={{ marginTop: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '7px',
                    fontWeight: 700, color: trackColor,
                  }}>
                    {missionProgress.current}/{missionProgress.target}
                  </span>
                </div>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (missionProgress.current / missionProgress.target) * 100)}%`,
                    background: trackColor, borderRadius: 2,
                    transition: 'width 0.3s ease',
                    boxShadow: `0 0 4px ${trackColor}66`,
                  }} />
                </div>
              </div>
            )}

            {/* Próximamente — misiones de Trading Mode */}
            {hasComingSoon && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                <Clock size={8} color="var(--text-hint)" strokeWidth={2} />
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: '8px', fontWeight: 600,
                  color: 'var(--text-hint)', letterSpacing: '0.04em',
                }}>
                  {t.traderPass.comingSoon}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reclamado: check en círculo (esquina superior derecha) */}
      {isClaimed && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          width: 18, height: 18, borderRadius: '50%',
          background: trackColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: animate ? 'checkIn 0.35s ease-out' : 'none',
        }}>
          <span style={{ fontSize: '9px', color: '#000', fontWeight: 900, lineHeight: 1 }}>✓</span>
        </div>
      )}

      {/* Cinta/ribbon RECLAMAR (esquina superior derecha, diagonal) */}
      {showRibbon && (
        <div
          onClick={isClaiming ? undefined : onClaim}
          style={{
            position: 'absolute', top: 0, right: 0,
            overflow: 'hidden', width: 60, height: 60,
            borderRadius: '0 12px 0 0',
            cursor: isClaiming ? 'default' : 'pointer',
          }}
        >
          <div style={{
            position: 'absolute',
            top: 12,
            right: -18,
            width: 72,
            background: '#e05585',
            color: '#fff',
            fontSize: '6.5px',
            fontWeight: 900,
            letterSpacing: '0.1em',
            textAlign: 'center',
            padding: '4px 0',
            transform: 'rotate(45deg)',
            transformOrigin: 'center',
            opacity: isClaiming ? 0.55 : 1,
            transition: 'opacity 0.2s',
          }}>
            {isClaiming ? '···' : t.traderPass.claim.toUpperCase()}
          </div>
        </div>
      )}

      {/* Bloqueado: icono candado (esquina) */}
      {isLocked && (
        <div style={{ position: 'absolute', top: 5, right: 5 }}>
          <Lock size={10} color="rgba(255,255,255,0.2)" strokeWidth={2} />
        </div>
      )}

      {/* Overlay Pro-locked */}
      {isProLocked && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 5,
          background: 'rgba(13,13,13,0.75)',
          borderRadius: '12px',
        }}>
          {swatchHex && (
            <div style={{
              width: 9, height: 9, borderRadius: '50%',
              background: swatchHex,
              boxShadow: `0 0 7px ${swatchHex}bb`,
              flexShrink: 0,
            }} />
          )}
          <Lock size={11} color="#e05585" strokeWidth={2} />
          {onGoPricing && (
            <button
              onClick={onGoPricing}
              style={{
                fontSize: '8px', fontFamily: 'var(--font-body)', fontWeight: 800,
                color: '#e05585', background: 'none',
                border: '0.5px solid #e05585',
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
