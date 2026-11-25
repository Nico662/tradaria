import { Crown, Star } from 'lucide-react';

const ICON_MAP = { Crown, Star };

const SPECIAL_USERS = [
  {
    googleId: '104543067538217236839',
    username: 'nico_founder',
    icon: 'Crown',
    color: 'rgb(245,158,11)',
    glow: 'rgba(245,158,11,0.7)',
    title: 'Founder',
  },
  {
    googleId: '118118786854640788548',
    username: 'aitanaruizvives',
    icon: 'Star',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.7)',
    title: 'Co-founder',
  },
];

export function getSpecialUser(googleId) {
  if (!googleId) return null;
  return SPECIAL_USERS.find(u => u.googleId === googleId) ?? null;
}

export function getSpecialUserByUsername(username) {
  if (!username) return null;
  return SPECIAL_USERS.find(u => u.username === username) ?? null;
}

export default function SpecialBadge({ specialUser, size = 13 }) {
  if (!specialUser) return null;
  const Icon = ICON_MAP[specialUser.icon] ?? Crown;
  return (
    <span
      title={specialUser.title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: '3px',
        lineHeight: 1,
        verticalAlign: 'middle',
        cursor: 'default',
        flexShrink: 0,
      }}
    >
      <Icon
        size={Math.max(size, 12)}
        strokeWidth={2}
        aria-hidden
        style={{ filter: `drop-shadow(0 0 5px ${specialUser.glow})`, color: specialUser.color }}
      />
    </span>
  );
}
