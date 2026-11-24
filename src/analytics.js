const GA_ID = 'G-ZG1DQSVHRV';
const CONSENT_KEY = 'tradaria_consent';

export function getConsent() {
  try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); } catch { return null; }
}

export function saveConsent(analytics) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ analytics, ts: Date.now(), v: 1 }));
}

export function loadAnalytics() {
  const c = getConsent();
  if (!c || !c.analytics) return;
  if (window.__analyticsLoaded) return;
  window.__analyticsLoaded = true;

  // Vercel Analytics
  const va = document.createElement('script');
  va.defer = true;
  va.src = '/_vercel/insights/script.js';
  document.head.appendChild(va);

  // Google Analytics
  const ga = document.createElement('script');
  ga.async = true;
  ga.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(ga);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
}

export function revokeAnalytics() {
  window[`ga-disable-${GA_ID}`] = true;
  document.cookie.split(';').forEach(c => {
    const name = c.trim().split('=')[0];
    if (name.startsWith('_ga')) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${location.hostname}`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${location.hostname}`;
    }
  });
}
