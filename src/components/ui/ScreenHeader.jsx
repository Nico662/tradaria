import { ChevronLeft } from 'lucide-react';

export default function ScreenHeader({ title, subtitle, onBack, action }) {
  return (
    <div className="screen-header">
      {onBack && (
        <button className="screen-header__back" onClick={onBack} aria-label="Back">
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="screen-header__title">{title}</h1>
        {subtitle && <p className="screen-header__sub">{subtitle}</p>}
      </div>
      {action && <div className="screen-header__action">{action}</div>}
    </div>
  );
}
