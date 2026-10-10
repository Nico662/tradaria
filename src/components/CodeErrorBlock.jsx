import { AlertTriangle } from 'lucide-react';

export default function CodeErrorBlock({ title, hint, onRetry, retryLabel }) {
  return (
    <div style={{
      marginTop: '12px',
      padding: '12px 14px',
      background: 'rgba(255,126,179,0.08)',
      border: '1px solid var(--pink)',
      borderRadius: '8px',
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
    }}>
      <AlertTriangle
        size={15}
        strokeWidth={2.5}
        aria-hidden
        style={{ color: 'var(--pink)', flexShrink: 0, marginTop: '1px' }}
      />
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 800,
          fontSize: '13px',
          color: 'var(--pink)',
          marginBottom: hint ? '3px' : 0,
        }}>
          {title}
        </div>
        {hint && (
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: 'var(--t3)',
            lineHeight: 1.45,
          }}>
            {hint}
          </div>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: '8px',
              background: 'none',
              border: 'none',
              color: 'var(--pink)',
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            {retryLabel ?? 'Retry'}
          </button>
        )}
      </div>
    </div>
  );
}
