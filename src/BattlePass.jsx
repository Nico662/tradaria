import { useState, useRef, useEffect } from 'react';
import { useBattlePass } from './BattlePassContext.jsx';
import { useAuth } from './AuthContext.jsx';
import { useLang } from './LangContext.jsx';
import { SEASON1_LEVELS } from './config/season1Config.js';
import RewardCard from './components/RewardCard.jsx';

const LABEL_W = 52;
const COL_W   = 110;
const CARD_H  = 96;
const NUM_H   = 30;
const ACT_H   = 40;

function getCardState(reward, levelNum, track, userLevel, claimedRewards, isPro) {
  if (!reward) return 'empty';
  if (claimedRewards.includes(levelNum)) return 'claimed';
  if (track === 'pro' && !isPro) return 'pro_locked';
  if (userLevel < levelNum) return 'locked';
  return 'claimable';
}

export default function BattlePass({ onBack, onGoPricing }) {
  const { season, userLevel, bpPoints, claimedRewards, isLoading, claimReward } = useBattlePass();
  const { isPro } = useAuth();
  const { t } = useLang();
  const tp = t.traderPass;

  const [claimingLevel, setClaimingLevel] = useState(null);
  const [claimError,    setClaimError]    = useState(null);
  const scrollRef  = useRef(null);
  const didScroll  = useRef(false);

  // Scroll to the first claimable (or active) column on mount
  useEffect(() => {
    if (!scrollRef.current || didScroll.current) return;
    if (userLevel === 0 && claimedRewards.length === 0) return;
    didScroll.current = true;
    const targetLevel = Math.min(userLevel + 1, 30);
    const scrollTo = Math.max(0, (targetLevel - 2) * COL_W - 20);
    scrollRef.current.scrollLeft = scrollTo;
  }, [userLevel, claimedRewards]);

  async function handleClaim(levelNum) {
    if (claimingLevel !== null) return;
    setClaimingLevel(levelNum);
    setClaimError(null);
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

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-base)',
      }}>
        <span style={{ color: 'var(--t5)', fontFamily: 'var(--font-body)', fontSize: '13px' }}>...</span>
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
            background: 'none', border: 'none', color: 'var(--t4)',
            fontFamily: 'var(--font-body)', fontSize: '13px',
            cursor: 'pointer', padding: 0, marginBottom: '16px',
          }}
        >
          {t.common.back}
        </button>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-body)',
            fontWeight: 900, fontSize: '22px', color: 'var(--t1)',
          }}>
            {t.home.traderPass}
          </h1>
          {season && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--t5)', fontWeight: 600 }}>
              {season.name}
            </span>
          )}
        </div>

        {season ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--green)' }}>
                {tp.levelOf.replace('{n}', userLevel)}
              </span>
              {daysLeft !== null && (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--t5)' }}>
                  {tp.daysLeft.replace('{n}', daysLeft)}
                </span>
              )}
            </div>
            <div style={{ height: '4px', background: 'var(--bg-2)', borderRadius: '2px', marginBottom: '20px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progressPct}%`,
                background: 'var(--green)', borderRadius: '2px',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </>
        ) : (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--t5)', margin: '0 0 20px' }}>
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

      {/* ── Grid ───────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{ overflowX: 'auto', flex: 1, paddingBottom: '32px' }}
      >
        <div style={{ display: 'flex', minWidth: `${LABEL_W + COL_W * 30}px` }}>

          {/* Sticky track-label column */}
          <div style={{
            position: 'sticky', left: 0, zIndex: 10,
            width: LABEL_W, flexShrink: 0,
            background: 'var(--bg-base)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ height: NUM_H + 4 }} />
            <div style={{ height: CARD_H + 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                writingMode: 'vertical-lr', transform: 'rotate(180deg)',
                fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 800,
                letterSpacing: '0.15em', color: 'var(--t4)', textTransform: 'uppercase',
              }}>
                {tp.freeTrack}
              </span>
            </div>
            <div style={{ height: CARD_H + 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                writingMode: 'vertical-lr', transform: 'rotate(180deg)',
                fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 800,
                letterSpacing: '0.15em', color: 'var(--green)', textTransform: 'uppercase',
              }}>
                {tp.proTrack}
              </span>
            </div>
            <div style={{ height: ACT_H }} />
          </div>

          {/* Level columns */}
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

            // Level number colour: green = claimed, bright = claimable, dim = locked
            const numColor = isClaimed
              ? 'var(--green)'
              : isClaimable
                ? 'var(--t1)'
                : 'var(--t5)';

            return (
              <div key={lvl.level} style={{ width: COL_W, flexShrink: 0, padding: '0 4px' }}>
                {/* Level number */}
                <div style={{ height: NUM_H + 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: isClaimable ? 800 : 500, color: numColor }}>
                    {lvl.level}
                  </span>
                </div>

                {/* Free reward card */}
                <div style={{ height: CARD_H, padding: '4px 0' }}>
                  <RewardCard
                    reward={lvl.freeReward}
                    mission={lvl.freeMission}
                    state={freeState}
                    track="free"
                    t={t}
                  />
                </div>

                {/* Pro reward card */}
                <div style={{ height: CARD_H, padding: '4px 0' }}>
                  <RewardCard
                    reward={lvl.proReward}
                    mission={lvl.proMission}
                    state={proState}
                    track="pro"
                    t={t}
                    onGoPricing={onGoPricing}
                  />
                </div>

                {/* Claim / claimed action row */}
                <div style={{ height: ACT_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isClaimed ? (
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--green)', fontWeight: 700 }}>
                      ✓
                    </span>
                  ) : isClaimable ? (
                    <button
                      onClick={() => handleClaim(lvl.level)}
                      disabled={isClaiming}
                      style={{
                        background: 'var(--green)', border: 'none', borderRadius: '6px',
                        padding: '5px 10px', fontFamily: 'var(--font-body)', fontSize: '10px',
                        fontWeight: 800, color: '#000', cursor: isClaiming ? 'default' : 'pointer',
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                        opacity: isClaiming ? 0.6 : 1,
                      }}
                    >
                      {isClaiming ? '...' : tp.claim}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
