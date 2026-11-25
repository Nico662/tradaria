import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { GLOSSARY } from './tradingGlossary.js';
import { CHARTS } from './glossaryCharts.jsx';
import { useLang } from './LangContext.jsx';
import ScreenHeader from './components/ui/ScreenHeader.jsx';
import SectionTitle from './components/ui/SectionTitle.jsx';
import FlatRow from './components/ui/FlatRow.jsx';
import { ChevronRight } from 'lucide-react';

const ACCENTS = ['var(--green)', 'var(--color-neutral)', 'var(--text-secondary)'];

function getUTCDoy(offset) {
  const now = new Date();
  const d   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.floor((d - jan1) / 86400000) + 1;
}

function getWordForOffset(offset) {
  return GLOSSARY[getUTCDoy(offset) % GLOSSARY.length];
}

function getTodayAccent() {
  return ACCENTS[getUTCDoy(0) % ACCENTS.length];
}

function accentForIndex(i) {
  return ACCENTS[i % ACCENTS.length];
}

// ─── Word Detail ──────────────────────────────────────────────────────────────

function WordDetail({ index, onIndexChange, onBack }) {
  const { lang, t } = useLang();

  const entry  = GLOSSARY[index];
  const accent = accentForIndex(index);

  const word       = entry.word[lang]       || entry.word.en;
  const definition = entry.definition[lang] || entry.definition.en;
  const example    = entry.example?.[lang]  || entry.example?.en;
  const extra      = entry.extra?.[lang]    || entry.extra?.en;

  const ChartComponent = entry.chartId ? CHARTS[entry.chartId] : null;

  const hasPrev = index > 0;
  const hasNext = index < GLOSSARY.length - 1;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-base)', zIndex: 10000, overflowY: 'auto' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', paddingTop: 'env(safe-area-inset-top, 0px)' }}>

        <ScreenHeader title={t.wotd.back} onBack={onBack} />

        <div style={{ padding: '0 20px 60px' }}>

          {/* Word title */}
          <div style={{
            fontFamily: 'var(--font-body)', fontWeight: 800,
            fontSize: 'var(--font-size-title)', color: accent,
            lineHeight: 1.1, letterSpacing: '-0.01em',
            overflowWrap: 'break-word', wordBreak: 'break-word',
            marginBottom: '16px',
          }}>
            {word}
          </div>

          {/* Definition */}
          <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 24px' }}>
            {definition}
          </p>

          {/* Example */}
          {example && (
            <div style={{
              background: `${accent}0d`,
              borderLeft: `3px solid ${accent}`,
              borderRadius: '0 6px 6px 0',
              padding: '12px 16px', marginBottom: '24px',
            }}>
              <div style={{ fontSize: '12px', color: accent, fontWeight: 800, fontFamily: 'var(--font-body)', marginBottom: '6px' }}>
                {t.wotd.example}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
                {example}
              </p>
            </div>
          )}

          {/* More context */}
          {extra && (
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle>{t.wotd.context}</SectionTitle>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>{extra}</p>
            </div>
          )}

          {/* Chart */}
          {ChartComponent && (
            <div style={{ marginBottom: '32px', borderRadius: '10px', overflow: 'hidden' }}>
              <ChartComponent />
            </div>
          )}

          {/* Prev / Next text navigation */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: '1px solid var(--border-default)', paddingTop: '20px', marginBottom: '8px',
          }}>
            <button
              onClick={() => onIndexChange(index - 1)}
              disabled={!hasPrev}
              style={{
                background: 'transparent', border: 'none',
                color: hasPrev ? 'var(--text-secondary)' : 'var(--border-default)',
                fontFamily: 'var(--font-body)', fontSize: '13px',
                cursor: hasPrev ? 'pointer' : 'default', padding: '4px 0',
              }}
            >
              {hasPrev ? `← ${(GLOSSARY[index - 1].word[lang] || GLOSSARY[index - 1].word.en)}` : ''}
            </button>
            <button
              onClick={() => onIndexChange(index + 1)}
              disabled={!hasNext}
              style={{
                background: 'transparent', border: 'none',
                color: hasNext ? 'var(--text-secondary)' : 'var(--border-default)',
                fontFamily: 'var(--font-body)', fontSize: '13px',
                cursor: hasNext ? 'pointer' : 'default', padding: '4px 0', textAlign: 'right',
              }}
            >
              {hasNext ? `${(GLOSSARY[index + 1].word[lang] || GLOSSARY[index + 1].word.en)} →` : ''}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Glossary Browser ─────────────────────────────────────────────────────────

function GlossaryBrowser({ onClose }) {
  const { lang, t } = useLang();
  const [search,        setSearch]        = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return GLOSSARY.map((e, i) => ({ e, i }));
    return GLOSSARY
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => {
        const w = (e.word[lang] || e.word.en).toLowerCase();
        const d = (e.definition[lang] || e.definition.en).toLowerCase();
        return w.includes(q) || d.includes(q);
      });
  }, [search, lang]);

  if (selectedIndex !== null) {
    return createPortal(
      <WordDetail
        index={selectedIndex}
        onIndexChange={setSelectedIndex}
        onBack={() => setSelectedIndex(null)}
      />,
      document.body
    );
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-base)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', height: '100%', paddingTop: 'env(safe-area-inset-top, 0px)' }}>

        <ScreenHeader title={t.wotd.header} onBack={onClose} />

        {/* Search input */}
        <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={'Search...'}
            autoComplete="off"
            spellCheck={false}
            style={{
              width: '100%', padding: '10px 0',
              background: 'transparent', border: 'none',
              borderBottom: '1.5px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)', fontSize: '14px',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Term count */}
        <div style={{ padding: '0 20px 8px', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
            {filtered.length} {filtered.length === 1 ? 'term' : 'terms'}
          </span>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {filtered.map(({ e, i }) => {
            const word       = e.word[lang]       || e.word.en;
            const definition = e.definition[lang] || e.definition.en;
            const accent     = accentForIndex(i);
            return (
              <FlatRow
                key={i}
                title={word}
                subtitle={definition}
                onClick={() => setSelectedIndex(i)}
                value={
                  <ChevronRight size={14} strokeWidth={2} style={{ color: 'var(--text-hint)', flexShrink: 0 }} />
                }
                style={{ '--flat-row-title-color': accent }}
              />
            );
          })}
        </div>

      </div>
    </div>,
    document.body
  );
}

// ─── Compact Card ─────────────────────────────────────────────────────────────

export default function WordOfTheDay() {
  const { lang, t } = useLang();
  const [showGlossary, setShowGlossary] = useState(false);

  const entry      = getWordForOffset(0);
  const accent     = getTodayAccent();
  const word       = entry.word[lang]       || entry.word.en;
  const definition = entry.definition[lang] || entry.definition.en;

  return (
    <>
      {showGlossary && <GlossaryBrowser onClose={() => setShowGlossary(false)} />}

      <div style={{ flex: 1, minWidth: 0, alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>

        <SectionTitle onClick={() => setShowGlossary(true)}>{t.home.sectionWordOfDay}</SectionTitle>

        {/* Word */}
        <div style={{ marginBottom: '7px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: accent, lineHeight: 1.25 }}>
            {word}
          </span>
        </div>

        {/* Definition — truncated */}
        <p style={{
          fontSize: '13px', color: 'var(--text-secondary)',
          margin: '0', lineHeight: 1.5, flex: 1, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
        }}>
          {definition}
        </p>

        {/* Button */}
        <button
          onClick={() => setShowGlossary(true)}
          style={{
            marginTop: '9px', background: 'transparent',
            border: `1px solid ${accent}33`, borderRadius: '4px',
            padding: '3px 7px', color: accent,
            fontFamily: 'var(--font-body)', fontSize: '12px',
            cursor: 'pointer', letterSpacing: '0.06em',
            width: '100%', textAlign: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent + '88'; e.currentTarget.style.background = accent + '11'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = accent + '33'; e.currentTarget.style.background = 'transparent'; }}
        >
          {t.wotd.more}
        </button>
      </div>
    </>
  );
}
