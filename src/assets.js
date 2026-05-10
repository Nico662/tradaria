function randomTF() {
  const tfs = ['1m', '5m', '15m'];
  return tfs[Math.floor(Math.random() * tfs.length)];
}

export const ASSETS = [
  { name: 'BTC/USD',  tf: randomTF(), vol: 0.025, cat: 'crypto',      binance: 'BTCUSDT',  yahoo: null, alphavantage: null,  base: () => 28000 + Math.random() * 40000 },
  { name: 'ETH/USD',  tf: randomTF(), vol: 0.030, cat: 'crypto',      binance: 'ETHUSDT',  yahoo: null, alphavantage: null,  base: () => 1200  + Math.random() * 2400  },
  { name: 'SOL/USD',  tf: randomTF(), vol: 0.035, cat: 'crypto',      binance: 'SOLUSDT',  yahoo: null, alphavantage: null,  base: () => 80    + Math.random() * 120   },
  { name: 'XRP/USD',  tf: randomTF(), vol: 0.030, cat: 'crypto',      binance: 'XRPUSDT',  yahoo: null, alphavantage: null,  base: () => 0.5   + Math.random() * 2     },
  { name: 'BNB/USD',  tf: randomTF(), vol: 0.025, cat: 'crypto',      binance: 'BNBUSDT',  yahoo: null, alphavantage: null,  base: () => 200   + Math.random() * 400   },
  { name: 'DOGE/USD', tf: randomTF(), vol: 0.040, cat: 'crypto',      binance: 'DOGEUSDT', yahoo: null, alphavantage: null,  base: () => 0.05  + Math.random() * 0.3   },
  { name: 'LINK/USD', tf: randomTF(), vol: 0.035, cat: 'crypto',      binance: 'LINKUSDT', yahoo: null, alphavantage: null,  base: () => 5     + Math.random() * 20    },
  { name: 'AVAX/USD', tf: randomTF(), vol: 0.035, cat: 'crypto',      binance: 'AVAXUSDT', yahoo: null, alphavantage: null,  base: () => 10    + Math.random() * 50    },
  { name: 'ADA/USD',  tf: randomTF(), vol: 0.030, cat: 'crypto',      binance: 'ADAUSDT',  yahoo: null, alphavantage: null,  base: () => 0.2   + Math.random() * 1     },
  { name: 'DOT/USD',  tf: randomTF(), vol: 0.035, cat: 'crypto',      binance: 'DOTUSDT',  yahoo: null, alphavantage: null,  base: () => 3     + Math.random() * 15    },
  { name: 'EUR/USD',  tf: '1H',       vol: 0.004, cat: 'forex',       binance: null, yahoo: 'EURUSD=X',  alphavantage: null, base: () => 1.04  + Math.random() * 0.18  },
  { name: 'GBP/USD',  tf: '1H',       vol: 0.005, cat: 'forex',       binance: null, yahoo: 'GBPUSD=X',  alphavantage: null, base: () => 1.20  + Math.random() * 0.20  },
  { name: 'USD/JPY',  tf: '1H',       vol: 0.004, cat: 'forex',       binance: null, yahoo: 'JPY=X',     alphavantage: null, base: () => 130   + Math.random() * 20    },
  { name: 'USD/CHF',  tf: '1H',       vol: 0.004, cat: 'forex',       binance: null, yahoo: 'CHF=X',     alphavantage: null, base: () => 0.88  + Math.random() * 0.15  },
  { name: 'AUD/USD',  tf: '1H',       vol: 0.004, cat: 'forex',       binance: null, yahoo: 'AUDUSD=X',  alphavantage: null, base: () => 0.62  + Math.random() * 0.12  },
  { name: 'USD/CAD',  tf: '1H',       vol: 0.004, cat: 'forex',       binance: null, yahoo: 'CAD=X',     alphavantage: null, base: () => 1.25  + Math.random() * 0.15  },
  { name: 'S&P 500',  tf: randomTF(), vol: 0.012, cat: 'indices',     binance: null, yahoo: null, alphavantage: 'SPY', base: () => 3800  + Math.random() * 2000  },
  { name: 'NASDAQ',   tf: randomTF(), vol: 0.014, cat: 'indices',     binance: null, yahoo: null, alphavantage: 'QQQ', base: () => 11000 + Math.random() * 5000  },
  { name: 'DOW',      tf: randomTF(), vol: 0.010, cat: 'indices',     binance: null, yahoo: null, alphavantage: 'DIA', base: () => 30000 + Math.random() * 8000  },
  { name: 'GOLD',     tf: randomTF(), vol: 0.008, cat: 'commodities', binance: null, yahoo: null, alphavantage: 'GLD', base: () => 1700  + Math.random() * 700   },
  { name: 'SILVER',   tf: randomTF(), vol: 0.015, cat: 'commodities', binance: null, yahoo: null, alphavantage: 'SLV', base: () => 20    + Math.random() * 10    },
  { name: 'OIL/USD',  tf: randomTF(), vol: 0.020, cat: 'commodities', binance: null, yahoo: null, alphavantage: 'USO', base: () => 60    + Math.random() * 40    },
];
