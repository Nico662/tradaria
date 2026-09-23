import { BadgeCheck } from 'lucide-react';

export default function VerifiedBadge({ size = 13 }) {
  return (
    <span
      title="Verified"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: '2px',
        lineHeight: 1,
        verticalAlign: 'middle',
        cursor: 'default',
        flexShrink: 0,
      }}
    >
      <BadgeCheck
        size={Math.max(size, 12)}
        strokeWidth={2}
        aria-hidden
        style={{ color: 'var(--green)', filter: 'drop-shadow(0 0 4px rgba(34,212,165,0.4))' }}
      />
    </span>
  );
}
