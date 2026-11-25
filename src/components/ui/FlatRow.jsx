import { ChevronRight } from 'lucide-react';

export default function FlatRow({
  icon,
  title,
  subtitle,
  value,
  valueColor,
  onClick,
  chevron = true,
  dimmed = false,
  style,
  children,
}) {
  const Tag = onClick && !dimmed ? 'button' : 'div';
  const showChevron = onClick && !dimmed && !value && chevron;

  const valueClass =
    valueColor === 'up'   ? 'flat-row-value flat-row-value--up' :
    valueColor === 'down' ? 'flat-row-value flat-row-value--down' :
    'flat-row-value';

  return (
    <Tag
      className={`flat-row${dimmed ? ' flat-row--dimmed' : ''}`}
      onClick={onClick && !dimmed ? onClick : undefined}
      style={style}
    >
      {icon && <div className="flat-row-icon">{icon}</div>}
      <div className="flat-row-content">
        {title    && <div className="flat-row-title">{title}</div>}
        {subtitle && <div className="flat-row-subtitle">{subtitle}</div>}
        {children}
      </div>
      {value && (
        <div
          className={valueClass}
          style={valueColor && valueColor !== 'up' && valueColor !== 'down'
            ? { color: valueColor }
            : undefined}
        >
          {value}
        </div>
      )}
      {showChevron && (
        <ChevronRight size={16} strokeWidth={2} className="flat-row-chevron" />
      )}
    </Tag>
  );
}
