import { useState, useCallback } from 'react';
import { ChevronLeft, User } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext';
import { SERVER } from './config';
import { FRAME_STYLES } from './UserAvatar';
import { AvatarSVG } from './components/AvatarSVGs';
import { BADGES, getUnlocked } from './badges';
import { USERNAME_COLORS } from './cosmeticColors';

const FRAME_META = {
  frame_gold:    { name: 'Gold Frame',    emoji: '🥇' },
  frame_neon:    { name: 'Neon Frame',    emoji: '💚' },
  frame_fire:    { name: 'Fire Frame',    emoji: '🔥' },
  frame_diamond: { name: 'Diamond Frame', emoji: '💎' },
};

const THEME_META = {
  theme_matrix:   { name: 'Matrix',       emoji: '🟩', accent: '#00ff41', bg: '#0a100c' },
  theme_blood:    { name: 'Blood Market', emoji: '🩸', accent: '#f05454', bg: '#120c0c' },
  theme_gold:     { name: 'Gold Rush',    emoji: '✨', accent: '#e6b432', bg: '#120f0a' },
  theme_midnight: { name: 'Midnight',     emoji: '🌙', accent: '#6b9fff', bg: '#0a0d14' },
};

const EFFECT_META = {
  effect_confetti:  { name: 'Confetti',  emoji: '🎉' },
  effect_lightning: { name: 'Lightning', emoji: '⚡' },
  effect_explosion: { name: 'Explosion', emoji: '💥' },
  effect_stars:     { name: 'Stars',     emoji: '⭐' },
};

const AVATAR_META = {
  avatar_bull:   'Bull',
  avatar_bear:   'Bear',
  avatar_whale:  'Whale',
  avatar_robot:  'AlgoBot',
  avatar_fox:    'Fox',
  avatar_dragon: 'Dragon',
};

const MINI_HEIGHTS = [0.4, 0.7, 0.3, 0.6, 0.9, 0.5, 0.65, 0.35];

export default function Inventory({ onBack }) {
  const { purchases, activeCosmetics, equipCosmetic, unequipCosmetic, user } = useAuth();
  const { t } = useLang();
  const [filter, setFilter] = useState('all');
  const [tickets, setTickets] = useState(user?.battlePassItems || []);
  const [busyTicket, setBusyTicket] = useState(false);
  const [ticketMsg, setTicketMsg] = useState(null); // { type: 'success'|'error', text: string }

  const ti = t.inventory;

  const ownedFrames   = purchases.filter(id => id && FRAME_META[id]);
  const ownedThemes   = purchases.filter(id => id && THEME_META[id]);
  const ownedAvatars  = purchases.filter(id => id && AVATAR_META[id]);
  const ownedEffects  = purchases.filter(id => id && EFFECT_META[id]);
  const ownedColors   = purchases.filter(id => id && USERNAME_COLORS[id]);
  const ownedBadges   = getUnlocked().map(id => BADGES.find(b => b.id === id)).filter(Boolean);
  const unusedTickets = tickets.filter(item => !item.used).length;

  const useTicket = useCallback(async () => {
    if (busyTicket || unusedTickets === 0) return;
    setBusyTicket(true);
    setTicketMsg(null);
    const tok = localStorage.getItem('tradaria_token');
    try {
      const res = await fetch(`${SERVER}/tickets/use`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTickets(prev => {
          const idx = prev.findIndex(t => !t.used);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], used: true };
          return next;
        });
        setTicketMsg({ type: 'success', text: ti.ticketRestored.replace('{n}', data.restoredTo) });
      } else if (data.error === 'NO_STREAK_TO_RESTORE') {
        setTicketMsg({ type: 'error', text: ti.ticketNoStreak });
      }
    } catch {}
    setBusyTicket(false);
  }, [busyTicket, unusedTickets, ti]);

  const isEmpty =
    ownedFrames.length === 0 && ownedThemes.length === 0 &&
    ownedAvatars.length === 0 && ownedEffects.length === 0 &&
    ownedColors.length === 0 && ownedBadges.length === 0 &&
    unusedTickets === 0;

  const chips = [
    { id: 'all',    label: ti.all },
    ownedFrames.length   > 0 && { id: 'frames',  label: ti.frames,  n: ownedFrames.length },
    ownedThemes.length   > 0 && { id: 'themes',  label: ti.themes,  n: ownedThemes.length },
    ownedAvatars.length  > 0 && { id: 'avatars', label: ti.avatars, n: ownedAvatars.length },
    ownedEffects.length  > 0 && { id: 'effects', label: ti.effects, n: ownedEffects.length },
    ownedColors.length   > 0 && { id: 'colors',  label: ti.colors,  n: ownedColors.length },
    ownedBadges.length   > 0 && { id: 'badges',  label: ti.badges,  n: ownedBadges.length },
    unusedTickets        > 0 && { id: 'tickets', label: ti.tickets, n: unusedTickets },
  ].filter(Boolean);

  const show = (section) => filter === 'all' || filter === section;

  function toggle(type, id) {
    if (activeCosmetics[type] === id) unequipCosmetic(type);
    else equipCosmetic(type, id);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '90px', fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', borderRadius: '8px' }}>
          <ChevronLeft size={22} />
        </button>
        <div>
          <div style={{ fontWeight: 900, fontSize: '22px', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{ti.title}</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '2px' }}>{ti.subtitle}</div>
        </div>
      </div>

      {/* Filter chips */}
      {!isEmpty && chips.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', padding: '6px 16px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {chips.map(chip => {
            const active = filter === chip.id;
            return (
              <button key={chip.id} onClick={() => setFilter(chip.id)} style={{
                flexShrink: 0,
                padding: '5px 14px',
                borderRadius: '999px',
                border: `1.5px solid ${active ? 'var(--border-green)' : 'var(--border-default)'}`,
                background: active ? 'var(--green-dim)' : 'var(--bg-elevated)',
                color: active ? 'var(--green)' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}>
                {chip.label}{chip.n ? ` · ${chip.n}` : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '70px 32px', textAlign: 'center', gap: '12px' }}>
          <div style={{ fontSize: '52px', lineHeight: 1 }}>📦</div>
          <div style={{ fontWeight: 900, fontSize: '18px', color: 'var(--text-primary)', marginTop: '4px' }}>{ti.empty}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '260px', lineHeight: 1.55 }}>{ti.emptySub}</div>
        </div>
      )}

      <div style={{ padding: '0 16px' }}>

        {/* MARCOS */}
        {show('frames') && ownedFrames.length > 0 && (
          <Section title={ti.frames}>
            {ownedFrames.map(id => {
              const meta = FRAME_META[id];
              const equipped = activeCosmetics.frame === id;
              return (
                <ItemCard key={id} equipped={equipped} onClick={() => toggle('frame', id)}>
                  <FramePreview id={id} />
                  <ItemLabel name={meta.name} equipped={equipped} ti={ti} />
                </ItemCard>
              );
            })}
          </Section>
        )}

        {/* TEMAS */}
        {show('themes') && ownedThemes.length > 0 && (
          <Section title={ti.themes}>
            {ownedThemes.map(id => {
              const meta = THEME_META[id];
              const equipped = activeCosmetics.theme === id;
              return (
                <ItemCard key={id} equipped={equipped} onClick={() => toggle('theme', id)}>
                  <ThemePreview meta={meta} />
                  <ItemLabel name={meta.name} equipped={equipped} ti={ti} />
                </ItemCard>
              );
            })}
          </Section>
        )}

        {/* AVATARES */}
        {show('avatars') && ownedAvatars.length > 0 && (
          <Section title={ti.avatars}>
            {ownedAvatars.map(id => {
              const equipped = activeCosmetics.avatar === id;
              return (
                <ItemCard key={id} equipped={equipped} onClick={() => toggle('avatar', id)}>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
                    <AvatarSVG id={id} size={56} />
                  </div>
                  <ItemLabel name={AVATAR_META[id] || id} equipped={equipped} ti={ti} />
                </ItemCard>
              );
            })}
          </Section>
        )}

        {/* EFECTOS */}
        {show('effects') && ownedEffects.length > 0 && (
          <Section title={ti.effects}>
            {ownedEffects.map(id => {
              const meta = EFFECT_META[id];
              const equipped = activeCosmetics.effect === id;
              return (
                <ItemCard key={id} equipped={equipped} onClick={() => toggle('effect', id)}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '68px', fontSize: '38px' }}>
                    {meta.emoji}
                  </div>
                  <ItemLabel name={meta.name} equipped={equipped} ti={ti} />
                </ItemCard>
              );
            })}
          </Section>
        )}

        {/* COLORES DE NOMBRE */}
        {show('colors') && ownedColors.length > 0 && (
          <Section title={ti.colors}>
            {ownedColors.map(id => {
              const meta = USERNAME_COLORS[id];
              const equipped = activeCosmetics.username_color === id;
              return (
                <ItemCard key={id} equipped={equipped} onClick={() => toggle('username_color', id)}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '68px' }}>
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '12px',
                      background: meta.hex,
                      boxShadow: `0 0 16px ${meta.hex}55`,
                    }} />
                  </div>
                  <div style={{ padding: '0 8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: meta.hex, letterSpacing: '0.04em' }}>{meta.name}</div>
                    <div style={{ fontSize: '10px', color: equipped ? 'var(--green)' : 'var(--t5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '3px' }}>
                      {equipped ? ti.equipped : ti.tap}
                    </div>
                  </div>
                  {equipped && <ActiveBadge />}
                </ItemCard>
              );
            })}
          </Section>
        )}

        {/* BADGES */}
        {show('badges') && ownedBadges.length > 0 && (
          <Section title={ti.badges}>
            {ownedBadges.map(badge => (
              <div key={badge.id} style={{
                background: 'var(--bg-surface)',
                border: '0.5px solid var(--border-default)',
                borderRadius: '12px',
                padding: '14px 8px 12px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}>
                <div style={{ fontSize: '30px', lineHeight: 1 }}>{badge.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.04em', lineHeight: 1.3 }}>{badge.name}</div>
              </div>
            ))}
          </Section>
        )}

        {/* TICKETS */}
        {show('tickets') && unusedTickets > 0 && (
          <Section title={ti.tickets}>
            <div style={{
              gridColumn: '1 / -1',
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border-default)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              <div style={{ fontSize: '30px', flexShrink: 0, lineHeight: 1 }}>🎫</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>{ti.ticketStreak}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 700 }}>
                  {ti.youHave} {unusedTickets}
                </div>
              </div>
              <button onClick={useTicket} disabled={busyTicket} style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--green)',
                background: 'var(--green-dim)',
                color: 'var(--green)',
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: busyTicket ? 'not-allowed' : 'pointer',
                opacity: busyTicket ? 0.6 : 1,
                flexShrink: 0,
              }}>
                {busyTicket ? '...' : ti.ticketUse}
              </button>
            </div>
            {ticketMsg && (
              <div style={{
                gridColumn: '1 / -1',
                marginTop: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                background: ticketMsg.type === 'success' ? 'var(--green-dim)' : 'var(--pink-dim)',
                color: ticketMsg.type === 'success' ? 'var(--green)' : 'var(--pink)',
                border: `0.5px solid ${ticketMsg.type === 'success' ? 'var(--border-green)' : 'var(--border-pink)'}`,
              }}>
                {ticketMsg.text}
              </div>
            )}
          </Section>
        )}

      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
        {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {children}
      </div>
    </div>
  );
}

function ItemCard({ equipped, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      position: 'relative',
      background: 'var(--bg-surface)',
      border: `1.5px solid ${equipped ? 'var(--green)' : 'var(--border-default)'}`,
      borderRadius: '12px',
      padding: 0,
      overflow: 'hidden',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      boxShadow: equipped ? '0 0 14px rgba(0,192,135,0.18)' : 'none',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {children}
      {equipped && <ActiveBadge />}
    </button>
  );
}

function ActiveBadge() {
  return (
    <div style={{
      position: 'absolute',
      top: '7px',
      right: '7px',
      background: 'var(--green)',
      color: '#000',
      fontSize: '9px',
      fontWeight: 900,
      letterSpacing: '0.06em',
      padding: '2px 6px',
      borderRadius: '4px',
      textTransform: 'uppercase',
      lineHeight: 1.5,
    }}>
      ON
    </div>
  );
}

function ItemLabel({ name, equipped, ti }) {
  return (
    <div style={{ padding: '0 10px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: '12px', fontWeight: 800, color: equipped ? 'var(--green)' : 'var(--text-muted)', letterSpacing: '0.04em' }}>
        {name}
      </div>
      <div style={{ fontSize: '10px', color: equipped ? 'var(--green)' : 'var(--t5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '3px' }}>
        {equipped ? ti.equipped : ti.tap}
      </div>
    </div>
  );
}

function FramePreview({ id }) {
  const frameStyle = FRAME_STYLES[id] || {};
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px' }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: '50%',
        background: 'var(--bg-card2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...frameStyle,
      }}>
        <User size={26} strokeWidth={1.5} color="var(--text-muted)" aria-hidden />
      </div>
    </div>
  );
}

function ThemePreview({ meta }) {
  return (
    <div style={{
      height: '70px',
      background: meta.bg,
      borderRadius: '10px 10px 0 0',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: '3px',
      padding: '0 10px 8px',
      overflow: 'hidden',
    }}>
      {MINI_HEIGHTS.map((h, i) => (
        <div key={i} style={{
          width: '8px',
          height: `${Math.round(h * 36) + 8}px`,
          background: i % 3 === 2 ? `${meta.accent}55` : meta.accent,
          borderRadius: '2px 2px 0 0',
          opacity: 0.85 + (i % 2) * 0.15,
        }} />
      ))}
    </div>
  );
}
