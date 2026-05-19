import { useState } from 'react';
import { GLOSSARY } from './tradingGlossary.js';
import { CHARTS } from './glossaryCharts.jsx';
import { useLang } from './LangContext.jsx';

const ACCENTS = ['#22d3a5', '#f5c842', '#8899b0'];

function getWordForOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const doy = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  return GLOSSARY[doy % GLOSSARY.length];
}

function getAccentForOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const doy = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  return ACCENTS[doy % ACCENTS.length];
}

function formatDate(offset, lang) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString(
    lang === 'es' ? 'es-ES' : lang === 'de' ? 'de-DE' : 'en-GB',
    { day: 'numeric', month: 'short' }
  );
}

const LABELS = {
  header:   { en: '— WORD OF DAY —',              es: '— CONCEPTO DEL DÍA —',       de: '— WORT DES TAGES —'       },
  more:     { en: 'learn more →',                 es: 'saber más →',                de: 'mehr erfahren →'          },
  back:     { en: '← back',                       es: '← volver',                   de: '← zurück'                 },
  example:  { en: 'Example',                      es: 'Ejemplo',                    de: 'Beispiel'                 },
  context:  { en: 'More context',                 es: 'Más contexto',               de: 'Mehr Kontext'             },
  soon:     { en: 'Chart · coming soon',          es: 'Gráfico · próximamente',     de: 'Chart · demnächst'        },
  today:    { en: 'TODAY',                        es: 'HOY',                        de: 'HEUTE'                    },
  yesterday:{ en: 'YESTERDAY',                    es: 'AYER',                       de: 'GESTERN'                  },
  previous: { en: 'PREVIOUS WORDS',               es: 'PALABRAS ANTERIORES',        de: 'FRÜHERE WÖRTER'           },
};

// ─── Detail Screen ────────────────────────────────────────────────────────────

function DetailScreen({ dayOffset, onOffsetChange, onClose }) {
  const { lang } = useLang();

  const entry  = getWordForOffset(dayOffset);
  const accent = getAccentForOffset(dayOffset);

  const word       = entry.word[lang]       || entry.word.en;
  const definition = entry.definition[lang] || entry.definition.en;
  const example    = entry.example?.[lang]  || entry.example?.en;
  const extra      = entry.extra?.[lang]    || entry.extra?.en;

  const dayLabel = dayOffset === 0
    ? LABELS.today[lang]
    : dayOffset === -1
      ? LABELS.yesterday[lang]
      : formatDate(dayOffset, lang).toUpperCase();

  const navBtn = {
    background: 'transparent', border: 'none',
    color: '#4a5568', fontFamily: "'Space Mono', monospace",
    fontSize: '14px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#080c11', zIndex: 9999, overflowY: 'auto' }}>
      <div style={{ padding: 'max(20px, calc(env(safe-area-inset-top) + 12px)) 28px 48px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Back */}
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#4a5568', fontFamily: "'Space Mono', monospace", fontSize: '10px', cursor: 'pointer', letterSpacing: '0.08em', padding: '8px 0', marginBottom: '24px', display: 'block' }}
          onMouseEnter={e => e.currentTarget.style.color = accent}
          onMouseLeave={e => e.currentTarget.style.color = '#4a5568'}
        >
          {LABELS.back[lang]}
        </button>

        {/* Day navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', background: '#0f141b', border: '1px solid #1e2530', borderRadius: '8px', padding: '6px 4px' }}>
          <button
            onClick={() => onOffsetChange(o => Math.max(o - 1, -30))}
            style={navBtn}
            onMouseEnter={e => e.currentTarget.style.color = accent}
            onMouseLeave={e => e.currentTarget.style.color = '#4a5568'}
          >←</button>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#8899b0', letterSpacing: '0.12em' }}>
            {dayLabel}
          </span>
          <button
            onClick={() => onOffsetChange(o => Math.min(o + 1, 0))}
            disabled={dayOffset === 0}
            style={{ ...navBtn, color: dayOffset === 0 ? '#2a3345' : '#4a5568', cursor: dayOffset === 0 ? 'default' : 'pointer' }}
            onMouseEnter={e => { if (dayOffset < 0) e.currentTarget.style.color = accent; }}
            onMouseLeave={e => { if (dayOffset < 0) e.currentTarget.style.color = '#4a5568'; }}
          >→</button>
        </div>

        {/* Label */}
        <div style={{ fontSize: '8px', color: '#2a3345', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", marginBottom: '18px' }}>
          {LABELS.header[lang]}
        </div>

        {/* Emoji */}
        <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '14px' }}>{entry.emoji}</div>

        {/* Word */}
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: accent, lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-0.01em', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
          {word}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#1a2030', marginBottom: '20px' }} />

        {/* Definition */}
        <p style={{ fontSize: '13px', color: '#c8d4e0', lineHeight: 1.7, margin: '0 0 24px' }}>
          {definition}
        </p>

        {/* Example */}
        {example && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}22`, borderLeft: `3px solid ${accent}`, borderRadius: '0 6px 6px 0', padding: '12px 16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '8px', color: accent, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", marginBottom: '6px', opacity: 0.7 }}>
              {LABELS.example[lang]}
            </div>
            <p style={{ fontSize: '11px', color: '#8899b0', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>{example}</p>
          </div>
        )}

        {/* Extra */}
        {extra && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '8px', color: '#2a3345', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", marginBottom: '10px' }}>
              {LABELS.context[lang]}
            </div>
            <p style={{ fontSize: '12px', color: '#5a6a7d', lineHeight: 1.75, margin: 0 }}>{extra}</p>
          </div>
        )}

        {/* Chart */}
        {(() => {
          const ChartComponent = entry.chartId ? CHARTS[entry.chartId] : null;
          return ChartComponent ? (
            <div style={{ marginBottom: '32px', borderRadius: '10px', overflow: 'hidden' }}><ChartComponent /></div>
          ) : (
            <div style={{ border: '1px dashed #1e2530', borderRadius: '10px', padding: '28px 20px', textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.3 }}>📸</div>
              <div style={{ fontSize: '9px', color: '#2a3345', fontFamily: "'Space Mono', monospace", letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                {LABELS.soon[lang]}
              </div>
            </div>
          );
        })()}

        {/* Previous words */}
        <div style={{ borderTop: '1px solid #1e2530', paddingTop: '20px' }}>
          <div style={{ fontSize: '8px', color: '#2a3345', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", marginBottom: '12px' }}>
            {LABELS.previous[lang]}
          </div>
          {[-1, -2, -3, -4, -5].map(offset => {
            const e      = getWordForOffset(offset);
            const ac     = getAccentForOffset(offset);
            const lbl    = offset === -1 ? LABELS.yesterday[lang] : formatDate(offset, lang);
            const isSelected = offset === dayOffset;
            return (
              <div
                key={offset}
                onClick={() => onOffsetChange(offset)}
                style={{
                  padding: '10px 12px', marginBottom: '6px',
                  background: isSelected ? `${ac}0f` : '#0a0c0f',
                  border: `1px solid ${isSelected ? ac + '55' : '#1e2530'}`,
                  borderRadius: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = ac + '55'}
                onMouseLeave={e => e.currentTarget.style.borderColor = isSelected ? ac + '55' : '#1e2530'}
              >
                <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>{e.emoji}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '11px', color: isSelected ? ac : '#e2e8f0', fontFamily: "'Syne', sans-serif", fontWeight: 800, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    {e.word[lang] || e.word.en}
                  </div>
                  <div style={{ fontSize: '8px', color: '#4a5568', marginTop: '2px', fontFamily: "'Space Mono', monospace" }}>{lbl}</div>
                </div>
                {isSelected && <span style={{ fontSize: '8px', color: ac, flexShrink: 0 }}>●</span>}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// ─── Compact Card ─────────────────────────────────────────────────────────────

export default function WordOfTheDay() {
  const { lang } = useLang();
  const [showDetail, setShowDetail]   = useState(false);
  const [dayOffset, setDayOffset]     = useState(0);

  const entry  = getWordForOffset(dayOffset);
  const accent = getAccentForOffset(dayOffset);
  const word       = entry.word[lang]       || entry.word.en;
  const definition = entry.definition[lang] || entry.definition.en;

  const dayLabel = dayOffset === 0
    ? LABELS.today[lang]
    : dayOffset === -1
      ? LABELS.yesterday[lang]
      : formatDate(dayOffset, lang).toUpperCase();

  const navBtn = (disabled) => ({
    background: 'transparent', border: 'none',
    color: disabled ? '#2a3345' : '#4a5568',
    fontSize: '10px', cursor: disabled ? 'default' : 'pointer',
    padding: '0 2px', lineHeight: 1, flexShrink: 0,
  });

  return (
    <>
      {showDetail && (
        <DetailScreen
          dayOffset={dayOffset}
          onOffsetChange={setDayOffset}
          onClose={() => setShowDetail(false)}
        />
      )}

      <div style={{
        flex: 1, minWidth: 0, alignSelf: 'stretch',
        background: '#0f141b',
        border: '1px solid #1e2530',
        borderTop: `2px solid ${accent}`,
        borderRadius: '8px',
        padding: '10px 12px 12px',
        marginBottom: '12px',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header + day nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '4px' }}>
          <button
            onClick={() => setDayOffset(d => Math.max(d - 1, -30))}
            style={navBtn(false)}
            onMouseEnter={e => e.currentTarget.style.color = accent}
            onMouseLeave={e => e.currentTarget.style.color = '#4a5568'}
          >←</button>
          <span style={{ fontSize: '6px', color: '#2a3345', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", textAlign: 'center', flex: 1 }}>
            {dayLabel}
          </span>
          <button
            onClick={() => setDayOffset(d => Math.min(d + 1, 0))}
            disabled={dayOffset === 0}
            style={navBtn(dayOffset === 0)}
            onMouseEnter={e => { if (dayOffset < 0) e.currentTarget.style.color = accent; }}
            onMouseLeave={e => { if (dayOffset < 0) e.currentTarget.style.color = '#4a5568'; }}
          >→</button>
        </div>

        {/* Emoji + word */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '7px' }}>
          <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>{entry.emoji}</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '9px', color: accent, lineHeight: 1.25, minWidth: 0, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {word}
          </span>
        </div>

        {/* Definition — truncated */}
        <p style={{ fontSize: '8px', color: '#8899b0', margin: '0', lineHeight: 1.5, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
          {definition}
        </p>

        {/* Button */}
        <button
          onClick={() => setShowDetail(true)}
          style={{ marginTop: '9px', background: 'transparent', border: `1px solid ${accent}33`, borderRadius: '4px', padding: '3px 7px', color: accent, fontFamily: "'Space Mono', monospace", fontSize: '7px', cursor: 'pointer', letterSpacing: '0.06em', width: '100%', textAlign: 'center' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent + '88'; e.currentTarget.style.background = accent + '11'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = accent + '33'; e.currentTarget.style.background = 'transparent'; }}
        >
          {LABELS.more[lang]}
        </button>
      </div>
    </>
  );
}
