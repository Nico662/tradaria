import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useBattlePass } from './BattlePassContext.jsx';
import { useAuth } from './AuthContext.jsx';
import { useLang } from './LangContext.jsx';
import { SEASON1_LEVELS } from './config/season1Config.js';
import RewardCard from './components/RewardCard.jsx';
import { Check } from 'lucide-react';
import { ScreenHeader, StatusText } from './components/ui';

// ── DEV MOCK ──────────────────────────────────────────────────────────────────
// Rellena la pantalla con datos de ejemplo cuando no hay season activa.
// Solo se activa en desarrollo (import.meta.env.DEV) y nunca en producción.
//
// Para DESACTIVAR: pon USE_MOCK_BP = false (o elimina este bloque antes de prod).
const USE_MOCK_BP = false;

const MOCK_SEASON = {
  name: 'Season 1 · Preview',
  endDate: new Date(Date.now() + 42 * 86400000).toISOString(), // 42 días desde ahora
};
const MOCK_USER_LEVEL    = 7;    // nivel actual del usuario de ejemplo
const MOCK_BP_POINTS     = 2240; // 7×300 base + 140 puntos en el nivel actual
const MOCK_CLAIMED_INIT  = [2, 4]; // niveles ya reclamados en el mock
const MOCK_IS_PRO        = true;   // true → columna Pro desbloqueada · false → pro_locked
const MOCK_ALL_PROGRESS = {
  // Niveles reclamados (claimed) → misiones completas al 100%
  2: { free: { current: 1,  target: 1  }, pro: { current: 5,  target: 5  } },
  4: { free: { current: 3,  target: 3  }, pro: { current: 30, target: 30 } },
  // Niveles pasados sin reclamar (completed, unclaimed)
  6: { free: null,                         pro: { current: 5,  target: 5  } },
  // Nivel activo
  [MOCK_USER_LEVEL]: { free: null, pro: { current: 3, target: 10 } },
  // Nivel bloqueado con progreso parcial (survival_rounds: 8 de 20)
  8: { free: { current: 8,  target: 20 }, pro: null },
  // Nivel bloqueado con progreso parcial (survival_rounds: 8 de 75)
  9: { free: null,                         pro: { current: 8,  target: 75 } },
  // Nivel bloqueado sin progreso
  12: { free: { current: 0,  target: 1  }, pro: { current: 0,  target: 50 } },
};
// ─────────────────────────────────────────────────────────────────────────────

const CARD_H = 80;
const ROW_PY = 5;

function BattlePassSkeleton({ t }) {
  const tp = t.traderPass;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        <div className="skeleton-bar" style={{ width: 36, height: 14, marginBottom: 20 }} />
        <div style={{ padding: '0 0 16px' }}>
          <div className="skeleton-bar" style={{ width: 150, height: 26, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div className="skeleton-bar" style={{ width: 80, height: 10 }} />
            <div className="skeleton-bar" style={{ width: 60, height: 10 }} />
          </div>
          <div className="skeleton-bar" style={{ width: '100%', height: 4, borderRadius: 2 }} />
        </div>
      </div>
      <div style={{ borderBottom: '0.5px solid var(--border-default)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="skeleton-bar" style={{ width: 30, height: 10 }} />
          </div>
          <div />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="skeleton-bar" style={{ width: 24, height: 10 }} />
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 44px 1fr',
              alignItems: 'stretch', padding: `${ROW_PY}px 16px`, gap: 6,
              borderBottom: '0.5px solid rgba(255,255,255,0.03)', position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: 1.5, background: 'rgba(255,255,255,0.08)', pointerEvents: 'none',
            }} />
            <div className="skeleton-bar" style={{ borderRadius: 12, height: CARD_H }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
              <div className="skeleton-bar" style={{ width: 26, height: 26, borderRadius: '50%' }} />
            </div>
            <div className="skeleton-bar" style={{ borderRadius: 12, height: CARD_H }} />
          </div>
        ))}
      </div>
    </div>
  );
}

const LevelRow = memo(function LevelRow({
  lvl, freeState, proState, isFreeClaiming, isProClaiming,
  isActive, isClaimed, isCompleted,
  freeMissionProgress, proMissionProgress,
  animateFree, animatePro,
  onClaim, t, onGoPricing,
}) {
  const spineColor = (isActive || isCompleted) ? 'var(--green)' : 'rgba(255,255,255,0.08)';

  const bubbleBg = isClaimed
    ? 'var(--green)'
    : isActive
      ? 'rgba(224,85,133,0.18)'
      : 'var(--bg-base)';

  const bubbleBorder = isClaimed
    ? 'var(--green)'
    : isActive
      ? '#e05585'
      : isCompleted
        ? 'rgba(0,192,135,0.5)'
        : 'rgba(255,255,255,0.12)';

  const bubbleTextColor = isClaimed
    ? '#000'
    : isActive
      ? '#e05585'
      : isCompleted
        ? 'rgba(0,192,135,0.65)'
        : 'rgba(255,255,255,0.22)';

  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: '1fr 44px 1fr',
        alignItems: 'stretch',
        padding: `${ROW_PY}px 16px`,
        gap: 6,
        borderBottom: '0.5px solid rgba(255,255,255,0.03)',
        background: isActive ? 'rgba(224,85,133,0.025)' : 'transparent',
        position: 'relative',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: '50%', transform: 'translateX(-50%)',
        width: 1.5, background: spineColor, zIndex: 0,
        pointerEvents: 'none',
        transition: 'background 0.3s ease',
      }} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <RewardCard
          reward={lvl.freeReward}
          mission={lvl.freeMission}
          state={freeState}
          track="free"
          isActive={isActive}
          missionProgress={freeMissionProgress}
          animate={animateFree}
          isClaiming={isFreeClaiming}
          onClaim={() => onClaim(lvl.level, 'free')}
          t={t}
        />
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: bubbleBg,
          border: `1.5px solid ${bubbleBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.3s ease, background 0.3s ease',
        }}>
          {isClaimed ? (
            <Check size={11} strokeWidth={2.5} style={{ stroke: '#000' }} />
          ) : (
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '9px',
              fontWeight: isActive ? 900 : 600,
              color: bubbleTextColor,
            }}>
              {lvl.level}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <RewardCard
          reward={lvl.proReward}
          mission={lvl.proMission}
          state={proState}
          track="pro"
          isActive={isActive}
          missionProgress={proMissionProgress}
          animate={animatePro}
          isClaiming={isProClaiming}
          onClaim={() => onClaim(lvl.level, 'pro')}
          t={t}
          onGoPricing={onGoPricing}
        />
      </div>
    </div>
  );
});

function getCardState(reward, mission, levelNum, track, userLevel, claimedRewards, isPro, missionProgress) {
  if (!reward && !mission) return 'empty';
  if (claimedRewards.includes(levelNum)) return 'claimed';
  if (track === 'pro' && !isPro) return 'pro_locked';
  if (userLevel < levelNum) return 'locked';
  // null missionProgress means no progress data yet — treat as pending, not done.
  if (mission) {
    if (!missionProgress || missionProgress.current < missionProgress.target) {
      return 'mission_pending';
    }
  }
  return 'claimable';
}

export default function BattlePass({ onBack, onGoPricing }) {
  const {
    season:               ctxSeason,
    userLevel:            ctxUserLevel,
    bpPoints:             ctxBpPoints,
    missionsForNextLevel: ctxMissionsForNextLevel,
    claimedFreeRewards:   ctxClaimedFreeRewards,
    claimedProRewards:    ctxClaimedProRewards,
    allMissionProgress:   ctxAllMissionProgress,
    cardStates:           ctxCardStates,
    isLoading,
    claimReward,
    refreshBattlePass,
  } = useBattlePass();
  const { isPro: ctxIsPro } = useAuth();
  const { t } = useLang();
  const tp = t.traderPass;

  // { level, track } | null — tracks which specific card is in-flight / just claimed
  const [claimingCard,  setClaimingCard]  = useState(null);
  const [claimError,    setClaimError]    = useState(null);
  const [mockClaimed,   setMockClaimed]   = useState(MOCK_CLAIMED_INIT);
  const [justClaimed,   setJustClaimed]   = useState(null); // { level, track } | null
  const scrollRef  = useRef(null);
  const didScroll  = useRef(false);

  // Scroll to top on entry (window may have restored a previous position).
  // Silently revalidate stale data in background without showing skeleton.
  useEffect(() => {
    window.scrollTo(0, 0);
    refreshBattlePass(); // no force — stale-while-revalidate; skips if data is fresh
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Decide si el mock está activo ───────────────────────────────────────────
  const mockActive = USE_MOCK_BP && import.meta.env.DEV && !ctxSeason;

  // ── Fuente de datos: real o mock ────────────────────────────────────────────
  const season               = mockActive ? MOCK_SEASON      : ctxSeason;
  const userLevel            = mockActive ? MOCK_USER_LEVEL   : ctxUserLevel;
  const bpPoints             = mockActive ? MOCK_BP_POINTS    : ctxBpPoints;   // kept for mock display
  const missionsForNextLevel = mockActive
    ? { current: MOCK_ALL_PROGRESS[MOCK_USER_LEVEL]?.pro?.current ?? 0, total: MOCK_ALL_PROGRESS[MOCK_USER_LEVEL]?.pro?.target ?? 1 }
    : ctxMissionsForNextLevel;
  const claimedFreeRewards   = mockActive ? mockClaimed        : ctxClaimedFreeRewards;
  const claimedProRewards    = mockActive ? mockClaimed        : ctxClaimedProRewards;
  const isPro                = mockActive ? MOCK_IS_PRO        : ctxIsPro;
  const allMissionProgress   = mockActive ? MOCK_ALL_PROGRESS  : ctxAllMissionProgress;
  // Server-computed card states. null until first /current-season response; getCardState is the fallback.
  const cardStates           = mockActive ? null               : ctxCardStates;

  useEffect(() => {
    if (!scrollRef.current || didScroll.current) return;
    if (userLevel === 0 && claimedFreeRewards.length === 0 && claimedProRewards.length === 0) return;
    didScroll.current = true;
    const targetLevel = Math.min(userLevel + 1, 30);
    const rowH = CARD_H + ROW_PY * 2;
    scrollRef.current.scrollTop = Math.max(0, (targetLevel - 2) * rowH - 20);
  }, [userLevel, claimedFreeRewards, claimedProRewards]);

  const CLAIM_ERROR_MESSAGES = {
    MISSION_NOT_COMPLETED: tp.errorMissionNotCompleted ?? 'Complete the mission first.',
    ALREADY_CLAIMED:       tp.errorAlreadyClaimed      ?? 'Already claimed.',
    PRO_REQUIRED:          tp.errorProRequired         ?? 'Trader Pass Pro required.',
    LEVEL_NOT_REACHED:     tp.errorLevelNotReached     ?? 'Level not reached yet.',
    NO_ACTIVE_SEASON:      tp.errorNoSeason            ?? 'No active season.',
    NETWORK_ERROR:         tp.errorNetwork             ?? 'Connection error. Try again.',
  };

  // Stable claim dispatcher — never changes reference, so LevelRow memo stays effective.
  const handleClaimRef = useRef(null);
  const stableClaim = useCallback((levelNum, track) => {
    handleClaimRef.current?.(levelNum, track);
  }, []);

  async function handleClaim(levelNum, track) {
    if (claimingCard !== null) return;
    setClaimingCard({ level: levelNum, track });
    setClaimError(null);

    if (mockActive) {
      await new Promise(r => setTimeout(r, 450));
      setMockClaimed(prev => [...prev, levelNum]);
      setJustClaimed({ level: levelNum, track });
      setTimeout(() => setJustClaimed(null), 650);
      setClaimingCard(null);
      return;
    }

    const result = await claimReward(levelNum, track);
    setClaimingCard(null);
    if (!result.ok) {
      const msg = CLAIM_ERROR_MESSAGES[result.error] ?? t.common.error;
      setClaimError(msg);
      setTimeout(() => setClaimError(null), 3000);
    } else {
      setJustClaimed({ level: levelNum, track });
      setTimeout(() => setJustClaimed(null), 650);
    }
  }
  // Keep ref current every render so stableClaim always calls the latest closure.
  handleClaimRef.current = handleClaim;

  let daysLeft = null;
  if (season?.endDate) {
    const ms = new Date(season.endDate) - Date.now();
    daysLeft = Math.max(0, Math.ceil(ms / 86400000));
  }

  const progressPct = userLevel >= 30
    ? 100
    : missionsForNextLevel.total > 0
      ? Math.min(100, (missionsForNextLevel.current / missionsForNextLevel.total) * 100)
      : 0;

  const proRewardCount = SEASON1_LEVELS.filter(lvl => lvl.proReward).length;

  if (isLoading && !mockActive) {
    return <BattlePassSkeleton t={t} />;
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Header ───────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
        <ScreenHeader title={t.home.traderPass} onBack={onBack} />

        {/* Season name + days remaining */}
        <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {season && (
            <StatusText color="var(--green)">{season.name}</StatusText>
          )}
          {daysLeft !== null && (
            <StatusText color="var(--pink)">
              {tp.daysLeft.replace('{n}', daysLeft)}
            </StatusText>
          )}
        </div>

        {/* DEV MOCK chip */}
        {mockActive && (
          <div style={{
            margin: '0 16px 10px',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(196,154,42,0.1)', border: '1px solid rgba(196,154,42,0.3)',
            borderRadius: '4px', padding: '2px 8px',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-neutral)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800, color: 'var(--color-neutral)', letterSpacing: '0.08em' }}>
              DEV MOCK · USE_MOCK_BP = true
            </span>
          </div>
        )}

        {/* Level + flat progress bar */}
        {season ? (
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{
              fontFamily: 'var(--font-body)', fontWeight: 900,
              fontSize: '22px', color: 'var(--text-primary)',
              lineHeight: 1, marginBottom: '8px',
            }}>
              {tp.levelOf.replace('{n}', userLevel)}
            </div>
            <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'var(--green)',
                borderRadius: '2px',
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-hint)', fontWeight: 600 }}>
              {userLevel >= 30
                ? (tp.max ?? 'MAX')
                : missionsForNextLevel.total === 0
                  ? tp.levelOf.replace('{n}', userLevel + 1)
                  : (tp.missionsToNext ?? '{done}/{total} → lv. {n}')
                      .replace('{done}',  String(missionsForNextLevel.current))
                      .replace('{total}', String(missionsForNextLevel.total))
                      .replace('{n}',     String(userLevel + 1))
              }
            </div>
          </div>
        ) : (
          <div style={{ padding: '0 16px 14px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>
            {tp.noSeason}
          </div>
        )}

        {/* Claim error */}
        {claimError && (
          <div style={{
            margin: '0 16px 12px', padding: '8px 32px 8px 12px',
            background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)',
            borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '12px', color: '#e05555',
            position: 'relative',
          }}>
            {claimError}
            <button
              onClick={() => setClaimError(null)}
              style={{
                position: 'absolute', top: '50%', right: 10,
                transform: 'translateY(-50%)',
                background: 'none', border: 'none', padding: 0,
                color: '#e05555', cursor: 'pointer', fontSize: '16px', lineHeight: 1,
                opacity: 0.7,
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* ── Scrollable grid ────────────────────── */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 40 }}
      >
        {/* Sticky column labels */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg-base)',
          borderBottom: '0.5px solid var(--border-default)',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 44px 1fr',
            padding: '8px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase', color: '#00c087',
              }}>
                {tp.freeTrack}
              </span>
            </div>
            <div />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase', color: '#e05585',
              }}>
                {tp.proTrack}
              </span>
            </div>
          </div>
        </div>

        {/* Pro rewards teaser — only for Free users with an active season */}
        {!isPro && season && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 16px',
            borderBottom: '0.5px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '11px',
              color: 'var(--text-muted)', fontWeight: 500,
            }}>
              {(tp.proRewardsCount ?? '{n} Pro rewards').replace('{n}', proRewardCount)}
            </span>
            <button
              onClick={onGoPricing}
              style={{
                fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 800,
                color: '#e05585', background: 'none',
                border: '0.5px solid rgba(224,85,133,0.45)',
                borderRadius: '6px', padding: '3px 8px',
                cursor: 'pointer', letterSpacing: '0.04em',
                flexShrink: 0,
              }}
            >
              {tp.goPro}
            </button>
          </div>
        )}

        {/* Level rows — memoized to avoid re-rendering all 30 when a single state changes */}
        {SEASON1_LEVELS.map((lvl) => {
          const freeState = claimedFreeRewards.includes(lvl.level)
            ? 'claimed'
            : (cardStates?.[lvl.level]?.free
              ?? getCardState(lvl.freeReward, lvl.freeMission, lvl.level, 'free', userLevel, claimedFreeRewards, isPro, allMissionProgress?.[lvl.level]?.free ?? null));
          const proState = claimedProRewards.includes(lvl.level)
            ? 'claimed'
            : (cardStates?.[lvl.level]?.pro
              ?? getCardState(lvl.proReward, lvl.proMission, lvl.level, 'pro', userLevel, claimedProRewards, isPro, allMissionProgress?.[lvl.level]?.pro ?? null));
          const isActive      = lvl.level === userLevel;
          const isCompleted   = lvl.level < userLevel;
          const isClaimed     = claimedFreeRewards.includes(lvl.level) || claimedProRewards.includes(lvl.level);
          const isFreeClaiming = claimingCard?.level === lvl.level && claimingCard?.track === 'free';
          const isProClaiming  = claimingCard?.level === lvl.level && claimingCard?.track === 'pro';
          return (
            <LevelRow
              key={lvl.level}
              lvl={lvl}
              freeState={freeState}
              proState={proState}
              isActive={isActive}
              isCompleted={isCompleted}
              isClaimed={isClaimed}
              isFreeClaiming={isFreeClaiming}
              isProClaiming={isProClaiming}
              freeMissionProgress={allMissionProgress?.[lvl.level]?.free ?? null}
              proMissionProgress={allMissionProgress?.[lvl.level]?.pro ?? null}
              animateFree={justClaimed?.level === lvl.level && justClaimed?.track === 'free'}
              animatePro={justClaimed?.level === lvl.level && justClaimed?.track === 'pro'}
              onClaim={stableClaim}
              t={t}
              onGoPricing={onGoPricing}
            />
          );
        })}
      </div>
    </div>
  );
}
