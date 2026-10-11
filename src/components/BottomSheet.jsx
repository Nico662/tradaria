import { useEffect } from 'react';

/**
 * Reusable bottom-sheet overlay.
 * - z-index 200 (above BottomNav at 100)
 * - max-width 480px centered (matches app column)
 * - max-height 90dvh with internal scroll
 * - safe-area padding at bottom
 * - locks body scroll while open
 * - backdrop click closes the sheet
 */
export default function BottomSheet({ onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        zIndex: 200,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        alignItems: 'center',
      }}
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }}
      />
      {/* sheet panel */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          maxHeight: '90dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
