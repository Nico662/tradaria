export function BullAvatar({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <g transform="translate(60,60)">
        <circle cx="0" cy="0" r="56" fill="#0f1f18"/>
        <circle cx="0" cy="0" r="56" fill="none" stroke="#2dd4a0" strokeWidth="2"/>
        <path d="M-24,-24 Q-40,-30 -42,-46 Q-30,-40 -20,-32 Z" fill="#e8e3d8"/>
        <path d="M24,-24 Q40,-30 42,-46 Q30,-40 20,-32 Z" fill="#e8e3d8"/>
        <ellipse cx="-28" cy="-14" rx="8" ry="11" fill="#1f4a38" transform="rotate(-30 -28 -14)"/>
        <ellipse cx="28" cy="-14" rx="8" ry="11" fill="#1f4a38" transform="rotate(30 28 -14)"/>
        <path d="M-24,-26 Q0,-36 24,-26 Q30,-8 24,12 Q14,30 0,32 Q-14,30 -24,12 Q-30,-8 -24,-26 Z" fill="#2dd4a0"/>
        <path d="M-10,-30 Q-6,-38 0,-32 Q6,-38 10,-30 Q4,-26 0,-28 Q-4,-26 -10,-30 Z" fill="#1f4a38"/>
        <circle cx="-11" cy="-8" r="4" fill="#0d0d0d"/>
        <circle cx="11" cy="-8" r="4" fill="#0d0d0d"/>
        <circle cx="-9.5" cy="-9.5" r="1.3" fill="#fff"/>
        <circle cx="12.5" cy="-9.5" r="1.3" fill="#fff"/>
        <path d="M-17,-15 L-6,-13" stroke="#0d0d0d" strokeWidth="2" strokeLinecap="round"/>
        <path d="M17,-15 L6,-13" stroke="#0d0d0d" strokeWidth="2" strokeLinecap="round"/>
        <ellipse cx="0" cy="16" rx="16" ry="12" fill="#1f4a38"/>
        <ellipse cx="-6" cy="15" rx="2.8" ry="3.6" fill="#0d0d0d"/>
        <ellipse cx="6" cy="15" rx="2.8" ry="3.6" fill="#0d0d0d"/>
        <path d="M-4,24 Q0,30 4,24" fill="none" stroke="#e8b93c" strokeWidth="2.5" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

export function BearAvatar({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <g transform="translate(60,60)">
        <circle cx="0" cy="0" r="56" fill="#211114"/>
        <circle cx="0" cy="0" r="56" fill="none" stroke="#f87171" strokeWidth="2"/>
        <circle cx="-22" cy="-30" r="11" fill="#f87171"/>
        <circle cx="22" cy="-30" r="11" fill="#f87171"/>
        <circle cx="-22" cy="-30" r="5.5" fill="#5c1f24"/>
        <circle cx="22" cy="-30" r="5.5" fill="#5c1f24"/>
        <path d="M-26,-22 Q0,-34 26,-22 Q32,-4 26,14 Q16,32 0,34 Q-16,32 -26,14 Q-32,-4 -26,-22 Z" fill="#f87171"/>
        <circle cx="-11" cy="-6" r="4" fill="#0d0d0d"/>
        <circle cx="11" cy="-6" r="4" fill="#0d0d0d"/>
        <circle cx="-9.5" cy="-7.5" r="1.3" fill="#fff"/>
        <circle cx="12.5" cy="-7.5" r="1.3" fill="#fff"/>
        <path d="M-17,-14 L-6,-10" stroke="#0d0d0d" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M17,-14 L6,-10" stroke="#0d0d0d" strokeWidth="2.2" strokeLinecap="round"/>
        <ellipse cx="0" cy="14" rx="14" ry="11" fill="#5c1f24"/>
        <ellipse cx="0" cy="9" rx="5" ry="3.6" fill="#0d0d0d"/>
        <path d="M0,13 L0,19 M0,19 Q-5,23 -9,20 M0,19 Q5,23 9,20" fill="none" stroke="#0d0d0d" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M30,24 L36,34 M36,22 L42,32" stroke="#5c1f24" strokeWidth="2" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

export function WhaleAvatar({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <g transform="translate(60,60)">
        <circle cx="0" cy="0" r="56" fill="#0f1a2b"/>
        <circle cx="0" cy="0" r="56" fill="none" stroke="#60a5fa" strokeWidth="2"/>
        <path d="M-6,-34 Q-10,-46 -16,-50 M-6,-34 Q-6,-48 -6,-52 M-6,-34 Q0,-46 6,-50" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round"/>
        <path d="M-40,4 Q-36,-22 -6,-26 Q28,-28 38,-6 Q42,10 30,22 Q10,34 -14,28 Q-36,22 -40,4 Z" fill="#60a5fa"/>
        <path d="M-38,10 Q-20,26 8,28 Q-8,32 -22,26 Q-34,20 -38,10 Z" fill="#93c5fd"/>
        <path d="M-32,14 Q-18,24 0,27 M-28,20 Q-16,27 -4,29" fill="none" stroke="#3b82c4" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M38,-6 Q48,-16 54,-22 Q52,-10 46,-2 Q54,2 58,10 Q48,10 40,6 Z" fill="#60a5fa"/>
        <circle cx="-20" cy="-4" r="4.5" fill="#0d0d0d"/>
        <circle cx="-18.5" cy="-5.5" r="1.5" fill="#fff"/>
        <path d="M-32,8 Q-24,14 -12,12" fill="none" stroke="#0d1f38" strokeWidth="2" strokeLinecap="round"/>
        <path d="M0,6 Q-4,20 -14,26 Q4,26 12,14 Z" fill="#3b82c4"/>
      </g>
    </svg>
  );
}

export function RobotAvatar({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <g transform="translate(60,60)">
        <circle cx="0" cy="0" r="56" fill="#171226"/>
        <circle cx="0" cy="0" r="56" fill="none" stroke="#a78bfa" strokeWidth="2"/>
        <line x1="0" y1="-30" x2="0" y2="-44" stroke="#a78bfa" strokeWidth="2.5"/>
        <circle cx="0" cy="-47" r="4" fill="#e8b93c"/>
        <circle cx="0" cy="-47" r="7" fill="none" stroke="#e8b93c" strokeWidth="1" opacity="0.4"/>
        <rect x="-26" y="-30" width="52" height="44" rx="10" fill="#a78bfa"/>
        <rect x="-20" y="-24" width="40" height="26" rx="6" fill="#171226"/>
        <rect x="-14" y="-17" width="9" height="10" rx="3" fill="#7cf5d4"/>
        <rect x="5" y="-17" width="9" height="10" rx="3" fill="#7cf5d4"/>
        <path d="M-8,-2.5 Q0,2.5 8,-2.5" fill="none" stroke="#7cf5d4" strokeWidth="2" strokeLinecap="round"/>
        <rect x="-32" y="-14" width="6" height="12" rx="2" fill="#6d5bb8"/>
        <rect x="26" y="-14" width="6" height="12" rx="2" fill="#6d5bb8"/>
        <rect x="-16" y="16" width="32" height="8" rx="3" fill="#6d5bb8"/>
        <circle cx="-9" cy="20" r="1.5" fill="#171226"/>
        <circle cx="0" cy="20" r="1.5" fill="#171226"/>
        <circle cx="9" cy="20" r="1.5" fill="#171226"/>
        <rect x="-7" y="26" width="14" height="7" rx="2" fill="#a78bfa"/>
      </g>
    </svg>
  );
}

export function FoxAvatar({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <g transform="translate(60,60)">
        <circle cx="0" cy="0" r="56" fill="#1a0f04"/>
        <circle cx="0" cy="0" r="56" fill="none" stroke="#f97316" strokeWidth="2"/>
        <path d="M-26,-28 L-44,-52 L-8,-36 Z" fill="#f97316"/>
        <path d="M-26,-28 L-40,-48 L-12,-36 Z" fill="#fbbf24"/>
        <path d="M26,-28 L44,-52 L8,-36 Z" fill="#f97316"/>
        <path d="M26,-28 L40,-48 L12,-36 Z" fill="#fbbf24"/>
        <path d="M-28,-22 Q-34,-8 -30,8 Q-20,26 0,28 Q20,26 30,8 Q34,-8 28,-22 Q20,-34 0,-32 Q-20,-34 -28,-22 Z" fill="#f97316"/>
        <ellipse cx="0" cy="10" rx="17" ry="14" fill="#fbbf24"/>
        <ellipse cx="-12" cy="-8" rx="5" ry="6.5" fill="#0d0d0d"/>
        <ellipse cx="12" cy="-8" rx="5" ry="6.5" fill="#0d0d0d"/>
        <circle cx="-10" cy="-10" r="1.5" fill="#fff"/>
        <circle cx="14" cy="-10" r="1.5" fill="#fff"/>
        <ellipse cx="0" cy="3" rx="4" ry="2.5" fill="#1a0f04"/>
        <path d="M-5,8 Q0,13 5,8" fill="none" stroke="#1a0f04" strokeWidth="1.5" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

export function DragonAvatar({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <g transform="translate(60,60)">
        <circle cx="0" cy="0" r="56" fill="#0e0a1a"/>
        <circle cx="0" cy="0" r="56" fill="none" stroke="#a855f7" strokeWidth="2"/>
        <path d="M-20,-8 Q-52,-28 -54,-52 Q-28,-28 -18,-8 Z" fill="#7c3aed" opacity="0.85"/>
        <path d="M20,-8 Q52,-28 54,-52 Q28,-28 18,-8 Z" fill="#7c3aed" opacity="0.85"/>
        <path d="M-26,-20 Q-32,-4 -28,12 Q-18,30 0,32 Q18,30 28,12 Q32,-4 26,-20 Q18,-32 0,-30 Q-18,-32 -26,-20 Z" fill="#a855f7"/>
        <path d="M-9,-30 L-14,-50 L-4,-32 Z" fill="#7c3aed"/>
        <path d="M9,-30 L14,-50 L4,-32 Z" fill="#7c3aed"/>
        <ellipse cx="-11" cy="-9" rx="5.5" ry="5.5" fill="#22d3ee"/>
        <ellipse cx="11" cy="-9" rx="5.5" ry="5.5" fill="#22d3ee"/>
        <ellipse cx="-11" cy="-9" rx="2" ry="2.5" fill="#0d0d0d"/>
        <ellipse cx="11" cy="-9" rx="2" ry="2.5" fill="#0d0d0d"/>
        <path d="M-10,6 Q0,14 10,6 Q8,18 0,20 Q-8,18 -10,6 Z" fill="#7c3aed"/>
        <circle cx="-4" cy="12" r="2.2" fill="#f97316"/>
        <circle cx="4" cy="12" r="2.2" fill="#f97316"/>
      </g>
    </svg>
  );
}

export function AvatarSVG({ id, size = 48 }) {
  const map = {
    avatar_bull:   BullAvatar,
    avatar_bear:   BearAvatar,
    avatar_whale:  WhaleAvatar,
    avatar_robot:  RobotAvatar,
    avatar_fox:    FoxAvatar,
    avatar_dragon: DragonAvatar,
  };
  const Comp = map[id];
  return Comp ? <Comp size={size} /> : null;
}
