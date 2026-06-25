import { useLang } from './LangContext.jsx';

export default function Privacy({ onSelect }) {
  const { t } = useLang();
  return (
    <div style={{ padding: '24px 20px', fontFamily: 'var(--font-body)', background: 'var(--bg-base)', minHeight: '100vh', maxWidth: '680px', margin: '0 auto' }}>

      <button onClick={() => onSelect && onSelect('home')}
        style={{ background: 'transparent', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '5px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: 'pointer', marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {t.common.back}
      </button>

      <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: '28px', color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.5px' }}>Privacy Policy</h1>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>Last updated: June 2026</p>

      {[
        {
          title: 'Who we are',
          text: 'Tradiko ("we", "our", or "us") operates tradiko.dev and the Tradiko mobile application. Tradiko is a trading simulation game using real market data.'
        },
        {
          title: 'Data we collect',
          text: 'We collect: (1) Account information — your name and email address when you sign in with Google or Apple. (2) Usage data — game results, scores, streaks, and activity within the app. (3) Device information — device type and operating system for app functionality.'
        },
        {
          title: 'How we use your data',
          text: 'We use your data to: provide and improve the game experience, display leaderboards and rankings, send optional push notifications about daily challenges, and manage your account and subscription.'
        },
        {
          title: 'Data sharing',
          text: 'We do not sell your personal data to third parties. We use Google OAuth for authentication. Game statistics may be displayed publicly in leaderboards (username and score only).'
        },
        {
          title: 'Data retention',
          text: 'We retain your data for as long as your account is active. You can request deletion of your account and all associated data at any time.'
        },
        {
          title: 'Your rights',
          text: 'You have the right to access, correct, or delete your personal data. To exercise these rights or to delete your account, contact us at tradikonicolasvidal@gmail.com.'
        },
        {
          title: 'Children',
          text: 'Tradiko is not directed at children under 13. We do not knowingly collect personal information from children under 13.'
        },
        {
          title: 'Changes to this policy',
          text: 'We may update this policy occasionally. We will notify users of significant changes via the app or email.'
        },
        {
          title: 'Contact',
          text: 'For privacy questions or data deletion requests: tradikonicolasvidal@gmail.com'
        },
      ].map(({ title, text }) => (
        <div key={title} style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>{title}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>{text}</p>
        </div>
      ))}

    </div>
  );
}
