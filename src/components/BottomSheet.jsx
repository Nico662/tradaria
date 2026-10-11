import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Bottom sheet rendered as a portal directly on document.body.
 *
 * Why portal: on iOS WKWebView, position:fixed inside an ancestor with
 * overflow:auto/scroll is clipped and positioned relative to that ancestor
 * (not the viewport). AppLayout's .app-main has overflow-y:auto, so any
 * fixed overlay inside it breaks on iOS. Rendering in document.body
 * sidesteps both the overflow clipping and the isolation:isolate stacking
 * context on .app-shell.
 *
 * z-index 9999: above BottomNav (100), above .app-shell's isolation context,
 * below LevelUpOverlay/UpdateBanner (10000).
 */
export default function BottomSheet({ onClose, children }) {
  // Lock scroll on the scrollable content area while sheet is open.
  // Targets .app-main (the actual scroll container) rather than body,
  // which is more reliable on iOS WebView than body overflow:hidden.
  useEffect(() => {
    const main = document.querySelector('.app-main');
    const target = main || document.body;
    const prev = target.style.overflow;
    target.style.overflow = 'hidden';
    return () => { target.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
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
          /* 90dvh with px fallback for older iOS that doesn't support dvh */
          maxHeight: 'min(90dvh, 90vh)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
