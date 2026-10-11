import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SERVER } from './config.js';
import { useAuth } from './AuthContext.jsx';

const BattlePassContext = createContext(null);

const STALE_MS = 60_000;

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
  const [hasClaimableRewards,  setHasClaimableRewards]  = useState(false);
  const [isLoading,            setIsLoading]            = useState(false);

  const inFlightRef = useRef(false);
  // In-memory cache cleared on logout / account-switch. Never written to localStorage.
  const cachedRef   = useRef(null); // { data, fetchedAt } | null

  const fetchBattlePass = useCallback(async ({ force = false } = {}) => {
    const token = localStorage.getItem('tradaria_token');
    if (!token) return;

    const now   = Date.now();
    const cache = cachedRef.current;

    // One in-flight request at a time — deduplicate even when force=true.
    if (inFlightRef.current) return;

    // If we have fresh data and this is a background poll, skip entirely.
    if (!force && cache && now - cache.fetchedAt < STALE_MS) return;

    // Show the skeleton only on the very first load (no cached data yet).
    const hasCached = !!cache;

    inFlightRef.current = true;
    if (!hasCached) setIsLoading(true);

    try {
      const res = await fetch(`${SERVER}/battle-pass/current-season`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();

      cachedRef.current = { data, fetchedAt: Date.now() };

      if (!data.season) { setSeason(null); return; }
      setSeason(data.season);
      setUserLevel(data.user.level);
      setBpPoints(data.user.bpPoints);
      setMissionsForNextLevel(data.user.missionsForNextLevel ?? { current: 0, total: 0 });
      setClaimedFreeRewards(data.user.claimedFreeRewards ?? []);
      setClaimedProRewards(data.user.claimedProRewards   ?? []);
      setCompletedMissions(data.user.completedMissions);
      setAllMissionProgress(data.user.allMissionProgress ?? null);
      setCardStates(data.user.cardStates ?? null);
      setHasClaimableRewards(data.user.hasClaimableRewards ?? false);
    } catch {}
    finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Preload on login; wipe cache and state on logout / account-switch so no
  // data from a previous account leaks into the next session.
  useEffect(() => {
    if (user) {
      fetchBattlePass({ force: true });
    } else {
      cachedRef.current = null;
      setSeason(null);
      setUserLevel(0);
      setBpPoints(0);
      setMissionsForNextLevel({ current: 0, total: 0 });
      setClaimedFreeRewards([]);
      setClaimedProRewards([]);
      setCompletedMissions([]);
      setAllMissionProgress(null);
      setCardStates(null);
      setHasClaimableRewards(false);
    }
  }, [user, fetchBattlePass]);

  // Revalidate on tab focus / visibility change (stale check inside fetchBattlePass).
  useEffect(() => {
    function onFocus()   { fetchBattlePass(); }
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

    // Optimistic update — server is still source of truth (reverted on error).
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

      if (data.user) {
        mergeUser?.({
          badges:              data.user.badges,
          purchases:           data.user.purchases,
          activeCosmetics:     data.user.activeCosmetics,
          battlePassItems:     data.user.battlePassItems,
          battlePassMechanics: data.user.battlePassMechanics,
        });
        if (data.user.battlePass) {
          setClaimedFreeRewards(data.user.battlePass.claimedFreeRewards ?? snapshotFree);
          setClaimedProRewards(data.user.battlePass.claimedProRewards   ?? snapshotPro);
        }
      }

      // Invalidate cache so the next fetchBattlePass always re-fetches,
      // then silently refresh cardStates + mission progress in the background.
      // hasCached will be true, so no loading indicator is shown.
      if (cachedRef.current) cachedRef.current = { ...cachedRef.current, fetchedAt: 0 };
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
      hasClaimableRewards,
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
