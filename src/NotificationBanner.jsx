import { useState, useEffect } from 'react';
import { SERVER } from './config.js';
import { useAuth } from './AuthContext.jsx';

export default function NotificationBanner() {
  const [show, setShow] = useState(false);
  const { user } = useAuth();

  async function subscribeUser() {
    try {
      const reg      = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: 'BEWPkbh1HeSsw08H0EsELp5TIPD2gcQ8Yfa1RsSW-9jER3uvoeVUTazcIqjlf4UNFKe7QeqQ8ZlVjGI72pinR0I',
      });
      await fetch(`${SERVER}/push/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...sub.toJSON(), userId: user?.id }),
      });
    } catch (err) {
      console.log('Push error:', err);
    }
  }

  async function allow() {
   setShow(false);
   try {
    console.log('Requesting permission...');
    const permission = await Notification.requestPermission();
    console.log('Permission result:', permission);
    if (permission !== 'granted') return;
    await subscribeUser();
  } catch (err) {
    console.log('Push error:', err);
  }
}

  function dismiss() {
    setShow(false);
    localStorage.setItem('tradaria_push_dismissed', '1');
  }

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const dismissed = localStorage.getItem('tradaria_push_dismissed');
    if (dismissed) return;
    if (Notification.permission === 'granted') {
      subscribeUser();
      return;
    }
    if (Notification.permission === 'denied') return;
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)',
      left: '12px',
      right: '12px',
      background: 'var(--bg-card)', border: '1px solid var(--green)',
      borderRadius: '12px', padding: '16px 20px',
      zIndex: 150, boxShadow: '0 0 24px rgba(0,229,160,0.15)',
      animation: 'slideUp 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>⚡</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '13px', color: 'var(--t1)', marginBottom: '4px' }}>
            Daily Challenge notifications
          </div>
          <div style={{ fontSize: '10px', color: 'var(--t5)', lineHeight: 1.5 }}>
            Get notified every day when the new chart drops.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button onClick={() => { console.log('Allow clicked'); allow(); }}
          style={{ flex: 1, padding: '10px', background: 'rgba(0,229,160,0.1)', border: '1px solid var(--green)', borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
             Allow
        </button>
        <button onClick={dismiss}
          style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
          Not now
        </button>
      </div>
    </div>
  );
}