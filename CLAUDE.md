# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (root)
```bash
npm run dev       # start Vite dev server (HMR)
npm run build     # production build → dist/
npm run preview   # preview production build locally
npm run lint      # ESLint
```

### Backend (`server/`)
```bash
cd server && npm start   # node index.js
```

There are no automated tests in this repo.

## Architecture

### Two-process setup
The app is split into two independent deployments:
- **Frontend** — React 19 + Vite SPA, deployed on Vercel. `vercel.json` rewrites all routes to `index.html`.
- **Backend** — Node/Express monolith (`server/index.js`), deployed on Railway. URL is hardcoded in `src/config.js` as `SERVER`.

The frontend communicates with the backend via:
- `fetch` with `Authorization: Bearer <token>` headers (JWT stored in `localStorage` as `tradaria_token`)
- Socket.IO for real-time features (friend challenges, arena matches, tournaments)

### Navigation — no React Router
All screen navigation is a `screen` state string in `App.jsx`. Screens include `home`, `game`, `arena`, `tournament`, `survival`, `daily`, `historical`, `portfolio`, `friends`, `stats`, `badges`, `shop`, `settings`, `pricing`, `legal`, `public_profile`, `join_academy`, `student_dashboard`, `teacher_dashboard`. The only URL-based routing is `/u/:username` for public profiles, handled manually with `window.history.pushState`.

### Auth flow
Google OAuth via Passport.js on the backend → short-lived `code` param on redirect URL → frontend calls `POST /auth/exchange` → receives JWT → stored in `localStorage`. `AuthContext.jsx` manages `user`, `purchases`, `activeCosmetics`, and `syncProgress()` (syncs XP + badges to server).

### Contexts (wrap entire app in `main.jsx`)
- `AuthProvider` — user session, cosmetics, level-up overlay
- `LangProvider` — active language (`en`/`es`/`de`), `t` translation object from `i18n.js`

Access via `useAuth()` and `useLang()` hooks.

### Client-side game state
Several systems are purely localStorage-based and synced to the server only after auth:
- **XP / Levels** — `levels.js`. Keys: `tradaria_xp`. Levels: Rookie → Trader → Pro → Expert → Legend.
- **Badges** — `badges.js`. `unlockBadge(id)` writes to `tradaria_badges`. All badge unlock conditions are checked inside `App.jsx`.
- **Daily Missions** — `missions.js`. Three missions are seeded from the current date. Progress stored as `tradaria_missions_<date>`.
- All localStorage keys are prefixed with `tradaria_`.

### Chart system (`Chart.jsx`)
Uses `lightweight-charts` v5. Data is fetched from three sources depending on the asset type:
- **Crypto** → Binance public API (called directly from the client)
- **Forex** → `GET /candles` on the backend (Yahoo Finance proxy)
- **Indices/Commodities** → Alpha Vantage via the backend

Falls back to `generateCandles()` (synthetic random-walk) on failure. The `Chart` component exposes an imperative ref API: `getCandles()`, `revealFuture(candles, cb)`, `getRealReveal()`, `reshuffleWindow()`.

### Word of the Day
- **Data**: `src/tradingGlossary.js` — `GLOSSARY` array of 34 trading terms, each with multilingual `word`/`definition`/`example`/`extra`, an `emoji`, and an optional `chartId`.
- **Charts**: `src/glossaryCharts.jsx` — inline SVG components exported as a `CHARTS` object keyed by `chartId`. All charts use a 188×158 viewBox, dark `#060b10` background, teal `#22d3a5` / yellow `#f5c842` / red `#e05555` palette, and `Space Mono` font.
- **Selection logic**: `DOY % GLOSSARY.length` (UTC day-of-year, deterministic). To find today's word: compute UTC DOY and mod by 34.
- **To add a chart**: create the SVG component in `glossaryCharts.jsx`, add `chartId: 'key'` to the matching `GLOSSARY` entry, add `key: ComponentName` to the `CHARTS` export.

### Backend (`server/index.js`)
Single-file Express monolith. Key dependencies:
- **MongoDB** (Mongoose) — users, game history, academies, tournaments, leagues, async duels
- **Upstash Redis** — OAuth code exchange TTL, caching
- **Socket.IO** — real-time rooms for friend challenges, arena, tournaments
- **Stripe** — academy/teacher subscriptions
- **web-push** — push notifications

Required env vars for the server: `JWT_SECRET`, `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`, `STRIPE_SECRET_KEY`, `FINNHUB_KEY`, `ADMIN_SECRET`.

### Styling
- No CSS modules — global `src/index.css` with CSS custom properties + inline styles everywhere.
- Themes (`theme_matrix`, `theme_blood`, `theme_gold`, `theme_midnight`) and light mode (`light-mode`) are applied as classes on `#root`.
- Fonts: **Syne** (headings, scores) and **Space Mono** (labels, data, monospace UI).
- Brand colors: `#22d3a5` teal (wins/bullish), `#f5c842` yellow (neutral/accent), `#e05555` red (losses/bearish).
