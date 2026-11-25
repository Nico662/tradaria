import { TITLE_LABELS } from '../cosmeticColors';

export default function TitleBadge({ title }) {
  if (!title || !TITLE_LABELS[title]) return null;
  return (
    <span style={{
      fontSize: '9px',
      fontWeight: 800,
      letterSpacing: '0.06em',
      padding: '2px 6px',
      borderRadius: '4px',
      background: 'rgba(196,154,42,0.12)',
      color: 'var(--color-neutral)',
      border: '0.5px solid rgba(196,154,42,0.25)',
      textTransform: 'uppercase',
      marginLeft: '5px',
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-body)',
      lineHeight: 1,
      display: 'inline-block',
      verticalAlign: 'middle',
    }}>
      {TITLE_LABELS[title]}
    </span>
  );
}
