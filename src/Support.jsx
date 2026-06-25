import { useLang } from './LangContext.jsx';

export default function Support({ onSelect }) {
  const { t } = useLang();
  return (
    <div style={{ padding: '24px 20px', fontFamily: 'var(--font-body)', background: 'var(--bg-base)', minHeight: '100vh', maxWidth: '680px', margin: '0 auto' }}>

      <button onClick={() => onSelect && onSelect('home')}
        style={{ background: 'transparent', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '5px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, cursor: 'pointer', marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {t.common.back}
      </button>

      <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '28px', color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '-0.5px' }}>Support</h1>

      <div style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--green)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 700, lineHeight: '1.5', margin: 0 }}>
          For support, contact us at{' '}
          <a href="mailto:tradikonicolasvidal@gmail.com" style={{ color: 'var(--green)', textDecoration: 'underline', fontWeight: 800 }}>
            tradikonicolasvidal@gmail.com
          </a>
        </p>
      </div>

      <div style={{ marginBottom: '24px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>Contact us</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '12px' }}>For any questions, issues or feedback, reach us at:</p>
        <a href="mailto:tradikonicolasvidal@gmail.com" style={{ color: 'var(--green)', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>tradikonicolasvidal@gmail.com</a>
      </div>

      {[
        {
          title: 'How do I delete my account?',
          text: 'Go to Settings → scroll to the bottom → tap "Eliminar cuenta" (Delete account). Your account and all associated data will be permanently deleted.'
        },
        {
          title: 'I forgot my username',
          text: 'Tradiko uses Google or Apple Sign-In — there is no separate password. Sign in with the same Google or Apple account you used when you registered.'
        },
        {
          title: 'How do I cancel my Pro subscription?',
          text: 'To cancel your Pro subscription, contact us at tradikonicolasvidal@gmail.com with the subject "Cancel Pro subscription" and we will process it within 24 hours. Your access will continue until the end of the current billing period.'
        },
        {
          title: 'The app is not loading',
          text: 'Make sure you have an active internet connection. Try closing and reopening the app. If the issue persists, contact us at tradikonicolasvidal@gmail.com.'
        },
        {
          title: 'I found a bug',
          text: 'Please report bugs to tradikonicolasvidal@gmail.com with a description of what happened and what device and OS version you are using. We appreciate your help!'
        },
      ].map(({ title, text }) => (
        <div key={title} style={{ marginBottom: '16px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>{title}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{text}</p>
        </div>
      ))}

    </div>
  );
}
