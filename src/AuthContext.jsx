import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();
const SERVER = 'https://tradara-production.up.railway.app';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [activeCosmetics, setActiveCosmetics] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tradara_cosmetics') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('tradara_token', token);
      window.history.replaceState({}, '', '/');
    }
    const saved = localStorage.getItem('tradara_token');
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
    localStorage.setItem('tradara_cosmetics', JSON.stringify(updated));
  }

  function unequipCosmetic(type) {
    const updated = { ...activeCosmetics };
    delete updated[type];
    setActiveCosmetics(updated);
    localStorage.setItem('tradara_cosmetics', JSON.stringify(updated));
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

        // Sincronizar XP
        const localXP = parseInt(localStorage.getItem('tradara_xp') || '0');
        if (data.xp > localXP) {
          localStorage.setItem('tradara_xp', String(data.xp));
        }

        // Sincronizar badges
        const localBadges = JSON.parse(localStorage.getItem('tradara_badges') || '[]');
        const merged = [...new Set([...data.badges, ...localBadges])];
        localStorage.setItem('tradara_badges', JSON.stringify(merged));

        // Sincronizar streak
        const serverStreak     = data.dailyStreak || 0;
        const serverLastPlayed = data.lastPlayed || null;
        const localStreak      = parseInt(localStorage.getItem('tradara_daily_streak') || '0');
        const bestStreak       = Math.max(serverStreak, localStreak);
        localStorage.setItem('tradara_daily_streak', String(bestStreak));

        // Normalizar y unificar fechas
        const localLast1 = normalizeDateStr(localStorage.getItem('tradara_daily_last'));
        const localLast2 = normalizeDateStr(localStorage.getItem('tradara_last_played'));
        const bestLast   = normalizeDateStr(serverLastPlayed) || localLast1 || localLast2 || null;
        if (bestLast) {
          localStorage.setItem('tradara_daily_last', bestLast);
          localStorage.setItem('tradara_last_played', bestLast);
          const todayISO = new Date().toISOString().split('T')[0];
          if (bestLast === todayISO) {
            localStorage.setItem('tradara_daily_played', todayISO);
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
        localStorage.removeItem('tradara_token');
      }
    } catch (e) {}
    setLoading(false);
  }

  async function syncProgress(xp, badges) {
    const token = localStorage.getItem('tradara_token');
    if (!token) return;
    try {
      const dailyStreak = parseInt(localStorage.getItem('tradara_daily_streak') || '0');
      const lastPlayed  = localStorage.getItem('tradara_daily_last') || null;
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

  function logout() {
    localStorage.removeItem('tradara_token');
    setUser(null);
    setPurchases([]);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, syncProgress, purchases, activeCosmetics, equipCosmetic, unequipCosmetic }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}