import { useState, useRef, useEffect } from 'react';
import { useBattlePass } from './BattlePassContext.jsx';
import { useAuth } from './AuthContext.jsx';
import { useLang } from './LangContext.jsx';
import { SEASON1_LEVELS } from './config/season1Config.js';
import RewardCard from './components/RewardCard.jsx';
import { TrendingUp, Diamond } from 'lucide-react';

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

function getCardState(reward, mission, levelNum, track, userLevel, claimedRewards, isPro, missionProgress) {
  if (!reward && !mission) return 'empty';
  if (claimedRewards.includes(levelNum)) return 'claimed';
  if (track === 'pro' && !isPro) return 'pro_locked';
  if (userLevel < levelNum) return 'locked';
  // Mirror server Fix G: mission must be complete (unless disabled) to be claimable
  if (mission && mission.enabled !== false && missionProgress && missionProgress.current < missionProgress.target) {
    return 'mission_pending';
  }
  return 'claimable';
}

function MiniCandleChart() {
  return (
    <svg width="54" height="30" viewBox="0 0 54 30" fill="none">
      <line x1="5"  y1="4"  x2="5"  y2="8"  stroke="#00c087" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="2"   y="8"   width="6" height="13" rx="1.5" fill="#00c087"/>
      <line x1="5"  y1="21" x2="5"  y2="26" stroke="#00c087" strokeWidth="1.5" strokeLinecap="round"/>

      <line x1="16" y1="6"  x2="16" y2="10" stroke="#e05585" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="13"  y="10"  width="6" height="9"  rx="1.5" fill="#e05585"/>
      <line x1="16" y1="19" x2="16" y2="24" stroke="#e05585" strokeWidth="1.5" strokeLinecap="round"/>

      <line x1="27" y1="2"  x2="27" y2="6"  stroke="#00c087" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="24"  y="6"   width="6" height="16" rx="1.5" fill="#00c087"/>
      <line x1="27" y1="22" x2="27" y2="27" stroke="#00c087" strokeWidth="1.5" strokeLinecap="round"/>

      <line x1="38" y1="7"  x2="38" y2="11" stroke="#e05585" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="35"  y="11"  width="6" height="8"  rx="1.5" fill="#e05585"/>
      <line x1="38" y1="19" x2="38" y2="23" stroke="#e05585" strokeWidth="1.5" strokeLinecap="round"/>

      <line x1="49" y1="5"  x2="49" y2="9"  stroke="#00c087" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="46"  y="9"   width="6" height="12" rx="1.5" fill="#00c087"/>
      <line x1="49" y1="21" x2="49" y2="26" stroke="#00c087" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function ProgressRing({ pct, level }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="bpRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e05585"/>
            <stop offset="100%" stopColor="#00c087"/>
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
        {dash > 0 && (
          <circle
            cx="32" cy="32" r={r} fill="none"
            stroke="url(#bpRingGrad)" strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
        )}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-body)', fontWeight: 900,
          fontSize: '18px', color: 'var(--text-primary)', lineHeight: 1,
        }}>
          {level}
        </span>
      </div>
    </div>
  );
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
    isLoading,
    claimReward,
  } = useBattlePass();
  const { isPro: ctxIsPro } = useAuth();
  const { t } = useLang();
  const tp = t.traderPass;

  const [claimingLevel, setClaimingLevel] = useState(null);
  const [claimError,    setClaimError]    = useState(null);
  const [mockClaimed,   setMockClaimed]   = useState(MOCK_CLAIMED_INIT);
  const [justClaimed,   setJustClaimed]   = useState(null);
  const scrollRef  = useRef(null);
  const didScroll  = useRef(false);

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

  useEffect(() => {
    if (!scrollRef.current || didScroll.current) return;
    if (userLevel === 0 && claimedFreeRewards.length === 0 && claimedProRewards.length === 0) return;
    didScroll.current = true;
    const targetLevel = Math.min(userLevel + 1, 30);
    const rowH = CARD_H + ROW_PY * 2;
    scrollRef.current.scrollTop = Math.max(0, (targetLevel - 2) * rowH - 20);
  }, [userLevel, claimedFreeRewards, claimedProRewards]);

  async function handleClaim(levelNum) {
    if (claimingLevel !== null) return;
    setClaimingLevel(levelNum);
    setClaimError(null);

    if (mockActive) {
      // Mock: simula latencia, actualiza estado local sin tocar BD
      await new Promise(r => setTimeout(r, 450));
      setMockClaimed(prev => [...prev, levelNum]);
      setJustClaimed(levelNum);
      setTimeout(() => setJustClaimed(null), 650);
      setClaimingLevel(null);
      return;
    }

    const result = await claimReward(levelNum);
    setClaimingLevel(null);
    if (!result.ok) {
      setClaimError(result.error ?? 'ERROR');
      setTimeout(() => setClaimError(null), 3000);
    } else {
      setJustClaimed(levelNum);
      setTimeout(() => setJustClaimed(null), 650);
    }
  }

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

  // Extrae la parte de texto después de {n}, p.ej. "días restantes" / "days remaining"
  const daysUnit = tp.daysLeft.split('{n}').pop()?.trim() ?? '';

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

      {/* ── Área de cabecera ───────────────────── */}
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

        {/* ── Tarjeta principal de cabecera ─────── */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '20px',
          padding: '16px',
          marginBottom: '16px',
        }}>

          {/* Fila superior: badge+título vs. velas+días */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: '14px',
          }}>

            {/* Izquierda */}
            <div>
              {season && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--green)', flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 900,
                    color: 'var(--green)', letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>
                    {season.name}
                  </span>
                </div>
              )}
              <h1 style={{
                margin: 0, fontFamily: 'var(--font-body)', fontWeight: 900,
                fontSize: '26px', color: 'var(--text-primary)',
                letterSpacing: '-0.02em', lineHeight: 1,
              }}>
                {t.home.traderPass}
              </h1>
              <p style={{
                margin: '5px 0 0', fontFamily: 'var(--font-body)',
                fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500,
              }}>
                {t.home.traderPassSub}
              </p>
            </div>

            {/* Derecha: mini candle SVG + días */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-end', gap: 6, flexShrink: 0,
            }}>
              <MiniCandleChart />
              {daysLeft !== null && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontWeight: 900,
                    fontSize: '22px', color: 'var(--pink)', lineHeight: 1,
                  }}>
                    {daysLeft}d
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: '8px', fontWeight: 800,
                    color: 'var(--text-muted)', letterSpacing: '0.1em',
                    textTransform: 'uppercase', marginTop: 1,
                  }}>
                    {daysUnit}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Divisor punteado */}
          <div style={{
            borderBottom: '1px dashed rgba(255,255,255,0.09)',
            marginBottom: '14px',
          }} />

          {/* Anillo de progreso + texto de nivel */}
          {season ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <ProgressRing pct={progressPct} level={userLevel} />
              <div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontWeight: 800,
                  fontSize: '16px', color: 'var(--text-primary)', lineHeight: 1,
                }}>
                  {tp.levelOf.replace('{n}', userLevel)}
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '12px',
                  color: 'var(--text-muted)', marginTop: 5,
                }}>
                  {userLevel >= 30
                  ? 'MAX'
                  : missionsForNextLevel.total === 0
                    ? `${tp.levelOf.replace('{n}', userLevel + 1)}`
                    : `${missionsForNextLevel.current}/${missionsForNextLevel.total} misiones → nv. ${userLevel + 1}`
                }
                </div>
              </div>
            </div>
          ) : (
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '13px',
              color: 'var(--text-muted)', margin: 0,
            }}>
              {tp.noSeason}
            </p>
          )}
        </div>

        {claimError && (
          <div style={{
            marginBottom: '12px', padding: '8px 32px 8px 12px',
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
            padding: '10px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <TrendingUp size={14} color="#00c087" strokeWidth={2.5} />
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 800,
                letterSpacing: '0.14em', textTransform: 'uppercase', color: '#00c087',
              }}>
                {tp.freeTrack}
              </span>
            </div>
            <div />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 800,
                letterSpacing: '0.14em', textTransform: 'uppercase', color: '#e05585',
              }}>
                {tp.proTrack}
              </span>
              <Diamond size={13} color="#e05585" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Level rows */}
        {SEASON1_LEVELS.map((lvl) => {
          const freeState  = getCardState(lvl.freeReward, lvl.freeMission, lvl.level, 'free', userLevel, claimedFreeRewards, isPro, allMissionProgress?.[lvl.level]?.free ?? null);
          const proState   = getCardState(lvl.proReward,  lvl.proMission,  lvl.level, 'pro',  userLevel, claimedProRewards,  isPro, allMissionProgress?.[lvl.level]?.pro  ?? null);
          const isClaiming = claimingLevel === lvl.level;
          const isActive   = lvl.level === userLevel;
          const isClaimed  = claimedFreeRewards.includes(lvl.level) || claimedProRewards.includes(lvl.level);

          const spineColor = lvl.level <= userLevel
            ? 'var(--green)'
            : 'rgba(255,255,255,0.08)';

          const isCompleted = lvl.level < userLevel;

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
              key={lvl.level}
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
              {/* Spine — línea verde fina */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                left: '50%', transform: 'translateX(-50%)',
                width: 1.5, background: spineColor, zIndex: 0,
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
                  missionProgress={allMissionProgress?.[lvl.level]?.free ?? null}
                  animate={justClaimed === lvl.level}
                  isClaiming={isClaiming}
                  onClaim={() => handleClaim(lvl.level)}
                  t={t}
                />
              </div>

              {/* Center — nodo de nivel (círculo hueco) */}
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
                    <span style={{ fontSize: '10px', color: '#000', fontWeight: 900, lineHeight: 1 }}>✓</span>
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

              {/* Right — Pro reward */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <RewardCard
                  reward={lvl.proReward}
                  mission={lvl.proMission}
                  state={proState}
                  track="pro"
                  isActive={isActive}
                  missionProgress={allMissionProgress?.[lvl.level]?.pro ?? null}
                  animate={justClaimed === lvl.level}
                  isClaiming={isClaiming}
                  onClaim={() => handleClaim(lvl.level)}
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
