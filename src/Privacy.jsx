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
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>Last updated: 24 November 2026</p>

      {[
        {
          title: 'Who we are',
          text: 'Tradiko ("we", "our", or "us") operates tradiko.dev and the Tradiko mobile application. Tradiko is a trading simulation game using real market data.'
        },
        {
          title: 'Data we collect',
          text: 'We collect: (1) Account information — your name and email address when you sign in with Google or Apple. (2) Usage data — game results, scores, streaks, and activity within the app. (3) Device information — device type and operating system for app functionality. (4) Analytics data — only if you have given your explicit consent via the cookie banner.'
        },
        {
          title: 'How we use your data',
          text: 'We use your data to: provide and improve the game experience, display leaderboards and rankings, send optional push notifications about daily challenges, and manage your account and subscription.'
        },
        {
          title: 'Analytics cookies',
          text: 'We use Google Analytics (G-ZG1DQSVHRV) and Vercel Analytics solely with your explicit prior consent. Without consent, no analytics scripts are loaded. You can accept or decline via the cookie banner shown at first visit, and change your preference at any time in Settings → Cookies / Privacy.'
        },
        {
          title: 'Data sharing',
          text: 'We do not sell your personal data to third parties. We use Google OAuth and Apple Sign-In for authentication. Game statistics may be displayed publicly in leaderboards (username and score only).'
        },
        {
          title: 'Data processors / Service providers',
          text: [
            '• Stripe — payment processing for Pro subscriptions and academy plans (web).',
            '• Apple — Sign in with Apple, in-app purchases (IAP), Apple Push Notification service (APNs).',
            '• Google — OAuth login, Google Analytics (only with consent).',
            '• Railway — backend server hosting.',
            '• MongoDB — primary database for user and game data.',
            '• Upstash — Redis cache (session tokens, rate limiting).',
            '• Vercel — frontend hosting and Vercel Analytics (only with consent).',
            '• Web Push services (browser/OS vendors) — push notification delivery.',
            '',
            'Data region and international transfers: A VERIFICAR POR NICO — exact server regions and Standard Contractual Clauses have not been verified in code. Nico should confirm these with each provider\'s DPA.'
          ].join('\n')
        },
        {
          title: 'Legal basis for processing (GDPR)',
          text: [
            '• Contract performance — processing necessary to provide the game service (account creation, game sessions, leaderboards).',
            '• Consent — analytics cookies (Google Analytics, Vercel Analytics); you may withdraw consent at any time.',
            '• Legal obligation — retention of billing and payment records as required by applicable law.',
            '• Legitimate interest — security, anti-abuse, fraud prevention, and service integrity.'
          ].join('\n')
        },
        {
          title: 'Your GDPR rights',
          text: [
            'Under GDPR you have the right to:',
            '• Access — request a copy of the personal data we hold about you.',
            '• Rectification — correct inaccurate or incomplete data.',
            '• Erasure ("right to be forgotten") — request deletion of your account and all associated data.',
            '• Data portability — receive your data in a machine-readable format.',
            '• Restriction — ask us to limit how we process your data.',
            '• Objection — object to processing based on legitimate interest.',
            '',
            'To exercise any of these rights, contact us at: support@tradiko.dev'
          ].join('\n')
        },
        {
          title: 'Data retention',
          text: 'We retain your data for as long as your account is active. If you request account deletion (via Settings → Delete account), all personal data will be permanently deleted. Billing and payment records required by law will be anonymised and retained for the legally required period.'
        },
        {
          title: 'Children',
          text: 'Tradiko is not directed at children under 14. We do not knowingly collect personal information from children under 14. Accounts found to belong to users under 14 years of age will be permanently deleted.'
        },
        {
          title: 'Changes to this policy',
          text: 'We may update this policy occasionally. We will notify users of significant changes via the app or email.'
        },
        {
          title: 'Contact',
          text: 'For privacy questions or data deletion requests: support@tradiko.dev'
        },
      ].map(({ title, text }) => (
        <div key={title} style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>{title}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{text}</p>
        </div>
      ))}

    </div>
  );
}
