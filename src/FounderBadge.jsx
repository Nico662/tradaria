export const FOUNDER = 'nico_founder';

export function isFounder(username) {
  return username === FOUNDER;
}

export default function FounderBadge({ size = 13 }) {
  return (
    <span
      title="Founder"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: '3px',
        fontSize: size,
        lineHeight: 1,
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 0 5px rgba(245,158,11,0.7))',
        cursor: 'default',
        flexShrink: 0,
      }}
    >
      👑
    </span>
  );
}
