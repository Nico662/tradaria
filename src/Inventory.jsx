import { useState, useCallback } from 'react';
import { PackageOpen, Lock, Ticket, Sparkles, Trophy, Star, Swords, Medal, PartyPopper, Zap, Flame } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLang } from './LangContext';
import { SERVER } from './config';
import UserAvatar from './UserAvatar';
import { AvatarSVG } from './components/AvatarSVGs';
import { USERNAME_COLORS, TITLE_LABELS } from './cosmeticColors';
import BadgeIcon, { RARITY_COLORS, BADGE_COLOR_OVERRIDES } from './BadgeIcon.jsx';
import { ScreenHeader, TextTabs, SectionTitle, FlatRow, StatusText } from './components/ui';

const FRAME_META = {
  frame_gold:    { name: 'Gold Frame'    },
  frame_neon:    { name: 'Neon Frame'    },
  frame_fire:    { name: 'Fire Frame'    },
  frame_diamond: { name: 'Diamond Frame' },
  frame_season1: { name: 'Season 1'     },
};

const THEME_META = {
  theme_matrix:   { name: 'Matrix',       accent: '#00ff41', bg: '#0a100c' },
  theme_blood:    { name: 'Blood Market', accent: '#f05454', bg: '#120c0c' },
  theme_gold:     { name: 'Gold Rush',    accent: '#e6b432', bg: '#120f0a' },
  theme_midnight: { name: 'Midnight',     accent: '#6b9fff', bg: '#0a0d14' },
  theme_aurora:   { name: 'Aurora',       accent: '#c084fc', bg: '#0d0a14' },
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

// ── BP Badge metadata ─────────────────────────────────────────────
const BP_BADGE_META = [
  { id: 'bp_s1_early_trader',  name: 'Early Trader',  rarity: 'rare'   },
  { id: 'bp_s1_elite',         name: 'Elite',         rarity: 'epic'   },
  { id: 'bp_s1_season1_pro',   name: 'Season 1 Pro',  rarity: 'epic'   },
  { id: 'bp_s1_season1',       name: 'Season 1',      rarity: 'legend' },
  { id: 'bp_s1_champion',      name: 'Champion',      rarity: 'legend' },
];

// ── Próximamente (Trader Pass teaser) ─────────────────────────────
const COMING_SOON = [
  { type: 'avatar', id: 'avatar_fox',          name: 'Fox',          hasPreview: true },
  { type: 'avatar', id: 'avatar_dragon',        name: 'Dragon',       hasPreview: true },
  { type: 'theme',  id: 'theme_aurora',         name: 'Aurora',       accent: '#c084fc', bg: '#0d0a14', hasPreview: true },
  { type: 'color',  id: 'color_green',          name: 'Verde',        hex: '#22c55e' },
  { type: 'color',  id: 'color_gold',           name: 'Dorado',       hex: '#f5c842' },
  { type: 'color',  id: 'color_red',            name: 'Rojo',         hex: '#e05555' },
  { type: 'color',  id: 'color_purple',         name: 'Morado',       hex: '#a855f7' },
  { type: 'frame',  id: 'frame_season1',        name: 'Season 1',     lucideIcon: Trophy, iconColor: 'var(--color-neutral)', hasPreview: false },
  { type: 'badge',  id: 'bp_s1_early_trader',   name: 'Early Trader',  lucideIcon: Star,   iconColor: 'var(--color-neutral)' },
  { type: 'badge',  id: 'bp_s1_elite',          name: 'Elite',         lucideIcon: Swords, iconColor: 'var(--color-neutral)' },
  { type: 'badge',  id: 'bp_s1_season1_pro',    name: 'Season 1 Pro',  lucideIcon: Star,   iconColor: 'var(--color-neutral)' },
  { type: 'badge',  id: 'bp_s1_season1',        name: 'Season 1',      lucideIcon: Medal,  iconColor: 'var(--color-neutral)' },
  { type: 'badge',  id: 'bp_s1_champion',       name: 'Champion',      lucideIcon: Trophy, iconColor: 'var(--color-neutral)' },
];

export default function Inventory({ onBack }) {
  const { purchases, activeCosmetics, equipCosmetic, unequipCosmetic, user, updateUser } = useAuth();
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

  const TITLE_IDS = new Set([
    'title_market_watcher','title_chart_reader','title_risk_taker',
    'title_bull_runner','title_bear_hunter','title_survivor','title_veteran',
  ]);
  const ownedTitles = purchases.filter(id => id && TITLE_IDS.has(id));
  const ownedBpBadges = BP_BADGE_META.filter(b => (user?.badges || []).includes(b.id));

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
        updateUser({ dailyStreak: data.restoredTo, lastPlayed: data.lastPlayed, streakBeforeLoss: 0 });
        localStorage.setItem('tradaria_daily_streak', String(data.restoredTo));
        if (data.lastPlayed) {
          localStorage.setItem('tradaria_daily_last', data.lastPlayed);
          localStorage.setItem('tradaria_last_played', data.lastPlayed);
        }
        setTicketMsg({ type: 'success', text: ti.ticketRestored.replace('{n}', data.restoredTo) });
      } else {
        const errKey =
          data.error === 'No tickets available'  ? 'ticketNoTicket' :
          data.error === 'NO_STREAK_TO_RESTORE'  ? 'ticketNoStreak' :
                                                   'ticketNetworkError';
        setTicketMsg({ type: 'error', text: ti[errKey] });
      }
    } catch {
      setTicketMsg({ type: 'error', text: ti.ticketNetworkError });
    }
    setBusyTicket(false);
  }, [busyTicket, unusedTickets, ti, updateUser]);

  const isEmpty =
    ownedFrames.length === 0 && ownedThemes.length === 0 &&
    ownedAvatars.length === 0 && ownedEffects.length === 0 &&
    ownedColors.length === 0 && ownedTitles.length === 0 &&
    ownedBpBadges.length === 0 && unusedTickets === 0;

  const chips = [
    { id: 'all',    label: ti.all },
    ownedFrames.length   > 0 && { id: 'frames',  label: ti.frames,  n: ownedFrames.length },
    ownedThemes.length   > 0 && { id: 'themes',  label: ti.themes,  n: ownedThemes.length },
    ownedAvatars.length  > 0 && { id: 'avatars', label: ti.avatars, n: ownedAvatars.length },
    ownedEffects.length  > 0 && { id: 'effects', label: ti.effects, n: ownedEffects.length },
    ownedColors.length   > 0 && { id: 'colors',  label: ti.colors,  n: ownedColors.length },
    ownedTitles.length   > 0 && { id: 'titles',  label: 'Titles',   n: ownedTitles.length },
    ownedBpBadges.length > 0 && { id: 'badges',  label: 'Badges',   n: ownedBpBadges.length },
    unusedTickets        > 0 && { id: 'tickets', label: ti.tickets, n: unusedTickets },
  ].filter(Boolean);

  const show = (section) => filter === 'all' || filter === section;

  function toggle(type, id) {
    if (activeCosmetics[type] === id) unequipCosmetic(type);
    else equipCosmetic(type, id);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '90px', fontFamily: 'var(--font-body)' }}>

      <ScreenHeader title={ti.title} subtitle={ti.subtitle} onBack={onBack} />

      {/* Filter tabs */}
      {!isEmpty && chips.length > 1 && (
        <TextTabs
          tabs={chips.map(c => ({ value: c.id, label: `${c.label}${c.n ? ` · ${c.n}` : ''}` }))}
          active={filter}
          onChange={setFilter}
          style={{ padding: '0 16px 12px' }}
        />
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
                <FlatRow key={id}
                  icon={<FramePreview id={id} small />}
                  title={meta.name}
                  onClick={() => toggle('frame', id)}
                  chevron={false}
                  value={<EquipValue equipped={equipped} ti={ti} onClick={() => toggle('frame', id)} />}
                />
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
                <FlatRow key={id}
                  icon={<ThemePreview meta={meta} id={id} small />}
                  title={meta.name}
                  onClick={() => toggle('theme', id)}
                  chevron={false}
                  value={<EquipValue equipped={equipped} ti={ti} onClick={() => toggle('theme', id)} />}
                />
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
                <FlatRow key={id}
                  icon={<AvatarSVG id={id} size={32} />}
                  title={AVATAR_META[id] || id}
                  onClick={() => toggle('avatar', id)}
                  chevron={false}
                  value={<EquipValue equipped={equipped} ti={ti} onClick={() => toggle('avatar', id)} />}
                />
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
                <FlatRow key={id}
                  icon={<meta.Icon size={22} color={meta.color} strokeWidth={1.5} aria-hidden />}
                  title={meta.name}
                  onClick={() => toggle('effect', id)}
                  chevron={false}
                  value={<EquipValue equipped={equipped} ti={ti} onClick={() => toggle('effect', id)} />}
                />
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
                <FlatRow key={id}
                  icon={<div style={{ width: 22, height: 22, borderRadius: 6, background: meta.hex }} />}
                  title={meta.name}
                  onClick={() => toggle('username_color', id)}
                  chevron={false}
                  value={<EquipValue equipped={equipped} ti={ti} onClick={() => toggle('username_color', id)} />}
                />
              );
            })}
          </Section>
        )}

        {/* TÍTULOS */}
        {show('titles') && ownedTitles.length > 0 && (
          <Section title="Titles">
            {ownedTitles.map(id => {
              const name = TITLE_LABELS[id] || id;
              const equipped = activeCosmetics.title === id;
              return (
                <FlatRow key={id}
                  icon={<span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--color-neutral)', border: '0.5px solid rgba(196,154,42,0.3)', borderRadius: 4, padding: '2px 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{name}</span>}
                  title={name}
                  onClick={() => toggle('title', id)}
                  chevron={false}
                  value={<EquipValue equipped={equipped} ti={ti} onClick={() => toggle('title', id)} />}
                />
              );
            })}
          </Section>
        )}

        {/* TICKETS */}
        {show('tickets') && unusedTickets > 0 && (
          <Section title={ti.tickets}>
            <FlatRow
              icon={<Ticket size={20} strokeWidth={1.5} color="var(--text-muted)" aria-hidden />}
              title={ti.ticketStreak}
              subtitle={`${ti.youHave} ${unusedTickets}`}
              chevron={false}
              value={
                <button onClick={useTicket} disabled={busyTicket} style={{
                  padding: '6px 12px', borderRadius: '6px',
                  border: '1px solid var(--green)', background: 'var(--green-dim)',
                  color: 'var(--green)', fontFamily: 'var(--font-body)',
                  fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em',
                  cursor: busyTicket ? 'not-allowed' : 'pointer',
                  opacity: busyTicket ? 0.6 : 1, flexShrink: 0,
                  WebkitAppearance: 'none', appearance: 'none',
                }}>
                  {busyTicket ? '...' : ti.ticketUse}
                </button>
              }
            />
            {ticketMsg && (
              <div style={{
                marginTop: '4px', padding: '10px 14px', borderRadius: '8px',
                fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-body)',
                background: ticketMsg.type === 'success' ? 'var(--green-dim)' : 'var(--pink-dim)',
                color: ticketMsg.type === 'success' ? 'var(--green)' : 'var(--pink)',
                border: `0.5px solid ${ticketMsg.type === 'success' ? 'var(--border-green)' : 'var(--border-pink)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
              }}>
                <span>{ticketMsg.text}</span>
                <button onClick={() => setTicketMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: '16px', lineHeight: 1, flexShrink: 0 }} aria-label="close">×</button>
              </div>
            )}
          </Section>
        )}

        {/* BP Badges earned */}
        {show('badges') && ownedBpBadges.length > 0 && (
          <Section title="Badges">
            {ownedBpBadges.map(badge => {
              const equipped = activeCosmetics.badge === badge.id;
              const color = BADGE_COLOR_OVERRIDES[badge.id] ?? RARITY_COLORS[badge.rarity] ?? RARITY_COLORS.common;
              return (
                <FlatRow key={badge.id}
                  icon={<div style={{ color }}><BadgeIcon id={badge.id} size={22} /></div>}
                  title={badge.name}
                  onClick={() => toggle('badge', badge.id)}
                  chevron={false}
                  value={<EquipValue equipped={equipped} ti={ti} onClick={() => toggle('badge', badge.id)} />}
                />
              );
            })}
          </Section>
        )}

        {/* PRÓXIMAMENTE — Trader Pass teaser */}
        {filter === 'all' && (
          <div style={{ marginTop: isEmpty ? '0' : '8px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <SectionTitle style={{ marginBottom: 0 }}>{ti.traderPassTeaser}</SectionTitle>
              <StatusText color="var(--pink)">{ti.ticketSoon}</StatusText>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {COMING_SOON.filter(item => {
                if (item.type === 'badge') {
                  const userBadges = user?.badges || [];
                  return !userBadges.includes(item.id);
                }
                return !purchases.includes(item.id);
              }).map(item => (
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
          position: 'relative',
        }}>
          {item.id === 'theme_aurora' && AURORA_BANDS.map((b, i) => (
            <div key={i} className="game-aurora-band" style={{
              position: 'absolute',
              top: '-20%',
              left: 0,
              width: b.w,
              height: '150%',
              background: `linear-gradient(90deg, transparent, ${b.color}, transparent)`,
              pointerEvents: 'none',
              zIndex: 0,
              animation: `game-aurora-sweep ${b.dur} linear ${b.delay} infinite`,
            }} />
          ))}
          {MINI_HEIGHTS.slice(0, 6).map((h, i) => (
            <div key={i} style={{
              width: '6px',
              height: `${Math.round(h * 26) + 5}px`,
              background: i % 3 === 2 ? `${item.accent}55` : item.accent,
              borderRadius: '1px 1px 0 0',
              opacity: 0.85 + (i % 2) * 0.15,
              position: 'relative',
              zIndex: 1,
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
    <div style={{ marginBottom: '20px' }}>
      <SectionTitle>{title}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

function EquipValue({ equipped, ti, onClick }) {
  return equipped
    ? <StatusText color="var(--green)">{ti.equipped}</StatusText>
    : <span
        onClick={onClick}
        style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}
      >{ti.tap}</span>;
}

function FramePreview({ id, small }) {
  const { user } = useAuth();
  const previewUser = { ...user, activeCosmetics: { ...(user?.activeCosmetics || {}), frame: id } };
  if (small) return <UserAvatar user={previewUser} size={32} />;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
      <UserAvatar user={previewUser} size={52} />
    </div>
  );
}

const AURORA_BANDS = [
  { w: '40%', color: 'rgba(45,212,160,0.22)',  dur: '9s',  delay: '0s'  },
  { w: '30%', color: 'rgba(192,132,252,0.24)', dur: '12s', delay: '3s'  },
  { w: '22%', color: 'rgba(45,212,160,0.16)',  dur: '15s', delay: '6s'  },
];

function ThemePreview({ meta, id, small }) {
  const w = small ? '36px' : '64px';
  const h = small ? '28px' : '48px';
  const inner = (
    <div style={{
      width: w, height: h,
      background: meta.bg,
      borderRadius: '8px',
      border: `1.5px solid ${meta.accent}44`,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      gap: '2px', padding: '0 6px 5px', overflow: 'hidden', position: 'relative',
    }}>
      {id === 'theme_aurora' && AURORA_BANDS.map((b, i) => (
        <div key={i} className="game-aurora-band" style={{
          position: 'absolute', top: '-20%', left: 0, width: b.w, height: '150%',
          background: `linear-gradient(90deg, transparent, ${b.color}, transparent)`,
          pointerEvents: 'none', zIndex: 0,
          animation: `game-aurora-sweep ${b.dur} linear ${b.delay} infinite`,
        }} />
      ))}
      {MINI_HEIGHTS.slice(0, 6).map((h2, i) => (
        <div key={i} style={{
          width: '6px', height: `${Math.round(h2 * 26) + 5}px`,
          background: i % 3 === 2 ? `${meta.accent}55` : meta.accent,
          borderRadius: '1px 1px 0 0', opacity: 0.85 + (i % 2) * 0.15,
          position: 'relative', zIndex: 1,
        }} />
      ))}
    </div>
  );
  if (small) return inner;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0 6px' }}>
      {inner}
    </div>
  );
}
