import BadgeIcon, { RARITY_COLORS } from '../BadgeIcon.jsx';
import { BADGES } from '../badges.js';

export default function EquippedBadge({ id, size = 12 }) {
  if (!id) return null;
  const badge = BADGES.find(b => b.id === id);
  if (!badge) return null;
  const color = RARITY_COLORS[badge.rarity] ?? RARITY_COLORS.common;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', color, flexShrink: 0 }}>
      <BadgeIcon id={id} size={size} />
    </span>
  );
}
