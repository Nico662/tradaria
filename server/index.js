const express        = require('express');
const http           = require('http');
const { Server }     = require('socket.io');
const YahooFinance   = require('yahoo-finance2').default;
const cors           = require('cors');
const cron           = require('node-cron');
const webpush        = require('web-push');
const mongoose       = require('mongoose');
const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session        = require('express-session');
const jwt            = require('jsonwebtoken');
const Stripe         = require('stripe');
const rateLimit      = require('express-rate-limit');
const { Redis }      = require('@upstash/redis');

// ── Config ────────────────────────────────────────────────────────
const JWT_SECRET           = process.env.JWT_SECRET || 'tradara_secret_2024';
const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const MONGODB_URI          = process.env.MONGODB_URI;
const CLIENT_URL           = 'https://tradara.dev';
const PORT                 = process.env.PORT || 3001;
const FINNHUB_KEY = 'd7pqi41r01qosaapiuugd7pqi41r01qosaapiuv0';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const yf     = new YahooFinance();

// ── Express ───────────────────────────────────────────────────────
const app        = express();
const httpServer = http.createServer(app);
const io         = new Server(httpServer, { cors: { origin: '*' } });
app.set('trust proxy', 1);

// ── Redis ─────────────────────────────────────────────────────────
const redis = new Redis({
  url:   'https://glad-teal-76856.upstash.io',
  token: 'gQAAAAAAASw4AAIncDJmYmZjYzFlYWVkZTc0MWU5YTBjMmExYWE5NGEwODFjYnAyNzY4NTY',
});

// ── MongoDB ───────────────────────────────────────────────────────
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

const UserSchema = new mongoose.Schema({
  googleId:  { type: String, required: true, unique: true },
  email:     { type: String, required: true },
  name:      { type: String, required: true },
  avatar:    { type: String },
  xp:        { type: Number, default: 0 },
  badges:    { type: [String], default: [] },
  purchases: { type: [String], default: [] },
  dailyStreak: { type: Number, default: 0 },
  lastPlayed:  { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
});

const TournamentSchema = new mongoose.Schema({
  weekId:    { type: String, required: true, unique: true },
  assets:    { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now },
});

const ScoreSchema = new mongoose.Schema({
  weekId:         { type: String, required: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:           { type: String, required: true },
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
const Portfolio = mongoose.model('Portfolio', PortfolioSchema);
const User       = mongoose.model('User', UserSchema);
const Tournament = mongoose.model('Tournament', TournamentSchema);
const Score      = mongoose.model('Score', ScoreSchema);
const Stats      = mongoose.model('Stats', StatsSchema);

// ── VAPID / Push ──────────────────────────────────────────────────
webpush.setVapidDetails(
  'mailto:nicolasvidalcorrecher@tradara.dev',
  'BEWPkbh1HeSsw08H0EsELp5TIPD2gcQ8Yfa1RsSW-9jER3uvoeVUTazcIqjlf4UNFKe7QeqQ8ZlVjGI72pinR0I',
  'PCyRdLvdQswDzk0DlbImRKEgPbVLewsWGHCha07sXw8'
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
  { symbol: 'BRK.B', name: 'Berkshire',          type: 'stock', source: 'finnhub' },
  { symbol: 'JPM',   name: 'JPMorgan',           type: 'stock', source: 'finnhub' },
  { symbol: 'V',     name: 'Visa',               type: 'stock', source: 'finnhub' },
  { symbol: 'UNH',   name: 'UnitedHealth',       type: 'stock', source: 'finnhub' },
  { symbol: 'MA',    name: 'Mastercard',         type: 'stock', source: 'finnhub' },
  { symbol: 'BAC',   name: 'Bank of America',    type: 'stock', source: 'finnhub' },
  { symbol: 'COST',  name: 'Costco',             type: 'stock', source: 'finnhub' },
  { symbol: 'NFLX',  name: 'Netflix',            type: 'stock', source: 'finnhub' },
  { symbol: 'ADBE',  name: 'Adobe',              type: 'stock', source: 'finnhub' },
  { symbol: 'CRM',   name: 'Salesforce',         type: 'stock', source: 'finnhub' },
  { symbol: 'AMD',   name: 'AMD',                type: 'stock', source: 'finnhub' },
  { symbol: 'ORCL',  name: 'Oracle',             type: 'stock', source: 'finnhub' },
  { symbol: 'UBER',  name: 'Uber',               type: 'stock', source: 'finnhub' },
  { symbol: 'PYPL',  name: 'PayPal',             type: 'stock', source: 'finnhub' },
  { symbol: 'INTC',  name: 'Intel',              type: 'stock', source: 'finnhub' },
  { symbol: 'SPOT',  name: 'Spotify',            type: 'stock', source: 'finnhub' },
  { symbol: 'ABNB',  name: 'Airbnb',             type: 'stock', source: 'finnhub' },
  { symbol: 'SHOP',  name: 'Shopify',            type: 'stock', source: 'finnhub' },
  { symbol: 'PLTR',  name: 'Palantir',           type: 'stock', source: 'finnhub' },
  { symbol: 'COIN',  name: 'Coinbase',           type: 'stock', source: 'finnhub' },
  { symbol: 'HOOD',  name: 'Robinhood',          type: 'stock', source: 'finnhub' },
  { symbol: 'NET',   name: 'Cloudflare',         type: 'stock', source: 'finnhub' },
  
  // ── Acciones europeas ─────────────────────────────────────────────
  { symbol: 'ASML',  name: 'ASML',               type: 'stock', source: 'finnhub' },
  { symbol: 'SAP',   name: 'SAP',                type: 'stock', source: 'finnhub' },
  { symbol: 'LVMUY', name: 'LVMH',               type: 'stock', source: 'finnhub' },
  { symbol: 'NSRGY', name: 'Nestlé',             type: 'stock', source: 'finnhub' },
  { symbol: 'SIEGY', name: 'Siemens',            type: 'stock', source: 'finnhub' },
  { symbol: 'IDEXY', name: 'Inditex',            type: 'stock', source: 'finnhub' },
  { symbol: 'ALIZF', name: 'Allianz',            type: 'stock', source: 'finnhub' },
  { symbol: 'BAYZF', name: 'Bayer',              type: 'stock', source: 'finnhub' },
  { symbol: 'RACE', name: 'Ferrari', type: 'stock', source: 'finnhub' },
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
  { symbol: 'AGG',   name: 'US Bonds Aggregate', type: 'index', source: 'finnhub' },
  { symbol: 'HYG',   name: 'High Yield Bonds',   type: 'index', source: 'finnhub' },
  // ── Cripto ────────────────────────────────────────────────────────
  { symbol: 'BTCUSDT',  name: 'Bitcoin',         type: 'crypto', source: 'binance' },
  { symbol: 'ETHUSDT',  name: 'Ethereum',        type: 'crypto', source: 'binance' },
  { symbol: 'XRPUSDT',  name: 'XRP',            type: 'crypto', source: 'binance' },
  { symbol: 'SOLUSDT',  name: 'Solana',          type: 'crypto', source: 'binance' },
  // ── Materias primas ───────────────────────────────────────────────
  { symbol: 'GLD',   name: 'Gold',               type: 'commodity', source: 'finnhub' },
  { symbol: 'SLV',   name: 'Silver',             type: 'commodity', source: 'finnhub' },
  { symbol: 'PDBC',  name: 'Commodities',        type: 'commodity', source: 'finnhub' },
  { symbol: 'PPLT',  name: 'Platinum',           type: 'commodity', source: 'finnhub' },
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
    } else {
      const res  = await fetch(`https://finnhub.io/api/v1/quote?symbol=${asset.symbol}&token=${FINNHUB_KEY}`);
      const data = await res.json();
      return {
        symbol:    asset.symbol,
        name:      asset.name,
        type:      asset.type,
        price:     data.c,
        change:    data.dp,
        prevClose: data.pc,
      };
    }
  });
}
// ── Middlewares ───────────────────────────────────────────────────
app.use(cors({
  origin: ['https://tradara.dev', 'https://www.tradara.dev'],
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

app.use(generalLimiter);
app.use('/daily',   dailyLimiter);
app.use('/candles', candlesLimiter);

// ── Passport ──────────────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID:     GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL:  'https://tradara-production.up.railway.app/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email:    profile.emails[0].value,
        name:     profile.displayName,
        avatar:   profile.photos[0]?.value,
      });
      console.log('New user created:', user.email);
    } else {
      user.lastLogin = new Date();
      await user.save();
    }
    return done(null, user);
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
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${CLIENT_URL}?auth=error` }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email, name: req.user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.redirect(`${CLIENT_URL}?token=${token}`);
  }
);

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
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/auth/sync', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { xp, badges, dailyStreak, lastPlayed } = req.body;
    const update = { xp, badges };
    if (dailyStreak !== undefined) update.dailyStreak = dailyStreak;
    if (lastPlayed !== undefined) update.lastPlayed = lastPlayed;
    await User.findByIdAndUpdate(decoded.id, update);
    res.json({ ok: true });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

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
          product_data: { name: `Tradara — ${item.name}` },
          unit_amount: item.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${CLIENT_URL}?purchase=success&item=${itemId}`,
      cancel_url:  `${CLIENT_URL}?purchase=cancelled`,
      metadata: { userId: decoded.id, itemId },
    });
    res.json({ url: stripeSession.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const stripeSession = event.data.object;
    const { userId, itemId } = stripeSession.metadata;
    try {
      await User.findByIdAndUpdate(userId, { $addToSet: { purchases: itemId } });
      console.log(`User ${userId} purchased ${itemId}`);
    } catch (err) {
      console.error('Error saving purchase:', err.message);
    }
  }
  res.json({ received: true });
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

// ── Stats routes ──────────────────────────────────────────────────
app.get('/stats', (req, res) => {
  res.json({ online: io.engine.clientsCount, gamesPlayed: totalGamesPlayed });
});

app.get('/stats/share', async (req, res) => {
  try {
    const doc = await Stats.findById('shares');
    res.json(doc || { daily: 0 });
  } catch { res.json({ daily: 0 }); }
});

app.post('/stats/share', async (req, res) => {
  try {
    await Stats.findByIdAndUpdate('shares', { $inc: { daily: 1 } }, { upsert: true, new: true });
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

// ── Candles route ─────────────────────────────────────────────────
app.get('/candles', async (req, res) => {
  const { symbol, interval, from, to } = req.query;
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
    const scores = await Score.find({ weekId }).sort({ score: -1 }).limit(100);
    res.json({ weekId, scores });
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
    const { score, rounds, cosmeticAvatar } = req.body;
    await Score.create({ weekId, userId: user._id, name: user.name, avatar: user.avatar, score, rounds, cosmeticAvatar: cosmeticAvatar || null });
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

// ── Push routes ───────────────────────────────────────────────────
app.post('/push/subscribe', async (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
  pushSubscriptions = await loadSubscriptions();
  const exists = pushSubscriptions.find(s => s.endpoint === sub.endpoint);
  if (!exists) {
    pushSubscriptions.push(sub);
    await saveSubscriptions(pushSubscriptions);
  }
  res.json({ ok: true });
});

app.post('/push/send', async (req, res) => {
  pushSubscriptions = await loadSubscriptions();
  const payload = JSON.stringify({
    title: '⚡ Daily Challenge',
    body:  "Today's chart is ready. Can you call it?",
    url:   'https://tradara.dev',
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

const privateLobby = {};

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

  socket.on('disconnect', () => {
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
// ── Cron ──────────────────────────────────────────────────────────
cron.schedule('0 8 * * *', async () => {
  pushSubscriptions = await loadSubscriptions();
  console.log('Sending to', pushSubscriptions.length, 'subscribers...');
  const payload = JSON.stringify({
    title: '⚡ Daily Challenge',
    body:  "Today's chart is ready. Can you call it?",
    url:   'https://tradara.dev',
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
    url:   'https://tradara.dev',
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
    url:   'https://tradara.dev',
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
// ── Portfolio routes ──────────────────────────────────────────────

// Obtener todos los precios
app.get('/portfolio/prices', async (req, res) => {
  try {
    // Intentar obtener desde caché primero — respuesta rápida
    const cachedResults = await Promise.all(
      PORTFOLIO_ASSETS.map(async a => {
        try {
          const cached = await redis.get(`price_v2:${a.symbol}`);
          if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
          return null;
        } catch { return null; }
      })
    );

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
    let portfolio = await Portfolio.findOne({ userId: decoded.id });
    if (!portfolio) {
      portfolio = await Portfolio.create({ userId: decoded.id, cash: 50000, positions: [], transactions: [] });
    }
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comprar
app.post('/portfolio/buy', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded  = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { symbol, qty } = req.body;
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
    res.json({ ok: true, cash: portfolio.cash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vender
app.post('/portfolio/sell', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded  = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { symbol, qty } = req.body;
    const asset    = PORTFOLIO_ASSETS.find(a => a.symbol === symbol);
    if (!asset) return res.status(400).json({ error: 'Asset not found' });
    const priceData = await getPrice(asset);
    const price     = priceData.price;
    const total     = price * qty;
    const portfolio = await Portfolio.findOne({ userId: decoded.id });
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
    const position  = portfolio.positions.find(p => p.symbol === symbol);
    if (!position || position.qty < qty) return res.status(400).json({ error: 'Insufficient position' });
    portfolio.cash += total;
    position.qty   -= qty;
    if (position.qty === 0) {
      portfolio.positions = portfolio.positions.filter(p => p.symbol !== symbol);
    }
    portfolio.transactions.push({ symbol, name: asset.name, type: asset.type, action: 'sell', qty, price, total });
    await portfolio.save();
    res.json({ ok: true, cash: portfolio.cash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
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
      const d = new Date(); d.setFullYear(d.getFullYear() - 1);
      const result = await yf.chart(symbol, { interval: '1d', period1: d.toISOString().split('T')[0] });
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
    const decoded   = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { totalValue } = req.body;
    const date = new Date().toISOString().split('T')[0];
    await PortfolioHistory.findOneAndUpdate(
      { userId: decoded.id, date },
      { totalValue },
      { upsert: true }
    );
    res.json({ ok: true });
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
app.get('/portfolio/debug/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const url  = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
    const r    = await fetch(url);
    const data = await r.json();
    res.json({ symbol, data, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── Start ─────────────────────────────────────────────────────────
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));