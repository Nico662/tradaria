import { useState, useRef, useEffect } from 'react';
import { useBattlePass } from './BattlePassContext.jsx';
import { useAuth } from './AuthContext.jsx';
import { useLang } from './LangContext.jsx';
import { SEASON1_LEVELS } from './config/season1Config.js';
import RewardCard from './components/RewardCard.jsx';

// ── DEV MOCK ──────────────────────────────────────────────────────────────────
// Rellena la pantalla con datos de ejemplo cuando no hay season activa.
// Solo se activa en desarrollo (import.meta.env.DEV) y nunca en producción.
//
// Para DESACTIVAR: pon USE_MOCK_BP = false (o elimina este bloque antes de prod).
const USE_MOCK_BP = true;

const MOCK_SEASON = {
  name: 'Season 1 · Preview',
  endDate: new Date(Date.now() + 42 * 86400000).toISOString(), // 42 días desde ahora
};
const MOCK_USER_LEVEL    = 7;    // nivel actual del usuario de ejemplo
const MOCK_BP_POINTS     = 2240; // 7×300 base + 140 puntos en el nivel actual
const MOCK_CLAIMED_INIT  = [2, 4]; // niveles ya reclamados en el mock
const MOCK_IS_PRO        = false;  // false → muestra estados pro_locked en la columna Pro
// Mock mission progress for the active level (Phase 5 will replace with real server data)
const MOCK_ACTIVE_PROGRESS = {
  free: null,                      // level 7 has no free mission (odd level)
  pro:  { current: 3, target: 10 }, // Racha Classic: 3/10 rondas seguidas
};
// ─────────────────────────────────────────────────────────────────────────────

const CARD_H = 80;
const ROW_PY = 5;

function getCardState(reward, levelNum, track, userLevel, claimedRewards, isPro) {
  if (!reward) return 'empty';
  if (claimedRewards.includes(levelNum)) return 'claimed';
  if (track === 'pro' && !isPro) return 'pro_locked';
  if (userLevel < levelNum) return 'locked';
  return 'claimable';
}

export default function BattlePass({ onBack, onGoPricing }) {
  const {
    season:         ctxSeason,
    userLevel:      ctxUserLevel,
    bpPoints:       ctxBpPoints,
    claimedRewards: ctxClaimedRewards,
    isLoading,
    claimReward,
  } = useBattlePass();
  const { isPro: ctxIsPro } = useAuth();
  const { t } = useLang();
  const tp = t.traderPass;

  const [claimingLevel, setClaimingLevel] = useState(null);
  const [claimError,    setClaimError]    = useState(null);
  const [mockClaimed,   setMockClaimed]   = useState(MOCK_CLAIMED_INIT);
  const scrollRef  = useRef(null);
  const didScroll  = useRef(false);

  // ── Decide si el mock está activo ───────────────────────────────────────────
  // mockActive es true SOLO cuando: USE_MOCK_BP=true + entorno DEV + sin season real
  const mockActive = USE_MOCK_BP && import.meta.env.DEV && !ctxSeason;

  // ── Fuente de datos: real o mock ────────────────────────────────────────────
  const season        = mockActive ? MOCK_SEASON        : ctxSeason;
  const userLevel     = mockActive ? MOCK_USER_LEVEL     : ctxUserLevel;
  const bpPoints      = mockActive ? MOCK_BP_POINTS      : ctxBpPoints;
  const claimedRewards = mockActive ? mockClaimed         : ctxClaimedRewards;
  const isPro         = mockActive ? MOCK_IS_PRO         : ctxIsPro;

  useEffect(() => {
    if (!scrollRef.current || didScroll.current) return;
    if (userLevel === 0 && claimedRewards.length === 0) return;
    didScroll.current = true;
    const targetLevel = Math.min(userLevel + 1, 30);
    const rowH = CARD_H + ROW_PY * 2;
    scrollRef.current.scrollTop = Math.max(0, (targetLevel - 2) * rowH - 20);
  }, [userLevel, claimedRewards]);

  async function handleClaim(levelNum) {
    if (claimingLevel !== null) return;
    setClaimingLevel(levelNum);
    setClaimError(null);

    if (mockActive) {
      // Mock: simula latencia, actualiza estado local sin tocar BD
      await new Promise(r => setTimeout(r, 450));
      setMockClaimed(prev => [...prev, levelNum]);
      setClaimingLevel(null);
      return;
    }

    const result = await claimReward(levelNum);
    setClaimingLevel(null);
    if (!result.ok) {
      setClaimError(result.error ?? 'ERROR');
      setTimeout(() => setClaimError(null), 3000);
    }
  }

  let daysLeft = null;
  if (season?.endDate) {
    const ms = new Date(season.endDate) - Date.now();
    daysLeft = Math.max(0, Math.ceil(ms / 86400000));
  }

  const progressPct = userLevel >= 30
    ? 100
    : Math.min(100, ((bpPoints % 300) / 300) * 100);

  const pointsInLevel = userLevel >= 30 ? 300 : (bpPoints % 300);

  if (isLoading && !mockActive) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-base)',
      }}>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '13px' }}>...</span>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Header ─────────────────────────────── */}
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)', fontSize: '13px',
            cursor: 'pointer', padding: 0, marginBottom: '16px',
          }}
        >
          {t.common.back}
        </button>

        {/* Chip de mock de desarrollo */}
        {mockActive && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(196,154,42,0.1)', border: '1px solid rgba(196,154,42,0.3)',
            borderRadius: '4px', padding: '2px 8px', marginBottom: '10px',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-neutral)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800, color: 'var(--color-neutral)', letterSpacing: '0.08em' }}>
              DEV MOCK · USE_MOCK_BP = true
            </span>
          </div>
        )}

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h1 style={{
              margin: 0, fontFamily: 'var(--font-body)',
              fontWeight: 900, fontSize: '22px', color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}>
              {t.home.traderPass}
            </h1>
            {season && (
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '12px',
                color: 'var(--green)', fontWeight: 700, letterSpacing: '0.04em',
              }}>
                {season.name}
              </span>
            )}
          </div>
          {daysLeft !== null && (
            <div style={{
              background: 'rgba(224,85,133,0.1)',
              border: '1px solid var(--border-pink)',
              borderRadius: 'var(--radius-full)',
              padding: '3px 10px',
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '11px',
                fontWeight: 700, color: 'var(--pink)',
              }}>
                {tp.daysLeft.replace('{n}', daysLeft)}
              </span>
            </div>
          )}
        </div>

        {/* Level progress card */}
        {season ? (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-green)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '16px',
            boxShadow: '0 0 16px rgba(0,192,135,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Level node */}
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: 'var(--bg-elevated)',
                border: '2px solid var(--green)',
                boxShadow: '0 0 12px rgba(0,192,135,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: '11px',
                  fontWeight: 900, color: 'var(--green)',
                }}>
                  {userLevel}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '13px',
                    fontWeight: 700, color: 'var(--text-primary)',
                  }}>
                    {tp.levelOf.replace('{n}', userLevel)}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '11px',
                    color: 'var(--text-muted)',
                  }}>
                    {userLevel >= 30 ? 'MAX' : `${pointsInLevel} / 300 BP`}
                  </span>
                </div>
                <div style={{ height: '5px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${progressPct}%`,
                    background: 'var(--green)', borderRadius: '3px',
                    transition: 'width 0.5s ease',
                    boxShadow: '0 0 6px rgba(0,192,135,0.5)',
                  }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
            {tp.noSeason}
          </p>
        )}

        {claimError && (
          <div style={{
            marginBottom: '12px', padding: '8px 12px',
            background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)',
            borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '12px', color: '#e05555',
          }}>
            {claimError}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 800,
                letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--green)',
              }}>
                {tp.freeTrack}
              </span>
            </div>
            <div />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--pink)', flexShrink: 0 }} />
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 800,
                letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--pink)',
              }}>
                {tp.proTrack}
              </span>
            </div>
          </div>
        </div>

        {/* Level rows */}
        {SEASON1_LEVELS.map((lvl) => {
          const freeState = getCardState(lvl.freeReward, lvl.level, 'free', userLevel, claimedRewards, isPro);
          const proState  = getCardState(lvl.proReward,  lvl.level, 'pro',  userLevel, claimedRewards, isPro);
          const isClaimed   = claimedRewards.includes(lvl.level);
          const isClaimable = (
            !isClaimed &&
            userLevel >= lvl.level &&
            (freeState === 'claimable' || (isPro && proState === 'claimable'))
          );
          const isClaiming = claimingLevel === lvl.level;
          const isActive   = lvl.level === userLevel;

          const lineColor   = lvl.level <= userLevel ? 'var(--green)' : 'var(--border-default)';
          const bubbleBg    = isClaimed
            ? 'var(--green)'
            : (isActive || isClaimable)
              ? 'var(--bg-elevated)'
              : 'var(--bg-subtle)';
          const bubbleBorder = (isClaimed || isActive || isClaimable || lvl.level < userLevel)
            ? 'var(--green)'
            : 'var(--border-default)';
          const bubbleGlow = (isActive || isClaimable) && !isClaimed
            ? '0 0 12px rgba(0,192,135,0.45)'
            : 'none';

          return (
            <div
              key={lvl.level}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 44px 1fr',
                alignItems: 'stretch',
                padding: `${ROW_PY}px 16px`,
                gap: 6,
                borderBottom: '0.5px solid rgba(255,255,255,0.03)',
                background: isActive ? 'rgba(0,192,135,0.025)' : 'transparent',
                position: 'relative',
              }}
            >
              {/* Spine line — absolute to the full row so it stretches with variable card heights */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                left: '50%', transform: 'translateX(-50%)',
                width: 1, background: lineColor, zIndex: 0,
                pointerEvents: 'none',
                transition: 'background 0.3s ease',
              }} />

              {/* Left — Free reward */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <RewardCard
                  reward={lvl.freeReward}
                  mission={lvl.freeMission}
                  state={freeState}
                  track="free"
                  isActive={isActive}
                  missionProgress={isActive ? MOCK_ACTIVE_PROGRESS.free : null}
                  t={t}
                />
              </div>

              {/* Center — spine bubble + claim button (line lives on the row now) */}
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4, position: 'relative', zIndex: 1,
              }}>
                {/* Level bubble */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: bubbleBg,
                  border: `1.5px solid ${bubbleBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: bubbleGlow,
                  transition: 'box-shadow 0.3s ease',
                }}>
                  {isClaimed ? (
                    <span style={{ fontSize: '10px', color: '#000', fontWeight: 800, lineHeight: 1 }}>✓</span>
                  ) : (
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: '9px',
                      fontWeight: (isActive || isClaimable) ? 800 : 500,
                      color: (isActive || isClaimable) ? 'var(--green)' : 'var(--text-muted)',
                    }}>
                      {lvl.level}
                    </span>
                  )}
                </div>

                {/* Claim button */}
                {isClaimable && (
                  <button
                    onClick={() => handleClaim(lvl.level)}
                    disabled={isClaiming}
                    style={{
                      background: 'var(--green)', border: 'none', borderRadius: '5px',
                      padding: '3px 6px', fontFamily: 'var(--font-body)', fontSize: '8px',
                      fontWeight: 800, color: '#000', cursor: isClaiming ? 'default' : 'pointer',
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                      opacity: isClaiming ? 0.6 : 1, flexShrink: 0,
                    }}
                  >
                    {isClaiming ? '...' : tp.claim}
                  </button>
                )}
              </div>

              {/* Right — Pro reward */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <RewardCard
                  reward={lvl.proReward}
                  mission={lvl.proMission}
                  state={proState}
                  track="pro"
                  isActive={isActive}
                  missionProgress={isActive ? MOCK_ACTIVE_PROGRESS.pro : null}
                  t={t}
                  onGoPricing={onGoPricing}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
