import { Lock } from 'lucide-react';

function RewardDisplay({ reward }) {
  if (!reward) return null;
  switch (reward.type) {
    case 'xp':
      return (
        <>
          <div style={{ fontSize: '18px', lineHeight: 1 }}>⚡</div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--t1)', marginTop: '3px' }}>
            +{reward.amount.toLocaleString()}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--t4)', fontFamily: 'var(--font-body)' }}>XP</div>
        </>
      );
    case 'badge':
      return (
        <>
          <div style={{ fontSize: '20px', lineHeight: 1 }}>{reward.emoji ?? '🏅'}</div>
          <div style={{ fontSize: '8px', color: 'var(--t3)', marginTop: '4px', textAlign: 'center', lineHeight: 1.2, fontFamily: 'var(--font-body)', fontWeight: 600 }}>
            {reward.name}
          </div>
        </>
      );
    case 'title':
      return (
        <>
          <div style={{ fontSize: '16px', lineHeight: 1 }}>📝</div>
          <div style={{ fontSize: '8px', color: 'var(--t3)', marginTop: '4px', textAlign: 'center', lineHeight: 1.2, fontFamily: 'var(--font-body)' }}>
            "{reward.name}"
          </div>
        </>
      );
    case 'frame':
      return (
        <>
          <div style={{ fontSize: '16px', lineHeight: 1 }}>🖼️</div>
          <div style={{ fontSize: '8px', color: 'var(--t3)', marginTop: '4px', textAlign: 'center', lineHeight: 1.2, fontFamily: 'var(--font-body)' }}>
            {reward.name}
          </div>
        </>
      );
    case 'avatar':
      return (
        <>
          <div style={{ fontSize: '18px', lineHeight: 1 }}>🦊</div>
          <div style={{ fontSize: '8px', color: 'var(--t3)', marginTop: '4px', textAlign: 'center', lineHeight: 1.2, fontFamily: 'var(--font-body)' }}>
            {reward.name}
          </div>
        </>
      );
    case 'theme':
      return (
        <>
          <div style={{ fontSize: '16px', lineHeight: 1 }}>🎨</div>
          <div style={{ fontSize: '8px', color: 'var(--t3)', marginTop: '4px', textAlign: 'center', lineHeight: 1.2, fontFamily: 'var(--font-body)' }}>
            {reward.name}
          </div>
        </>
      );
    case 'username_color':
      return (
        <>
          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: reward.hex, border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
          <div style={{ fontSize: '8px', color: 'var(--t3)', marginTop: '4px', textAlign: 'center', lineHeight: 1.2, fontFamily: 'var(--font-body)' }}>
            {reward.name}
          </div>
        </>
      );
    case 'ticket':
      return (
        <>
          <div style={{ fontSize: '16px', lineHeight: 1 }}>🎟️</div>
          <div style={{ fontSize: '8px', color: 'var(--t3)', marginTop: '4px', textAlign: 'center', lineHeight: 1.2, fontFamily: 'var(--font-body)' }}>
            {reward.name}
          </div>
        </>
      );
    case 'mechanic':
      return (
        <>
          <div style={{ fontSize: '16px', lineHeight: 1 }}>⚙️</div>
          <div style={{ fontSize: '8px', color: 'var(--t3)', marginTop: '4px', textAlign: 'center', lineHeight: 1.2, fontFamily: 'var(--font-body)' }}>
            {reward.name}
          </div>
        </>
      );
    default:
      return <div style={{ fontSize: '18px' }}>🎁</div>;
  }
}

// Props:
//   reward       — reward object from season1Config, or null
//   mission      — mission object { title, desc, enabled } or null
//   state        — 'empty' | 'locked' | 'claimable' | 'claimed' | 'pro_locked'
//   track        — 'free' | 'pro'
//   t            — translation object (needs t.traderPass)
//   onGoPricing  — called when free user taps the PRO lock button
export default function RewardCard({ reward, mission, state, track, t, onGoPricing }) {
  if (state === 'empty') {
    return (
      <div style={{
        width: '100%', height: '100%', borderRadius: '8px',
        background: 'rgba(255,255,255,0.015)',
        border: '1px dashed rgba(255,255,255,0.04)',
      }} />
    );
  }

  const isProTrack  = track === 'pro';
  const isClaimable = state === 'claimable';
  const isClaimed   = state === 'claimed';
  const isLocked    = state === 'locked';
  const isProLocked = state === 'pro_locked';

  const cardBg     = isClaimable
    ? (isProTrack ? 'rgba(34,211,160,0.07)' : 'rgba(255,255,255,0.05)')
    : (isProTrack ? 'rgba(34,211,160,0.03)' : 'rgba(255,255,255,0.025)');
  const cardBorder = isClaimable
    ? (isProTrack ? 'rgba(34,211,160,0.45)' : 'rgba(255,255,255,0.18)')
    : (isProTrack ? 'rgba(34,211,160,0.12)' : 'rgba(255,255,255,0.06)');
  const cardShadow = isClaimable
    ? (isProTrack ? '0 0 10px rgba(34,211,160,0.15)' : '0 0 6px rgba(255,255,255,0.06)')
    : 'none';

  const hasComingSoon = mission && mission.enabled === false;

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      borderRadius: '8px', background: cardBg,
      border: `1px solid ${cardBorder}`,
      boxShadow: cardShadow,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      opacity: isLocked ? 0.45 : 1,
    }}>
      {/* Reward content */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '6px 4px', width: '100%',
        filter: isProLocked ? 'blur(4px)' : 'none',
        userSelect: isProLocked ? 'none' : 'auto',
        pointerEvents: isProLocked ? 'none' : 'auto',
      }}>
        <RewardDisplay reward={reward} />
        {hasComingSoon && (
          <div style={{
            marginTop: '5px', fontSize: '7px',
            fontFamily: 'var(--font-body)', fontWeight: 700,
            letterSpacing: '0.04em', color: 'var(--t5)',
            border: '0.5px solid var(--t5)',
            borderRadius: '3px', padding: '1px 4px',
          }}>
            {t.traderPass.comingSoon}
          </div>
        )}
      </div>

      {/* Claimed badge */}
      {isClaimed && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          width: '16px', height: '16px', borderRadius: '50%',
          background: 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '9px', color: '#000', fontWeight: 800, lineHeight: 1 }}>✓</span>
        </div>
      )}

      {/* Locked overlay */}
      {isLocked && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={12} style={{ stroke: 'rgba(255,255,255,0.2)' }} />
        </div>
      )}

      {/* Pro-locked overlay */}
      {isProLocked && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '5px',
          background: 'rgba(6,11,16,0.72)',
        }}>
          <Lock size={11} style={{ stroke: 'var(--green)' }} />
          {onGoPricing && (
            <button
              onClick={onGoPricing}
              style={{
                fontSize: '8px', fontFamily: 'var(--font-body)', fontWeight: 800,
                color: 'var(--green)', background: 'none',
                border: '0.5px solid var(--green)',
                borderRadius: '4px', padding: '2px 6px',
                cursor: 'pointer', letterSpacing: '0.05em',
              }}
            >
              PRO
            </button>
          )}
        </div>
      )}
    </div>
  );
}
