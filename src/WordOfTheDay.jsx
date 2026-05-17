import { useState } from 'react';
import { GLOSSARY } from './tradingGlossary.js';
import { useLang } from './LangContext.jsx';

const ACCENTS = ['#22d3a5', '#f5c842', '#8899b0'];

const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
const todayEntry = GLOSSARY[dayOfYear % GLOSSARY.length];
const accent = ACCENTS[dayOfYear % ACCENTS.length];

const LABELS = {
  header: { en: '— WORD OF DAY —', es: '— CONCEPTO DEL DÍA —', de: '— WORT DES TAGES —' },
  more:   { en: '↓ more', es: '↓ más', de: '↓ mehr' },
  less:   { en: '↑ less', es: '↑ menos', de: '↑ weniger' },
};

export default function WordOfTheDay() {
  const { lang } = useLang();
  const [expanded, setExpanded] = useState(false);

  const word       = todayEntry.word[lang]       || todayEntry.word.en;
  const definition = todayEntry.definition[lang] || todayEntry.definition.en;
  const example    = todayEntry.example?.[lang]  || todayEntry.example?.en;
  const extra      = todayEntry.extra?.[lang]     || todayEntry.extra?.en;

  return (
    <div style={{
      flexShrink: 0,
      width: '142px',
      background: '#0f141b',
      border: '1px solid #1e2530',
      borderTop: `2px solid ${accent}`,
      borderRadius: '8px',
      padding: '8px 10px 10px',
      marginBottom: '12px',
    }}>
      <div style={{
        fontSize: '6.5px',
        color: '#2a3345',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontFamily: "'Space Mono', monospace",
        marginBottom: '7px',
      }}>
        {LABELS.header[lang] || LABELS.header.en}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
        <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>{todayEntry.emoji}</span>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '12px',
          color: accent,
          lineHeight: 1.15,
          wordBreak: 'break-word',
        }}>
          {word}
        </span>
      </div>

      <p style={{
        fontSize: '8px',
        color: '#8899b0',
        margin: '0 0 5px',
        lineHeight: 1.55,
        wordBreak: 'break-word',
      }}>
        {definition}
      </p>

      {example && (
        <p style={{
          fontSize: '7.5px',
          color: '#3a4a5c',
          fontStyle: 'italic',
          margin: '0 0 7px',
          lineHeight: 1.45,
        }}>
          {example}
        </p>
      )}

      {expanded && extra && (
        <p style={{
          fontSize: '7.5px',
          color: '#5a6a7d',
          margin: '0 0 7px',
          lineHeight: 1.55,
        }}>
          {extra}
        </p>
      )}

      {extra && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'transparent',
            border: `1px solid ${accent}33`,
            borderRadius: '4px',
            padding: '2px 7px',
            color: accent,
            fontFamily: "'Space Mono', monospace",
            fontSize: '7px',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            display: 'block',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = accent + '88'}
          onMouseLeave={e => e.currentTarget.style.borderColor = accent + '33'}
        >
          {expanded ? (LABELS.less[lang] || LABELS.less.en) : (LABELS.more[lang] || LABELS.more.en)}
        </button>
      )}
    </div>
  );
}
