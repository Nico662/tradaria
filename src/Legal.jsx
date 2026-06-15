import { useState } from 'react';

export default function Legal({ onBack }) {
  const [view, setView] = useState('quick');

  return (
    <div id="gtm-root" style={{ position: 'relative' }}>
      <div className="scanlines" />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack}
            style={{ background: 'transparent', border: 'none', color: 'var(--t6)', fontFamily: "'Space Mono', monospace", fontSize: '11px', cursor: 'pointer', letterSpacing: '0.06em' }}
            onMouseEnter={e => e.target.style.color = 'var(--t2)'}
            onMouseLeave={e => e.target.style.color = 'var(--t6)'}
          >← back</button>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px', color: 'var(--t1)', letterSpacing: '0.06em' }}>LEGAL</div>
        </div>

        <div style={{ display: 'flex', gap: '8px', padding: '16px 20px 0' }}>
          <button onClick={() => setView('quick')}
            style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${view === 'quick' ? 'var(--green)' : 'var(--bd2)'}`, background: view === 'quick' ? 'rgba(0,229,160,0.08)' : 'transparent', color: view === 'quick' ? 'var(--green)' : 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}>
            Quick
          </button>
          <button onClick={() => setView('full')}
            style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${view === 'full' ? 'var(--green)' : 'var(--bd2)'}`, background: view === 'full' ? 'rgba(0,229,160,0.08)' : 'transparent', color: view === 'full' ? 'var(--green)' : 'var(--t5)', fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}>
            Full Legal
          </button>
        </div>

        <div style={{ padding: '16px 20px 40px', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
          {view === 'quick' ? <QuickVersion /> : <FullVersion />}
        </div>
      </div>
    </div>
  );
}

function Section({ emoji, title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--t2)', marginBottom: '6px' }}>{emoji} {title}</div>
      <div style={{ fontSize: '11px', color: 'var(--t4)', lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function QuickVersion() {
  return (
    <div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px' }}>Quick Heads-Up</div>
      <Section emoji="🧠" title="What is Tradaria?">Tradaria is a simulation game, not real trading. Nothing here is financial advice. You must be at least 16 years old to use this app.</Section>
      <Section emoji="📊" title="About the Game">You're trading in a simulated market — no real money, no real risk. Just your skills against the market.</Section>
      <Section emoji="⚠️" title="Keep in Mind">Market data may be delayed or simulated. Don't use it for real-world financial decisions.</Section>
      <Section emoji="🔐" title="Your Data">We only collect what's needed to run the app (your Google account info and game scores). You can request deletion anytime at nicolasvidalcorrecher@tradaria.dev.</Section>
      <Section emoji="🍪" title="Cookies">We only use functional cookies for login and session management. No tracking or advertising cookies.</Section>
      <Section emoji="📜" title="Fair Play">No cheating, exploiting bugs, or disrupting others. Play fair or risk losing access.</Section>
      <Section emoji="💰" title="Purchases">Any purchases are optional and don't guarantee better results — skill still wins.</Section>
      <Section emoji="🚫" title="Responsibility">Your real-world financial decisions are 100% yours. Tradaria isn't responsible for them.</Section>
      <Section emoji="🌍" title="Governing Law">These terms are governed by the laws of Spain and the European Union.</Section>
      <Section emoji="🔄" title="Updates">We may update these terms from time to time. Last updated: April 2026.</Section>
    </div>
  );
}

function FullVersion() {
  return (
    <div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '10px', color: 'var(--t6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px' }}>Terms & Privacy Policy</div>

      <Section emoji="📌" title="Disclaimer">
        Tradaria is provided for educational and entertainment purposes only. The information, simulations, and results presented within the application do not constitute financial, investment, legal, or other professional advice. Users are solely responsible for their real-world financial decisions. Tradaria makes no guarantees regarding the accuracy, completeness, or usefulness of the information provided and assumes no liability for any losses incurred as a result of using the application.
      </Section>

      <Section emoji="⚖️" title="Nature of the Service">
        Tradaria is a market simulation platform designed to recreate trading scenarios in an interactive environment. No real financial transactions are executed, and no user funds are managed. All outcomes within the application occur in a simulated environment and have no impact on real-world assets. Tradaria is intended for users aged 16 and older. By using the application, you confirm that you meet this age requirement.
      </Section>

      <Section emoji="🔐" title="Privacy & Data Protection (GDPR)">
        Tradaria is committed to protecting your personal data in accordance with the General Data Protection Regulation (GDPR) and applicable Spanish and European data protection law.{'\n\n'}
        <strong style={{ color: '#8a9ab5' }}>Data we collect:</strong> Account information provided via Google OAuth login (your name, email address, and profile picture); game data including scores, XP, level, badges, and tournament results; and session tokens (JWT) stored locally on your device.{'\n\n'}
        <strong style={{ color: '#8a9ab5' }}>How we use your data:</strong> Your data is used exclusively to operate and improve Tradaria — to maintain your account, display your scores and ranking, and send optional push notifications if you have enabled them. We do not sell, rent, or share your personal data with third parties for commercial purposes.{'\n\n'}
        <strong style={{ color: '#8a9ab5' }}>Legal basis:</strong> We process your data based on your consent at the time of login and on our legitimate interest in operating and securing the service.{'\n\n'}
        <strong style={{ color: '#8a9ab5' }}>Data retention:</strong> Your data is retained for as long as your account is active. If you request account deletion, all personal data will be permanently removed within 30 days.{'\n\n'}
        <strong style={{ color: '#8a9ab5' }}>Your rights:</strong> Under GDPR, you have the right to access, rectify, or delete your personal data at any time. You may also withdraw consent or request a copy of your data. To exercise any of these rights, contact us at: nicolasvidalcorrecher@tradaria.dev
      </Section>

      <Section emoji="🍪" title="Cookies">
        Tradaria uses only functional cookies and local storage strictly necessary for authentication and session management. We do not use advertising or tracking cookies. No third-party analytics are loaded without your prior consent.
      </Section>

      <Section emoji="📜" title="Terms of Use">
        By using Tradaria, you agree to use the application responsibly and in accordance with these terms. You must be at least 16 years old to create an account. Misuse of the platform — including attempts to exploit bugs, manipulate systems, gain unfair advantages in tournaments, or disrupt other users — is strictly prohibited. Tradaria reserves the right to suspend or terminate accounts that violate these terms without prior notice.
      </Section>

      <Section emoji="📈" title="Market Data">
        Market data displayed in Tradaria is sourced from third-party providers and may be delayed, simulated, or not reflective of real-time market conditions. This data is provided solely for use within the Tradaria platform and may not be extracted, redistributed, or used for any commercial purpose outside of the application. Tradaria does not guarantee the accuracy or timeliness of such data and is not responsible for any decisions made based on it.
      </Section>

      <Section emoji="💰" title="Monetization">
        Tradaria may offer optional premium features, subscriptions, or cosmetic in-app purchases. All purchases are voluntary and do not guarantee improved game performance or specific results. Where applicable, purchases are subject to the refund policies of the relevant platform or payment provider.
      </Section>

      <Section emoji="⚠️" title="Limitation of Liability">
        To the fullest extent permitted by applicable law, Tradaria and its creators shall not be liable for any direct, indirect, incidental, or consequential damages — including financial losses, data loss, or service interruption — arising from the use or inability to use the application.
      </Section>

      <Section emoji="🧠" title="Intellectual Property">
        All elements of Tradaria — including its name, logo, design, content, graphics, and software — are owned by its creators or properly licensed. Unauthorized use, reproduction, or distribution of any part of the application is strictly prohibited.
      </Section>

      <Section emoji="🌍" title="Governing Law & Changes to Terms">
        These terms are governed by the laws of Spain and, where applicable, the laws of the European Union. Any disputes arising from the use of Tradaria shall be subject to the jurisdiction of the courts of Spain.{'\n\n'}
        Tradaria reserves the right to modify these terms at any time. Continued use of the application following any changes constitutes acceptance of the updated terms. Last updated: April 2026.
      </Section>
    </div>
  );
}