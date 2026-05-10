import { useState, useEffect } from 'react';
import { SERVER } from './config.js';
import { useAuth } from './AuthContext';

export default function NotificationBanner() {
  const [show, setShow] = useState(false);
  const { user } = useAuth();

  async function subscribeUser() {
    try {
      const reg      = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        if (user?.username) {
          await fetch(`${SERVER}/push/subscribe`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ ...JSON.parse(JSON.stringify(existing)), username: user.username }),
          });
        }
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: 'BEWPkbh1HeSsw08H0EsELp5TIPD2gcQ8Yfa1RsSW-9jER3uvoeVUTazcIqjlf4UNFKe7QeqQ8ZlVjGI72pinR0I',
      });
      await fetch(`${SERVER}/push/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...JSON.parse(JSON.stringify(sub)), username: user?.username }),
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
    localStorage.setItem('tradara_push_dismissed', '1');
  }

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const dismissed = localStorage.getItem('tradara_push_dismissed');
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
      position: 'fixed', bottom: '20px', left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 40px)', maxWidth: '400px',
      background: '#0f141b', border: '1px solid #22d3a5',
      borderRadius: '12px', padding: '16px 20px',
      zIndex: 9998, boxShadow: '0 0 24px rgba(34,211,165,0.15)',
      animation: 'slideUp 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>⚡</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: '#f0f0f0', marginBottom: '4px' }}>
            Daily Challenge notifications
          </div>
          <div style={{ fontSize: '10px', color: '#4a5568', lineHeight: 1.5 }}>
            Get notified every day when the new chart drops.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button onClick={() => { console.log('Allow clicked'); allow(); }}
          style={{ flex: 1, padding: '10px', background: 'rgba(34,211,165,0.1)', border: '1px solid #22d3a5', borderRadius: '6px', color: '#22d3a5', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
             Allow
        </button>
        <button onClick={dismiss}
          style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #2a3345', borderRadius: '6px', color: '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
          Not now
        </button>
      </div>
    </div>
  );
}