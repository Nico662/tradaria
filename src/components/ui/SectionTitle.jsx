import { ChevronRight } from 'lucide-react';

export default function SectionTitle({ children, onClick, style }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="section-title" onClick={onClick} style={style}>
      {children}
      {onClick && <ChevronRight size={16} strokeWidth={2.5} style={{ color: 'var(--text-hint)' }} />}
    </Tag>
  );
}
