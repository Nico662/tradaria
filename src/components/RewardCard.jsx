import { useRef, useEffect } from 'react';
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
//   reward          — reward object from season1Config, or null
//   mission         — mission object { title, desc, enabled } or null
//   state           — 'empty' | 'locked' | 'claimable' | 'claimed' | 'pro_locked'
//   track           — 'free' | 'pro'
//   isActive        — true when this card is at the user's current level
//   missionProgress — { current, target } | null — shows progress bar at active level
//   t               — translation object (needs t.traderPass)
//   onGoPricing     — called when free user taps the PRO lock button
export default function RewardCard({ reward, mission, state, track, isActive, missionProgress, animate, t, onGoPricing }) {
  const isProTrack = track === 'pro';
  const swatchHex  = getSwatchHex(reward);

  const cardRef   = useRef(null);
  const rewardRef = useRef(null);
  const checkRef  = useRef(null);

  useEffect(() => {
    if (!animate) return;

    const card     = cardRef.current;
    const rewardEl = rewardRef.current;
    const checkEl  = checkRef.current;
    if (!card) return;

    // Versión mínima sin vela ni rebote para prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const trackColor = isProTrack ? '#e05585' : '#00c087';
    const { width, height } = card.getBoundingClientRect();
    if (!width || !height) return;
    const cx = width / 2;

    // SVG overlay: se inserta como primer hijo para quedar detrás del contenido
    const NS  = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('aria-hidden', 'true');
    Object.assign(svg.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      overflow: 'visible',
    });
    card.insertBefore(svg, card.firstChild);

    // Glow radial desde abajo
    const glowEl = document.createElementNS(NS, 'ellipse');
    glowEl.setAttribute('cx', cx);
    glowEl.setAttribute('cy', height);
    glowEl.setAttribute('rx', width * 0.55);
    glowEl.setAttribute('ry', height * 0.32);
    glowEl.setAttribute('fill', trackColor);
    svg.appendChild(glowEl);

    // Línea de tendencia ascendente (fondo, sutil)
    const pt1 = [8, height * 0.85];
    const pt2 = [cx * 0.82, height * 0.58];
    const pt3 = [width - 8, height * 0.2];
    const lineLen = (
      Math.hypot(pt2[0] - pt1[0], pt2[1] - pt1[1]) +
      Math.hypot(pt3[0] - pt2[0], pt3[1] - pt2[1])
    );
    const tl = document.createElementNS(NS, 'polyline');
    tl.setAttribute('points', `${pt1[0]},${pt1[1]} ${pt2[0]},${pt2[1]} ${pt3[0]},${pt3[1]}`);
    tl.setAttribute('fill', 'none');
    tl.setAttribute('stroke', trackColor);
    tl.setAttribute('stroke-width', '1.5');
    tl.setAttribute('stroke-linecap', 'round');
    tl.setAttribute('stroke-linejoin', 'round');
    tl.setAttribute('opacity', '0.28');
    tl.style.strokeDasharray = `${lineLen}`;
    tl.style.strokeDashoffset = `${lineLen}`;
    svg.appendChild(tl);

    // Vela (candlestick): mecha + cuerpo, crecen de abajo hacia arriba
    const bodyW = Math.max(10, width * 0.22);
    const bodyH = height * 0.46;
    const bodyY = height * 0.34;
    const wickT = height * 0.16;
    const wickB = height * 0.82;

    const wick = document.createElementNS(NS, 'line');
    wick.setAttribute('x1', cx); wick.setAttribute('x2', cx);
    wick.setAttribute('y1', wickT); wick.setAttribute('y2', wickB);
    wick.setAttribute('stroke', trackColor);
    wick.setAttribute('stroke-width', '1.5');
    wick.setAttribute('stroke-linecap', 'round');
    wick.style.transformBox = 'fill-box';
    wick.style.transformOrigin = 'bottom';
    svg.appendChild(wick);

    const body = document.createElementNS(NS, 'rect');
    body.setAttribute('x', cx - bodyW / 2);
    body.setAttribute('y', bodyY);
    body.setAttribute('width', bodyW);
    body.setAttribute('height', bodyH);
    body.setAttribute('rx', '2');
    body.setAttribute('fill', trackColor);
    body.setAttribute('opacity', '0.88');
    body.style.transformBox = 'fill-box';
    body.style.transformOrigin = 'bottom';
    svg.appendChild(body);

    const easeOut = 'cubic-bezier(0.0, 0.0, 0.2, 1)';
    const elastic = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
    const anims   = [];
    const run = (el, kf, opts) => { const a = el.animate(kf, opts); anims.push(a); return a; };

    // 1. Tarjeta se comprime (~100ms)
    run(card, [{ transform: 'scale(1)' }, { transform: 'scale(0.94)' }],
      { duration: 100, easing: easeOut, fill: 'forwards' });

    // 2. Vela se dispara de abajo hacia arriba (~430ms)
    run(body, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
      { duration: 430, easing: easeOut, fill: 'forwards' });
    run(wick, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
      { duration: 430, easing: easeOut, fill: 'forwards' });

    // 3. Tarjeta rebota (~560ms) + glow breve desde abajo (~650ms)
    run(card, [
      { transform: 'scale(0.94)' },
      { transform: 'scale(1.05)', offset: 0.55 },
      { transform: 'scale(1)' },
    ], { delay: 100, duration: 560, easing: elastic, fill: 'forwards' });

    run(glowEl, [{ opacity: 0 }, { opacity: 0.18, offset: 0.32 }, { opacity: 0 }],
      { delay: 100, duration: 650, easing: 'ease-out', fill: 'forwards' });

    // 4. Línea de tendencia se dibuja de izquierda a derecha (~520ms)
    run(tl, [{ strokeDashoffset: `${lineLen}` }, { strokeDashoffset: '0' }],
      { delay: 30, duration: 520, easing: easeOut, fill: 'forwards' });

    // 5. Recompensa salta: translateY + scale + brillo (~600ms)
    if (rewardEl) {
      run(rewardEl, [
        { transform: 'translateY(0) scale(1)', filter: 'brightness(1)' },
        { transform: 'translateY(-12px) scale(1.16)', filter: 'brightness(1.9)', offset: 0.44 },
        { transform: 'translateY(0) scale(1)', filter: 'brightness(1)' },
      ], { delay: 180, duration: 600, easing: elastic, fill: 'forwards' });
    }

    // 6. Check se sella: scale 0→1.35→1 + rotación (~460ms)
    // fill:'both' lo mantiene invisible desde el inicio (evita flash de 1 frame)
    if (checkEl) {
      run(checkEl, [
        { transform: 'scale(0) rotate(-20deg)', opacity: 0 },
        { transform: 'scale(1.35) rotate(6deg)', opacity: 1, offset: 0.62 },
        { transform: 'scale(1) rotate(0deg)', opacity: 1 },
      ], { duration: 620, easing: elastic, fill: 'both' });
    }

    // Fade-out del SVG al completarse la secuencia, luego se elimina del DOM
    const fadeTimer = setTimeout(() => {
      if (!svg.parentNode) return;
      svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' })
        .finished.then(() => { if (svg.parentNode) svg.remove(); });
    }, 750);

    return () => {
      clearTimeout(fadeTimer);
      anims.forEach(a => a.cancel());
      if (svg.parentNode) svg.remove();
    };
  }, [animate, isProTrack]);

  if (state === 'empty') {
    // Niveles impares del Free track: solo un puntito centrado en la celda
    return (
      <div style={{
        flex: 1, width: '100%', minHeight: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
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

  const trackColor    = isProTrack ? 'var(--pink)' : 'var(--green)';
  const hasComingSoon = mission && mission.enabled === false;
  const showProgress  = isActive && !!missionProgress && !hasComingSoon;

  return (
    <div
      ref={cardRef}
      style={{
        flex: 1,
        width: '100%', position: 'relative',
        borderRadius: '8px', background: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: cardShadow,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        opacity: isLocked ? 0.4 : 1,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Reward content — blurred when pro_locked */}
      <div
        ref={rewardRef}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          width: '100%',
          padding: '8px 0 6px',
          filter: isProLocked ? 'blur(9px)' : 'none',
          opacity: isProLocked ? 0.2 : 1,
          userSelect: isProLocked ? 'none' : 'auto',
          pointerEvents: isProLocked ? 'none' : 'auto',
        }}
      >
        {/* Reward: icon + name/amount + swatch */}
        <RewardDisplay reward={reward} track={track} />

        {/* Mission text */}
        {mission && (
          <div style={{
            width: '100%',
            marginTop: 5,
            borderTop: '0.5px solid rgba(255,255,255,0.07)',
            paddingTop: 5,
          }}>
            <p style={{
              margin: 0, padding: '0 6px',
              fontSize: '8.5px', color: 'var(--text-muted)',
              fontFamily: 'var(--font-body)', fontWeight: 500,
              textAlign: 'center', lineHeight: 1.35,
            }}>
              {mission.desc}
            </p>

            {/* Progress bar — solo en el nivel activo, misiones habilitadas */}
            {showProgress && (
              <div style={{ marginTop: 5, padding: '0 6px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '7px',
                    fontWeight: 700, color: trackColor,
                  }}>
                    {missionProgress.current}/{missionProgress.target}
                  </span>
                </div>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (missionProgress.current / missionProgress.target) * 100)}%`,
                    background: trackColor, borderRadius: 2,
                    transition: 'width 0.3s ease',
                    boxShadow: `0 0 4px ${trackColor}88`,
                  }} />
                </div>
              </div>
            )}

            {/* Coming soon badge — Trading Mode missions */}
            {hasComingSoon && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 3, marginTop: 5,
              }}>
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
        )}
      </div>

      {/* Claimed badge — opacity:0 al inicio de animación para evitar flash; WAAPI lo controla */}
      {isClaimed && (
        <div
          ref={checkRef}
          style={{
            position: 'absolute', top: 4, right: 4,
            width: 16, height: 16, borderRadius: '50%',
            background: isProTrack ? 'var(--pink)' : 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: animate ? 0 : 1,
          }}
        >
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
