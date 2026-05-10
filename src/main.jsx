import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LangProvider } from './LangContext.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { SERVER } from './config.js';
import { inject } from '@vercel/analytics';
inject();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const existing = await reg.pushManager.getSubscription();
      if (existing) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BEWPkbh1HeSsw08H0EsELp5TIPD2gcQ8Yfa1RsSW-9jER3uvoeVUTazcIqjlf4UNFKe7QeqQ8ZlVjGI72pinR0I',
      });

      await fetch(`${SERVER}/push/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(sub),
      });

      console.log('Push subscribed');
    } catch (err) {
      console.log('SW error:', err);
    }
  });
}

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <LangProvider>
      <App />
    </LangProvider>
  </AuthProvider>
)