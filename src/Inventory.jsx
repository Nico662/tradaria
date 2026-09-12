import { useState, useCallback } from 'react';
import { ChevronLeft, User, PackageOpen, Lock, Ticket, Sparkles, Trophy, Star, Crown, Medal, PartyPopper, Zap, Flame } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext';
import { SERVER } from './config';
import { FRAME_STYLES } from './UserAvatar';
import { AvatarSVG } from './components/AvatarSVGs';
import { USERNAME_COLORS } from './cosmeticColors';

const FRAME_META = {
  frame_gold:    { name: 'Gold Frame'    },
  frame_neon:    { name: 'Neon Frame'    },
  frame_fire:    { name: 'Fire Frame'    },
  frame_diamond: { name: 'Diamond Frame' },
};

const THEME_META = {
  theme_matrix:   { name: 'Matrix',       accent: '#00ff41', bg: '#0a100c' },
  theme_blood:    { name: 'Blood Market', accent: '#f05454', bg: '#120c0c' },
  theme_gold:     { name: 'Gold Rush',    accent: '#e6b432', bg: '#120f0a' },
  theme_midnight: { name: 'Midnight',     accent: '#6b9fff', bg: '#0a0d14' },
};

const EFFECT_META = {
  effect_confetti:  { name: 'Confetti',  Icon: PartyPopper, color: '#f5c842' },
  effect_lightning: { name: 'Lightning', Icon: Zap,         color: '#6b9fff' },
  effect_explosion: { name: 'Explosion', Icon: Flame,       color: '#e05555' },
  effect_stars:     { name: 'Stars',     Icon: Sparkles,    color: '#f5c842' },
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

// ── Próximamente (Trader Pass teaser) ─────────────────────────────
const COMING_SOON = [
  { type: 'avatar', id: 'avatar_fox',      name: 'Fox',          hasPreview: true },
  { type: 'avatar', id: 'avatar_dragon',   name: 'Dragon',       hasPreview: true },
  { type: 'theme',  id: 'theme_midnight',  name: 'Midnight',     accent: '#6b9fff', bg: '#0a0d14', hasPreview: true },
  { type: 'theme',  id: 'theme_aurora',    name: 'Aurora',       lucideIcon: Sparkles, iconColor: '#6b9fff', hasPreview: false },
  { type: 'color',  id: 'color_green',     name: 'Verde',        hex: '#22c55e' },
  { type: 'color',  id: 'color_gold',      name: 'Dorado',       hex: '#f5c842' },
  { type: 'color',  id: 'color_red',       name: 'Rojo',         hex: '#e05555' },
  { type: 'color',  id: 'color_purple',    name: 'Morado',       hex: '#a855f7' },
  { type: 'frame',  id: 'frame_season1',   name: 'Season 1',     lucideIcon: Trophy, iconColor: 'var(--color-neutral)', hasPreview: false },
  { type: 'badge',  id: 'badge_early',     name: 'Early Trader', lucideIcon: Star,   iconColor: 'var(--color-neutral)' },
  { type: 'badge',  id: 'badge_elite',     name: 'Elite',        lucideIcon: Crown,  iconColor: 'var(--color-neutral)' },
  { type: 'badge',  id: 'badge_season1',   name: 'Season 1',     lucideIcon: Medal,  iconColor: 'var(--color-neutral)' },
];

export default function Inventory({ onBack }) {
  const { purchases, activeCosmetics, equipCosmetic, unequipCosmetic, user } = useAuth();
  const { t } = useLang();
  const [filter, setFilter] = useState('all');
  const [tickets, setTickets] = useState(user?.battlePassItems || []);
  const [busyTicket, setBusyTicket] = useState(false);
  const [ticketMsg, setTicketMsg] = useState(null);

  const ti = t.inventory;

  const ownedFrames   = purchases.filter(id => id && FRAME_META[id]);
  const ownedThemes   = purchases.filter(id => id && THEME_META[id]);
  const ownedAvatars  = purchases.filter(id => id && AVATAR_META[id]);
  const ownedEffects  = purchases.filter(id => id && EFFECT_META[id]);
  const ownedColors   = purchases.filter(id => id && USERNAME_COLORS[id]);
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
    ownedColors.length === 0 &&
    unusedTickets === 0;

  const chips = [
    { id: 'all',    label: ti.all },
    ownedFrames.length   > 0 && { id: 'frames',  label: ti.frames,  n: ownedFrames.length },
    ownedThemes.length   > 0 && { id: 'themes',  label: ti.themes,  n: ownedThemes.length },
    ownedAvatars.length  > 0 && { id: 'avatars', label: ti.avatars, n: ownedAvatars.length },
    ownedEffects.length  > 0 && { id: 'effects', label: ti.effects, n: ownedEffects.length },
    ownedColors.length   > 0 && { id: 'colors',  label: ti.colors,  n: ownedColors.length },
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
        <button onClick={onBack} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', borderRadius: '8px', WebkitAppearance: 'none', appearance: 'none' }}>
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
                WebkitAppearance: 'none',
                appearance: 'none',
              }}>
                {chip.label}{chip.n ? ` · ${chip.n}` : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '70px 32px 24px', textAlign: 'center', gap: '12px' }}>
          <PackageOpen size={52} strokeWidth={1.2} color="var(--text-muted)" aria-hidden />
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
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0 6px' }}>
                    <meta.Icon size={38} color={meta.color} strokeWidth={1.5} aria-hidden />
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
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0 6px' }}>
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '12px',
                      background: meta.hex,
                      boxShadow: `0 0 16px ${meta.hex}55`,
                    }} />
                  </div>
                  <ItemLabel name={meta.name} equipped={equipped} ti={ti} />
                </ItemCard>
              );
            })}
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
              <Ticket size={28} strokeWidth={1.5} color="var(--text-muted)" aria-hidden style={{ flexShrink: 0 }} />
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
                WebkitAppearance: 'none',
                appearance: 'none',
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

        {/* PRÓXIMAMENTE — Trader Pass teaser */}
        {filter === 'all' && (
          <div style={{ marginTop: isEmpty ? '0' : '8px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {ti.traderPassTeaser}
              </div>
              <div style={{
                fontSize: '9px', fontWeight: 900, letterSpacing: '0.1em',
                background: 'var(--pink-dim)', color: 'var(--pink)',
                border: '0.5px solid var(--border-pink)', borderRadius: '4px',
                padding: '2px 7px', textTransform: 'uppercase',
              }}>
                {ti.ticketSoon}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {COMING_SOON.map(item => (
                <LockedCard key={item.id} item={item} locked={ti.locked} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function LockedCard({ item, locked }) {
  return (
    <div style={{
      position: 'relative',
      background: 'var(--bg-surface)',
      border: '1.5px solid var(--border-default)',
      borderRadius: '12px',
      overflow: 'hidden',
      opacity: 0.72,
    }}>
      {/* Preview */}
      <LockedPreview item={item} />
      {/* Name */}
      <div style={{ padding: '0 10px 10px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          {item.name}
        </div>
      </div>
      {/* Lock overlay badge */}
      <div style={{
        position: 'absolute',
        top: '7px',
        right: '7px',
        background: 'rgba(0,0,0,0.75)',
        color: 'var(--text-muted)',
        fontSize: '9px',
        fontWeight: 900,
        letterSpacing: '0.06em',
        padding: '2px 6px',
        borderRadius: '4px',
        textTransform: 'uppercase',
        lineHeight: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
      }}>
        <Lock size={9} strokeWidth={2.5} aria-hidden /> {locked}
      </div>
    </div>
  );
}

function LockedPreview({ item }) {
  if (item.type === 'avatar' && item.hasPreview) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
        <AvatarSVG id={item.id} size={56} />
      </div>
    );
  }
  if (item.type === 'theme' && item.hasPreview) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0 6px' }}>
        <div style={{
          width: '64px',
          height: '48px',
          background: item.bg,
          borderRadius: '8px',
          border: `1.5px solid ${item.accent}44`,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '2px',
          padding: '0 6px 5px',
          overflow: 'hidden',
        }}>
          {MINI_HEIGHTS.slice(0, 6).map((h, i) => (
            <div key={i} style={{
              width: '6px',
              height: `${Math.round(h * 26) + 5}px`,
              background: i % 3 === 2 ? `${item.accent}55` : item.accent,
              borderRadius: '1px 1px 0 0',
              opacity: 0.85 + (i % 2) * 0.15,
            }} />
          ))}
        </div>
      </div>
    );
  }
  if (item.type === 'color') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0 6px' }}>
        <div style={{
          width: '46px', height: '46px', borderRadius: '12px',
          background: item.hex,
          boxShadow: `0 0 16px ${item.hex}55`,
        }} />
      </div>
    );
  }
  // Lucide icon (Aurora, frame Season 1, badges)
  if (item.lucideIcon) {
    const IconComp = item.lucideIcon;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0 6px' }}>
        <IconComp size={36} color={item.iconColor || 'var(--text-muted)'} strokeWidth={1.5} aria-hidden />
      </div>
    );
  }
  return null;
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
      textAlign: 'center',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      boxShadow: equipped ? '0 0 14px rgba(0,192,135,0.18)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      WebkitAppearance: 'none',
      appearance: 'none',
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
    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0 6px' }}>
      <div style={{
        width: '64px',
        height: '48px',
        background: meta.bg,
        borderRadius: '8px',
        border: `1.5px solid ${meta.accent}44`,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: '2px',
        padding: '0 6px 5px',
        overflow: 'hidden',
      }}>
        {MINI_HEIGHTS.slice(0, 6).map((h, i) => (
          <div key={i} style={{
            width: '6px',
            height: `${Math.round(h * 26) + 5}px`,
            background: i % 3 === 2 ? `${meta.accent}55` : meta.accent,
            borderRadius: '1px 1px 0 0',
            opacity: 0.85 + (i % 2) * 0.15,
          }} />
        ))}
      </div>
    </div>
  );
}
