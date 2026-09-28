import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SERVER } from './config.js';
import { useAuth } from './AuthContext.jsx';

const BattlePassContext = createContext(null);

export function BattlePassProvider({ children }) {
  const { user, isPro, mergeUser } = useAuth();

  const [season,               setSeason]               = useState(null);
  const [userLevel,            setUserLevel]            = useState(0);
  const [bpPoints,             setBpPoints]             = useState(0);
  const [missionsForNextLevel, setMissionsForNextLevel] = useState({ current: 0, total: 0 });
  const [claimedFreeRewards,   setClaimedFreeRewards]   = useState([]);
  const [claimedProRewards,    setClaimedProRewards]    = useState([]);
  const [completedMissions,    setCompletedMissions]    = useState([]);
  const [allMissionProgress,   setAllMissionProgress]   = useState(null);
  const [cardStates,           setCardStates]           = useState(null);
  const [isLoading,            setIsLoading]            = useState(false);

  const lastFetchRef = useRef(0);
  const inFlightRef  = useRef(false);

  const fetchBattlePass = useCallback(async ({ force = false } = {}) => {
    const token = localStorage.getItem('tradaria_token');
    if (!token) return;

    const now = Date.now();
    if (!force && inFlightRef.current) return;
    if (!force && now - lastFetchRef.current < 1500) return;

    inFlightRef.current = true;
    lastFetchRef.current = now;
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
      setMissionsForNextLevel(data.user.missionsForNextLevel ?? { current: 0, total: 0 });
      setClaimedFreeRewards(data.user.claimedFreeRewards ?? []);
      setClaimedProRewards(data.user.claimedProRewards   ?? []);
      setCompletedMissions(data.user.completedMissions);
      setAllMissionProgress(data.user.allMissionProgress ?? null);
      setCardStates(data.user.cardStates ?? null);
    } catch {}
    finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  // Fetch once when the user session is established; clear state on logout.
  useEffect(() => {
    if (user) {
      fetchBattlePass({ force: true });
    } else {
      setSeason(null);
      setUserLevel(0);
      setBpPoints(0);
      setMissionsForNextLevel({ current: 0, total: 0 });
      setClaimedFreeRewards([]);
      setClaimedProRewards([]);
      setCompletedMissions([]);
      setAllMissionProgress(null);
      setCardStates(null);
    }
  }, [user, fetchBattlePass]);

  // Refresh on tab focus / visibility change
  useEffect(() => {
    function onFocus() { fetchBattlePass(); }
    function onVisible() { if (document.visibilityState === 'visible') fetchBattlePass(); }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchBattlePass]);

  // Claim the reward for a given BP level and track.
  // Returns { ok: true, rewards } on success, or { ok: false, error } on failure.
  async function claimReward(levelNum, track) {
    const token = localStorage.getItem('tradaria_token');
    if (!token) return { ok: false, error: 'NOT_AUTHENTICATED' };

    const snapshotFree = [...claimedFreeRewards];
    const snapshotPro  = [...claimedProRewards];

    // Optimistic update
    if (track !== 'pro')  setClaimedFreeRewards(prev => [...prev, levelNum]);
    if (track !== 'free' && isPro) setClaimedProRewards(prev => [...prev, levelNum]);

    try {
      const res = await fetch(`${SERVER}/battle-pass/claim/${levelNum}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ track }),
      });
      const data = await res.json();
      if (!res.ok) {
        setClaimedFreeRewards(snapshotFree);
        setClaimedProRewards(snapshotPro);
        return { ok: false, error: data.error };
      }

      // Merge full user state returned by server into AuthContext
      if (data.user) {
        mergeUser?.({
          badges:          data.user.badges,
          purchases:       data.user.purchases,
          activeCosmetics: data.user.activeCosmetics,
          battlePassItems: data.user.battlePassItems,
          battlePassMechanics: data.user.battlePassMechanics,
        });
        // Sync BP state from server response
        if (data.user.battlePass) {
          setClaimedFreeRewards(data.user.battlePass.claimedFreeRewards ?? snapshotFree);
          setClaimedProRewards(data.user.battlePass.claimedProRewards   ?? snapshotPro);
        }
      }

      // Force-refresh to get updated cardStates and mission progress
      fetchBattlePass({ force: true });

      return { ok: true, rewards: data.rewards };
    } catch {
      setClaimedFreeRewards(snapshotFree);
      setClaimedProRewards(snapshotPro);
      return { ok: false, error: 'NETWORK_ERROR' };
    }
  }

  return (
    <BattlePassContext.Provider value={{
      season,
      userLevel,
      bpPoints,
      missionsForNextLevel,
      claimedFreeRewards,
      claimedProRewards,
      completedMissions,
      allMissionProgress,
      cardStates,
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
