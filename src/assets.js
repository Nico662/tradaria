function randomTF() {
  const tfs = ['1m', '5m', '15m'];
  return tfs[Math.floor(Math.random() * tfs.length)];
}

export const ASSETS = [
  // ── Crypto ──────────────────────────────────────────────────────────────────
  { name: 'BTC/USD',  tf: randomTF(), vol: 0.025, cat: 'crypto',      candle: 'BTCUSD',  binance: 'BTCUSDT',  yahoo: null,      alphavantage: null,   base: () => 28000 + Math.random() * 40000 },
  { name: 'ETH/USD',  tf: randomTF(), vol: 0.030, cat: 'crypto',      candle: 'ETHUSD',  binance: 'ETHUSDT',  yahoo: null,      alphavantage: null,   base: () => 1200  + Math.random() * 2400  },
  { name: 'SOL/USD',  tf: randomTF(), vol: 0.035, cat: 'crypto',      candle: 'SOLUSD',  binance: 'SOLUSDT',  yahoo: null,      alphavantage: null,   base: () => 80    + Math.random() * 120   },
  { name: 'XRP/USD',  tf: randomTF(), vol: 0.030, cat: 'crypto',      candle: 'XRPUSD',  binance: 'XRPUSDT',  yahoo: null,      alphavantage: null,   base: () => 0.5   + Math.random() * 2     },
  { name: 'BNB/USD',  tf: randomTF(), vol: 0.025, cat: 'crypto',      candle: 'BNBUSD',  binance: 'BNBUSDT',  yahoo: null,      alphavantage: null,   base: () => 200   + Math.random() * 400   },
  { name: 'DOGE/USD', tf: randomTF(), vol: 0.040, cat: 'crypto',      candle: 'DOGEUSD', binance: 'DOGEUSDT', yahoo: null,      alphavantage: null,   base: () => 0.05  + Math.random() * 0.3   },
  { name: 'LINK/USD', tf: randomTF(), vol: 0.035, cat: 'crypto',      candle: 'LINKUSD', binance: 'LINKUSDT', yahoo: null,      alphavantage: null,   base: () => 5     + Math.random() * 20    },
  { name: 'AVAX/USD', tf: randomTF(), vol: 0.035, cat: 'crypto',      candle: 'AVAXUSD', binance: 'AVAXUSDT', yahoo: null,      alphavantage: null,   base: () => 10    + Math.random() * 50    },
  { name: 'ADA/USD',  tf: randomTF(), vol: 0.030, cat: 'crypto',      candle: 'ADAUSD',  binance: 'ADAUSDT',  yahoo: null,      alphavantage: null,   base: () => 0.2   + Math.random() * 1     },
  { name: 'DOT/USD',  tf: randomTF(), vol: 0.035, cat: 'crypto',      candle: 'DOTUSD',  binance: 'DOTUSDT',  yahoo: null,      alphavantage: null,   base: () => 3     + Math.random() * 15    },

  // ── Forex ────────────────────────────────────────────────────────────────────
  { name: 'EUR/USD',  tf: '1H', vol: 0.004, cat: 'forex', candle: 'EURUSD=X', binance: null, yahoo: 'EURUSD=X',  alphavantage: null, base: () => 1.04  + Math.random() * 0.18  },
  { name: 'GBP/USD',  tf: '1H', vol: 0.005, cat: 'forex', candle: 'GBPUSD=X', binance: null, yahoo: 'GBPUSD=X',  alphavantage: null, base: () => 1.20  + Math.random() * 0.20  },
  { name: 'USD/JPY',  tf: '1H', vol: 0.004, cat: 'forex', candle: 'JPY=X',    binance: null, yahoo: 'JPY=X',     alphavantage: null, base: () => 130   + Math.random() * 20    },
  { name: 'USD/CHF',  tf: '1H', vol: 0.004, cat: 'forex', candle: 'CHF=X',    binance: null, yahoo: 'CHF=X',     alphavantage: null, base: () => 0.88  + Math.random() * 0.15  },
  { name: 'AUD/USD',  tf: '1H', vol: 0.004, cat: 'forex', candle: 'AUDUSD=X', binance: null, yahoo: 'AUDUSD=X',  alphavantage: null, base: () => 0.62  + Math.random() * 0.12  },
  { name: 'USD/CAD',  tf: '1H', vol: 0.004, cat: 'forex', candle: 'CAD=X',    binance: null, yahoo: 'CAD=X',     alphavantage: null, base: () => 1.25  + Math.random() * 0.15  },

  // ── Indices ──────────────────────────────────────────────────────────────────
  { name: 'S&P 500',  tf: randomTF(), vol: 0.012, cat: 'indices', candle: '^GSPC',  binance: null, yahoo: '^GSPC',  alphavantage: 'SPY', base: () => 3800  + Math.random() * 2000  },
  { name: 'NASDAQ',   tf: randomTF(), vol: 0.014, cat: 'indices', candle: '^IXIC',  binance: null, yahoo: '^IXIC',  alphavantage: 'QQQ', base: () => 11000 + Math.random() * 5000  },
  { name: 'DOW',      tf: randomTF(), vol: 0.010, cat: 'indices', candle: '^DJI',   binance: null, yahoo: '^DJI',   alphavantage: 'DIA', base: () => 30000 + Math.random() * 8000  },
  { name: 'GER40',    tf: randomTF(), vol: 0.012, cat: 'indices', candle: '^GDAXI', binance: null, yahoo: '^GDAXI', alphavantage: 'EWG', base: () => 16000 + Math.random() * 3000  },
  { name: 'UK100',    tf: randomTF(), vol: 0.010, cat: 'indices', candle: '^FTSE',  binance: null, yahoo: '^FTSE',  alphavantage: 'EWU', base: () => 7000  + Math.random() * 1500  },
  { name: 'JPN225',   tf: randomTF(), vol: 0.012, cat: 'indices', candle: '^N225',  binance: null, yahoo: '^N225',  alphavantage: 'EWJ', base: () => 32000 + Math.random() * 8000  },

  // ── Commodities ───────────────────────────────────────────────────────────────
  { name: 'GOLD',     tf: randomTF(), vol: 0.008, cat: 'commodities', candle: 'GC=F', binance: null, yahoo: 'GC=F',  alphavantage: 'GLD',  base: () => 1700  + Math.random() * 700   },
  { name: 'SILVER',   tf: randomTF(), vol: 0.015, cat: 'commodities', candle: 'SI=F', binance: null, yahoo: 'SI=F',  alphavantage: 'SLV',  base: () => 20    + Math.random() * 10    },
  { name: 'OIL/USD',  tf: randomTF(), vol: 0.020, cat: 'commodities', candle: 'CL=F', binance: null, yahoo: 'CL=F',  alphavantage: 'USO',  base: () => 60    + Math.random() * 40    },
  { name: 'NGAS',     tf: randomTF(), vol: 0.025, cat: 'commodities', candle: 'NG=F', binance: null, yahoo: 'NG=F',  alphavantage: 'UNG',  base: () => 2     + Math.random() * 2     },
  { name: 'COPPER',   tf: randomTF(), vol: 0.015, cat: 'commodities', candle: 'HG=F', binance: null, yahoo: 'HG=F',  alphavantage: 'COPX', base: () => 3.5   + Math.random() * 2     },

  // ── Stocks ───────────────────────────────────────────────────────────────────
  { name: 'AAPL',  tf: randomTF(), vol: 0.020, cat: 'stocks', candle: 'AAPL',  binance: null, yahoo: 'AAPL',  alphavantage: 'AAPL',  base: () => 160 + Math.random() * 50  },
  { name: 'TSLA',  tf: randomTF(), vol: 0.035, cat: 'stocks', candle: 'TSLA',  binance: null, yahoo: 'TSLA',  alphavantage: 'TSLA',  base: () => 150 + Math.random() * 80  },
  { name: 'MSFT',  tf: randomTF(), vol: 0.018, cat: 'stocks', candle: 'MSFT',  binance: null, yahoo: 'MSFT',  alphavantage: 'MSFT',  base: () => 360 + Math.random() * 80  },
  { name: 'AMZN',  tf: randomTF(), vol: 0.022, cat: 'stocks', candle: 'AMZN',  binance: null, yahoo: 'AMZN',  alphavantage: 'AMZN',  base: () => 160 + Math.random() * 50  },
  { name: 'GOOGL', tf: randomTF(), vol: 0.020, cat: 'stocks', candle: 'GOOGL', binance: null, yahoo: 'GOOGL', alphavantage: 'GOOGL', base: () => 140 + Math.random() * 50  },
  { name: 'META',  tf: randomTF(), vol: 0.025, cat: 'stocks', candle: 'META',  binance: null, yahoo: 'META',  alphavantage: 'META',  base: () => 400 + Math.random() * 150 },
  { name: 'NVDA',  tf: randomTF(), vol: 0.030, cat: 'stocks', candle: 'NVDA',  binance: null, yahoo: 'NVDA',  alphavantage: 'NVDA',  base: () => 700 + Math.random() * 300 },
];
