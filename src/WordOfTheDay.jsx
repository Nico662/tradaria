import { useState } from 'react';
import { GLOSSARY } from './tradingGlossary.js';
import { CHARTS } from './glossaryCharts.jsx';
import { useLang } from './LangContext.jsx';

const ACCENTS = ['#22d3a5', '#f5c842', '#8899b0'];

const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
const todayEntry = GLOSSARY[dayOfYear % GLOSSARY.length];
const accent = ACCENTS[dayOfYear % ACCENTS.length];

const LABELS = {
  header: { en: '— WORD OF DAY —', es: '— CONCEPTO DEL DÍA —', de: '— WORT DES TAGES —' },
  more:   { en: 'learn more →', es: 'saber más →', de: 'mehr erfahren →' },
  back:   { en: '← back', es: '← volver', de: '← zurück' },
  example: { en: 'Example', es: 'Ejemplo', de: 'Beispiel' },
  context: { en: 'More context', es: 'Más contexto', de: 'Mehr Kontext' },
  soon:   { en: 'Chart example · coming soon', es: 'Ejemplo con gráfico · próximamente', de: 'Chartbeispiel · demnächst' },
};

function DetailScreen({ onClose }) {
  const { lang } = useLang();

  const word       = todayEntry.word[lang]       || todayEntry.word.en;
  const definition = todayEntry.definition[lang] || todayEntry.definition.en;
  const example    = todayEntry.example?.[lang]  || todayEntry.example?.en;
  const extra      = todayEntry.extra?.[lang]     || todayEntry.extra?.en;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#080c11',
      zIndex: 9999,
      overflowY: 'auto',
    }}>
      <div style={{ padding: 'max(20px, calc(env(safe-area-inset-top) + 12px)) 28px 48px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Back */}
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#4a5568',
            fontFamily: "'Space Mono', monospace",
            fontSize: '10px',
            cursor: 'pointer',
            letterSpacing: '0.08em',
            padding: '8px 0',
            marginBottom: '32px',
            display: 'block',
          }}
          onMouseEnter={e => e.currentTarget.style.color = accent}
          onMouseLeave={e => e.currentTarget.style.color = '#4a5568'}
        >
          {LABELS.back[lang] || LABELS.back.en}
        </button>

        {/* Label */}
        <div style={{
          fontSize: '8px', color: '#2a3345',
          letterSpacing: '0.22em', textTransform: 'uppercase',
          fontFamily: "'Space Mono', monospace",
          marginBottom: '18px',
        }}>
          {LABELS.header[lang] || LABELS.header.en}
        </div>

        {/* Emoji */}
        <div style={{ fontSize: '56px', lineHeight: 1, marginBottom: '16px' }}>
          {todayEntry.emoji}
        </div>

        {/* Word */}
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '22px',
          color: accent,
          lineHeight: 1.1,
          marginBottom: '20px',
          letterSpacing: '-0.01em',
        }}>
          {word}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#1a2030', marginBottom: '20px' }} />

        {/* Definition */}
        <p style={{
          fontSize: '13px',
          color: '#c8d4e0',
          lineHeight: 1.7,
          margin: '0 0 24px',
        }}>
          {definition}
        </p>

        {/* Example */}
        {example && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${accent}22`,
            borderLeft: `3px solid ${accent}`,
            borderRadius: '0 6px 6px 0',
            padding: '12px 16px',
            marginBottom: '24px',
          }}>
            <div style={{
              fontSize: '8px', color: accent, letterSpacing: '0.14em',
              textTransform: 'uppercase', fontFamily: "'Space Mono', monospace",
              marginBottom: '6px', opacity: 0.7,
            }}>
              {LABELS.example[lang] || LABELS.example.en}
            </div>
            <p style={{ fontSize: '11px', color: '#8899b0', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
              {example}
            </p>
          </div>
        )}

        {/* Extra */}
        {extra && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              fontSize: '8px', color: '#2a3345', letterSpacing: '0.18em',
              textTransform: 'uppercase', fontFamily: "'Space Mono', monospace",
              marginBottom: '10px',
            }}>
              {LABELS.context[lang] || LABELS.context.en}
            </div>
            <p style={{ fontSize: '12px', color: '#5a6a7d', lineHeight: 1.75, margin: 0 }}>
              {extra}
            </p>
          </div>
        )}

        {/* Chart: real SVG if available, placeholder otherwise */}
        {(() => {
          const ChartComponent = todayEntry.chartId ? CHARTS[todayEntry.chartId] : null;
          return ChartComponent ? (
            <div style={{ marginTop: '8px', borderRadius: '10px', overflow: 'hidden' }}>
              <ChartComponent />
            </div>
          ) : (
            <div style={{
              border: '1px dashed #1e2530',
              borderRadius: '10px',
              padding: '36px 20px',
              textAlign: 'center',
              marginTop: '8px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.3 }}>📸</div>
              <div style={{
                fontSize: '9px', color: '#2a3345',
                fontFamily: "'Space Mono', monospace",
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>
                {LABELS.soon[lang] || LABELS.soon.en}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}

export default function WordOfTheDay() {
  const { lang } = useLang();
  const [showDetail, setShowDetail] = useState(false);

  const word       = todayEntry.word[lang]       || todayEntry.word.en;
  const definition = todayEntry.definition[lang] || todayEntry.definition.en;

  return (
    <>
      {showDetail && <DetailScreen onClose={() => setShowDetail(false)} />}

      <div style={{
        flex: 1,
        minWidth: 0,
        alignSelf: 'stretch',
        background: '#0f141b',
        border: '1px solid #1e2530',
        borderTop: `2px solid ${accent}`,
        borderRadius: '8px',
        padding: '10px 12px 12px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header label */}
        <div style={{
          fontSize: '6px',
          color: '#2a3345',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontFamily: "'Space Mono', monospace",
          marginBottom: '8px',
        }}>
          {LABELS.header[lang] || LABELS.header.en}
        </div>

        {/* Emoji + word */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '7px' }}>
          <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>{todayEntry.emoji}</span>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '9px',
            color: accent,
            lineHeight: 1.2,
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            minWidth: 0,
            flex: 1,
          }}>
            {word}
          </span>
        </div>

        {/* Definition — truncated */}
        <p style={{
          fontSize: '8px',
          color: '#8899b0',
          margin: '0',
          lineHeight: 1.5,
          flex: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
        }}>
          {definition}
        </p>

        {/* Button pinned to bottom */}
        <button
          onClick={() => setShowDetail(true)}
          style={{
            marginTop: '9px',
            background: 'transparent',
            border: `1px solid ${accent}33`,
            borderRadius: '4px',
            padding: '3px 7px',
            color: accent,
            fontFamily: "'Space Mono', monospace",
            fontSize: '7px',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            width: '100%',
            textAlign: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent + '88'; e.currentTarget.style.background = accent + '11'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = accent + '33'; e.currentTarget.style.background = 'transparent'; }}
        >
          {LABELS.more[lang] || LABELS.more.en}
        </button>
      </div>
    </>
  );
}
