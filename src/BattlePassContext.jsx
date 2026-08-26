import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SERVER } from './config.js';
import { useAuth } from './AuthContext.jsx';

// BP level (1–30) is the Battle Pass seasonal level.
// It is completely separate from the account tier ("Trader", "Expert", etc.)
// that lives in levels.js and is derived from total XP.

const BattlePassContext = createContext(null);

export function BattlePassProvider({ children }) {
  const { user } = useAuth();

  const [season,            setSeason]            = useState(null);
  const [userLevel,         setUserLevel]         = useState(0);
  const [bpPoints,          setBpPoints]          = useState(0);
  const [pointsToNextLevel, setPointsToNextLevel] = useState(0);
  const [claimedRewards,    setClaimedRewards]    = useState([]);
  const [completedMissions, setCompletedMissions] = useState([]);
  const [isLoading,         setIsLoading]         = useState(false);

  const fetchBattlePass = useCallback(async () => {
    const token = localStorage.getItem('tradaria_token');
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${SERVER}/battle-pass/current-season`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.season) {
        setSeason(null);
        return;
      }
      setSeason(data.season);
      setUserLevel(data.user.level);
      setBpPoints(data.user.bpPoints);
      setPointsToNextLevel(data.user.pointsToNextLevel);
      setClaimedRewards(data.user.claimedRewards);
      setCompletedMissions(data.user.completedMissions);
    } catch {}
    finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch once when the user session is established; clear state on logout.
  useEffect(() => {
    if (user) {
      fetchBattlePass();
    } else {
      setSeason(null);
      setUserLevel(0);
      setBpPoints(0);
      setPointsToNextLevel(0);
      setClaimedRewards([]);
      setCompletedMissions([]);
    }
  }, [user, fetchBattlePass]);

  // Claim the reward(s) for a given BP level.
  // Applies an optimistic update that is reverted if the server returns 403.
  // Returns { ok: true, rewards } on success, or { ok: false, error } on failure.
  async function claimReward(levelNum) {
    const token = localStorage.getItem('tradaria_token');
    if (!token) return { ok: false, error: 'NOT_AUTHENTICATED' };

    const snapshot = [...claimedRewards];
    setClaimedRewards(prev => [...prev, levelNum]);

    try {
      const res = await fetch(`${SERVER}/battle-pass/claim/${levelNum}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setClaimedRewards(snapshot);
        return { ok: false, error: data.error };
      }
      return { ok: true, rewards: data.rewards };
    } catch {
      setClaimedRewards(snapshot);
      return { ok: false, error: 'NETWORK_ERROR' };
    }
  }

  return (
    <BattlePassContext.Provider value={{
      // Season metadata (null when no season is active)
      season,
      // BP level 1–30 (NOT the account tier — see levels.js for that)
      userLevel,
      bpPoints,
      pointsToNextLevel,
      claimedRewards,
      completedMissions,
      isLoading,
      claimReward,
      refreshBattlePass: fetchBattlePass,
    }}>
      {children}
    </BattlePassContext.Provider>
  );
}

export function useBattlePass() {
  return useContext(BattlePassContext);
}
