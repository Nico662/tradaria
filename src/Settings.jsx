import { useState } from 'react';
import { useAuth, isIOSApp } from './AuthContext';
import { useLang } from './LangContext.jsx';
import UsernameModal from './UsernameModal.jsx';
import { SERVER } from './config.js';
import { restorePurchases } from './iap.js';
import { Zap, Check } from 'lucide-react';
import { ScreenHeader, SectionTitle } from './components/ui';
import { saveConsent } from './analytics.js';

const STRINGS = {
  en: {
    title: 'Settings', back: '← back',
    appearance: 'Appearance', darkMode: 'Dark mode',
    language: 'Language',
    notifications: 'Notifications',
    notifOn: 'Notifications enabled', notifOff: 'Enable notifications', notifDisable: 'Disable notifications',
    account: 'Account', username: 'Username', edit: 'Edit', signOut: 'Sign out',
    about: 'About Tradiko', builtBy: 'Built by Nicolás Vidal',
    subscription: 'Subscription', planLabel: 'Pro Plan · €3.99/mo', planActive: 'ACTIVE',
    cancelDoneMsg: 'Subscription cancelled. You will keep Pro access until the end of the current period.',
    cancelConfirmMsg: 'Are you sure? You will lose Pro access at the end of the current period.',
    cancelling: 'Cancelling...', confirmCancel: 'Yes, cancel', goBack: 'Back', cancelSub: 'Cancel subscription',
    deleteAccount: 'Delete account', deleteConfirmMsg: 'Are you sure? This will permanently delete your account and all your data.',
    cancel: 'Cancel', yesDelete: 'Yes, delete', deleting: 'Deleting...',
    cancelError: 'Error cancelling. Contact tradikonicolasvidal@gmail.com', connectionError: 'Connection error. Please try again.',
    howToPlay: 'How to play',
    cookiePrivacy: 'Cookies / Privacy', cookiePrivacyHint: 'Change your cookie preferences',
    restore: 'Restore purchases', restoring: 'Restoring...', restoreOk: '{n} purchases restored', restoreNone: 'No purchases to restore', restoreError: 'Restore failed',
  },
  es: {
    title: 'Configuración', back: '← volver',
    appearance: 'Apariencia', darkMode: 'Modo oscuro',
    language: 'Idioma',
    notifications: 'Notificaciones',
    notifOn: 'Notificaciones activadas', notifOff: 'Activar notificaciones', notifDisable: 'Desactivar notificaciones',
    account: 'Cuenta', username: 'Nombre de usuario', edit: 'Editar', signOut: 'Cerrar sesión',
    about: 'Sobre Tradiko', builtBy: 'Construido por Nicolás Vidal',
    subscription: 'Suscripción', planLabel: 'Plan Pro · €3.99/mes', planActive: 'ACTIVO',
    cancelDoneMsg: 'Suscripción cancelada. Seguirás teniendo acceso Pro hasta el fin del período.',
    cancelConfirmMsg: '¿Estás seguro? Perderás el acceso Pro al finalizar el período actual.',
    cancelling: 'Cancelando...', confirmCancel: 'Sí, cancelar', goBack: 'Volver', cancelSub: 'Cancelar suscripción',
    deleteAccount: 'Eliminar cuenta', deleteConfirmMsg: '¿Seguro? Esta acción eliminará tu cuenta y todos tus datos permanentemente.',
    cancel: 'Cancelar', yesDelete: 'Sí, eliminar', deleting: 'Eliminando...',
    cancelError: 'Error al cancelar. Contacta con tradikonicolasvidal@gmail.com', connectionError: 'Error de conexión. Inténtalo de nuevo.',
    howToPlay: 'Cómo se juega',
    cookiePrivacy: 'Cookies / Privacidad', cookiePrivacyHint: 'Cambia tus preferencias de cookies',
    restore: 'Restaurar compras', restoring: 'Restaurando...', restoreOk: '{n} compras restauradas', restoreNone: 'No hay compras que restaurar', restoreError: 'Error al restaurar',
  },
  de: {
    title: 'Einstellungen', back: '← zurück',
    appearance: 'Aussehen', darkMode: 'Dunkelmodus',
    language: 'Sprache',
    notifications: 'Benachrichtigungen',
    notifOn: 'Benachrichtigungen aktiv', notifOff: 'Benachrichtigungen aktivieren', notifDisable: 'Benachrichtigungen deaktivieren',
    account: 'Konto', username: 'Benutzername', edit: 'Bearbeiten', signOut: 'Abmelden',
    about: 'Über Tradiko', builtBy: 'Erstellt von Nicolás Vidal',
    subscription: 'Abonnement', planLabel: 'Pro Plan · €3.99/Monat', planActive: 'AKTIV',
    cancelDoneMsg: 'Abonnement gekündigt. Du behältst den Pro-Zugang bis zum Ende des aktuellen Zeitraums.',
    cancelConfirmMsg: 'Bist du sicher? Du verlierst den Pro-Zugang am Ende des aktuellen Zeitraums.',
    cancelling: 'Wird gekündigt...', confirmCancel: 'Ja, kündigen', goBack: 'Zurück', cancelSub: 'Abonnement kündigen',
    deleteAccount: 'Konto löschen', deleteConfirmMsg: 'Bist du sicher? Diese Aktion löscht dein Konto und alle deine Daten dauerhaft.',
    cancel: 'Abbrechen', yesDelete: 'Ja, löschen', deleting: 'Wird gelöscht...',
    cancelError: 'Fehler beim Kündigen. Kontaktiere tradikonicolasvidal@gmail.com', connectionError: 'Verbindungsfehler. Bitte versuche es erneut.',
    howToPlay: 'So wird gespielt',
    cookiePrivacy: 'Cookies / Datenschutz', cookiePrivacyHint: 'Cookie-Einstellungen ändern',
    restore: 'Käufe wiederherstellen', restoring: 'Wird wiederhergestellt...', restoreOk: '{n} Käufe wiederhergestellt', restoreNone: 'Keine Käufe zum Wiederherstellen', restoreError: 'Wiederherstellung fehlgeschlagen',
  },
};

function Toggle({ on, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: on ? 'var(--green)' : 'var(--bd2)',
        cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%',
        background: 'var(--t1)', position: 'absolute', top: '3px',
        left: on ? '23px' : '3px', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' }}>
      {children}
    </div>
  );
}

function Row({ label, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: last ? 'none' : '1px solid var(--border-default)', gap: '12px' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </div>
  );
}

export default function Settings({ onBack, onShowTutorial, onNavigate }) {
  const { user, logout, updateUser, isPro, refreshPurchases, refreshUser } = useAuth();
  const { lang, setLang } = useLang();
  const s = STRINGS[lang] || STRINGS.en;

  const [notifEnabled, setNotifEnabled] = useState(
    () => {
      if (typeof window !== 'undefined' && window.__isIOSApp === true) {
        return true; // En iOS los permisos se gestionan desde Swift/Ajustes
      }
      return typeof Notification !== 'undefined' && Notification.permission === 'granted';
    }
  );
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState(null);

  async function handleCancelSubscription() {
    try {
      setCancelLoading(true);
      const token = localStorage.getItem('tradaria_token');
      const res = await fetch(`${SERVER}/pro/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setLeaveMessage(data.message || s.cancelDoneMsg);
        updateUser({ isPro: false });
        setCancelDone(true);
        setCancelConfirm(false);
      } else {
        setLeaveMessage(data.error || s.cancelError);
        setCancelConfirm(false);
        setCancelDone(true);
      }
    } catch (err) {
      setLeaveMessage(s.connectionError);
      setCancelConfirm(false);
      setCancelDone(true);
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      const token = localStorage.getItem('tradaria_token');
      const res = await fetch(`${SERVER}/auth/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        localStorage.clear();
        logout();
      }
    } catch (err) {
      console.error(err);
    }
    setDeleting(false);
  }

  async function handleRestore() {
    setRestoring(true);
    setRestoreMsg(null);
    try {
      const { productIDs, receiptData } = await restorePurchases();
      const token = localStorage.getItem('tradaria_token');
      let count = 0;
      for (const pid of productIDs) {
        const parts = pid.split('.');
        let itemId = null;
        if (parts[2] === 'pro') itemId = 'pro';
        else if (parts.length >= 4) itemId = `${parts[2]}_${parts[3]}`;
        if (!itemId) continue;
        try {
          await fetch(`${SERVER}/shop/iap-confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ itemId, receiptData }),
          });
          count++;
        } catch {}
      }
      await refreshPurchases();
      await refreshUser();
      setRestoreMsg(count > 0 ? s.restoreOk.replace('{n}', count) : s.restoreNone);
    } catch {
      setRestoreMsg(s.restoreError);
    } finally {
      setRestoring(false);
    }
  }

  async function enableNotifications() {
    if (window.__isIOSApp) {
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.requestPushPermission) {
        window.webkit.messageHandlers.requestPushPermission.postMessage('');
      }
      return;
    }
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotifEnabled(true);
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BEWPkbh1HeSsw08H0EsELp5TIPD2gcQ8Yfa1RsSW-9jER3uvoeVUTazcIqjlf4UNFKe7QeqQ8ZlVjGI72pinR0I'
      });
      const token = localStorage.getItem('tradaria_token');
      await fetch(`${SERVER}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...sub.toJSON(), lang })
      });
    }
  }

  async function disableNotifications() {
    if (window.__isIOSApp) {
      // iOS doesn't allow revoking permission from JS — open system settings
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.openSettings) {
        window.webkit.messageHandlers.openSettings.postMessage('');
      }
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const endpoint = sub?.endpoint;
      if (sub) await sub.unsubscribe();
      const token = localStorage.getItem('tradaria_token');
      await fetch(`${SERVER}/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ endpoint })
      });
      setNotifEnabled(false);
    } catch (err) {
    }
  }

  return (
    <div id="gtm-root" style={{ minHeight: '100dvh', background: 'var(--bg-base)', fontFamily: 'var(--font-body)' }}>
      <div style={{ paddingBottom: 60 }}>

        {showUsernameModal && (
          <UsernameModal onNavigate={onNavigate || onBack} onDone={(username) => {
            setShowUsernameModal(false);
            updateUser({ username });
          }} />
        )}

        <ScreenHeader title={s.title} onBack={onBack} />

        {/* Language */}
        <div style={{ padding: '0 16px' }}>
          <SectionTitle style={{ marginBottom: '10px' }}>{s.language}</SectionTitle>
        </div>
        <Card>
          <Row label="" last>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['en', 'es', 'de'].map(l => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: '6px 14px', borderRadius: '6px',
                  background: lang === l ? 'rgba(0,229,160,0.12)' : 'transparent',
                  border: `1px solid ${lang === l ? 'var(--green)' : 'var(--border-default)'}`,
                  color: lang === l ? 'var(--green)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer',
                }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </Row>
        </Card>

        {/* Notifications */}
        <div style={{ padding: '0 16px' }}>
          <SectionTitle style={{ marginBottom: '10px' }}>{s.notifications}</SectionTitle>
        </div>
        <Card>
          <div style={{ padding: '14px 16px' }}>
            {notifEnabled ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--green)' }}>
                  <Check size={13} strokeWidth={2.5} style={{ stroke: 'var(--green)', flexShrink: 0 }} />
                  {s.notifOn}
                </div>
                {!window.__isIOSApp && (
                  <button onClick={disableNotifications} style={{
                    width: '100%', padding: '11px',
                    background: 'transparent', border: '1px solid var(--border-default)',
                    borderRadius: '6px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  }}>
                    {s.notifDisable}
                  </button>
                )}
              </div>
            ) : (
              <button onClick={enableNotifications} style={{
                width: '100%', padding: '11px',
                background: 'rgba(0,229,160,0.08)', border: '1px solid var(--green)',
                borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              }}>
                {s.notifOff}
              </button>
            )}
          </div>
        </Card>

        {/* Pro subscription */}
        {isPro && !isIOSApp() && (
          <>
            <div style={{ padding: '0 16px' }}>
              <SectionTitle style={{ marginBottom: '10px' }}>{s.subscription}</SectionTitle>
            </div>
            <Card>
              <Row label={s.planLabel} last={!cancelConfirm && !cancelDone}>
                <span style={{ fontSize: '12px', color: 'var(--green)', background: 'rgba(0,229,160,0.1)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={12} strokeWidth={2} aria-hidden />
                  {s.planActive}
                </span>
              </Row>
              {cancelDone ? (
                <div style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {leaveMessage || s.cancelDoneMsg}
                </div>
              ) : cancelConfirm ? (
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-default)' }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                    {s.cancelConfirmMsg}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelLoading}
                      style={{
                        flex: 1, padding: '10px',
                        background: cancelLoading ? 'rgba(255,126,179,0.04)' : 'rgba(255,126,179,0.08)',
                        border: '1px solid rgba(255,126,179,0.4)',
                        borderRadius: '6px', color: 'var(--color-down)',
                        fontFamily: 'var(--font-body)', fontSize: '12px',
                        fontWeight: 700, cursor: cancelLoading ? 'default' : 'pointer',
                      }}
                    >
                      {cancelLoading ? s.cancelling : s.confirmCancel}
                    </button>
                    <button
                      onClick={() => setCancelConfirm(false)}
                      disabled={cancelLoading}
                      style={{
                        flex: 1, padding: '10px',
                        background: 'transparent', border: '1px solid var(--border-default)',
                        borderRadius: '6px', color: 'var(--text-muted)',
                        fontFamily: 'var(--font-body)', fontSize: '12px',
                        fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {s.goBack}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-default)' }}>
                  <button
                    onClick={() => setCancelConfirm(true)}
                    style={{
                      width: '100%', padding: '10px',
                      background: 'transparent', border: '1px solid var(--border-default)',
                      borderRadius: '6px', color: 'var(--text-muted)',
                      fontFamily: 'var(--font-body)', fontSize: '12px',
                      fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {s.cancelSub}
                  </button>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Account */}
        {user && (
          <>
            <div style={{ padding: '0 16px' }}>
              <SectionTitle style={{ marginBottom: '10px' }}>{s.account}</SectionTitle>
            </div>
            <Card>
              <Row label={s.username}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--green)' }}>
                    {user.username ? `@${user.username}` : '—'}
                  </span>
                  <button onClick={() => setShowUsernameModal(true)} style={{
                    padding: '4px 10px', background: 'transparent', border: '1px solid var(--border-default)',
                    borderRadius: '5px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
                    fontSize: '12px', cursor: 'pointer',
                  }}>
                    {s.edit}
                  </button>
                </div>
              </Row>
              <div style={{ padding: '12px 16px' }}>
                <button onClick={logout} style={{
                  width: '100%', padding: '11px',
                  background: 'rgba(255,126,179,0.06)', border: '1px solid rgba(255,126,179,0.3)',
                  borderRadius: '6px', color: 'var(--color-down)', fontFamily: 'var(--font-body)',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                }}>
                  {s.signOut}
                </button>
                <div style={{ marginTop: '12px' }}>
                  {!showDeleteConfirm ? (
                    <button onClick={handleDeleteAccount}
                      style={{ width: '100%', background: 'transparent', border: '1px solid #ff4444', borderRadius: 'var(--radius-md)', padding: '12px', color: '#ff4444', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                      {s.deleteAccount}
                    </button>
                  ) : (
                    <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid #ff4444', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#ff4444', marginBottom: '12px', fontWeight: 700 }}>
                        {s.deleteConfirmMsg}
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setShowDeleteConfirm(false)}
                          style={{ flex: 1, background: 'var(--bg-elevated)', border: '0.5px solid var(--border-default)', borderRadius: 'var(--radius-full)', padding: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
                          {s.cancel}
                        </button>
                        <button onClick={handleDeleteAccount} disabled={deleting}
                          style={{ flex: 1, background: '#ff4444', border: 'none', borderRadius: 'var(--radius-full)', padding: '10px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 800, cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}>
                          {deleting ? s.deleting : s.yesDelete}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </>
        )}

        {isIOSApp() && window.webkit?.messageHandlers?.iapRestore && (
          <>
            <div style={{ padding: '0 16px' }}>
              <SectionTitle style={{ marginBottom: '10px' }}>{s.restore}</SectionTitle>
            </div>
            <Card>
              <div style={{ padding: '12px 16px' }}>
                {restoreMsg && (
                  <div style={{
                    marginBottom: '10px', padding: '10px 14px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                    borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{restoreMsg}</span>
                    <button onClick={() => setRestoreMsg(null)} style={{
                      background: 'transparent', border: 'none', color: 'var(--text-hint)',
                      cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 4px',
                    }}>×</button>
                  </div>
                )}
                <button onClick={handleRestore} disabled={restoring} style={{
                  width: '100%', padding: '11px',
                  background: 'transparent', border: '1px solid var(--border-default)',
                  borderRadius: '6px', color: restoring ? 'var(--text-hint)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                  cursor: restoring ? 'default' : 'pointer',
                }}>
                  {restoring ? s.restoring : s.restore}
                </button>
              </div>
            </Card>
          </>
        )}

        {/* How to play */}
        <div style={{ padding: '0 16px' }}>
          <Card>
            <div style={{ padding: '12px 16px' }}>
              <button onClick={onShowTutorial} style={{
                width: '100%', padding: '11px',
                background: 'rgba(0,192,135,0.08)', border: '1px solid var(--green)',
                borderRadius: '6px', color: 'var(--green)', fontFamily: 'var(--font-body)',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              }}>
                {s.howToPlay}
              </button>
            </div>
          </Card>
        </div>

        {/* Cookies / Privacy */}
        <div style={{ padding: '0 16px' }}>
          <Card>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-hint)', marginBottom: '8px' }}>{s.cookiePrivacyHint}</div>
              <button
                onClick={() => {
                  localStorage.removeItem('tradaria_consent');
                  window.dispatchEvent(new CustomEvent('tradiko-consent-reset'));
                  window.location.reload();
                }}
                style={{
                  width: '100%', padding: '11px',
                  background: 'transparent', border: '1px solid var(--border-default)',
                  borderRadius: '6px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {s.cookiePrivacy}
              </button>
            </div>
          </Card>
        </div>

        {/* About */}
        <div style={{ padding: '0 16px' }}>
          <SectionTitle style={{ marginBottom: '10px' }}>{s.about}</SectionTitle>
          <Card>
            <Row label={s.builtBy}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-hint)' }}>© {new Date().getFullYear()}</span>
            </Row>
            <Row label="Charts by TradingView">
              <a href="https://www.tradingview.com" target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--green)', textDecoration: 'none' }}>
                ↗
              </a>
            </Row>
            <Row label="tradiko.dev" last>
              <a href="https://tradiko.dev" target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--green)', textDecoration: 'none' }}>
                ↗
              </a>
            </Row>
          </Card>
        </div>

      </div>
    </div>
  );
}
