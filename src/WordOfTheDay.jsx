import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GLOSSARY } from './tradingGlossary.js';
import { CHARTS } from './glossaryCharts.jsx';
import { useLang } from './LangContext.jsx';
import ScreenHeader from './components/ui/ScreenHeader.jsx';
import SectionTitle from './components/ui/SectionTitle.jsx';
import FlatRow from './components/ui/FlatRow.jsx';

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

function getAccentForOffset(offset) {
  return ACCENTS[getUTCDoy(offset) % ACCENTS.length];
}

function formatDate(offset, lang) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString(
    lang === 'es' ? 'es-ES' : lang === 'de' ? 'de-DE' : 'en-GB',
    { day: 'numeric', month: 'short' }
  );
}

// ─── Detail Screen ────────────────────────────────────────────────────────────

function DetailScreen({ dayOffset, onOffsetChange, onClose }) {
  const { lang, t } = useLang();

  const entry  = getWordForOffset(dayOffset);
  const accent = getAccentForOffset(dayOffset);

  const word       = entry.word[lang]       || entry.word.en;
  const definition = entry.definition[lang] || entry.definition.en;
  const example    = entry.example?.[lang]  || entry.example?.en;
  const extra      = entry.extra?.[lang]    || entry.extra?.en;

  const dayLabel = dayOffset === 0
    ? t.wotd.today
    : dayOffset === -1
      ? t.wotd.yesterday
      : formatDate(dayOffset, lang);

  return (
    createPortal(
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-base)', zIndex: 9999, overflowY: 'auto' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', paddingTop: 'env(safe-area-inset-top, 0px)' }}>

          <ScreenHeader title={t.wotd.back} onBack={onClose} />

          <div style={{ padding: '0 20px 48px' }}>

            {/* Day navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '8px' }}>
              <button
                onClick={() => onOffsetChange(o => Math.max(o - 1, -30))}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <ChevronLeft size={18} strokeWidth={2} />
              </button>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', flex: 1 }}>
                {dayLabel}
              </span>
              <button
                onClick={() => onOffsetChange(o => Math.min(o + 1, 0))}
                disabled={dayOffset === 0}
                style={{ background: 'transparent', border: 'none', color: dayOffset === 0 ? 'var(--border-subtle)' : 'var(--text-muted)', cursor: dayOffset === 0 ? 'default' : 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <ChevronRight size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Section label */}
            <SectionTitle>{t.wotd.header}</SectionTitle>

            {/* Word title */}
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--font-size-title)', color: accent, lineHeight: 1.1, letterSpacing: '-0.01em', overflowWrap: 'break-word', wordBreak: 'break-word', marginBottom: '16px' }}>
              {word}
            </div>

            {/* Definition */}
            <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 24px' }}>
              {definition}
            </p>

            {/* Example */}
            {example && (
              <div style={{ background: `${accent}0d`, borderLeft: `3px solid ${accent}`, borderRadius: '0 6px 6px 0', padding: '12px 16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', color: accent, fontWeight: 800, fontFamily: 'var(--font-body)', marginBottom: '6px' }}>
                  {t.wotd.example}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>{example}</p>
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
            {(() => {
              const ChartComponent = entry.chartId ? CHARTS[entry.chartId] : null;
              return ChartComponent ? (
                <div style={{ marginBottom: '32px', borderRadius: '10px', overflow: 'hidden' }}>
                  <ChartComponent />
                </div>
              ) : null;
            })()}

            {/* Previous words */}
            <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '20px' }}>
              <SectionTitle>{t.wotd.previous}</SectionTitle>
              {[-1, -2, -3, -4, -5].map(offset => {
                const e   = getWordForOffset(offset);
                const lbl = offset === -1 ? t.wotd.yesterday : formatDate(offset, lang);
                const isSelected = offset === dayOffset;
                return (
                  <FlatRow
                    key={offset}
                    title={e.word[lang] || e.word.en}
                    onClick={() => onOffsetChange(offset)}
                    style={isSelected ? { borderLeft: `2px solid ${getAccentForOffset(offset)}`, paddingLeft: '10px' } : {}}
                    value={
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 400 }}>{lbl}</span>
                        <ChevronRight size={14} strokeWidth={2} style={{ color: 'var(--text-hint)', flexShrink: 0 }} />
                      </span>
                    }
                  />
                );
              })}
            </div>

          </div>
        </div>
      </div>,
      document.body
    )
  );
}

// ─── Compact Card ─────────────────────────────────────────────────────────────

export default function WordOfTheDay() {
  const { lang, t } = useLang();
  const [showDetail, setShowDetail] = useState(false);
  const [dayOffset,  setDayOffset]  = useState(0);

  const entry  = getWordForOffset(dayOffset);
  const accent = getAccentForOffset(dayOffset);
  const word       = entry.word[lang]       || entry.word.en;
  const definition = entry.definition[lang] || entry.definition.en;

  const dayLabel = dayOffset === 0
    ? t.wotd.today
    : dayOffset === -1
      ? t.wotd.yesterday
      : formatDate(dayOffset, lang);

  const navBtnStyle = (disabled) => ({
    background: 'transparent', border: 'none',
    color: disabled ? 'var(--border-subtle)' : 'var(--text-muted)',
    cursor: disabled ? 'default' : 'pointer',
    padding: '0 2px', lineHeight: 1, flexShrink: 0,
    display: 'flex', alignItems: 'center',
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

      <div style={{ flex: 1, minWidth: 0, alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>

        <SectionTitle onClick={() => setShowDetail(true)}>{t.home.sectionWordOfDay}</SectionTitle>

        {/* Day nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '4px' }}>
          <button
            onClick={() => setDayOffset(d => Math.max(d - 1, -30))}
            style={navBtnStyle(false)}
          >
            <ChevronLeft size={14} strokeWidth={2} />
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', textAlign: 'center', flex: 1 }}>
            {dayLabel}
          </span>
          <button
            onClick={() => setDayOffset(d => Math.min(d + 1, 0))}
            disabled={dayOffset === 0}
            style={navBtnStyle(dayOffset === 0)}
          >
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Word */}
        <div style={{ marginBottom: '7px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px', color: accent, lineHeight: 1.25 }}>
            {word}
          </span>
        </div>

        {/* Definition — truncated */}
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0', lineHeight: 1.5, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
          {definition}
        </p>

        {/* Button */}
        <button
          onClick={() => setShowDetail(true)}
          style={{ marginTop: '9px', background: 'transparent', border: `1px solid ${accent}33`, borderRadius: '4px', padding: '3px 7px', color: accent, fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', letterSpacing: '0.06em', width: '100%', textAlign: 'center' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = accent + '88'; e.currentTarget.style.background = accent + '11'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = accent + '33'; e.currentTarget.style.background = 'transparent'; }}
        >
          {t.wotd.more}
        </button>
      </div>
    </>
  );
}
