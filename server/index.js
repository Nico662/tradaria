const express        = require('express');
const http           = require('http');
const { Server }     = require('socket.io');
const YahooFinance   = require('yahoo-finance2').default;
const cors           = require('cors');
const helmet         = require('helmet');
const cron           = require('node-cron');
const webpush        = require('web-push');
const mongoose       = require('mongoose');
const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const appleSignin    = require('apple-signin-auth');
const session        = require('express-session');
const jwt            = require('jsonwebtoken');
const Stripe         = require('stripe');
const rateLimit      = require('express-rate-limit');
const { Redis }      = require('@upstash/redis');
const { ApnsClient, Notification } = require('apns2');

const apnsClient = new ApnsClient({
  team: 'KA99F6SRW4',
  keyId: '4QV52YAMPK',
  signingKey: (process.env.APNS_SIGNING_KEY || '').replace(/\\n/g, '\n'),
  defaultTopic: 'dev.tradiko',
  production: true
});

// ── Config ────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) { console.error('FATAL: JWT_SECRET env var is not set'); process.exit(1); }
const ADMIN_SECRET = process.env.ADMIN_SECRET; // protects /push/send against spam

const VALID_BADGE_IDS = new Set([
  'first_trade','sniper','on_fire','diamond_hands','consistent','dedicated','legend',
  'rekt','bitcoin_maxi','forex_king','whale','perfectionist','big_brain','all_rounder',
  'screenshot_ready','daily_streak_3','daily_streak_7','daily_streak_30','perfect_week',
  'early_bird','ghost','historical_ace','first_blood','dominator',
  'mission_first','mission_week','mission_master',
  'portfolio_profit','portfolio_10x','portfolio_loss','portfolio_diverse','portfolio_hodl','portfolio_trader',
  'social_first','social_squad','social_duel_win','social_duel_3','social_challenger',
  'streak_14','streak_60','streak_100','arena_streak_3','arena_streak_5',
  'secret_night','secret_allgreen','secret_broke','secret_speedrun','secret_comeback',
]);

const VALID_GAME_MODES = new Set(['guess', 'survival', 'daily', 'arena', 'tournament', 'historical', 'portfolio']);
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const MONGODB_URI          = process.env.MONGODB_URI;
const CLIENT_URL           = 'https://tradiko.dev';
const PORT                 = process.env.PORT || 3001;
const FINNHUB_KEY = process.env.FINNHUB_KEY;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const yf     = new YahooFinance();

// ── Express ───────────────────────────────────────────────────────
const app        = express();
const httpServer = http.createServer(app);
const ALLOWED_ORIGINS = ['https://tradiko.dev', 'https://www.tradiko.dev'];
const io         = new Server(httpServer, { cors: { origin: ALLOWED_ORIGINS, credentials: true } });
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));

// ── Redis ─────────────────────────────────────────────────────────
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// ── MongoDB ───────────────────────────────────────────────────────
mongoose.connect(MONGODB_URI, { autoIndex: false })
  .then(async () => {
    console.log('MongoDB connected');
    const db = mongoose.connection.db;
    const indexes = await db.collection('users').indexes();
    const hasOldIndex = indexes.some(i => i.name === 'username_1');
    if (hasOldIndex) {
      await db.collection('users').dropIndex('username_1');
      console.log('Índice username_1 eliminado');
    }
    const hasGoogleIdIndex = indexes.some(i => i.name === 'googleId_1' && !i.sparse);
    if (hasGoogleIdIndex) {
      await db.collection('users').dropIndex('googleId_1');
      console.log('Dropped googleId_1 index (non-sparse)');
    }
    const hasAppleIdIndex = indexes.some(i => i.name === 'appleId_1' && !i.sparse);
    if (hasAppleIdIndex) {
      await db.collection('users').dropIndex('appleId_1');
      console.log('Dropped appleId_1 index (non-sparse)');
    }
    await User.syncIndexes();
    console.log('User indexes synced');
    const { deletedCount } = await db.collection('asyncduels').deleteMany({
      $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }],
    });
    if (deletedCount > 0) console.log(`Retos fantasma eliminados: ${deletedCount}`);
  })
  .catch(err => console.error('MongoDB error:', err));

const UserSchema = new mongoose.Schema({
  googleId:  { type: String, required: false, unique: true, sparse: true },
  appleId:   { type: String, required: false, unique: true, sparse: true },
  email:     { type: String, required: true },
  name:      { type: String, required: true },
  avatar:    { type: String },
  xp:        { type: Number, default: 0 },
  badges:    { type: [String], default: [] },
  purchases: { type: [String], default: [] },
  dailyStreak: { type: Number, default: 0 },
  lastPlayed:  { type: String, default: null },
  dailyResult: {
    date:      { type: String,  default: null },
    win:       { type: Boolean, default: null },
    choice:    { type: String,  default: null },
    direction: { type: String,  default: null },
    pctMove:   { type: Number,  default: null },
    asset:     { type: String,  default: null },
    interval:  { type: String,  default: null },
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  username:        { type: String, sparse: true },
  customAvatar:    { type: String, default: null },
  activeCosmetics: { type: mongoose.Schema.Types.Mixed, default: {} },
  portfolioTutorialSeen:  { type: Boolean, default: false },
  academiasTutorialSeen:  { type: Boolean, default: false },
  isPro:                 { type: Boolean, default: false },
  stripeCustomerId:      { type: String,  default: null },
  stripeSubscriptionId:  { type: String,  default: null },
  academyId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', default: null },
  role:                  { type: String,  enum: ['student', 'teacher'], default: 'student' },
  isAcademyPro:          { type: Boolean, default: false },
});

const TournamentSchema = new mongoose.Schema({
  weekId:    { type: String, required: true, unique: true },
  assets:    { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now },
});

const PaidTournamentSchema = new mongoose.Schema({
  entryFee:   { type: Number, default: 2 },
  prize:      { type: Number, default: 10 },
  maxPlayers: { type: Number, default: 10 },
  totalPot:   { type: Number, default: 20 },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  players:    [{
    _id:            false,
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    paymentIntentId:{ type: String, default: null },
  }],
  status:     { type: String, enum: ['waiting', 'active', 'finished'], default: 'waiting' },
  winner:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  payoutStatus: { type: String, enum: ['pending', 'paid', 'none'], default: 'none' },
  createdAt:  { type: Date, default: Date.now },
});

const ScoreSchema = new mongoose.Schema({
  weekId:         { type: String, required: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:           { type: String, required: true },
  username:       { type: String, default: null },
  avatar:         { type: String },
  score:          { type: Number, default: 0 },
  rounds:         { type: Array, default: [] },
  cosmeticAvatar: { type: String, default: null },
  createdAt:      { type: Date, default: Date.now },
});
ScoreSchema.index({ weekId: 1, userId: 1 }, { unique: true });

const StatsSchema = new mongoose.Schema({
  _id:   String,
  daily: { type: Number, default: 0 },
});
const PortfolioSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  cash:      { type: Number, default: 50000 },
  positions: [{
    symbol:    { type: String, required: true },
    name:      { type: String, required: true },
    qty:       { type: Number, required: true },
    avgPrice:  { type: Number, required: true },
    type:      { type: String, enum: ['stock', 'crypto', 'commodity', 'index'], required: true },
  }],
  transactions: [{
   symbol:  { type: String },
   name:    { type: String },
   type:    { type: String },
   action:  { type: String, enum: ['buy', 'sell'] },
   qty:     { type: Number },
   price:   { type: Number },
   total:   { type: Number },
   date:    { type: Date, default: Date.now },
 }],
  createdAt: { type: Date, default: Date.now },
});
const PortfolioHistorySchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:       { type: String, required: true },
  totalValue: { type: Number, required: true },
});
PortfolioHistorySchema.index({ userId: 1, date: 1 }, { unique: true });
const PortfolioHistory = mongoose.model('PortfolioHistory', PortfolioHistorySchema);

const PriceAlertSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticker:      { type: String, required: true },
  targetPrice: { type: Number, required: true },
  condition:   { type: String, enum: ['above', 'below'], required: true },
  triggered:   { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now },
});
const PriceAlert = mongoose.model('PriceAlert', PriceAlertSchema);


const PortfolioDuelSchema = new mongoose.Schema({
  challenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  opponent:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:     { type: String, enum: ['pending', 'active', 'finished'], default: 'pending' },
  startDate:  { type: String, default: null },
  endDate:    { type: String, default: null },
  challengerStartValue: { type: Number, default: null },
  opponentStartValue:   { type: Number, default: null },
  winner:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt:  { type: Date, default: Date.now },
});
const PortfolioDuel = mongoose.model('PortfolioDuel', PortfolioDuelSchema);

const PositionNoteSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticker:    { type: String, required: true },
  note:      { type: String, maxlength: 1000 },
  updatedAt: { type: Date, default: Date.now },
});
PositionNoteSchema.index({ userId: 1, ticker: 1 }, { unique: true });
const PositionNote = mongoose.model('PositionNote', PositionNoteSchema);

const LeagueSchema = new mongoose.Schema({
  name:      { type: String, required: true, maxlength: 30 },
  code:      { type: String, required: true, unique: true },
  owner:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:   [{
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startValue: { type: Number, default: 50000 },
    joinedAt:   { type: Date, default: Date.now },
  }],
  startDate: { type: String, required: true },
  endDate:   { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});
const League = mongoose.model('League', LeagueSchema);

const Portfolio       = mongoose.model('Portfolio', PortfolioSchema);
const User            = mongoose.model('User', UserSchema);
const Tournament      = mongoose.model('Tournament', TournamentSchema);
const PaidTournament  = mongoose.model('PaidTournament', PaidTournamentSchema);
const Score           = mongoose.model('Score', ScoreSchema);
const Stats           = mongoose.model('Stats', StatsSchema);

const FriendshipSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:    { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});
FriendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
const Friendship = mongoose.model('Friendship', FriendshipSchema);

const GameHistorySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mode:      { type: String, enum: ['guess', 'survival', 'daily', 'arena', 'tournament', 'historical', 'portfolio'], required: true },
  score:     { type: Number, default: 0 },
  correct:   { type: Number, default: 0 },
  wrong:     { type: Number, default: 0 },
  accuracy:  { type: Number, default: 0 },
  streak:    { type: Number, default: 0 },
  rounds:    { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
const GameHistory = mongoose.model('GameHistory', GameHistorySchema);

const TournamentSessionSchema = new mongoose.Schema({
  weekId:       { type: String, required: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rounds:       { type: Array, default: [] },
  currentRound: { type: Number, default: 0 },
  score:        { type: Number, default: 0 },
  history:      { type: Array, default: [] },
  completed:    { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now },
});
TournamentSessionSchema.index({ weekId: 1, userId: 1 }, { unique: true });
const TournamentSession = mongoose.model('TournamentSession', TournamentSessionSchema);

const AsyncDuelSchema = new mongoose.Schema({
  code:       { type: String, required: true, unique: true },
  charts:     { type: Array, default: [] },
  challenger: {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name:        { type: String, default: '' },
    answers:     { type: Array, default: [] },
    score:       { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
  },
  rival: {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name:        { type: String, default: '' },
    answers:     { type: Array, default: [] },
    score:       { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
  },
  status:    { type: String, enum: ['waiting_challenger', 'waiting_rival', 'completed', 'expired'], default: 'waiting_challenger' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});
const AsyncDuel = mongoose.model('AsyncDuel', AsyncDuelSchema);

// ── VAPID / Push ──────────────────────────────────────────────────
webpush.setVapidDetails(
  'mailto:nicolasvidalcorrecher@tradaria.dev',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);
// ── Push subscriptions ────────────────────────────────────────────
let pushSubscriptions = [];

async function loadSubscriptions() {
  try {
    const raw = await redis.get('push_subscriptions');
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return JSON.parse(raw);
  } catch (e) {
    console.log('loadSubscriptions error:', e.message);
    return [];
  }
}

async function saveSubscriptions(subs) {
  try {
    await redis.set('push_subscriptions', JSON.stringify(subs));
  } catch (e) {}
}

loadSubscriptions().then(subs => {
  pushSubscriptions = subs;
  console.log('Loaded', subs.length, 'subscriptions from Redis');
});

async function sendPushToUser(userId, payload) {
  const title = payload.title || '⚡ Tradiko';
  const body = payload.body || '';
  const url = payload.url || 'https://tradiko.dev';

  // Web Push
  try {
    const subRaw = await redis.get(`push_user_sub:${userId}`);
    if (subRaw) {
      const sub = typeof subRaw === 'string' ? JSON.parse(subRaw) : subRaw;
      await webpush.sendNotification(sub, JSON.stringify({ title, body, url })).catch(async err => {
        if (err.statusCode === 410) await redis.del(`push_user_sub:${userId}`);
      });
    }
  } catch (err) {
    console.log('Web push error:', err.message);
  }

  // APNs
  try {
    const tokenRaw = await redis.get(`apns_token:${userId}`);
    if (tokenRaw) {
      const notification = new Notification(tokenRaw, {
        alert: { title, body },
        sound: 'default',
        badge: 1,
        data: { url }
      });
      await apnsClient.send(notification).catch(err => {
        console.log('APNs error:', err.message);
      });
    }
  } catch (err) {
    console.log('APNs error:', err.message);
  }
}

// ── Cache ─────────────────────────────────────────────────────────
async function cachedFetch(key, ttlSeconds, fetchFn) {
  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log('Cache HIT:', key);
      return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
  } catch (e) {}
  const data = await fetchFn();
  try {
    await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
    console.log('Cache SET:', key);
  } catch (e) {}
  return data;
}

const PORTFOLIO_ASSETS = [
  // ── Acciones US ──────────────────────────────────────────────────
  { symbol: 'AAPL',  name: 'Apple',             type: 'stock', source: 'finnhub' },
  { symbol: 'MSFT',  name: 'Microsoft',          type: 'stock', source: 'finnhub' },
  { symbol: 'NVDA',  name: 'NVIDIA',             type: 'stock', source: 'finnhub' },
  { symbol: 'GOOGL', name: 'Alphabet',           type: 'stock', source: 'finnhub' },
  { symbol: 'AMZN',  name: 'Amazon',             type: 'stock', source: 'finnhub' },
  { symbol: 'META',  name: 'Meta',               type: 'stock', source: 'finnhub' },
  { symbol: 'TSLA',  name: 'Tesla',              type: 'stock', source: 'finnhub' },
  { symbol: 'JPM',   name: 'JPMorgan',           type: 'stock', source: 'finnhub' },
  { symbol: 'UNH',   name: 'UnitedHealth',       type: 'stock', source: 'finnhub' },
  { symbol: 'BAC',   name: 'Bank of America',    type: 'stock', source: 'finnhub' },
  { symbol: 'NFLX',  name: 'Netflix',            type: 'stock', source: 'finnhub' },
  { symbol: 'ADBE',  name: 'Adobe',              type: 'stock', source: 'finnhub' },
  { symbol: 'AMD',   name: 'AMD',                type: 'stock', source: 'finnhub' },
  { symbol: 'ORCL',  name: 'Oracle',             type: 'stock', source: 'finnhub' },
  { symbol: 'INTC',  name: 'Intel',              type: 'stock', source: 'finnhub' },
  { symbol: 'PLTR',  name: 'Palantir',           type: 'stock', source: 'finnhub' },
  { symbol: 'HOOD',  name: 'Robinhood',          type: 'stock', source: 'finnhub' },
  { symbol: 'MSTR',  name: 'MicroStrategy',      type: 'stock', source: 'finnhub' },
  { symbol: 'TSM',   name: 'TSMC',               type: 'stock', source: 'finnhub' },
  
  // ── Acciones europeas ─────────────────────────────────────────────
  { symbol: 'ASML',  name: 'ASML',               type: 'stock', source: 'finnhub' },
  { symbol: 'IDEXY', name: 'Inditex',            type: 'stock', source: 'finnhub' },
  { symbol: 'ALIZF', name: 'Allianz',            type: 'stock', source: 'finnhub' },
  { symbol: 'BAYZF', name: 'Bayer',              type: 'stock', source: 'finnhub' },
  { symbol: 'RACE', name: 'Ferrari', type: 'stock', source: 'finnhub' },
  { symbol: 'ORAN', name: 'Orange S.A.',           type: 'stock', source: 'yahoo'   },
  // ── Índices y ETFs ────────────────────────────────────────────────
  { symbol: 'SPY',   name: 'S&P 500',            type: 'index', source: 'finnhub' },
  { symbol: 'QQQ',   name: 'NASDAQ 100',         type: 'index', source: 'finnhub' },
  { symbol: 'DIA',   name: 'Dow Jones',          type: 'index', source: 'finnhub' },
  { symbol: 'VTI',   name: 'Total US Market',    type: 'index', source: 'finnhub' },
  { symbol: 'VEA',   name: 'Europe & Asia',      type: 'index', source: 'finnhub' },
  { symbol: 'VWO',   name: 'Emerging Markets',   type: 'index', source: 'finnhub' },
  { symbol: 'EWG',   name: 'Germany ETF',        type: 'index', source: 'finnhub' },
  { symbol: 'EWQ',   name: 'France ETF',         type: 'index', source: 'finnhub' },
  { symbol: 'EWP',   name: 'Spain ETF',          type: 'index', source: 'finnhub' },
  { symbol: 'XLK',   name: 'Tech Sector',        type: 'index', source: 'finnhub' },
  { symbol: 'XLF',   name: 'Financial Sector',   type: 'index', source: 'finnhub' },
  { symbol: 'XLE',   name: 'Energy Sector',      type: 'index', source: 'finnhub' },
  { symbol: 'XLV',   name: 'Health Sector',      type: 'index', source: 'finnhub' },
  // ── Bonos ─────────────────────────────────────────────────────────
  { symbol: 'TLT',   name: 'US Bonds 20Y',       type: 'index', source: 'finnhub' },
  { symbol: 'HYG',   name: 'High Yield Bonds',   type: 'index', source: 'finnhub' },
  // ── Cripto ────────────────────────────────────────────────────────
  { symbol: 'BTCUSDT',  name: 'Bitcoin',         type: 'crypto', source: 'binance' },
  { symbol: 'ETHUSDT',  name: 'Ethereum',        type: 'crypto', source: 'binance' },
  { symbol: 'XRPUSDT',  name: 'XRP',            type: 'crypto', source: 'binance' },
  { symbol: 'SOLUSDT',  name: 'Solana',          type: 'crypto', source: 'binance' },
  // ── Materias primas ───────────────────────────────────────────────
  { symbol: 'GLD',   name: 'Gold',               type: 'commodity', source: 'finnhub' },
  { symbol: 'SLV',   name: 'Silver',             type: 'commodity', source: 'finnhub' },
];

async function getPrice(asset) {
  const cacheKey = `price_v2:${asset.symbol}`;
  return cachedFetch(cacheKey, 300, async () => {
    if (asset.source === 'binance') {
      const coinMap = {
        'BTCUSDT': 'bitcoin',
        'ETHUSDT': 'ethereum',
        'XRPUSDT': 'ripple',
        'SOLUSDT':  'solana',
        'DOGEUSDT': 'dogecoin',
        'BNBUSDT':  'binancecoin',
        'AVAXUSDT': 'avalanche-2',
        'ADAUSDT':  'cardano',
        'DOTUSDT':  'polkadot',
        'LINKUSDT': 'chainlink',
      };
      const coinId = coinMap[asset.symbol];
      const res  = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`);
      const data = await res.json();
      const coin = data[coinId];
      return {
        symbol:    asset.symbol,
        name:      asset.name,
        type:      asset.type,
        price:     coin.usd,
        change:    coin.usd_24h_change,
        prevClose: coin.usd / (1 + coin.usd_24h_change / 100),
      };
    } else if (asset.source === 'yahoo') {
      const yahooQuoteMap = { 'ORAN': 'ORA.PA', 'IDEXY': 'ITX.MC', 'ALIZF': 'ALV.DE', 'BAYZF': 'BAYN.DE' };
      const yahooSym = yahooQuoteMap[asset.symbol] || asset.symbol;
      const q = await yf.quote(yahooSym);
      const price     = q.regularMarketPrice || q.regularMarketPreviousClose || 0;
      const prevClose = q.regularMarketPreviousClose || price;
      const change    = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
      return {
        symbol:    asset.symbol,
        name:      asset.name,
        type:      asset.type,
        price,
        change,
        prevClose,
      };
    } else {
      const res  = await fetch(`https://finnhub.io/api/v1/quote?symbol=${asset.symbol}&token=${FINNHUB_KEY}`);
      const data = await res.json();
      return {
        symbol:    asset.symbol,
        name:      asset.name,
        type:      asset.type,
        price:     data.c || data.pc,
        change:    data.dp,
        prevClose: data.pc,
      };
    }
  });
}
// ── Middlewares ───────────────────────────────────────────────────
app.use(cors({
  origin: ['https://tradiko.dev', 'https://www.tradiko.dev'],
  credentials: true,
}));

app.use((req, res, next) => {
  if (req.originalUrl === '/shop/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, sameSite: 'strict' },
}));

app.use(passport.initialize());
app.use(passport.session());

// ── Rate limiters ─────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, max: 100,
  message: { error: 'Too many requests, slow down.' },
  standardHeaders: true, legacyHeaders: false,
});
const dailyLimiter   = rateLimit({ windowMs: 60 * 1000, max: 10,  message: { error: 'Too many requests for daily challenge.' } });
const candlesLimiter = rateLimit({ windowMs: 60 * 1000, max: 30,  message: { error: 'Too many candle requests.' } });
const tradeLimiter   = rateLimit({ windowMs: 60 * 1000, max: 20,  message: { error: 'Too many trade requests.' } });
const authLimiter    = rateLimit({ windowMs: 60 * 1000, max: 10,  message: { error: 'Too many auth requests.' } });
const shareLimiter   = rateLimit({ windowMs: 60 * 1000, max: 5,   message: { error: 'Too many share requests.' } });
const syncLimiter    = rateLimit({ windowMs: 60 * 1000, max: 30,  message: { error: 'Too many sync requests.' } });
const writeLimiter   = rateLimit({ windowMs: 60 * 1000, max: 10,  message: { error: 'Too many requests, slow down.' } });

app.use(generalLimiter);
app.use('/daily',              dailyLimiter);
app.use('/candles',            candlesLimiter);
app.use('/portfolio/buy',      tradeLimiter);
app.use('/portfolio/sell',     tradeLimiter);
app.use('/auth/google',        authLimiter);
app.use('/auth/username/check', authLimiter);
app.use('/stats/share',        shareLimiter);
app.use('/auth/sync',          syncLimiter);
app.use('/friends/request',           writeLimiter);
app.use('/portfolio/duel/challenge',  writeLimiter);
app.use('/arena/async/create',        writeLimiter);
app.use('/api/alerts',                writeLimiter);

// ── Passport ──────────────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID:     GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL:  'https://tradara-production.up.railway.app/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const existingUser = await User.findOne({ googleId: profile.id });
    if (existingUser) {
      existingUser.lastLogin = new Date();
      await existingUser.save();
      return done(null, existingUser);
    }
    const newUser = await User.create({
      googleId: profile.id,
      email:    profile.emails[0].value,
      name:     profile.displayName,
      avatar:   profile.photos[0]?.value,
    });
    console.log('New user created:', newUser.email);
    return done(null, newUser);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) { done(err, null); }
});

// ── Auth routes ───────────────────────────────────────────────────
app.get('/auth/google', (req, res, next) => {
  const state = req.query.platform === 'ios' ? 'ios' : 'web';
  passport.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next);
});

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${CLIENT_URL}?auth=error` }),
  async (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email, name: req.user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    const oauthCode = require('crypto').randomBytes(32).toString('hex');
    await redis.set(`oauth_code:${oauthCode}`, token, { ex: 60 });
    if (req.query.state === 'ios') {
      res.redirect(`tradiko://?code=${oauthCode}`);
    } else {
      res.redirect(`${CLIENT_URL}?code=${oauthCode}`);
    }
  }
);

app.post('/auth/exchange', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Invalid code' });
    const token = await redis.get(`oauth_code:${code}`);
    if (!token) return res.status(400).json({ error: 'Code expired or invalid' });
    await redis.del(`oauth_code:${code}`);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/apple', async (req, res) => {
  try {
    const { identityToken, fullName } = req.body;
    console.log('Apple auth: identityToken length:', identityToken?.length);
    console.log('Apple auth: identityToken first 50 chars:', identityToken?.substring(0, 50));
    if (!identityToken) return res.status(400).json({ error: 'Missing identityToken' });

    const payload = await appleSignin.verifyIdToken(identityToken, {
      audience: 'dev.tradiko',
      ignoreExpiration: false,
    });
    console.log('Apple auth: payload sub:', payload.sub);

    const appleId = payload.sub;
    const email   = payload.email;
    const name    = fullName?.givenName
      ? `${fullName.givenName} ${fullName.familyName || ''}`.trim()
      : email?.split('@')[0] || 'User';

    let user = await User.findOne({ appleId });
    if (!user && email) user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        appleId,
        email: email || `${appleId}@privaterelay.appleid.com`,
        name,
      });
    } else if (!user.appleId) {
      user.appleId = appleId;
      await user.save();
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ token });
  } catch (err) {
    console.error('Apple auth error details:', err.message);
    console.error('Apple auth error name:', err.name);
    res.status(401).json({ error: 'Invalid Apple token' });
  }
});

app.post('/auth/logout', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.json({ ok: true });
  const token = auth.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await redis.set(`blacklist:${token}`, '1', { ex: ttl });
  } catch {}
  res.json({ ok: true });
});

app.get('/auth/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id:     user._id,
      name:   user.name,
      email:  user.email,
      avatar: user.avatar,
      xp:     user.xp,
      badges: user.badges,
      dailyStreak: user.dailyStreak || 0,
      lastPlayed: user.lastPlayed || null,
      username: user.username || null,
      dailyResult:     user.dailyResult  || null,
      customAvatar:    user.customAvatar || null,
      activeCosmetics: user.activeCosmetics || {},
      isPro:           user.isPro || false,
      role:            user.role        || 'student',
      academyId:       user.academyId   || null,
      isAcademyPro:    user.isAcademyPro || false,
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/auth/sync', async (req, res) => {
  const decoded = await verifyTokenBlacklisted(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const current = await User.findById(decoded.id);
    if (!current) return res.status(404).json({ error: 'User not found' });
    const { xp, badges, dailyStreak, lastPlayed, dailyResult } = req.body;

    // XP: only allow increase, cap delta at 2000 per sync
    const newXP = Number(xp);
    const safeXP = Number.isFinite(newXP) && newXP >= 0
      ? Math.min(newXP, current.xp + 2000)
      : current.xp;

    // Badges: only known IDs, only additive
    const incomingBadges = Array.isArray(badges) ? badges : [];
    const safeBadges = [...new Set([
      ...current.badges,
      ...incomingBadges.filter(b => typeof b === 'string' && VALID_BADGE_IDS.has(b)),
    ])];

    // Streak: non-negative integer, max 3650, only increase
    const newStreak = Number(dailyStreak);
    const safeStreak = Number.isInteger(newStreak) && newStreak >= 0 && newStreak <= 3650
      ? Math.max(current.dailyStreak || 0, newStreak)
      : current.dailyStreak || 0;

    // lastPlayed: must be YYYY-MM-DD
    const safeLastPlayed = typeof lastPlayed === 'string' && DATE_REGEX.test(lastPlayed)
      ? lastPlayed : current.lastPlayed;

    const update = { xp: safeXP, badges: safeBadges };
    if (dailyStreak !== undefined) update.dailyStreak = safeStreak;
    if (lastPlayed  !== undefined) update.lastPlayed  = safeLastPlayed;
    if (dailyResult !== undefined) {
      const dr = dailyResult && typeof dailyResult === 'object' ? dailyResult : {};
      update.dailyResult = {
        date:      typeof dr.date === 'string' && DATE_REGEX.test(dr.date) ? dr.date : null,
        win:       typeof dr.win === 'boolean' ? dr.win : null,
        choice:    ['long', 'short', 'skip'].includes(dr.choice) ? dr.choice : null,
        direction: ['up', 'down', 'flat'].includes(dr.direction) ? dr.direction : null,
        pctMove:   Number.isFinite(Number(dr.pctMove)) ? Number(dr.pctMove) : null,
        asset:     typeof dr.asset === 'string' ? dr.asset.slice(0, 50) : null,
        interval:  ['15m', '1h', '1d'].includes(dr.interval) ? dr.interval : null,
      };
    }
    await User.findByIdAndUpdate(decoded.id, update);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Sync failed' });
  }
});
app.post('/auth/avatar', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ error: 'No avatar' });
    const SAFE_AVATAR = /^data:image\/(jpeg|png|webp|gif);base64,/;
    if (typeof avatar !== 'string' || !SAFE_AVATAR.test(avatar)) return res.status(400).json({ error: 'Invalid image format' });
    if (avatar.length > 700000) return res.status(400).json({ error: 'Image too large (max 500KB)' });
    await User.findByIdAndUpdate(decoded.id, { customAvatar: avatar });
    res.json({ ok: true });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/auth/cosmetics', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const { activeCosmetics } = req.body;
    const user = await User.findById(decoded.id).select('purchases');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const VALID_TYPES = new Set(['theme', 'frame', 'avatar', 'effect']);
    const owned = new Set(user.purchases);
    const safe = {};
    if (activeCosmetics && typeof activeCosmetics === 'object' && !Array.isArray(activeCosmetics)) {
      for (const [type, itemId] of Object.entries(activeCosmetics)) {
        if (!VALID_TYPES.has(type)) continue;
        if (typeof itemId !== 'string' || !SHOP_ITEMS[itemId] || !owned.has(itemId)) continue;
        safe[type] = itemId;
      }
    }

    await User.findByIdAndUpdate(decoded.id, { activeCosmetics: safe });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/auth/username/check/:username', async (req, res) => {
  try {
    const { username } = req.params;
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
      return res.json({ available: false, error: 'Solo letras, números y _ (3-16 caracteres)' });
    }
    const existing = await User.findOne({ username: username.toLowerCase() });
    res.json({ available: !existing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/username/set', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { username } = req.body;
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
      return res.status(400).json({ error: 'Solo letras, números y _ (3-16 caracteres)' });
    }
    const existing = await User.findOne({ username: username.toLowerCase(), _id: { $ne: decoded.id } });
    if (existing) return res.status(400).json({ error: 'Username ya en uso' });
    await User.findByIdAndUpdate(decoded.id, { username: username.toLowerCase() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/auth/account', async (req, res) => {
  try {
    const decoded = verifyToken(req);
    if (!decoded) return res.status(401).json({ error: 'No token' });
    await User.findByIdAndDelete(decoded.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Error deleting account' });
  }
});

const SHOP_ITEMS = {
  frame_gold:    { name: 'Gold Frame',    price: 299 },
  frame_neon:    { name: 'Neon Frame',    price: 199 },
  frame_fire:    { name: 'Fire Frame',    price: 399 },
  frame_diamond: { name: 'Diamond Frame', price: 499 },
  theme_blood:   { name: 'Blood Theme',   price: 199 },
  theme_matrix: { name: 'Matrix Theme', price: 199 },
  theme_gold:    { name: 'Gold Theme',    price: 199 },
  theme_midnight:{ name: 'Midnight Theme',price: 199 },
  avatar_bull:   { name: 'Bull Avatar',   price: 99 },
  avatar_bear:   { name: 'Bear Avatar',   price: 99 },
  avatar_whale:  { name: 'Whale Avatar',  price: 199 },
  avatar_robot:  { name: 'Robot Avatar',  price: 199 },
  effect_confetti:  { name: 'Confetti Effect',  price: 199 },
  effect_lightning: { name: 'Lightning Effect', price: 299 },
  effect_explosion: { name: 'Explosion Effect', price: 299 },
  effect_stars:     { name: 'Stars Effect',      price: 199 },
};
// ── Shop routes ───────────────────────────────────────────────────
app.post('/shop/checkout', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { itemId } = req.body;
    const item = SHOP_ITEMS[itemId];
    if (!item) return res.status(400).json({ error: 'Item not found' });
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Tradiko — ${item.name}` },
          unit_amount: item.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${CLIENT_URL}?purchase=success&item=${itemId}`,
      cancel_url:  `${CLIENT_URL}?purchase=cancelled`,
      metadata: { userId: String(decoded.id), itemId, type: 'shop' },
    });
    res.json({ url: stripeSession.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

app.post('/shop/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, itemId, type: metaType, tournamentId, academyId, plan: academyPlan } = session.metadata || {};

    // Shop item purchase
    if (metaType === 'shop' && userId && itemId) {
      try {
        await User.findByIdAndUpdate(userId, { $addToSet: { purchases: itemId } });
      } catch (err) { console.error('Error saving purchase:', err.message); }
    }

    // Pro subscription activated
    if (session.mode === 'subscription' && userId && !academyId) {
      try {
        await User.findByIdAndUpdate(userId, {
          isPro: true,
          stripeCustomerId:     session.customer,
          stripeSubscriptionId: session.subscription,
        });
        console.log(`User ${userId} is now Pro`);
      } catch (err) { console.error('Pro activation error:', err.message); }
    }

    // Academy subscription activated
    if (session.mode === 'subscription' && academyId) {
      try {
        const Academy = mongoose.model('Academy');
        const maxStudents = academyPlan === 'pro' ? 60 : 25;
        const academy = await Academy.findByIdAndUpdate(academyId, {
          isActive:             true,
          stripeCustomerId:     session.customer,
          stripeSubscriptionId: session.subscription,
          plan:                 academyPlan || 'starter',
          maxStudents,
          trialEndsAt:          null,
        }, { new: true });
        if (academy) {
          await User.updateMany({ _id: { $in: academy.students } }, { isAcademyPro: true });
          console.log(`Academy ${academyId} activated on plan ${academyPlan}`);
        }
      } catch (err) { console.error('Academy activation error:', err.message); }
    }

    // Paid tournament entry
    if (metaType === 'tournament_entry' && userId && tournamentId) {
      try {
        const pt = await PaidTournament.findById(tournamentId);
        if (pt && pt.status === 'waiting' && !pt.players.some(p => String(p.userId) === userId)) {
          pt.players.push({ userId, paymentIntentId: session.payment_intent });
          if (pt.players.length >= pt.maxPlayers) {
            pt.status = 'active';
            // Notify all subscribers that a paid tournament is starting
            const subs = await loadSubscriptions();
            const payload = JSON.stringify({
              title: '⚔️ Torneo de pago — ¡COMIENZA!',
              body:  `El torneo de €${pt.entryFee} con premio de €${pt.prize} ya tiene ${pt.maxPlayers} jugadores. ¡Entra a jugar!`,
              url:   '/?screen=tournament',
            });
            subs.forEach(sub => webpush.sendNotification(sub, payload).catch(() => {}));
          }
          await pt.save();
        }
      } catch (err) { console.error('Tournament entry error:', err.message); }
    }
  }

  // Subscription cancelled (Pro user or Academy)
  if (event.type === 'customer.subscription.deleted') {
    const customerId     = event.data.object.customer;
    const subscriptionId = event.data.object.id;
    try {
      await User.findOneAndUpdate({ stripeCustomerId: customerId }, { isPro: false });
      console.log(`Pro cancelled for customer ${customerId}`);
    } catch (err) { console.error('Pro cancellation error:', err.message); }
    try {
      const Academy = mongoose.model('Academy');
      const academy = await Academy.findOne({ stripeSubscriptionId: subscriptionId });
      if (academy) {
        academy.isActive = false;
        academy.stripeSubscriptionId = null;
        await academy.save();
        await User.updateMany({ _id: { $in: academy.students } }, { isAcademyPro: false });
        console.log(`Academy ${academy._id} subscription cancelled`);
      }
    } catch (err) { console.error('Academy cancellation error:', err.message); }
  }

  res.json({ received: true });
});

// ── Pro routes ────────────────────────────────────────────────────
app.post('/pro/checkout', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: 'Tradiko Pro', description: 'Suscripción mensual — sin anuncios, regeneración de vidas, badge Pro y más.' },
          unit_amount: 399,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${CLIENT_URL}?pro=success`,
      cancel_url:  `${CLIENT_URL}?pro=cancelled`,
      metadata: { userId: String(decoded.id), type: 'pro_subscription' },
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Pro checkout error:', err.message);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

app.post('/pro/cancel', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isPro) return res.status(400).json({ error: 'No tienes una suscripción activa.' });
    if (!user.stripeSubscriptionId) {
      console.error(`Pro cancel: user ${decoded.id} has isPro=true but no stripeSubscriptionId`);
      return res.status(400).json({ error: 'No se encontró el ID de suscripción. Contacta con soporte.' });
    }
    try {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    } catch (stripeErr) {
      console.error(`Pro cancel Stripe error for user ${decoded.id}:`, stripeErr.message);
      return res.status(502).json({ error: `Error de Stripe: ${stripeErr.message}` });
    }
    await User.findByIdAndUpdate(decoded.id, { isPro: false, stripeSubscriptionId: null });
    console.log(`Pro cancelled for user ${decoded.id}`);
    res.json({ ok: true, message: 'Suscripción cancelada. Seguirás teniendo acceso Pro hasta el fin del período.' });
  } catch (err) {
    console.error('Pro cancel error:', err.message);
    res.status(500).json({ error: 'Error interno al cancelar. Inténtalo de nuevo.' });
  }
});

// ── Paid tournament routes ────────────────────────────────────────
app.post('/tournament/paid/create', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { maxParticipants } = req.body;
    const n = Number(maxParticipants);
    if (!Number.isInteger(n) || n < 2 || n > 10) {
      return res.status(400).json({ error: 'maxParticipants must be an integer between 2 and 10' });
    }
    const entryFee = 2;
    const totalPot = entryFee * n;
    const prize    = totalPot / 2;
    const pt = await PaidTournament.create({ entryFee, maxPlayers: n, totalPot, prize, createdBy: decoded.id });
    res.json({ ok: true, tournament: pt });
  } catch (err) {
    console.error('Create tournament error:', err.message);
    res.status(500).json({ error: 'Create failed' });
  }
});

app.delete('/tournament/paid/:tournamentId', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const pt = await PaidTournament.findById(req.params.tournamentId);
    if (!pt) return res.status(404).json({ error: 'Torneo no encontrado' });
    if (String(pt.createdBy) !== String(decoded.id)) return res.status(403).json({ error: 'No autorizado' });
    if (pt.players.length > 0) return res.status(400).json({ error: 'No puedes borrar un torneo con jugadores ya inscritos' });
    await pt.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete tournament error:', err.message);
    res.status(500).json({ error: 'Error al borrar el torneo' });
  }
});

app.get('/tournaments', async (req, res) => {
  try {
    const paid = await PaidTournament.find({ status: { $in: ['waiting', 'active'] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    // Auto-create a waiting paid tournament if none exist
    if (paid.filter(t => t.status === 'waiting').length === 0) {
      const created = await PaidTournament.create({});
      paid.unshift(created.toObject());
    }
    res.json({ paid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/tournament/paid/join', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded      = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { tournamentId } = req.body;
    const pt = await PaidTournament.findById(tournamentId);
    if (!pt) return res.status(404).json({ error: 'Tournament not found' });
    if (pt.status !== 'waiting') return res.status(400).json({ error: 'Tournament not open' });
    if (pt.players.some(p => p.userId.toString() === String(decoded.id)))
      return res.status(400).json({ error: 'Already joined' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Torneo Tradiko — entrada €${pt.entryFee}`, description: `Premio al ganador: €${pt.prize}` },
          unit_amount: pt.entryFee * 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${CLIENT_URL}?tournament=success`,
      cancel_url:  `${CLIENT_URL}?tournament=cancelled`,
      metadata: { userId: String(decoded.id), type: 'tournament_entry', tournamentId: String(pt._id) },
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Tournament join error:', err.message);
    res.status(500).json({ error: 'Join failed' });
  }
});

app.post('/tournament/paid/:tournamentId/leave', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { tournamentId } = req.params;
    const pt = await PaidTournament.findById(tournamentId);
    if (!pt) return res.status(404).json({ error: 'Torneo no encontrado' });
    if (pt.status !== 'waiting') return res.status(400).json({ error: 'El torneo ya ha comenzado, no puedes salir' });
    const playerEntry = pt.players.find(p => p.userId.toString() === decoded.id.toString());
    if (!playerEntry) return res.status(404).json({ error: 'No estás en este torneo' });
    await PaidTournament.updateOne(
      { _id: tournamentId },
      { $pull: { players: { userId: decoded.id } } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Tournament leave error:', err.message);
    res.status(500).json({ error: 'Error al salir del torneo' });
  }
});

app.post('/tournament/paid/:id/winner', async (req, res) => {
  const key = req.headers['x-admin-secret'];
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) return res.status(403).json({ error: 'forbidden' });
  try {
    const { userId } = req.body;
    const pt = await PaidTournament.findByIdAndUpdate(req.params.id, {
      winner: userId, status: 'finished', payoutStatus: 'pending',
    }, { new: true });
    res.json({ ok: true, tournament: pt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/shop/purchases', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ purchases: [] });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const user    = await User.findById(decoded.id);
    res.json({ purchases: user?.purchases || [] });
  } catch {
    res.json({ purchases: [] });
  }
});

app.post('/shop/iap-confirm', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'Missing itemId' });
    const update = itemId === 'pro'
      ? { isPro: true, $addToSet: { purchases: itemId } }
      : { $addToSet: { purchases: itemId } };
    await User.findByIdAndUpdate(decoded.id, update);
    res.json({ success: true });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ── Stats routes ──────────────────────────────────────────────────
app.get('/stats', (req, res) => {
  try {
    res.json({ online: io.engine?.clientsCount || 0, gamesPlayed: totalGamesPlayed || 0 });
  } catch (e) {
    res.json({ online: 0, gamesPlayed: 0 });
  }
});
app.get('/stats/share', async (req, res) => {
  try {
    const doc = await Stats.findById('shares');
    res.json(doc || { daily: 0 });
  } catch { res.json({ daily: 0 }); }
});

app.post('/stats/share', async (req, res) => {
  if (!verifyToken(req)) return res.status(401).json({ error: 'No token' });
  try {
    await Stats.findByIdAndUpdate('shares', { $inc: { daily: 1 } }, { upsert: true, new: true });
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

app.post('/stats/game', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const { mode, score, correct, wrong, accuracy, streak, rounds } = req.body;
    if (!VALID_GAME_MODES.has(mode)) return res.status(400).json({ error: 'Invalid mode' });
    const safeScore    = Math.max(0, Math.min(Number(score)    || 0, 100000));
    const safeCorrect  = Math.max(0, Math.min(Number(correct)  || 0, 10000));
    const safeWrong    = Math.max(0, Math.min(Number(wrong)    || 0, 10000));
    const safeAccuracy = Math.max(0, Math.min(Number(accuracy) || 0, 100));
    const safeStreak   = Math.max(0, Math.min(Number(streak)   || 0, 10000));
    const safeRounds   = Math.max(0, Math.min(Number(rounds)   || 0, 10000));
    await GameHistory.create({ userId: decoded.id, mode, score: safeScore, correct: safeCorrect, wrong: safeWrong, accuracy: safeAccuracy, streak: safeStreak, rounds: safeRounds });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/stats/personal', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const games = await GameHistory.find({ userId: decoded.id }).sort({ createdAt: -1 }).limit(200);
    const totalGames   = games.length;
    const totalCorrect = games.reduce((s, g) => s + g.correct, 0);
    const totalWrong   = games.reduce((s, g) => s + g.wrong, 0);
    const avgAccuracy  = totalGames ? Math.round(games.reduce((s, g) => s + g.accuracy, 0) / totalGames) : 0;
    const bestScore    = games.reduce((m, g) => Math.max(m, g.score), 0);
    const bestStreak   = games.reduce((m, g) => Math.max(m, g.streak), 0);
    const modeCounts   = {};
    games.forEach(g => { modeCounts[g.mode] = (modeCounts[g.mode] || 0) + 1; });
    const favoriteMode = Object.keys(modeCounts).sort((a, b) => modeCounts[b] - modeCounts[a])[0] || null;
    const arenaGames   = games.filter(g => g.mode === 'arena');
    const arenaWins    = arenaGames.filter(g => g.score > 0).length;
    const winRate      = arenaGames.length ? Math.round(arenaWins / arenaGames.length * 100) : 0;
    const user         = await require('mongoose').model('User').findById(decoded.id).select('dailyStreak lastPlayed');
    const dailyStreak  = user?.dailyStreak || 0;
    const weekStart    = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const gamesThisWeek = games.filter(g => new Date(g.createdAt) >= weekStart).length;
    const accuracyTrend = games.slice(0, 7).map(g => g.accuracy).reverse();
    // global comparison
    const allAvg = await GameHistory.aggregate([{ $group: { _id: null, avg: { $avg: '$accuracy' } } }]);
    const globalAvg = allAvg[0]?.avg || 50;
    const betterThan = avgAccuracy >= globalAvg ? Math.round(((avgAccuracy - globalAvg) / (100 - globalAvg)) * 50 + 50) : Math.round((avgAccuracy / globalAvg) * 50);
    res.json({ totalGames, totalCorrect, totalWrong, avgAccuracy, bestScore, bestStreak, favoriteMode, winRate, dailyStreak, gamesThisWeek, accuracyTrend, betterThan: Math.min(99, Math.max(1, betterThan)), modeCounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Candles route ─────────────────────────────────────────────────
app.get('/candles', async (req, res) => {
  const { symbol, interval, from, to } = req.query;
  if (!symbol || !/^[A-Z0-9\-\.=^/]{1,20}$/i.test(symbol)) return res.status(400).json({ error: 'Invalid symbol' });
  if (from && !DATE_REGEX.test(from)) return res.status(400).json({ error: 'Invalid from date' });
  if (to   && !DATE_REGEX.test(to))   return res.status(400).json({ error: 'Invalid to date' });
  try {
    let period1, period2;
    if (from && to) {
      period1 = from; period2 = to;
    } else if (interval === '1h') {
      const d = new Date(); d.setDate(d.getDate() - 29);
      period1 = d.toISOString().split('T')[0];
    } else {
      const d = new Date(); d.setFullYear(d.getFullYear() - 2);
      period1 = d.toISOString().split('T')[0];
    }
    const result  = await yf.chart(symbol, { interval: interval === '1h' ? '1h' : '1d', period1, ...(period2 ? { period2 } : {}) });
    const quotes  = result.quotes.filter(q => q.open && q.high && q.low && q.close);
    const candles = quotes.slice(-500).map(q => ({
      time:  Math.floor(new Date(q.date).getTime() / 1000),
      open:  q.open, high: q.high, low: q.low, close: q.close,
    }));
    res.json(candles);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Daily routes ──────────────────────────────────────────────────
const DAILY_ASSETS = [
  { source: 'kraken', symbol: 'BTCUSD',   name: 'BTC/USD', interval: '15m' },
  { source: 'kraken', symbol: 'ETHUSD',   name: 'ETH/USD', interval: '15m' },
  { source: 'kraken', symbol: 'SOLUSD',   name: 'SOL/USD', interval: '15m' },
  { source: 'kraken', symbol: 'XRPUSD',   name: 'XRP/USD', interval: '15m' },
  { source: 'yahoo',  symbol: 'EURUSD=X', name: 'EUR/USD', interval: '1h'  },
  { source: 'yahoo',  symbol: 'GBPUSD=X', name: 'GBP/USD', interval: '1h'  },
  { source: 'yahoo',  symbol: 'JPY=X',    name: 'USD/JPY', interval: '1h'  },
  { source: 'yahoo',  symbol: 'AUDUSD=X', name: 'AUD/USD', interval: '1h'  },
];

let dailyChallenge = null;
let dailyDate      = null;

async function getDailyChallenge() {
  const today = new Date().toISOString().split('T')[0];
  if (dailyDate === today && dailyChallenge) return dailyChallenge;
  const seed     = today.replace(/-/g, '');
  const idx      = parseInt(seed) % DAILY_ASSETS.length;
  const asset    = DAILY_ASSETS[idx];
  const candles  = await fetchCandles(asset);
  const total    = candles.length;
  const visible  = Math.min(80, Math.floor(total * 0.8));
  const future   = Math.min(20, total - visible);
  const maxStart = Math.max(0, total - visible - future);
  const start    = parseInt(seed.slice(-4)) % (maxStart || 1);
  dailyChallenge = {
    date:     today,
    asset:    asset.name,
    interval: asset.interval,
    visible:  candles.slice(start, start + visible),
    future:   candles.slice(start + visible, start + visible + future),
  };
  dailyDate = today;
  return dailyChallenge;
}

app.get('/daily', async (req, res) => {
  try {
    const challenge = await getDailyChallenge();
    res.json({
      date:     challenge.date,
      asset:    challenge.asset,
      interval: challenge.interval,
      visible:  challenge.visible,
      future:   challenge.future,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Tournament routes ─────────────────────────────────────────────
const ASSETS = [
  { name: 'BTC/USD',  source: 'kraken', symbol: 'XBTUSD',   interval: '15m' },
  { name: 'ETH/USD',  source: 'kraken', symbol: 'ETHUSD',   interval: '15m' },
  { name: 'SOL/USD',  source: 'kraken', symbol: 'SOLUSD',   interval: '15m' },
  { name: 'XRP/USD',  source: 'kraken', symbol: 'XRPUSD',   interval: '15m' },
  { name: 'DOGE/USD', source: 'kraken', symbol: 'DOGEUSD',  interval: '15m' },
  { name: 'LINK/USD', source: 'kraken', symbol: 'LINKUSD',  interval: '15m' },
  { name: 'AVAX/USD', source: 'kraken', symbol: 'AVAXUSD',  interval: '15m' },
  { name: 'ADA/USD',  source: 'kraken', symbol: 'ADAUSD',   interval: '15m' },
  { name: 'DOT/USD',  source: 'kraken', symbol: 'DOTUSD',   interval: '15m' },
  { name: 'EUR/USD',  source: 'yahoo',  symbol: 'EURUSD=X', interval: '1h'  },
  { name: 'GBP/USD',  source: 'yahoo',  symbol: 'GBPUSD=X', interval: '1h'  },
  { name: 'USD/JPY',  source: 'yahoo',  symbol: 'JPY=X',    interval: '1h'  },
  { name: 'AUD/USD',  source: 'yahoo',  symbol: 'AUDUSD=X', interval: '1h'  },
];

function getWeekId() {
  const now    = new Date();
  const day    = now.getUTCDay();
  const diff   = (day === 0) ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  const year  = monday.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const week  = Math.ceil(((monday - start) / 86400000 + start.getUTCDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '00')}`;
}

app.get('/tournament', async (req, res) => {
  try {
    const weekId = getWeekId();
    let tournament = await Tournament.findOne({ weekId });
    if (!tournament) {
      const shuffled        = [...ASSETS].sort(() => Math.random() - 0.5).slice(0, 10);
      const tournamentAssets = shuffled.map(a => ({ ...a, interval: '1h' }));
      tournament = await Tournament.create({ weekId, assets: tournamentAssets });
    }
    const rounds = [];
    for (const asset of tournament.assets) {
      try {
        const candles      = await fetchCandles({ ...asset, interval: '1h' });
        const cleanCandles = candles.filter(c => c && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0);
        if (cleanCandles.length < 100) continue;
        const win = randomWindow(cleanCandles);
        rounds.push({ asset: asset.name, interval: '1h', visible: win.visible, future: win.future });
      } catch (e) { console.log('Tournament fetch error:', e.message); }
    }
    res.json({ weekId, rounds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/tournament/leaderboard', async (req, res) => {
  try {
    const weekId = getWeekId();
    const scores = await Score.find({ weekId }).sort({ score: -1 }).limit(100)
      .populate('userId', 'username name avatar customAvatar activeCosmetics');
    const allScores = scores.map(s => ({
      ...s.toObject(),
      name:            s.userId?.username ? `@${s.userId.username}` : (s.name || s.userId?.name),
      avatar:          s.userId?.avatar || s.avatar,
      customAvatar:    s.userId?.customAvatar || null,
      activeCosmetics: s.userId?.activeCosmetics || {},
    }));
    const top10 = allScores.slice(0, 10);
    let userPosition = null;
    const { userId } = req.query;
    if (userId) {
      const idx = allScores.findIndex(s => String(s.userId?._id || s.userId) === String(userId));
      if (idx >= 10) {
        const u = allScores[idx];
        userPosition = { rank: idx + 1, score: u.score, name: u.name, username: u.username, avatar: u.avatar, customAvatar: u.customAvatar, activeCosmetics: u.activeCosmetics };
      }
    }
    res.json({ weekId, scores: top10, userPosition });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/tournament/score', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded  = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const user     = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const weekId   = getWeekId();
    const existing = await Score.findOne({ weekId, userId: user._id });
    if (existing) return res.status(400).json({ error: 'Already played this week' });

    const { cosmeticAvatar } = req.body;

    const session = await TournamentSession.findOne({ weekId, userId: user._id });
    if (!session || !session.history || session.history.length === 0) return res.status(400).json({ error: 'No session found' });
    if (session.history.length > TOTAL_ROUNDS) return res.status(400).json({ error: 'Invalid session' });
    if (session.currentRound < TOTAL_ROUNDS) return res.status(400).json({ error: 'Tournament not completed' });

    let calculatedScore = 0;
    for (const round of session.history) {
      if (round.win && round.choice === 'skip') calculatedScore += 50;
      else if (round.win) calculatedScore += 100;
    }

    await Score.create({ weekId, userId: user._id, name: user.username || user.name, username: user.username || null, avatar: user.avatar, score: calculatedScore, rounds: session.history, cosmeticAvatar: cosmeticAvatar || null });
    await TournamentSession.findOneAndUpdate({ weekId, userId: user._id }, { completed: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/tournament/played', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(200).json({ played: false });
  try {
    const decoded  = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const weekId   = getWeekId();
    const existing = await Score.findOne({ weekId, userId: decoded.id });
    res.json({ played: !!existing, score: existing?.score });
  } catch {
    res.json({ played: false });
  }
});

app.get('/tournament/session', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const weekId  = getWeekId();

    let session = await TournamentSession.findOne({ weekId, userId: decoded.id });
    if (!session) {
      let tournament = await Tournament.findOne({ weekId });
      if (!tournament) {
        const shuffled        = [...ASSETS].sort(() => Math.random() - 0.5).slice(0, 10);
        const tournamentAssets = shuffled.map(a => ({ ...a, interval: '1h' }));
        tournament = await Tournament.create({ weekId, assets: tournamentAssets });
      }
      const rounds = [];
      for (const asset of tournament.assets) {
        try {
          const candles      = await fetchCandles({ ...asset, interval: '1h' });
          const cleanCandles = candles.filter(c => c && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0);
          if (cleanCandles.length < 100) continue;
          const win = randomWindow(cleanCandles);
          rounds.push({ asset: asset.name, interval: '1h', visible: win.visible, future: win.future });
        } catch (e) { console.log('Tournament session fetch error:', e.message); }
      }
      session = await TournamentSession.create({ weekId, userId: decoded.id, rounds, currentRound: 0, score: 0, history: [] });
    }

    res.json({
      weekId:       session.weekId,
      rounds:       session.rounds,
      currentRound: session.currentRound,
      score:        session.score,
      history:      session.history,
      completed:    session.completed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/tournament/progress', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const weekId  = getWeekId();
    const { currentRound, score, history } = req.body;
    await TournamentSession.findOneAndUpdate(
      { weekId, userId: decoded.id },
      { currentRound, score, history },
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/tournament/progress/round', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const weekId  = getWeekId();
    const { roundIndex, choice } = req.body;

    const session = await TournamentSession.findOne({ weekId, userId: decoded.id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (roundIndex < session.currentRound) return res.json({ alreadyPlayed: true });

    const roundData = session.rounds[roundIndex];
    if (!roundData) return res.status(400).json({ error: 'Invalid round' });

    const visible    = roundData.visible;
    const future     = roundData.future;
    const lastClose  = visible[visible.length - 1].close;
    const lastFuture = future[future.length - 1].close;
    const pctMove    = (lastFuture - lastClose) / lastClose * 100;
    const direction  = pctMove > 0.1 ? 'up' : pctMove < -0.1 ? 'down' : 'flat';
    const win = (choice === 'long'  && direction === 'up')
             || (choice === 'short' && direction === 'down')
             || (choice === 'skip'  && direction === 'flat');
    const pts = win && choice !== 'skip' ? 100 : win && choice === 'skip' ? 50 : 0;

    const newHistory = [...session.history, { choice, win, pts }];
    const newScore   = session.score + pts;

    await TournamentSession.findOneAndUpdate(
      { weekId, userId: decoded.id },
      { currentRound: roundIndex + 1, score: newScore, history: newHistory },
    );

    res.json({ ok: true, win, pts, pctMove, direction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Async duel routes ─────────────────────────────────────────────
app.post('/arena/async/create', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const challengerName = req.body.name || user.username || user.name;

    const recentCutoff = new Date(Date.now() - 60 * 1000);
    const existing = await AsyncDuel.findOne({
      'challenger.userId': user._id,
      status: 'waiting_challenger',
      createdAt: { $gte: recentCutoff },
    });
    if (existing) {
      return res.json({ code: existing.code, charts: existing.charts, challengerName });
    }

    const shuffled = [...ASSETS].sort(() => Math.random() - 0.5);
    const charts   = [];
    for (const asset of shuffled) {
      if (charts.length >= 10) break;
      try {
        const candles      = await fetchCandles({ ...asset, interval: '1h' });
        const cleanCandles = candles.filter(c => c && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0);
        if (cleanCandles.length < 100) continue;
        const win = randomWindow(cleanCandles);
        charts.push({ asset: asset.name, interval: '1h', visible: win.visible, future: win.future });
      } catch (e) { console.log('Async duel chart error:', e.message); }
    }
    if (charts.length < 10) return res.status(500).json({ error: 'Failed to generate charts' });

    let code, attempts = 0;
    do {
      code = Array.from({ length: 4 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]).join('');
      attempts++;
    } while (attempts < 10 && await AsyncDuel.findOne({ code }));

    const now       = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const duel      = await AsyncDuel.create({
      code, charts,
      challenger: { userId: user._id, name: challengerName },
      status: 'waiting_challenger',
      createdAt: now, expiresAt,
    });
    res.json({ code: duel.code, charts: duel.charts, challengerName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/arena/async/my-duels', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const uid     = decoded.id;
    const duels   = await AsyncDuel.find({
      $or: [{ 'challenger.userId': uid }, { 'rival.userId': uid }],
    }).sort({ createdAt: -1 }).limit(10);

    const now = Date.now();
    const result = duels.map(d => {
      const isChallenger  = String(d.challenger.userId) === String(uid);
      const status        = d.status === 'waiting_rival' && new Date(d.expiresAt) < now ? 'expired' : d.status;
      const myScore       = isChallenger ? d.challenger.score : d.rival.score;
      const oppScore      = isChallenger ? d.rival.score       : d.challenger.score;
      const oppName       = isChallenger ? d.rival.name        : d.challenger.name;
      const myCorrect     = Number.isFinite(myScore)  ? Math.round(myScore  / 100) : null;
      const oppCorrect    = Number.isFinite(oppScore) ? Math.round(oppScore / 100) : null;
      const hoursLeft     = Math.max(0, Math.floor((new Date(d.expiresAt) - now) / 3600000));
      return {
        code:        d.code,
        status,
        isChallenger,
        myCorrect,
        oppCorrect,
        oppName,
        hoursLeft,
        expiresAt:   d.expiresAt,
        createdAt:   d.createdAt,
      };
    });
    res.json({ duels: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/arena/async/:code', async (req, res) => {
  try {
    const duel = await AsyncDuel.findOne({ code: req.params.code.toUpperCase() });
    if (!duel) return res.status(404).json({ error: 'Duel not found' });
    if (duel.status === 'waiting_rival' && new Date() > duel.expiresAt) {
      await AsyncDuel.findByIdAndUpdate(duel._id, { status: 'expired' });
      return res.json({ duel: { code: duel.code, status: 'expired', challenger: { name: duel.challenger.name }, rival: { name: '' }, charts: [], expiresAt: duel.expiresAt } });
    }
    const completed = duel.status === 'completed';
    res.json({
      duel: {
        code:             duel.code,
        status:           duel.status,
        charts:           duel.charts,
        challengerUserId: String(duel.challenger.userId || ''),
        challenger: { name: duel.challenger.name, score: completed ? duel.challenger.score : null, answers: completed ? duel.challenger.answers : [] },
        rival:      { name: duel.rival.name,       score: completed ? duel.rival.score       : null, answers: completed ? duel.rival.answers       : [] },
        expiresAt:  duel.expiresAt,
        createdAt:  duel.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/arena/async/:code/submit', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const duel = await AsyncDuel.findOne({ code });
    if (!duel) return res.status(404).json({ error: 'Duel not found' });
    const { name, answers, score, role } = req.body;
    let userId = null;
    const auth = req.headers.authorization;
    if (auth) { try { userId = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET).id; } catch {} }

    if (role === 'challenger') {
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      if (!duel.challenger.userId || userId !== duel.challenger.userId.toString()) return res.status(403).json({ error: 'Forbidden' });
      if (duel.status !== 'waiting_challenger') return res.status(400).json({ error: 'Already submitted' });

      const serverScore = duel.charts.reduce((total, chart, i) => {
        const choice = answers?.[i]?.choice;
        if (!choice) return total;
        const lastClose  = chart.visible[chart.visible.length - 1].close;
        const lastFuture = chart.future[chart.future.length - 1].close;
        const pctMove    = (lastFuture - lastClose) / lastClose * 100;
        const direction  = pctMove > 0.1 ? 'up' : pctMove < -0.1 ? 'down' : 'flat';
        const win = (choice === 'long' && direction === 'up') || (choice === 'short' && direction === 'down') || (choice === 'skip' && direction === 'flat');
        return total + (win && choice !== 'skip' ? 100 : win && choice === 'skip' ? 50 : 0);
      }, 0);

      const safeAnswers = (answers || []).map((a, i) => {
        const chart      = duel.charts[i];
        const choice     = ['long', 'short', 'skip'].includes(a?.choice) ? a.choice : 'skip';
        const lastClose  = chart.visible[chart.visible.length - 1].close;
        const lastFuture = chart.future[chart.future.length - 1].close;
        const pctMove    = (lastFuture - lastClose) / lastClose * 100;
        const direction  = pctMove > 0.1 ? 'up' : pctMove < -0.1 ? 'down' : 'flat';
        const win = (choice === 'long' && direction === 'up') || (choice === 'short' && direction === 'down') || (choice === 'skip' && direction === 'flat');
        const pts = win && choice !== 'skip' ? 100 : win && choice === 'skip' ? 50 : 0;
        return { choice, win, pts, direction, pctMove: +pctMove.toFixed(2) };
      });

      await AsyncDuel.findByIdAndUpdate(duel._id, { 'challenger.answers': safeAnswers, 'challenger.score': serverScore, 'challenger.completedAt': new Date(), status: 'waiting_rival' });
    } else {
      if (duel.status !== 'waiting_rival') return res.status(400).json({ error: 'Cannot submit now' });
      await AsyncDuel.findByIdAndUpdate(duel._id, { 'rival.name': name, 'rival.userId': userId, 'rival.answers': answers, 'rival.score': score, 'rival.completedAt': new Date(), status: 'completed' });
      // Push notification to challenger
      if (duel.challenger.userId) {
        try {
          const subRaw = await redis.get(`push_user_sub:${duel.challenger.userId}`);
          if (subRaw) {
            const sub = JSON.parse(subRaw);
            await webpush.sendNotification(sub, JSON.stringify({
              title: '⚔️ ¡Tu rival ha aceptado el reto!',
              body:  'Ver los resultados →',
              url:   `${CLIENT_URL}?reto=${code}`,
            })).catch(() => {});
          }
        } catch {}
      }
    }
    const updated = await AsyncDuel.findOne({ code });
    res.json({ ok: true, duel: {
      code: updated.code, status: updated.status, charts: updated.charts,
      challenger: { name: updated.challenger.name, score: updated.challenger.score, answers: updated.challenger.answers },
      rival:      { name: updated.rival.name,       score: updated.rival.score,       answers: updated.rival.answers },
    }});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/arena/async/:code/status', async (req, res) => {
  try {
    const duel = await AsyncDuel.findOne({ code: req.params.code.toUpperCase() });
    if (!duel) return res.status(404).json({ error: 'Not found' });
    res.json({ status: duel.status, expiresAt: duel.expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Push routes ───────────────────────────────────────────────────
app.post('/push/subscribe', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  const { userId, ...sub } = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
  if (userId && String(userId) !== String(decoded.id)) return res.status(403).json({ error: 'Forbidden' });
  pushSubscriptions = await loadSubscriptions();
  const exists = pushSubscriptions.find(s => s.endpoint === sub.endpoint);
  if (!exists) {
    pushSubscriptions.push(sub);
    await saveSubscriptions(pushSubscriptions);
  }
  await redis.set(`push_user_sub:${decoded.id}`, JSON.stringify(sub));
  res.json({ ok: true });
});

app.post('/push/send', async (req, res) => {
  const key = req.headers['x-admin-secret'];
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
  pushSubscriptions = await loadSubscriptions();
  const payload = JSON.stringify({
    title: '⚡ Daily Challenge',
    body:  "Today's chart is ready. Can you call it?",
    url:   'https://tradiko.dev',
  });
  const promises = pushSubscriptions.map(sub =>
    webpush.sendNotification(sub, payload).catch(async err => {
      if (err.statusCode === 410) {
        pushSubscriptions = pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
        await saveSubscriptions(pushSubscriptions);
      }
    })
  );
  await Promise.all(promises);
  res.json({ ok: true, sent: pushSubscriptions.length });
});

app.post('/push/apns-register', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  const { deviceToken } = req.body;
  if (!deviceToken) return res.status(400).json({ error: 'No token' });
  await redis.set(`apns_token:${decoded.id}`, deviceToken);
  res.json({ ok: true });
});

app.post('/push/send-apns', async (req, res) => {
  const key = req.headers['x-admin-secret'];
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });

  const { title, body, userId } = req.body;

  try {
    const tokenRaw = await redis.get(`apns_token:${userId}`);
    if (!tokenRaw) return res.status(404).json({ error: 'No APNs token for user' });

    const { Notification } = require('apns2');
    const notification = new Notification(tokenRaw, {
      alert: { title: title || '⚡ Tradiko', body: body || 'Test' },
      sound: 'default',
      badge: 1,
    });

    await apnsClient.send(notification);
    res.json({ ok: true, token: tokenRaw.substring(0, 10) + '...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Candles helpers ───────────────────────────────────────────────
async function fetchCandles(asset) {
  console.log('Fetching:', asset.name, asset.source);
  const cacheKey = `candles:${asset.symbol}:${asset.interval}`;
  const ttl      = asset.interval === '15m' ? 300 : 600;

  return cachedFetch(cacheKey, ttl, async () => {
    if (asset.source === 'kraken') {
      const intervalMap = { '15m': 15, '1h': 60, '1d': 1440 };
      const minutes     = intervalMap[asset.interval] || 15;
      const url         = `https://api.kraken.com/0/public/OHLC?pair=${asset.symbol}&interval=${minutes}`;
      const res         = await fetch(url);
      const data        = await res.json();
      if (data.error && data.error.length > 0) throw new Error('Kraken error: ' + data.error[0]);
      const pair = Object.keys(data.result).find(k => k !== 'last');
      return data.result[pair].map(k => ({
        time:  k[0],
        open:  parseFloat(k[1]),
        high:  parseFloat(k[2]),
        low:   parseFloat(k[3]),
        close: parseFloat(k[4]),
      }));
    } else {
      const from   = new Date(); from.setDate(from.getDate() - 29);
      const result = await yf.chart(asset.symbol, { interval: '1h', period1: from.toISOString().split('T')[0] });
      return result.quotes
        .filter(q => q.open && q.high && q.low && q.close)
        .map(q => ({
          time:  Math.floor(new Date(q.date).getTime() / 1000),
          open:  q.open, high: q.high, low: q.low, close: q.close,
        }));
    }
  });
}

function randomWindow(candles) {
  const maxStart = Math.max(0, candles.length - 100);
  const start    = Math.floor(Math.random() * maxStart);
  return { visible: candles.slice(start, start + 80), future: candles.slice(start + 80, start + 100) };
}

// ── Socket.io ─────────────────────────────────────────────────────
const TOTAL_ROUNDS  = 10;
const rooms         = {};
const finishedRooms = {};
let   waiting       = null;
let   totalGamesPlayed = 0;

async function startRoom(socket1, socket2) {
  const shuffled = [...ASSETS].sort(() => Math.random() - 0.5);
  for (const asset of shuffled) {
    try {
      const candles = await fetchCandles(asset);
      if (!candles || candles.length < 100) continue;
      const roomId = `room_${Date.now()}`;
      const win    = randomWindow(candles);
      rooms[roomId] = {
        players:    [socket1.id, socket2.id],
        scores:     { [socket1.id]: 0, [socket2.id]: 0 },
        names:      { [socket1.id]: socket1.playerName, [socket2.id]: socket2.playerName },
        round:      1,
        choices:    {},
        allCandles: candles,
        visible:    win.visible,
        future:     win.future,
        asset,
        usedAssets: [asset.name],
      };
      socket1.join(roomId); socket2.join(roomId);
      socket1.roomId = roomId; socket2.roomId = roomId;
      const payload = { roomId, round: 1, total: TOTAL_ROUNDS, asset: asset.name, interval: asset.interval, visible: win.visible, future: win.future };
      socket1.emit('game:start', { ...payload, opponent: socket2.playerName });
      socket2.emit('game:start', { ...payload, opponent: socket1.playerName });
      totalGamesPlayed++;
      return;
    } catch (err) { console.log('Error con', asset.name, ':', err.message); }
  }
  socket1.emit('game:error', { message: 'Error al cargar datos. Intenta de nuevo.' });
  socket2.emit('game:error', { message: 'Error al cargar datos. Intenta de nuevo.' });
}

function resolveRound(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const lastClose   = room.visible[room.visible.length - 1].close;
  const lastFuture  = room.future[room.future.length - 1].close;
  const pctMove     = (lastFuture - lastClose) / lastClose * 100;
  const direction   = pctMove > 0.1 ? 'up' : pctMove < -0.1 ? 'down' : 'flat';
  const roundResult = {};
  for (const [pid, choice] of Object.entries(room.choices)) {
    const win = (choice === 'long' && direction === 'up') || (choice === 'short' && direction === 'down') || (choice === 'skip' && direction === 'flat');
    const pts = win && choice !== 'skip' ? 100 : win && choice === 'skip' ? 50 : 0;
    room.scores[pid] += pts;
    roundResult[pid]  = { choice, win, pts };
  }
  io.to(roomId).emit('game:round_result', { direction, pctMove, future: room.future, results: roundResult, scores: room.scores, names: room.names, round: room.round, total: TOTAL_ROUNDS });
  if (room.round >= TOTAL_ROUNDS) {
    setTimeout(() => {
      io.to(roomId).emit('game:over', { scores: room.scores, names: room.names });
      finishedRooms[roomId] = { ...room };
      delete rooms[roomId];
      setTimeout(() => delete finishedRooms[roomId], 120000);
    }, 3000);
    return;
  }
  room.round++;
  room.choices = {};
  const available = ASSETS.filter(a => !room.usedAssets.includes(a.name));
  if (available.length < 3) room.usedAssets = [room.asset.name];
  const pool      = ASSETS.filter(a => !room.usedAssets.includes(a.name));
  const nextAsset = pool[Math.floor(Math.random() * pool.length)];
  room.usedAssets.push(nextAsset.name);
  fetchCandles(nextAsset).then(candles => {
    const win = randomWindow(candles);
    room.visible = win.visible; room.future = win.future;
    room.asset = nextAsset; room.allCandles = candles;
    setTimeout(() => {
      io.to(roomId).emit('game:next_round', { round: room.round, total: TOTAL_ROUNDS, asset: nextAsset.name, interval: nextAsset.interval, visible: room.visible, future: room.future });
    }, 3000);
  }).catch(async (err) => {
    console.log('Error next round:', err.message, '— trying fallback');
    const fallbackPool = ASSETS.filter(a => a.name !== nextAsset.name && !room.usedAssets.includes(a.name));
    if (fallbackPool.length > 0) {
      const fallback = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
      try {
        const candles = await fetchCandles(fallback);
        const win = randomWindow(candles);
        room.visible = win.visible; room.future = win.future;
        room.asset = fallback; room.allCandles = candles;
        room.usedAssets.push(fallback.name);
        setTimeout(() => {
          io.to(roomId).emit('game:next_round', { round: room.round, total: TOTAL_ROUNDS, asset: fallback.name, interval: fallback.interval, visible: room.visible, future: room.future });
        }, 3000);
        return;
      } catch (e) { console.log('Fallback failed:', e.message); }
    }
    const win = randomWindow(room.allCandles);
    room.visible = win.visible; room.future = win.future;
    setTimeout(() => {
      io.to(roomId).emit('game:next_round', { round: room.round, total: TOTAL_ROUNDS, asset: room.asset.name, interval: room.asset.interval, visible: room.visible, future: room.future });
    }, 3000);
  });
}

const privateLobby   = {};
const userSockets    = {}; // username → socket (for challenge targeting)
const challengeRooms = {}; // roomCode → challenge state

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return privateLobby[code] ? generateCode() : code;
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('matchmaking:join', ({ name }) => {
    socket.playerName = name || 'Player';
    if (waiting && waiting.id !== socket.id) {
      const opponent = waiting; waiting = null;
      startRoom(opponent, socket);
    } else {
      waiting = socket;
      socket.emit('matchmaking:waiting');
    }
  });

  socket.on('game:forfeit', () => {
    if (socket.roomId && rooms[socket.roomId]) {
      const room     = rooms[socket.roomId];
      const winnerId = room.players.find(id => id !== socket.id);
      io.to(socket.roomId).emit('game:opponent_forfeited', { winner: room.names[winnerId] });
      delete rooms[socket.roomId];
    }
  });

  socket.on('game:choice', ({ choice }) => {
    const room = rooms[socket.roomId];
    if (!room) return;
    room.choices[socket.id] = choice;
    socket.to(socket.roomId).emit('game:opponent_chose');
    if (Object.keys(room.choices).length === 2) resolveRound(socket.roomId);
  });

  socket.on('chat:message', ({ msg }) => {
    if (socket.roomId && rooms[socket.roomId])
      socket.to(socket.roomId).emit('chat:message', { msg, from: socket.playerName });
  });

  socket.on('room:create', ({ name }) => {
    socket.playerName = name || 'Player';
    const code = generateCode();
    privateLobby[code] = { host: socket, name };
    socket.roomCode = code;
    socket.emit('room:created', { code });
  });

  socket.on('room:join', ({ name, code }) => {
    socket.playerName = name || 'Player';
    const lobby = privateLobby[code.toUpperCase()];
    if (!lobby) { socket.emit('room:error', { message: 'Sala no encontrada' }); return; }
    if (!lobby.host.connected) { socket.emit('room:error', { message: 'El host se desconectó' }); delete privateLobby[code]; return; }
    delete privateLobby[code];
    startRoom(lobby.host, socket);
  });

  socket.on('room:cancel', () => {
    if (socket.roomCode && privateLobby[socket.roomCode]) {
      delete privateLobby[socket.roomCode];
      socket.roomCode = null;
    }
  });

  socket.on('rematch:request', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('rematch:requested');
  });

  socket.on('rematch:accept', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    io.to(roomId).emit('rematch:countdown');
    setTimeout(async () => {
      const room = finishedRooms[roomId] || rooms[roomId];
      if (!room) return;
      const shuffled = [...ASSETS].sort(() => Math.random() - 0.5);
      for (const asset of shuffled) {
        try {
          const candles = await fetchCandles(asset);
          if (!candles || candles.length < 100) continue;
          const win = randomWindow(candles);
          rooms[roomId] = {
            players:    room.players,
            scores:     { [room.players[0]]: 0, [room.players[1]]: 0 },
            names:      room.names,
            round:      1,
            choices:    {},
            allCandles: candles,
            visible:    win.visible,
            future:     win.future,
            asset,
            usedAssets: [asset.name],
          };
          delete finishedRooms[roomId];
          const [id1, id2] = room.players;
          const payload = { roomId, round: 1, total: TOTAL_ROUNDS, asset: asset.name, interval: asset.interval, visible: win.visible, future: win.future };
          io.to(id1).emit('game:start', { ...payload, opponent: room.names[id2] });
          io.to(id2).emit('game:start', { ...payload, opponent: room.names[id1] });
          totalGamesPlayed++;
          return;
        } catch (err) { console.log('Rematch error:', err.message); }
      }
    }, 10000);
  });

  // ── Challenge system ────────────────────────────────────────────────
  socket.on('user:register', async ({ username, token }) => {
    if (!username || !token) return;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('username');
      if (!user || user.username !== username) return;
      socket.username = username;
      socket.userId   = decoded.id;
      userSockets[username] = socket;
    } catch {}
  });

  socket.on('friend:challenge', ({ targetUsername }) => {
    const challengerUsername = socket.username;
    if (!challengerUsername || !targetUsername) return;
    const targetSocket = userSockets[targetUsername];
    if (!targetSocket?.connected) {
      socket.emit('friend:challenge:expired');
      return;
    }
    const code = generateCode();
    const timeoutId = setTimeout(() => {
      if (challengeRooms[code]) {
        socket.emit('friend:challenge:expired');
        delete challengeRooms[code];
      }
    }, 30000);
    challengeRooms[code] = { challengerSocketId: socket.id, challengerUsername, targetUsername, timeoutId };
    targetSocket.emit('friend:challenged', { challengerUsername, roomCode: code });
  });

  socket.on('friend:challenge:accept', ({ roomCode }) => {
    const challenge = challengeRooms[roomCode];
    if (!challenge) return;
    clearTimeout(challenge.timeoutId);
    challengeRooms[roomCode] = { ...challenge, accepted: true };
    socket.emit('friend:challenge:ready', { roomCode });
    io.to(challenge.challengerSocketId).emit('friend:challenge:ready', { roomCode });
  });

  socket.on('friend:challenge:reject', ({ roomCode }) => {
    const challenge = challengeRooms[roomCode];
    if (!challenge) return;
    clearTimeout(challenge.timeoutId);
    io.to(challenge.challengerSocketId).emit('friend:challenge:rejected');
    delete challengeRooms[roomCode];
  });

  socket.on('challenge:join', ({ name, code }) => {
    socket.playerName = name || 'Player';
    const challenge = challengeRooms[code];
    if (!challenge?.accepted) {
      socket.emit('room:error', { message: 'Reto no encontrado o expirado' });
      return;
    }
    if (!challenge.waitingSocket) {
      const cleanupId = setTimeout(() => { delete challengeRooms[code]; }, 60000);
      challengeRooms[code] = { ...challenge, waitingSocket: socket, cleanupId };
    } else {
      clearTimeout(challenge.cleanupId);
      const host = challenge.waitingSocket;
      delete challengeRooms[code];
      startRoom(host, socket);
    }
  });

  socket.on('disconnect', () => {
    if (socket.username && userSockets[socket.username] === socket) delete userSockets[socket.username];
    for (const [code, ch] of Object.entries(challengeRooms)) {
      if (ch.challengerSocketId === socket.id || ch.waitingSocket?.id === socket.id) {
        clearTimeout(ch.timeoutId);
        clearTimeout(ch.cleanupId);
        delete challengeRooms[code];
      }
    }
    if (socket.roomCode && privateLobby[socket.roomCode]) delete privateLobby[socket.roomCode];
    if (socket.roomId && rooms[socket.roomId]) {
      socket.to(socket.roomId).emit('game:opponent_disconnected');
      delete rooms[socket.roomId];
    }
    if (waiting?.id === socket.id) waiting = null;
    console.log('Disconnected:', socket.id);
  });
});
// Precargar precios cada 5 minutos
async function warmPriceCache() {
  console.log('Warming price cache...');
  for (let i = 0; i < PORTFOLIO_ASSETS.length; i += 5) {
    const batch = PORTFOLIO_ASSETS.slice(i, i + 5);
    await Promise.all(batch.map(a => getPrice(a).catch(() => null)));
    if (i + 5 < PORTFOLIO_ASSETS.length) {
      await new Promise(r => setTimeout(r, 1200));
    }
  }
  console.log('Price cache warmed');
}

// Ejecutar al arrancar y cada 5 minutos
warmPriceCache();
cron.schedule('*/5 * * * *', warmPriceCache);

// ── Price alerts cron (every 15 min) ──────────────────────────────
cron.schedule('*/15 * * * *', async () => {
  try {
    const alerts = await PriceAlert.find({ triggered: false });
    if (!alerts.length) return;
    for (const alert of alerts) {
      try {
        const cached = await redis.get(`price_v2:${alert.ticker}`);
        if (!cached) continue;
        const priceData    = typeof cached === 'string' ? JSON.parse(cached) : cached;
        const currentPrice = priceData.price;
        const hit =
          (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
          (alert.condition === 'below' && currentPrice <= alert.targetPrice);
        if (!hit) continue;
        await PriceAlert.findByIdAndUpdate(alert._id, { triggered: true });
        const emoji = alert.condition === 'above' ? '📈' : '📉';
        const dir   = alert.condition === 'above' ? 'subido a' : 'bajado a';
        await sendPushToUser(alert.userId, {
          title: `${emoji} Alerta: ${alert.ticker}`,
          body:  `${alert.ticker} ha ${dir} $${currentPrice.toFixed(2)} (objetivo: $${alert.targetPrice})`,
          url:   'https://tradiko.dev',
        });
      } catch (e) {
        console.error('Alert check error:', e.message);
      }
    }
  } catch (e) {
    console.error('Alerts cron error:', e.message);
  }
});

// ── Cron ──────────────────────────────────────────────────────────
cron.schedule('0 8 * * *', async () => {
  pushSubscriptions = await loadSubscriptions();
  console.log('Sending to', pushSubscriptions.length, 'subscribers...');
  const payload = JSON.stringify({
    title: '⚡ Daily Challenge',
    body:  "Today's chart is ready. Can you call it?",
    url:   'https://tradiko.dev',
  });
  const promises = pushSubscriptions.map(sub =>
    webpush.sendNotification(sub, payload).catch(async err => {
      if (err.statusCode === 410) {
        pushSubscriptions = pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
        await saveSubscriptions(pushSubscriptions);
      }
    })
  );
  await Promise.all(promises);
  console.log(`Sent to ${pushSubscriptions.length} subscribers`);
 });
 // Notificación apertura mercado — 15:30 hora española = 13:30 UTC (horario verano)
cron.schedule('30 13 * * 1-5', async () => {
  pushSubscriptions = await loadSubscriptions();
  console.log('Sending market open notification...');
  const payload = JSON.stringify({
    title: '📈 El mercado acaba de abrir',
    body:  'NYSE y NASDAQ abiertos. Revisa tu portfolio.',
    url:   'https://tradiko.dev',
  });
  const promises = pushSubscriptions.map(sub =>
    webpush.sendNotification(sub, payload).catch(async err => {
      if (err.statusCode === 410) {
        pushSubscriptions = pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
        await saveSubscriptions(pushSubscriptions);
      }
    })
  );
  await Promise.all(promises);
  console.log(`Market open notification sent to ${pushSubscriptions.length} subscribers`);
});

// Notificación cierre mercado — 22:00 hora española = 20:00 UTC (horario verano)
cron.schedule('0 20 * * 1-5', async () => {
  pushSubscriptions = await loadSubscriptions();
  const payload = JSON.stringify({
    title: '🔔 El mercado ha cerrado',
    body:  'Revisa cómo ha ido tu portfolio hoy.',
    url:   'https://tradiko.dev',
  });
  const promises = pushSubscriptions.map(sub =>
    webpush.sendNotification(sub, payload).catch(async err => {
      if (err.statusCode === 410) {
        pushSubscriptions = pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
        await saveSubscriptions(pushSubscriptions);
      }
    })
  );
  await Promise.all(promises);
 });

cron.schedule('0 7 * * *', async () => {
  const portfolios = await Portfolio.find({}).populate('userId', 'name');
  for (const portfolio of portfolios) {
    try {
      if (!portfolio.userId) continue;
      const today     = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const histToday = await PortfolioHistory.findOne({ userId: portfolio.userId._id, date: today });
      const histYest  = await PortfolioHistory.findOne({ userId: portfolio.userId._id, date: yesterday });
      if (!histToday || !histYest) continue;
      const change    = histToday.totalValue - histYest.totalValue;
      const changePct = ((change / histYest.totalValue) * 100).toFixed(2);
      const emoji     = change >= 0 ? '📈' : '📉';
      const sign      = change >= 0 ? '+' : '';
      await sendPushToUser(portfolio.userId._id, {
        title: `${emoji} Tu portfolio hoy`,
        body:  `${sign}${changePct}% (${sign}${change.toFixed(0)}) · Valor total: ${histToday.totalValue.toFixed(0)}`,
        url:   'https://tradiko.dev',
      });
    } catch (e) {
      console.error('Portfolio notification error:', e.message);
    }
  }
});

cron.schedule('0 21 * * *', async () => {
  const now = new Date();
  const todayMadrid = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' })).toISOString().split('T')[0];
  console.log(`[streak-cron] Fired at ${now.toISOString()} — today (Madrid): ${todayMadrid}`);

  const usersAtRisk = await User.find({
    dailyStreak: { $gt: 0 },
    $or: [
      { lastPlayed: { $ne: todayMadrid } },
      { lastPlayed: null }
    ]
  });

  console.log(`[streak-cron] Found ${usersAtRisk.length} users at risk`);

  let sent = 0;
  for (const user of usersAtRisk) {
    try {
      const subRaw = await redis.get(`push_user_sub:${user._id}`);
      const apnsRaw = await redis.get(`apns_token:${user._id}`);
      console.log(`[streak-cron] user=${user._id} streak=${user.dailyStreak} lastPlayed=${user.lastPlayed} hasSub=${!!subRaw} hasApns=${!!apnsRaw}`);
      if (!subRaw && !apnsRaw) continue;
      await sendPushToUser(user._id, {
        title: '⚡ Tu racha está en peligro',
        body:  `Llevas ${user.dailyStreak} días seguidos. Te quedan 3 horas para mantenerla.`,
        url:   'https://tradiko.dev',
      });
      sent++;
    } catch (e) {
      console.error(`[streak-cron] Error for user ${user._id}:`, e.message);
    }
  }

  console.log(`[streak-cron] Done — sent ${sent}/${usersAtRisk.length}`);
}, { timezone: 'Europe/Madrid' });

cron.schedule('0 0 * * *', async () => {
  const today = new Date().toISOString().split('T')[0];
  const expiredDuels = await PortfolioDuel.find({ status: 'active', endDate: { $lte: today } });
  for (const duel of expiredDuels) {
    const cVal = await getPortfolioValue(duel.challenger);
    const oVal = await getPortfolioValue(duel.opponent);
    const cReturn = (cVal - duel.challengerStartValue) / duel.challengerStartValue;
    const oReturn = (oVal - duel.opponentStartValue)   / duel.opponentStartValue;
    duel.status = 'finished';
    duel.winner = cReturn >= oReturn ? duel.challenger : duel.opponent;
    await duel.save();
  }
});

 app.get('/stats/dashboard', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  try {
    const users  = await User.aggregate([
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    const scores = await Score.aggregate([
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        avgScore: { $avg: '$score' }
      }},
      { $sort: { _id: 1 } }
    ]);
    const purchases = await User.aggregate([
      { $unwind: '$purchases' },
      { $group: { _id: '$purchases', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const totalUsers     = await User.countDocuments();
    const totalScores    = await Score.countDocuments();
    const totalPurchases = await User.aggregate([
      { $project: { count: { $size: { $ifNull: ['$purchases', []] } } } },
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]);
    res.json({ users, scores, purchases, totalUsers, totalScores, totalPurchases: totalPurchases[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

let revenueCache = null;
let revenueCacheAt = 0;
const REVENUE_CACHE_TTL = 5 * 60 * 1000;

app.get('/stats/revenue', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  try {
    if (revenueCache && Date.now() - revenueCacheAt < REVENUE_CACHE_TTL) {
      return res.json(revenueCache);
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let totalRevenue = 0;
    let monthRevenue = 0;
    let todayRevenue = 0;

    let hasMore = true;
    let startingAfter = undefined;
    while (hasMore) {
      const params = { limit: 100, currency: 'eur', status: 'succeeded' };
      if (startingAfter) params.starting_after = startingAfter;
      const page = await stripe.charges.list(params);
      for (const charge of page.data) {
        const amount = charge.amount / 100;
        const created = new Date(charge.created * 1000);
        totalRevenue += amount;
        if (created >= startOfMonth) monthRevenue += amount;
        if (created >= startOfDay)   todayRevenue += amount;
      }
      hasMore = page.has_more;
      if (hasMore) startingAfter = page.data[page.data.length - 1].id;
    }

    revenueCache = {
      totalRevenue: +totalRevenue.toFixed(2),
      monthRevenue: +monthRevenue.toFixed(2),
      todayRevenue: +todayRevenue.toFixed(2),
      currency: 'eur',
    };
    revenueCacheAt = Date.now();
    res.json(revenueCache);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Portfolio routes ──────────────────────────────────────────────

// Obtener todos los precios
app.get('/portfolio/prices', async (req, res) => {
  try {
    // Obtener todos los precios en caché con una sola operación mget
    const keys = PORTFOLIO_ASSETS.map(a => `price_v2:${a.symbol}`);
    let rawValues;
    try { rawValues = await redis.mget(...keys); } catch { rawValues = []; }
    const cachedResults = (rawValues || []).map(v => {
      if (!v) return null;
      try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return null; }
    });

    const cached = cachedResults.filter(Boolean);

    // Si hay suficientes en caché, responde ya
    if (cached.length >= PORTFOLIO_ASSETS.length * 0.7) {
      res.json(cached);
      return;
    }

    // Si no hay caché suficiente, carga en batches y responde
    const results = [];
    const batchSize = 5;
    for (let i = 0; i < PORTFOLIO_ASSETS.length; i += batchSize) {
      const batch = PORTFOLIO_ASSETS.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(a => getPrice(a).catch(() => null))
      );
      results.push(...batchResults);
      if (i + batchSize < PORTFOLIO_ASSETS.length) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }
    res.json(results.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Obtener portfolio del usuario
app.get('/portfolio', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const cacheKey = `portfolio:${decoded.id}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(typeof cached === 'string' ? JSON.parse(cached) : cached);
    } catch {}
    let portfolio = await Portfolio.findOne({ userId: decoded.id });
    if (!portfolio) {
      portfolio = await Portfolio.create({ userId: decoded.id, cash: 50000, positions: [], transactions: [] });
    }
    const user = await User.findById(decoded.id).select('portfolioTutorialSeen');
    const obj = portfolio.toObject();
    obj.tutorialSeen = user?.portfolioTutorialSeen ?? false;
    redis.set(cacheKey, JSON.stringify(obj), { ex: 30 }).catch(() => {});
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/portfolio/tutorial-seen', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    await User.findByIdAndUpdate(decoded.id, { portfolioTutorialSeen: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/academias/intro', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.json({ seen: false });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const user = await User.findById(decoded.id).select('academiasTutorialSeen');
    res.json({ seen: user?.academiasTutorialSeen ?? false });
  } catch {
    res.json({ seen: false });
  }
});

app.post('/academias/tutorial-seen', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    await User.findByIdAndUpdate(decoded.id, { academiasTutorialSeen: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/reset-portfolio-tutorial/:username', async (req, res) => {
  const key = req.headers['x-admin-secret'];
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
  try {
    const user = await User.findOneAndUpdate({ username: req.params.username }, { portfolioTutorialSeen: false });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, username: req.params.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/reset-academias/:username', async (req, res) => {
  const key = req.headers['x-admin-secret'];
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
  try {
    const user = await User.findOneAndUpdate({ username: req.params.username }, { academiasTutorialSeen: false });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, username: req.params.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/portfolio/:username', async (req, res) => {
  const key = req.headers['x-admin-secret'];
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const portfolio = await Portfolio.findOne({ userId: user._id });
    if (!portfolio) return res.json({ cash: 50000, positions: [], transactions: [] });
    const priceMap = {};
    await Promise.all(PORTFOLIO_ASSETS.map(async a => {
      try {
        const c = await redis.get(`price_v2:${a.symbol}`);
        if (c) { const p = typeof c === 'string' ? JSON.parse(c) : c; priceMap[p.symbol] = p.price; }
      } catch {}
    }));
    const positions = portfolio.positions.map(pos => {
      const currentPrice = priceMap[pos.symbol] || pos.avgPrice;
      const value = currentPrice * pos.qty;
      const pnl = (currentPrice - pos.avgPrice) * pos.qty;
      const pnlPct = ((currentPrice - pos.avgPrice) / pos.avgPrice) * 100;
      return { symbol: pos.symbol, name: pos.name, type: pos.type, qty: pos.qty, avgPrice: pos.avgPrice, currentPrice, value, pnl, pnlPct };
    });
    const invested = positions.reduce((s, p) => s + p.value, 0);
    const totalValue = portfolio.cash + invested;
    const portfolioReturn = ((totalValue - 50000) / 50000) * 100;
    res.json({ username: user.username, name: user.name, cash: portfolio.cash, invested, totalValue, portfolioReturn, positions, transactions: portfolio.transactions.slice(-20) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Ligas ─────────────────────────────────────────────────────────────────────

function generateLeagueCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

app.post('/leagues/create', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { name, endDate } = req.body;
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Nombre demasiado corto' });
    let code, tries = 0;
    do { code = generateLeagueCode(); tries++; }
    while (await League.exists({ code }) && tries < 10);
    const startValue = await getPortfolioValue(decoded.id);
    const today      = new Date().toISOString().split('T')[0];
    const league     = await League.create({
      name: name.trim().slice(0, 30), code, owner: decoded.id,
      members: [{ userId: decoded.id, startValue, joinedAt: new Date() }],
      startDate: today, endDate: endDate || null,
    });
    res.json({ leagueId: league._id, code });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/leagues/join', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { code } = req.body;
    const league = await League.findOne({ code: (code || '').toUpperCase() });
    if (!league) return res.status(404).json({ error: 'Liga no encontrada' });
    if (league.members.some(m => m.userId.toString() === decoded.id))
      return res.status(400).json({ error: 'Ya eres miembro de esta liga' });
    const startValue = await getPortfolioValue(decoded.id);
    league.members.push({ userId: decoded.id, startValue, joinedAt: new Date() });
    await league.save();
    res.json({ leagueId: league._id, name: league.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/leagues/mine', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const leagues  = await League.find({ 'members.userId': decoded.id });
    res.json(leagues.map(l => ({
      _id: l._id, name: l.name, code: l.code, owner: l.owner,
      memberCount: l.members.length, startDate: l.startDate, endDate: l.endDate,
      isOwner: l.owner.toString() === decoded.id,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/leagues/:leagueId/ranking', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const league  = await League.findById(req.params.leagueId);
    if (!league) return res.status(404).json({ error: 'Liga no encontrada' });
    if (!league.members.some(m => m.userId.toString() === decoded.id))
      return res.status(403).json({ error: 'No eres miembro de esta liga' });
    const priceMap = {};
    await Promise.all(PORTFOLIO_ASSETS.map(async a => {
      try {
        const c = await redis.get(`price_v2:${a.symbol}`);
        if (c) { const p = typeof c === 'string' ? JSON.parse(c) : c; priceMap[p.symbol] = p.price; }
      } catch {}
    }));
    const memberIds = league.members.map(m => m.userId);
    const [portfolios, users] = await Promise.all([
      Portfolio.find({ userId: { $in: memberIds } }),
      User.find({ _id: { $in: memberIds } }).select('name username avatar customAvatar activeCosmetics'),
    ]);
    const pMap = {}; portfolios.forEach(p => { pMap[p.userId.toString()] = p; });
    const uMap = {}; users.forEach(u => { uMap[u._id.toString()] = u; });
    const ranking = league.members.map(m => {
      const uid  = m.userId.toString();
      const u    = uMap[uid];
      const port = pMap[uid];
      let totalValue = m.startValue;
      if (port) {
        const invested = port.positions.reduce((s, pos) => s + (priceMap[pos.symbol] || pos.avgPrice) * pos.qty, 0);
        totalValue = port.cash + invested;
      }
      return {
        userId: m.userId, name: u?.name || 'Anonymous', username: u?.username || null,
        avatar: u?.avatar || null, customAvatar: u?.customAvatar || null,
        activeCosmetics: u?.activeCosmetics || {},
        startValue: m.startValue, totalValue,
        returnPct: ((totalValue - m.startValue) / m.startValue) * 100,
        isYou: uid === decoded.id,
      };
    }).sort((a, b) => b.returnPct - a.returnPct);
    const top10 = ranking.slice(0, 10);
    let userPosition = null;
    const userIdx = ranking.findIndex(e => e.isYou);
    if (userIdx >= 10) {
      userPosition = { rank: userIdx + 1, ...ranking[userIdx] };
    }
    res.json({
      _id: league._id, name: league.name, code: league.code,
      owner: league.owner, startDate: league.startDate, endDate: league.endDate,
      isOwner: league.owner.toString() === decoded.id, ranking: top10, userPosition,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/leagues/:leagueId/leave', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const league  = await League.findById(req.params.leagueId);
    if (!league) return res.status(404).json({ error: 'Liga no encontrada' });
    if (league.owner.toString() === decoded.id)
      return res.status(400).json({ error: 'El owner no puede abandonar la liga. Elimínala.' });
    league.members = league.members.filter(m => m.userId.toString() !== decoded.id);
    await league.save();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/leagues/:leagueId', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const league  = await League.findById(req.params.leagueId);
    if (!league) return res.status(404).json({ error: 'Liga no encontrada' });
    if (league.owner.toString() !== decoded.id)
      return res.status(403).json({ error: 'Solo el owner puede eliminar la liga' });
    await League.findByIdAndDelete(req.params.leagueId);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Comprar
app.post('/portfolio/buy', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { symbol, qty } = req.body;
    if (!qty || qty <= 0 || !Number.isFinite(qty)) return res.status(400).json({ error: 'Invalid quantity' });
    const asset    = PORTFOLIO_ASSETS.find(a => a.symbol === symbol);
    if (!asset) return res.status(400).json({ error: 'Asset not found' });
    const priceData = await getPrice(asset);
    const price     = priceData.price;
    const total     = price * qty;
    let portfolio   = await Portfolio.findOne({ userId: decoded.id });
    if (!portfolio) portfolio = await Portfolio.create({ userId: decoded.id, cash: 50000, positions: [], transactions: [] });
    if (portfolio.cash < total) return res.status(400).json({ error: 'Insufficient funds' });
    portfolio.cash -= total;
    const existing = portfolio.positions.find(p => p.symbol === symbol);
    if (existing) {
      existing.avgPrice = (existing.avgPrice * existing.qty + price * qty) / (existing.qty + qty);
      existing.qty += qty;
    } else {
      portfolio.positions.push({ symbol, name: asset.name, qty, avgPrice: price, type: asset.type });
    }
    portfolio.transactions.push({ symbol, name: asset.name, type: asset.type, action: 'buy', qty, price, total });
    await portfolio.save();
    redis.del(`portfolio:${decoded.id}`).catch(() => {});
    res.json({ ok: true, cash: portfolio.cash });
  } catch (err) {
    console.error('Buy error:', err.message);
    res.status(500).json({ error: 'Trade failed' });
  }
});

// Vender
app.post('/portfolio/sell', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { symbol, qty } = req.body;
    if (!qty || qty <= 0 || !Number.isFinite(qty)) return res.status(400).json({ error: 'Invalid quantity' });
    const asset    = PORTFOLIO_ASSETS.find(a => a.symbol === symbol);
    if (!asset) {
      const portfolio = await Portfolio.findOne({ userId: decoded.id });
      if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
      const position = portfolio.positions.find(p => p.symbol === symbol);
      if (!position) return res.status(404).json({ error: 'Position not found' });
      const refund = position.avgPrice * position.qty;
      portfolio.cash += refund;
      portfolio.positions = portfolio.positions.filter(p => p.symbol !== symbol);
      portfolio.transactions.push({ symbol, name: position.name, type: position.type, action: 'sell', qty: position.qty, price: position.avgPrice, total: refund });
      await portfolio.save();
      redis.del(`portfolio:${decoded.id}`).catch(() => {});
      return res.json({ ok: true, cash: portfolio.cash, refunded: true });
    }
    const priceData = await getPrice(asset);
    const price     = priceData.price;
    const total     = price * qty;
    const portfolio = await Portfolio.findOne({ userId: decoded.id });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    const position  = portfolio.positions.find(p => p.symbol === symbol);
    if (!position || position.qty < qty) return res.status(400).json({ error: 'Insufficient position' });
    portfolio.cash += total;
    position.qty = Math.round((position.qty - qty) * 10000) / 10000;
    if (position.qty < 0.0001) {
      portfolio.positions = portfolio.positions.filter(p => p.symbol !== symbol);
    }
    portfolio.transactions.push({ symbol, name: asset.name, type: asset.type, action: 'sell', qty, price, total, avgPrice: position?.avgPrice ?? price });
    await portfolio.save();
    redis.del(`portfolio:${decoded.id}`).catch(() => {});
    res.json({ ok: true, cash: portfolio.cash });
  } catch (err) {
    console.error('Sell error:', err.message);
    res.status(500).json({ error: 'Trade failed' });
  }
});
app.post('/admin/refund-unlisted/:username', async (req, res) => {
  const key = req.headers['x-admin-secret'];
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) return res.status(403).json({ error: 'forbidden' });
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'user not found' });
    const portfolio = await Portfolio.findOne({ userId: user._id });
    if (!portfolio) return res.status(404).json({ error: 'portfolio not found' });

    const listed = new Set(PORTFOLIO_ASSETS.map(a => a.symbol));
    const stuck  = portfolio.positions.filter(p => !listed.has(p.symbol));

    if (stuck.length === 0) {
      return res.json({ ok: true, message: 'no unlisted positions', positions: portfolio.positions.map(p => p.symbol) });
    }

    let refund = 0;
    for (const pos of stuck) {
      refund += pos.avgPrice * pos.qty;
      portfolio.transactions.push({ symbol: pos.symbol, name: pos.name, type: pos.type, action: 'sell', qty: pos.qty, price: pos.avgPrice, total: pos.avgPrice * pos.qty, date: new Date() });
    }
    portfolio.positions = portfolio.positions.filter(p => listed.has(p.symbol));
    portfolio.cash += refund;
    await portfolio.save();

    res.json({ ok: true, refundedSymbols: stuck.map(p => p.symbol), refund: refund.toFixed(2), newCash: portfolio.cash.toFixed(2) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/portfolio/refund-delisted', async (req, res) => {
  const key = req.headers['x-admin-secret'] || req.query.secret;
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
  const DELISTED = ['BRK.B', 'LVMUY', 'NSRGY', 'AGG', 'SAP'];
  try {
    const portfolios = await Portfolio.find({});
    let totalRefunded = 0;
    let usersAffected = 0;
    for (const portfolio of portfolios) {
      const delistedPositions = portfolio.positions.filter(p => DELISTED.includes(p.symbol));
      if (delistedPositions.length === 0) continue;
      let refund = 0;
      for (const pos of delistedPositions) {
        refund += pos.avgPrice * pos.qty;
        portfolio.transactions.push({ symbol: pos.symbol, name: pos.name, type: pos.type, action: 'sell', qty: pos.qty, price: pos.avgPrice, total: pos.avgPrice * pos.qty, date: new Date() });
      }
      portfolio.positions = portfolio.positions.filter(p => !DELISTED.includes(p.symbol));
      portfolio.cash += refund;
      await portfolio.save();
      totalRefunded += refund;
      usersAffected++;
      console.log(`Refunded $${refund.toFixed(2)} to portfolio ${portfolio._id}`);
    }
    res.json({ ok: true, usersAffected, totalRefunded: totalRefunded.toFixed(2) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function isWeekday() {
  const day = new Date().getUTCDay(); // 0 = domingo, 6 = sábado
  return day !== 0 && day !== 6;
}

app.get('/portfolio/clear-crypto-cache', async (req, res) => {
  await redis.del('price:BTCUSDT');
  await redis.del('price:ETHUSDT');
  await redis.del('price:XRPUSDT');
  res.json({ ok: true });
});
app.get('/portfolio/candles/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const asset = PORTFOLIO_ASSETS.find(a => a.symbol === symbol);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  try {
    let candles;
    if (asset.source === 'binance') {
      const coinMap = { 'BTCUSDT': 'BTC-USD', 'ETHUSDT': 'ETH-USD', 'XRPUSDT': 'XRP-USD' ,'SOLUSDT':  'SOL-USD', 'DOGEUSDT': 'DOGE-USD', 'BNBUSDT': 'BNB-USD', 'AVAXUSDT': 'AVAX-USD', 'ADAUSDT': 'ADA-USD', 'DOTUSDT': 'DOT-USD', 'LINKUSDT': 'LINK-USD' };
      const yahooSymbol = coinMap[symbol];
      const d = new Date(); d.setFullYear(d.getFullYear() - 1);
      const result = await yf.chart(yahooSymbol, { interval: '1d', period1: d.toISOString().split('T')[0] });
      candles = result.quotes.filter(q => q.open && q.high && q.low && q.close).map(q => ({
        time:  Math.floor(new Date(q.date).getTime() / 1000),
        open:  q.open, high: q.high, low: q.low, close: q.close,
      }));
    } else {
      const yahooSymbolMap = { 'ORAN': 'ORA.PA', 'IDEXY': 'ITX.MC', 'ALIZF': 'ALV.DE', 'BAYZF': 'BAYN.DE' };
      const yahooSym = yahooSymbolMap[symbol] || symbol;
      const d = new Date(); d.setFullYear(d.getFullYear() - 1);
      const result = await yf.chart(yahooSym, { interval: '1d', period1: d.toISOString().split('T')[0] });
      candles = result.quotes.filter(q => q.open && q.high && q.low && q.close).map(q => ({
        time:  Math.floor(new Date(q.date).getTime() / 1000),
        open:  q.open, high: q.high, low: q.low, close: q.close,
      }));
    }
    res.json(candles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/portfolio/snapshot', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded    = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const totalValue = await getPortfolioValue(decoded.id);
    const date = new Date().toISOString().split('T')[0];
    await PortfolioHistory.findOneAndUpdate(
      { userId: decoded.id, date },
      { totalValue },
      { upsert: true }
    );
    res.json({ ok: true });

    // Check if user has surpassed someone in the leaderboard
    try {
      const allPortfolios = await Portfolio.find({}).populate('userId', 'name username avatar');
      const prices = {};
      for (const asset of PORTFOLIO_ASSETS) {
        try {
          const cached = await redis.get(`price_v2:${asset.symbol}`);
          if (cached) prices[asset.symbol] = (typeof cached === 'string' ? JSON.parse(cached) : cached).price;
        } catch {}
      }

      const ranking = allPortfolios.map(p => {
        const invested   = p.positions.reduce((s, pos) => s + (prices[pos.symbol] || pos.avgPrice) * pos.qty, 0);
        const totalValue = p.cash + invested;
        const returnPct  = ((totalValue - 50000) / 50000) * 100;
        return { userId: p.userId?._id, name: p.userId?.username || p.userId?.name, totalValue, returnPct };
      }).filter(p => p.userId).sort((a, b) => b.returnPct - a.returnPct);

      const myRank = ranking.findIndex(r => r.userId.toString() === decoded.id.toString());
      const myData = ranking[myRank];

      const prevRankKey = `prev_rank:${decoded.id}`;
      const prevRank    = parseInt(await redis.get(prevRankKey) || '999');
      console.log(`[leaderboard-notif] user=${decoded.id} myRank=${myRank} prevRank=${prevRank} rankingSize=${ranking.length}`);

      // Notify the person we just displaced (now at myRank, the position we took)
      if (myRank < prevRank && myRank < ranking.length && isWeekday()) {
        const surpassedUser = ranking[myRank]; // the user now at the position we just took
        console.log(`[leaderboard-notif] surpassed user=${surpassedUser.userId} (${surpassedUser.name}) — checking sub`);
        if (surpassedUser.userId && surpassedUser.userId.toString() !== decoded.id.toString()) {
          const cooldownKey    = `leaderboard_notif_sent:${surpassedUser.userId}`;
          const alreadyNotified = await redis.get(cooldownKey);
          const subRaw         = await redis.get(`push_user_sub:${surpassedUser.userId}`);
          console.log(`[leaderboard-notif] surpassed user hasSub=${!!subRaw} alreadyNotified=${!!alreadyNotified}`);
          if (!alreadyNotified && subRaw) {
            const sub     = typeof subRaw === 'string' ? JSON.parse(subRaw) : subRaw;
            const myName  = `@${myData.name}`;
            const payload = JSON.stringify({
              title: '📉 Te han superado en el ranking',
              body:  `${myName} te ha superado. Su portfolio: ${myData.returnPct >= 0 ? '+' : ''}${myData.returnPct.toFixed(1)}% · El tuyo: ${surpassedUser.returnPct >= 0 ? '+' : ''}${surpassedUser.returnPct.toFixed(1)}%`,
              url:   'https://tradiko.dev',
            });
            await webpush.sendNotification(sub, payload).catch(() => {});
            await redis.set(cooldownKey, '1', { ex: 21600 }); // 6 horas
            console.log(`[leaderboard-notif] notification sent to ${surpassedUser.userId}`);
          }
        }
      }

      await redis.set(`prev_rank:${decoded.id}`, myRank.toString(), { ex: 86400 });
    } catch (e) {
      console.error('[leaderboard-notif] error:', e.message);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/portfolio/history', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const history = await PortfolioHistory.find({ userId: decoded.id }).sort({ date: 1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/portfolio/clear-cache', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try { jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET); } 
  catch { return res.status(401).json({ error: 'Invalid token' }); }
  try {
    const keys = PORTFOLIO_ASSETS
      .filter(a => a.source === 'finnhub')
      .map(a => `price:${a.symbol}`);
    await Promise.all(keys.map(k => redis.del(k)));
    res.json({ ok: true, cleared: keys.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/portfolio/weekly/leaderboard', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  try {
    const now   = new Date();
    const day   = now.getUTCDay();
    const diff  = (day === 0) ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString().split('T')[0];

    const activeUserIds = await PortfolioHistory.distinct('userId', { date: { $gte: mondayStr } });
    if (activeUserIds.length === 0) {
      return res.json({ leaderboard: [], userPosition: null });
    }

    // Weekly baseline: last snapshot BEFORE Monday for each active user
    const baselineHistory = await PortfolioHistory.aggregate([
      { $match: { userId: { $in: activeUserIds }, date: { $lt: mondayStr } } },
      { $sort: { date: -1 } },
      { $group: { _id: '$userId', totalValue: { $first: '$totalValue' } } },
    ]);
    const baselineMap = {};
    baselineHistory.forEach(h => { baselineMap[String(h._id)] = h.totalValue; });

    const portfolios = await Portfolio.find({ userId: { $in: activeUserIds } })
      .populate('userId', 'name avatar customAvatar username activeCosmetics');
    const prices     = await Promise.all(PORTFOLIO_ASSETS.map(a => getPrice(a).catch(() => null)));
    const priceMap   = {};
    prices.filter(Boolean).forEach(p => { priceMap[p.symbol] = p.price; });

    const allLeaderboard = portfolios.map(p => {
      const invested   = p.positions.reduce((s, pos) => s + (priceMap[pos.symbol] || pos.avgPrice) * pos.qty, 0);
      const totalValue = p.cash + invested;
      const baseline   = baselineMap[String(p.userId?._id)] ?? 50000;
      const returnPct  = ((totalValue - baseline) / baseline) * 100;
      return {
        userId:          String(p.userId?._id || ''),
        name:            p.userId?.username || p.userId?.name || 'Anonymous',
        username:        p.userId?.username || null,
        avatar:          p.userId?.avatar || null,
        customAvatar:    p.userId?.customAvatar || null,
        activeCosmetics: p.userId?.activeCosmetics || {},
        totalValue,
        returnPct,
        cash:            p.cash,
      };
    }).sort((a, b) => b.returnPct - a.returnPct);

    const top10 = allLeaderboard.slice(0, 10);
    let userPosition = null;
    const { userId } = req.query;
    if (userId) {
      const idx = allLeaderboard.findIndex(p => p.userId === String(userId));
      if (idx >= 10) {
        const u = allLeaderboard[idx];
        userPosition = { rank: idx + 1, returnPct: u.returnPct, totalValue: u.totalValue, name: u.name, username: u.username, avatar: u.avatar, customAvatar: u.customAvatar, activeCosmetics: u.activeCosmetics };
      }
    }
    res.json({ leaderboard: top10, userPosition });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/portfolio/leaderboard', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  try {
    const portfolios = await Portfolio.find({}).populate('userId', 'name avatar customAvatar username activeCosmetics');
    const prices     = await Promise.all(PORTFOLIO_ASSETS.map(a => getPrice(a).catch(() => null)));
    const priceMap   = {};
    prices.filter(Boolean).forEach(p => { priceMap[p.symbol] = p.price; });

    const allLeaderboard = portfolios.map(p => {
      const invested = p.positions.reduce((s, pos) => {
        const price = priceMap[pos.symbol] || pos.avgPrice;
        return s + price * pos.qty;
      }, 0);
      const totalValue = p.cash + invested;
      const returnPct  = ((totalValue - 50000) / 50000) * 100;
      return {
        userId:          String(p.userId?._id || ''),
        name:            p.userId?.username || p.userId?.name || 'Anonymous',
        username:        p.userId?.username || null,
        avatar:          p.userId?.avatar || null,
        customAvatar:    p.userId?.customAvatar || null,
        activeCosmetics: p.userId?.activeCosmetics || {},
        totalValue,
        returnPct,
        cash:            p.cash,
      };
    })
    .filter(p => p.totalValue !== 50000)
    .sort((a, b) => b.returnPct - a.returnPct);

    const top10 = allLeaderboard.slice(0, 10);
    let userPosition = null;
    const { userId } = req.query;
    if (userId) {
      const idx = allLeaderboard.findIndex(p => p.userId === String(userId));
      if (idx >= 10) {
        const u = allLeaderboard[idx];
        userPosition = { rank: idx + 1, returnPct: u.returnPct, totalValue: u.totalValue, name: u.name, username: u.username, avatar: u.avatar, customAvatar: u.customAvatar, activeCosmetics: u.activeCosmetics };
      }
    }
    res.json({ leaderboard: top10, userPosition });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
async function getPortfolioValue(userId) {
  try {
    const portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) return 50000;
    const priceMap = {};
    await Promise.all(PORTFOLIO_ASSETS.map(async a => {
      try {
        const c = await redis.get(`price_v2:${a.symbol}`);
        if (c) { const p = typeof c === 'string' ? JSON.parse(c) : c; priceMap[p.symbol] = p.price; }
      } catch {}
    }));
    const invested = portfolio.positions.reduce((s, pos) => s + (priceMap[pos.symbol] || pos.avgPrice) * pos.qty, 0);
    return portfolio.cash + invested;
  } catch { return 50000; }
}


// ── Portfolio duels ───────────────────────────────────────────────
app.post('/portfolio/duel/challenge', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const { username } = req.body;
    const target = await User.findOne({ username: username.toLowerCase() });
    if (!target) return res.status(404).json({ error: 'User not found' });
    const friendship = await Friendship.findOne({
      $or: [{ requester: decoded.id, recipient: target._id }, { requester: target._id, recipient: decoded.id }],
      status: 'accepted',
    });
    if (!friendship) return res.status(403).json({ error: 'Not friends' });
    const existing = await PortfolioDuel.findOne({
      $or: [{ challenger: decoded.id, opponent: target._id }, { challenger: target._id, opponent: decoded.id }],
      status: { $in: ['pending', 'active'] },
    });
    if (existing) return res.status(400).json({ error: 'Already have an active duel' });
    const duel = await PortfolioDuel.create({ challenger: decoded.id, opponent: target._id });
    res.json({ ok: true, duelId: duel._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/portfolio/duel/accept/:duelId', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const duel = await PortfolioDuel.findOne({ _id: req.params.duelId, opponent: decoded.id, status: 'pending' });
    if (!duel) return res.status(404).json({ error: 'Duel not found' });
    const [cVal, oVal] = await Promise.all([getPortfolioValue(duel.challenger), getPortfolioValue(duel.opponent)]);
    const startDate = new Date().toISOString().split('T')[0];
    const endD = new Date(); endD.setDate(endD.getDate() + 7);
    const endDate = endD.toISOString().split('T')[0];
    duel.status = 'active'; duel.startDate = startDate; duel.endDate = endDate;
    duel.challengerStartValue = cVal; duel.opponentStartValue = oVal;
    await duel.save();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/portfolio/duel/reject/:duelId', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    await PortfolioDuel.findOneAndDelete({ _id: req.params.duelId, opponent: decoded.id, status: 'pending' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/portfolio/duel/pending', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const duels = await PortfolioDuel.find({ opponent: decoded.id, status: 'pending' })
      .populate('challenger', 'name avatar customAvatar username');
    res.json(duels.map(d => ({
      id:         d._id,
      challenger: { name: d.challenger.name, username: d.challenger.username, avatar: d.challenger.avatar, customAvatar: d.challenger.customAvatar || null },
      createdAt:  d.createdAt,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/portfolio/duel/active', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const duel = await PortfolioDuel.findOne({
      $or: [{ challenger: decoded.id }, { opponent: decoded.id }],
      status: 'active',
    }).populate('challenger', 'name avatar customAvatar username')
      .populate('opponent',   'name avatar customAvatar username');
    if (!duel) return res.json(null);
    const [cVal, oVal] = await Promise.all([getPortfolioValue(duel.challenger._id), getPortfolioValue(duel.opponent._id)]);
    const endDate  = new Date(duel.endDate);
    const daysLeft = Math.max(0, Math.ceil((endDate - new Date()) / 86400000));
    res.json({
      id: duel._id,
      challenger: { name: duel.challenger.name, username: duel.challenger.username, avatar: duel.challenger.avatar, customAvatar: duel.challenger.customAvatar, returnPct: ((cVal - duel.challengerStartValue) / duel.challengerStartValue) * 100, currentValue: cVal },
      opponent:   { name: duel.opponent.name,   username: duel.opponent.username,   avatar: duel.opponent.avatar,   customAvatar: duel.opponent.customAvatar,   returnPct: ((oVal - duel.opponentStartValue)   / duel.opponentStartValue)   * 100, currentValue: oVal },
      startDate: duel.startDate, endDate: duel.endDate, daysLeft,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Auth helpers ──────────────────────────────────────────────────
function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  try { return jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET); } catch { return null; }
}

async function verifyTokenBlacklisted(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const token = auth.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) return null;
    return decoded;
  } catch { return null; }
}

// ── Friends routes ────────────────────────────────────────────────

app.post('/friends/request', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    const recipient = await User.findOne({ username: username.toLowerCase() });
    if (!recipient) return res.status(404).json({ error: 'User not found' });
    if (recipient._id.equals(decoded.id)) return res.status(400).json({ error: 'Cannot add yourself' });
    const existing = await Friendship.findOne({
      $or: [
        { requester: decoded.id, recipient: recipient._id },
        { requester: recipient._id, recipient: decoded.id },
      ],
    });
    if (existing) return res.status(400).json({ error: existing.status === 'accepted' ? 'Already friends' : 'Request already sent' });
    await Friendship.create({ requester: decoded.id, recipient: recipient._id });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/friends/accept', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const { friendshipId } = req.body;
    const friendship = await Friendship.findOne({ _id: friendshipId, recipient: decoded.id, status: 'pending' });
    if (!friendship) return res.status(404).json({ error: 'Request not found' });
    friendship.status = 'accepted';
    await friendship.save();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/friends/reject', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const { friendshipId } = req.body;
    const friendship = await Friendship.findOne({ _id: friendshipId, recipient: decoded.id, status: 'pending' });
    if (!friendship) return res.status(404).json({ error: 'Request not found' });
    await friendship.deleteOne();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/friends/list', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const friendships = await Friendship.find({
      $or: [{ requester: decoded.id }, { recipient: decoded.id }],
      status: 'accepted',
    }).populate('requester', 'name avatar customAvatar username xp badges activeCosmetics')
      .populate('recipient', 'name avatar customAvatar username xp badges activeCosmetics');
    const friends = friendships.map(f => {
      const friend = f.requester._id.equals(decoded.id) ? f.recipient : f.requester;
      return { friendshipId: f._id, id: friend._id, name: friend.name, avatar: friend.avatar, customAvatar: friend.customAvatar || null, activeCosmetics: friend.activeCosmetics || {}, username: friend.username, xp: friend.xp, badges: friend.badges };
    });
    res.json(friends);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/friends/pending', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const pending = await Friendship.find({ recipient: decoded.id, status: 'pending' })
      .populate('requester', 'name avatar username xp');
    const requests = pending.map(f => ({
      friendshipId: f._id,
      id: f.requester._id,
      name: f.requester.name,
      avatar: f.requester.avatar,
      username: f.requester.username,
      xp: f.requester.xp,
      createdAt: f.createdAt,
    }));
    res.json(requests);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/friends/profile/:username', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const target = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!target) return res.status(404).json({ error: 'User not found' });
    let portfolioReturn = null;
    try {
      const portfolio = await Portfolio.findOne({ userId: target._id });
      if (portfolio) {
        const priceMap = {};
        await Promise.all(PORTFOLIO_ASSETS.map(async a => {
          try {
            const c = await redis.get(`price_v2:${a.symbol}`);
            if (c) { const p = typeof c === 'string' ? JSON.parse(c) : c; priceMap[p.symbol] = p.price; }
          } catch {}
        }));
        const invested = portfolio.positions.reduce((s, pos) => s + (priceMap[pos.symbol] || pos.avgPrice) * pos.qty, 0);
        portfolioReturn = ((portfolio.cash + invested - 50000) / 50000) * 100;
      }
    } catch {}
    const friendship = await Friendship.findOne({
      $or: [{ requester: decoded.id, recipient: target._id }, { requester: target._id, recipient: decoded.id }],
    });
    res.json({
      id:              target._id,
      name:            target.name,
      avatar:          target.avatar,
      customAvatar:    target.customAvatar || null,
      activeCosmetics: target.activeCosmetics || {},
      username:        target.username,
      xp:              target.xp,
      badges:          target.badges,
      portfolioReturn,
      friendshipStatus: friendship?.status || null,
      friendshipId: friendship?._id || null,
      isRequester: friendship ? friendship.requester.equals(decoded.id) : null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/u/:username', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  try {
    const target = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!target) return res.status(404).json({ error: 'User not found' });

    let portfolioReturn = null, totalValue = null;
    try {
      const portfolio = await Portfolio.findOne({ userId: target._id });
      if (portfolio) {
        const priceMap = {};
        await Promise.all(PORTFOLIO_ASSETS.map(async a => {
          try {
            const c = await redis.get(`price_v2:${a.symbol}`);
            if (c) { const p = typeof c === 'string' ? JSON.parse(c) : c; priceMap[p.symbol] = p.price; }
          } catch {}
        }));
        const invested = portfolio.positions.reduce((s, pos) => s + (priceMap[pos.symbol] || pos.avgPrice) * pos.qty, 0);
        totalValue = portfolio.cash + invested;
        portfolioReturn = ((totalValue - 50000) / 50000) * 100;
      }
    } catch {}

    let friendshipStatus = null;
    const decoded = verifyToken(req);
    if (decoded && decoded.id !== target._id.toString()) {
      try {
        const fr = await Friendship.findOne({
          $or: [{ requester: decoded.id, recipient: target._id }, { requester: target._id, recipient: decoded.id }],
        });
        friendshipStatus = fr?.status || null;
      } catch {}
    }

    res.json({
      username:        target.username,
      name:            target.name,
      avatar:          target.avatar,
      customAvatar:    target.customAvatar || null,
      activeCosmetics: target.activeCosmetics || {},
      xp:              target.xp,
      badges:          target.badges,
      dailyStreak:     target.dailyStreak,
      portfolioReturn,
      totalValue,
      joinedAt:        target.createdAt,
      friendshipStatus,
      isPro:           target.isPro || false,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use('/academy', require('./routes/academy'));

// ── Stripe academy billing portal ─────────────────────────────────
app.post('/stripe/academy-portal', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded  = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { academyId } = req.body;
    const Academy  = mongoose.model('Academy');
    const academy  = await Academy.findById(academyId);
    if (!academy) return res.status(404).json({ error: 'Academia no encontrada' });
    if (academy.ownerId.toString() !== decoded.id)
      return res.status(403).json({ error: 'No autorizado' });
    if (!academy.stripeCustomerId)
      return res.status(400).json({ error: 'No hay suscripción activa' });
    const session = await stripe.billingPortal.sessions.create({
      customer:   academy.stripeCustomerId,
      return_url: 'https://tradiko.dev/teacher-dashboard',
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Academy portal error:', err.message);
    res.status(500).json({ error: 'Portal failed' });
  }
});

// ── Academy trial expiry cron (every 24h) ─────────────────────────
setInterval(async () => {
  try {
    const Academy = mongoose.model('Academy');
    const expired = await Academy.find({
      trialEndsAt:          { $lt: new Date() },
      isActive:             true,
      stripeSubscriptionId: null,
    });
    for (const academy of expired) {
      academy.isActive = false;
      await academy.save();
      await User.updateMany({ _id: { $in: academy.students } }, { isAcademyPro: false });
      console.log(`Academy ${academy._id} trial expired`);
    }
    if (expired.length) console.log(`Expired ${expired.length} academy trial(s)`);
  } catch (err) { console.error('Trial expiry cron error:', err.message); }
}, 24 * 60 * 60 * 1000);

// ── Price alerts ──────────────────────────────────────────────────
app.get('/api/alerts', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  const user = await User.findById(decoded.id).select('isPro');
  if (!user?.isPro) return res.status(403).json({ error: 'Pro required' });
  const alerts = await PriceAlert.find({ userId: decoded.id, triggered: false });
  res.json(alerts);
});

app.post('/api/alerts', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  const user = await User.findById(decoded.id).select('isPro');
  if (!user?.isPro) return res.status(403).json({ error: 'Pro required' });
  const { ticker, targetPrice, condition } = req.body;
  const validTickers = new Set(PORTFOLIO_ASSETS.map(a => a.symbol));
  if (!ticker || !validTickers.has(ticker) || !targetPrice || !['above', 'below'].includes(condition))
    return res.status(400).json({ error: 'Invalid params' });
  await PriceAlert.deleteMany({ userId: decoded.id, ticker, triggered: false });
  const alert = await PriceAlert.create({ userId: decoded.id, ticker, targetPrice, condition });
  res.json({ ok: true, alert });
});

app.delete('/api/alerts/:id', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  await PriceAlert.deleteOne({ _id: req.params.id, userId: decoded.id });
  res.json({ ok: true });
});

// ── Position notes (Pro) ─────────────────────────────────────────
app.get('/api/portfolio/notes', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const user = await User.findById(decoded.id).select('isPro');
    if (!user?.isPro) return res.status(403).json({ error: 'Pro required' });
    const notes = await PositionNote.find({ userId: decoded.id });
    res.json(notes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/portfolio/note', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const user = await User.findById(decoded.id).select('isPro');
    if (!user?.isPro) return res.status(403).json({ error: 'Pro required' });
    const { ticker, note } = req.body;
    if (!ticker || !note?.trim()) return res.status(400).json({ error: 'ticker and note required' });
    const saved = await PositionNote.findOneAndUpdate(
      { userId: decoded.id, ticker },
      { note: note.trim(), updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true, note: saved });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/portfolio/note/:ticker', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    await PositionNote.deleteOne({ userId: decoded.id, ticker: req.params.ticker });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Portfolio compare vs #1 (Pro) ─────────────────────────────────
app.get('/api/portfolio/compare', async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No token' });
  try {
    const user = await User.findById(decoded.id).select('isPro');
    if (!user?.isPro) return res.status(403).json({ error: 'Pro required' });
    const myPortfolio = await Portfolio.findOne({ userId: decoded.id });
    if (!myPortfolio) return res.json({ top1: null, onlyInTop1: [], inCommon: [], onlyInMe: [] });
    // Read cached prices
    const keys = PORTFOLIO_ASSETS.map(a => `price_v2:${a.symbol}`);
    let rawValues;
    try { rawValues = await redis.mget(...keys); } catch { rawValues = []; }
    const priceMap = {};
    (rawValues || []).forEach(v => {
      if (!v) return;
      try { const p = typeof v === 'string' ? JSON.parse(v) : v; if (p?.symbol) priceMap[p.symbol] = p.price; } catch {}
    });
    // Rank all portfolios
    const allPortfolios = await Portfolio.find({}).populate('userId', 'name username');
    const ranked = allPortfolios
      .map(p => {
        const invested   = p.positions.reduce((s, pos) => s + (priceMap[pos.symbol] || pos.avgPrice) * pos.qty, 0);
        const totalValue = p.cash + invested;
        const returnPct  = ((totalValue - 50000) / 50000) * 100;
        return { p, totalValue, returnPct, u: p.userId };
      })
      .filter(e => e.totalValue !== 50000)
      .sort((a, b) => b.returnPct - a.returnPct);
    if (ranked.length === 0) return res.json({ top1: null, onlyInTop1: [], inCommon: [], onlyInMe: [] });
    const top1Entry     = ranked[0];
    const top1Portfolio = top1Entry.p;
    const mySymbols   = new Set(myPortfolio.positions.map(p => p.symbol));
    const top1Symbols = new Set(top1Portfolio.positions.map(p => p.symbol));
    const calcReturn = (sym, positions) => {
      const pos = positions.find(p => p.symbol === sym);
      if (!pos) return 0;
      return ((( priceMap[sym] || pos.avgPrice) - pos.avgPrice) / pos.avgPrice) * 100;
    };
    const myTotalValue = myPortfolio.cash + myPortfolio.positions.reduce((s, p) => s + (priceMap[p.symbol] || p.avgPrice) * p.qty, 0);
    res.json({
      top1: {
        username:   top1Entry.u?.username || top1Entry.u?.name || 'Anonymous',
        returnPct:  top1Entry.returnPct,
        totalValue: top1Entry.totalValue,
      },
      myReturnPct: ((myTotalValue - 50000) / 50000) * 100,
      onlyInTop1: [...top1Symbols].filter(s => !mySymbols.has(s)).map(s => {
        const pos = top1Portfolio.positions.find(p => p.symbol === s);
        return { symbol: s, name: pos?.name || s, type: pos?.type, top1Return: calcReturn(s, top1Portfolio.positions) };
      }),
      inCommon: [...mySymbols].filter(s => top1Symbols.has(s)).map(s => {
        const pos = myPortfolio.positions.find(p => p.symbol === s);
        return { symbol: s, name: pos?.name || s, type: pos?.type, myReturn: calcReturn(s, myPortfolio.positions), top1Return: calcReturn(s, top1Portfolio.positions) };
      }),
      onlyInMe: [...mySymbols].filter(s => !top1Symbols.has(s)).map(s => {
        const pos = myPortfolio.positions.find(p => p.symbol === s);
        return { symbol: s, name: pos?.name || s, type: pos?.type, myReturn: calcReturn(s, myPortfolio.positions) };
      }),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => res.json({ status: 'ok' }));

// ── Start ─────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Remove scores that exceed the maximum possible tournament score
  const maxScore = TOTAL_ROUNDS * 100;
  Score.deleteMany({ weekId: getWeekId(), score: { $gt: maxScore } })
    .then(r => { if (r.deletedCount > 0) console.log(`Removed ${r.deletedCount} invalid tournament score(s)`); })
    .catch(e => console.error('Score cleanup error:', e.message));
});