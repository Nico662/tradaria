import { createContext, useContext, useState, useEffect } from 'react';
import { SERVER } from './config.js';
import { getLevel, getXP } from './levels.js';
import LevelUpOverlay from './LevelUpOverlay.jsx';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [activeCosmetics, setActiveCosmetics] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tradaria_cosmetics') || '{}'); } catch { return {}; }
  });
  const [levelUpData, setLevelUpData] = useState(null);

  function checkLevelUp(prevXP, newXP) {
    const prev = getLevel(prevXP);
    const next = getLevel(newXP);
    if (next.name !== prev.name) {
      setLevelUpData({ newLevel: next, prevLevel: prev });
      setTimeout(() => setLevelUpData(null), 3500);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthCode = params.get('code');
    if (oauthCode) {
      window.history.replaceState({}, '', '/');
      fetch(`${SERVER}/auth/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: oauthCode }),
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(({ token }) => {
          localStorage.setItem('tradaria_token', token);
          fetchUser(token);
          fetchPurchases(token);
        })
        .catch(() => setLoading(false));
      return;
    }
    const saved = localStorage.getItem('tradaria_token');
    if (saved) {
      fetchUser(saved);
      fetchPurchases(saved);
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchPurchases(token) {
    try {
      const res = await fetch(`${SERVER}/shop/purchases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPurchases(data.purchases || []);
      }
    } catch (e) {}
  }

  function equipCosmetic(type, id) {
    const updated = { ...activeCosmetics, [type]: id };
    setActiveCosmetics(updated);
    localStorage.setItem('tradaria_cosmetics', JSON.stringify(updated));
    const token = localStorage.getItem('tradaria_token');
    if (token) {
      fetch(`${SERVER}/auth/cosmetics`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeCosmetics: updated }),
      }).catch(() => {});
    }
  }

  function unequipCosmetic(type) {
    const updated = { ...activeCosmetics };
    delete updated[type];
    setActiveCosmetics(updated);
    localStorage.setItem('tradaria_cosmetics', JSON.stringify(updated));
    const token = localStorage.getItem('tradaria_token');
    if (token) {
      fetch(`${SERVER}/auth/cosmetics`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeCosmetics: updated }),
      }).catch(() => {});
    }
  }

  function normalizeDateStr(d) {
    if (!d) return null;
    const parsed = new Date(d);
    if (!isNaN(parsed)) return parsed.toISOString().split('T')[0];
    return d;
  }

  async function fetchUser(token) {
    try {
      const res = await fetch(`${SERVER}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);

        // Asociar suscripción push con el userId cuando el usuario se carga
        if (data.id && 'serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg =>
            reg.pushManager.getSubscription().then(sub => {
              if (sub) {
                fetch(`${SERVER}/push/subscribe`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...sub.toJSON(), userId: data.id }),
                }).catch(() => {});
              }
            })
          ).catch(() => {});
        }

        // Sincronizar cosméticos desde el servidor
        if (data.activeCosmetics && Object.keys(data.activeCosmetics).length > 0) {
          setActiveCosmetics(data.activeCosmetics);
          localStorage.setItem('tradaria_cosmetics', JSON.stringify(data.activeCosmetics));
        }

        // Sincronizar XP
        const localXP = parseInt(localStorage.getItem('tradaria_xp') || '0');
        if (data.xp > localXP) {
          localStorage.setItem('tradaria_xp', String(data.xp));
        }

        // Sincronizar badges
        const localBadges = JSON.parse(localStorage.getItem('tradaria_badges') || '[]');
        const merged = [...new Set([...data.badges, ...localBadges])];
        localStorage.setItem('tradaria_badges', JSON.stringify(merged));

        // Sincronizar streak
        const serverStreak     = data.dailyStreak || 0;
        const serverLastPlayed = data.lastPlayed || null;
        const localStreak      = parseInt(localStorage.getItem('tradaria_daily_streak') || '0');
        const bestStreak       = Math.max(serverStreak, localStreak);
        localStorage.setItem('tradaria_daily_streak', String(bestStreak));

        // Normalizar y unificar fechas
        const localLast1 = normalizeDateStr(localStorage.getItem('tradaria_daily_last'));
        const localLast2 = normalizeDateStr(localStorage.getItem('tradaria_last_played'));
        const bestLast   = normalizeDateStr(serverLastPlayed) || localLast1 || localLast2 || null;
        if (bestLast) {
          localStorage.setItem('tradaria_daily_last', bestLast);
          localStorage.setItem('tradaria_last_played', bestLast);
          const todayISO = new Date().toISOString().split('T')[0];
          if (bestLast === todayISO) {
            localStorage.setItem('tradaria_daily_played', todayISO);
          }
        }

        // Sincronizar con servidor si hay diferencias
        const needsSync = merged.length > data.badges.length || bestStreak > serverStreak;
        if (needsSync) {
          await fetch(`${SERVER}/auth/sync`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              xp:          Math.max(data.xp, localXP),
              badges:      merged,
              dailyStreak: bestStreak,
              lastPlayed:  bestLast,
            }),
          });
        }
      } else {
        localStorage.removeItem('tradaria_token');
      }
    } catch (e) {}
    setLoading(false);
  }

  async function syncProgress(xp, badges) {
    const token = localStorage.getItem('tradaria_token');
    if (!token) return;
    try {
      const dailyStreak = parseInt(localStorage.getItem('tradaria_daily_streak') || '0');
      const lastPlayed  = localStorage.getItem('tradaria_daily_last') || null;
      await fetch(`${SERVER}/auth/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ xp, badges, dailyStreak, lastPlayed }),
      });
    } catch (e) {}
  }

  function login() {
    window.location.href = `${SERVER}/auth/google`;
  }

  useEffect(() => {
    window.__loginWithApple = (identityToken, givenName, familyName) => {
      console.log('__loginWithApple called, token length:', identityToken?.length);
      console.log('givenName:', givenName, 'familyName:', familyName);
      loginWithApple(identityToken, { givenName, familyName });
    };
    return () => { delete window.__loginWithApple; };
  }, []);

  function loginWithApple(identityToken, fullName) {
    console.log('loginWithApple called, posting to /auth/apple');
    return fetch(`${SERVER}/auth/apple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityToken, fullName }),
    })
      .then(r => {
        console.log('auth/apple response status:', r.status);
        return r.json();
      })
      .then(({ token }) => {
        console.log('token received:', token ? 'yes' : 'no');
        if (!token) throw new Error('No token');
        localStorage.setItem('tradaria_token', token);
        fetchUser(token);
        fetchPurchases(token);
      })
      .catch(err => {
        console.error('loginWithApple error:', err);
      });
  }

  function logout() {
    const token = localStorage.getItem('tradaria_token');
    if (token) {
      fetch(`${SERVER}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('tradaria_token');
    localStorage.removeItem('tradaria_cosmetics');
    setUser(null);
    setPurchases([]);
    setActiveCosmetics({});
  }

  function updateUser(updates) {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  }

  const isPro = user?.isPro || false;

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithApple, logout, syncProgress, purchases, activeCosmetics, equipCosmetic, unequipCosmetic, updateUser, checkLevelUp, isPro }}>
      {children}
      {levelUpData && <LevelUpOverlay {...levelUpData} onClose={() => setLevelUpData(null)} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function isIOSApp() {
  if (typeof window === 'undefined') return false;
  if (window.__isIOSApp === true) return true;
  return document.cookie.split(';').some(c => c.trim() === 'app-platform=iOS App Store');
}