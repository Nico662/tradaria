import { useState } from 'react';
import { createPortal } from 'react-dom';
import { getTodayMissions, getMissionProgress, getWeeklyMission, getWeeklyProgress } from './missions.js';
import { useLang } from './LangContext.jsx';
import { TrendingUp, Briefcase, Zap, Shield, Calendar, Clock, Trophy, Target } from 'lucide-react';

const LABELS = {
  more:  { en: 'see all →', es: 'ver todo →', de: 'alle sehen →' },
  back:  { en: '← back',    es: '← volver',   de: '← zurück'     },
  reset: { en: 'Resets Monday', es: 'Reinicia el lunes', de: 'Reset Montag' },
};

const MODE_ICON = {
  guess:      TrendingUp,
  portfolio:  Briefcase,
  arena:      Zap,
  survival:   Shield,
  daily:      Calendar,
  historical: Clock,
  tournament: Trophy,
};

// ─── Detail Screen ────────────────────────────────────────────────────────────

function DetailScreen({ onClose }) {
  const { lang } = useLang();
  const missions = getTodayMissions();
  const weekly   = getWeeklyMission();
  const wProgress = getWeeklyProgress();
  const wDone  = wProgress >= weekly.target;
  const wPct   = Math.min(wProgress / weekly.target * 100, 100);
  const WeeklyIcon = MODE_ICON[weekly.mode] || Target;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#0a0f0d', zIndex: 9999, overflowY: 'auto' }}>
      <div style={{ padding: 'max(16px, calc(env(safe-area-inset-top) + 12px)) 16px 48px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Back */}
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: '0.5px solid #2a3830', color: '#7c8a83', fontSize: '12px', fontWeight: 600, cursor: 'pointer', borderRadius: '6px', padding: '5px 10px', marginBottom: '24px', display: 'block' }}
          onMouseEnter={e => e.currentTarget.style.color = '#2dd4a0'}
          onMouseLeave={e => e.currentTarget.style.color = '#7c8a83'}
        >
          {LABELS.back[lang]}
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" height="20"
               style={{ flexShrink: 0, marginTop: '3px' }}>
            <line x1="50" y1="10" x2="50" y2="40" stroke="#ff7eb3" strokeWidth="8" strokeLinecap="round"/>
            <rect x="25" y="40" width="50" height="110" rx="6" fill="url(#candleGradMC)"/>
            <line x1="50" y1="150" x2="50" y2="190" stroke="#00e5a0" strokeWidth="8" strokeLinecap="round"/>
            <defs>
              <linearGradient id="candleGradMC" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff7eb3"/>
                <stop offset="100%" stopColor="#00e5a0"/>
              </linearGradient>
            </defs>
          </svg>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 500, color: '#f3f1ea', lineHeight: 1.2 }}>
              {lang === 'es' ? 'Misiones' : lang === 'de' ? 'Missionen' : 'Missions'}
            </div>
            <div style={{ fontSize: '13px', color: '#7c8a83', marginTop: '2px' }}>
              {lang === 'es' ? 'Completa retos y gana XP'
               : lang === 'de' ? 'Aufgaben erfüllen und XP verdienen'
               : 'Complete challenges and earn XP'}
            </div>
          </div>
        </div>

        {/* ── Daily missions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {missions.map(m => {
            const progress = getMissionProgress(m.id);
            const done  = progress >= m.target;
            const pct   = Math.min(progress / m.target * 100, 100);
            const title = m.title[lang] || m.title.en;
            const desc  = m.desc[lang]  || m.desc.en;
            const Icon  = MODE_ICON[m.mode] || Target;
            return (
              <div key={m.id} style={{ background: '#121815', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              gap: '8px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <Icon size={16} strokeWidth={2} color="#2dd4a0" aria-hidden style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', fontWeight: 500,
                                   color: done ? '#2dd4a0' : '#f3f1ea', lineHeight: 1.3 }}>
                      {title}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#2dd4a0', flexShrink: 0 }}>
                    +{m.xp} XP
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#7c8a83', paddingLeft: '24px',
                              marginBottom: '10px', lineHeight: 1.4 }}>
                  {desc}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '4px', background: '#1f2b26',
                                borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#2dd4a0',
                                  borderRadius: '2px', transition: 'width 0.3s ease' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#7c8a83', flexShrink: 0 }}>
                    {progress}/{m.target}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Esta semana ── */}
        <div style={{ fontSize: '11px', fontWeight: 500, color: '#5a6560',
                      marginBottom: '8px', paddingLeft: '2px' }}>
          {lang === 'es' ? 'Esta semana' : lang === 'de' ? 'Diese Woche' : 'This week'}
        </div>

        {/* ── Weekly mission ── */}
        <div style={{ background: 'linear-gradient(135deg, #2dd4a0, #ff6b8f)',
                      borderRadius: '14px', padding: '2px' }}>
          <div style={{ background: '#121815', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: '8px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <WeeklyIcon size={16} strokeWidth={2} color="#ff9db8" aria-hidden style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '15px', fontWeight: 500,
                               color: wDone ? '#2dd4a0' : '#f3f1ea', lineHeight: 1.3 }}>
                  {weekly.title[lang] || weekly.title.en}
                </span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#2dd4a0', flexShrink: 0 }}>
                +{weekly.xp} XP
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#7c8a83', paddingLeft: '24px',
                          marginBottom: '10px', lineHeight: 1.4 }}>
              {weekly.desc[lang] || weekly.desc.en}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ flex: 1, height: '4px', background: '#1f2b26',
                            borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${wPct}%`, height: '100%',
                              background: 'linear-gradient(90deg, #2dd4a0, #ff6b8f)',
                              borderRadius: '2px', transition: 'width 0.3s ease' }} />
              </div>
              <span style={{ fontSize: '11px', color: '#f3f1ea', flexShrink: 0 }}>
                {wProgress}/{weekly.target}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#5a6560' }}>
              {LABELS.reset[lang]}
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}

// ─── Compact Card ─────────────────────────────────────────────────────────────

export default function MissionsCard() {
  const { lang } = useLang();
  const [showDetail, setShowDetail] = useState(false);

  const missions = getTodayMissions();
  const weekly   = getWeeklyMission();
  const weeklyProgress  = getWeeklyProgress();
  const weeklyDone      = weeklyProgress >= weekly.target;

  const dailyDone  = missions.filter(m => getMissionProgress(m.id) >= m.target).length;
  const allDailyDone = dailyDone === missions.length;

  return (
    <>
      {showDetail && <DetailScreen onClose={() => setShowDetail(false)} />}

      <div style={{
        flex: 1,
        minWidth: 0,
        alignSelf: 'stretch',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderTop: '2px solid var(--green)',
        borderRadius: '8px',
        padding: '10px 12px 12px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ fontSize: '12px', color: '#888', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: '8px' }}>
          {LABELS.header[lang]}
        </div>

        {/* Daily missions list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px', flex: 1 }}>
          {missions.map(m => {
            const done = getMissionProgress(m.id) >= m.target;
            const progress = getMissionProgress(m.id);
            const pct = Math.min(progress / m.target * 100, 100);
            const title = m.title[lang] || m.title.en;
            return (
              <div key={m.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                  {done
                    ? <span style={{ fontSize: '12px', color: 'var(--green)', flexShrink: 0, lineHeight: 1 }}>✓</span>
                    : <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--border-subtle)', display: 'inline-block', flexShrink: 0 }} />
                  }
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: done ? 'var(--green)' : '#c8d4e0',
                    letterSpacing: '0.01em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    flex: 1,
                  }}>
                    {title}
                  </span>
                </div>
                <div style={{ height: '2px', background: 'var(--bg-elevated)', borderRadius: '1px', overflow: 'hidden', marginLeft: '10px' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: done ? 'var(--green)' : 'rgba(0,229,160,0.35)', borderRadius: '1px', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Weekly teaser */}
        <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '6px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {weeklyDone
              ? <span style={{ fontSize: '12px', color: 'var(--green)', flexShrink: 0, lineHeight: 1 }}>✓</span>
              : <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3a2a08', display: 'inline-block', flexShrink: 0 }} />
            }
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              fontWeight: 700,
              color: weeklyDone ? 'var(--green)' : '#e8d4a0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              flex: 1,
            }}>
              {weekly.title[lang] || weekly.title.en}
            </span>
          </div>
          <div style={{ height: '2px', background: '#1a1508', borderRadius: '1px', overflow: 'hidden', marginTop: '3px', marginLeft: '10px' }}>
            <div style={{ width: `${Math.min(weeklyProgress / weekly.target * 100, 100)}%`, height: '100%', background: weeklyDone ? 'var(--green)' : 'var(--color-neutral)', borderRadius: '1px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Button */}
        <button
          onClick={() => setShowDetail(true)}
          style={{ marginTop: '9px', background: 'transparent', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '4px', padding: '3px 7px', color: 'var(--green)', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.06em', width: '100%', textAlign: 'center' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,160,0.5)'; e.currentTarget.style.background = 'rgba(0,229,160,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,229,160,0.2)'; e.currentTarget.style.background = 'transparent'; }}
        >
          {LABELS.more[lang]}
        </button>
      </div>
    </>
  );
}
