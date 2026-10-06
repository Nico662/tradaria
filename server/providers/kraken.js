'use strict';

const INTERVAL_MINUTES = { '1m': 1, '5m': 5, '15m': 15, '1h': 60, '1d': 1440 };

async function fetchKrakenCandles(symbol, interval) {
  const minutes = INTERVAL_MINUTES[interval];
  if (!minutes) throw new Error('Unsupported Kraken interval: ' + interval);
  const url = 'https://api.kraken.com/0/public/OHLC?pair=' + symbol + '&interval=' + minutes;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Kraken HTTP ' + res.status);
  const data = await res.json();
  if (data.error && data.error.length > 0) throw new Error('Kraken: ' + data.error[0]);
  const pairKey = Object.keys(data.result).find(k => k !== 'last');
  if (!pairKey) throw new Error('Kraken: empty result for ' + symbol);
  return data.result[pairKey].map(k => ({
    time:  k[0],
    open:  parseFloat(k[1]),
    high:  parseFloat(k[2]),
    low:   parseFloat(k[3]),
    close: parseFloat(k[4]),
  }));
}

module.exports = { fetchKrakenCandles };
