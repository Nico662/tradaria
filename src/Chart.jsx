import { createChart, CandlestickSeries } from "lightweight-charts";
import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { SERVER, ALPHA_VANTAGE_KEY } from './config.js';

const FOREX = ['EUR/USD','GBP/USD','AUD/USD','USD/JPY','USD/CHF','USD/CAD'];

function generateCandles(n, startPrice, vol, trend = 0) {
  const out = [];
  let price = startPrice;
  for (let i = 0; i < n; i++) {
    const change = (Math.random() - 0.5 + trend * 0.3) * vol;
    const open  = price;
    const close = price * (1 + change);
    const high  = Math.max(open, close) * (1 + Math.random() * vol * 0.5);
    const low   = Math.min(open, close) * (1 - Math.random() * vol * 0.5);
    out.push({ open, close, high, low });
    price = close;
  }
  return out;
}

async function fetchBinanceCandles(symbol, interval, limit) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res  = await fetch(url);
  const data = await res.json();
  return data.map(k => ({
    time:  Math.floor(k[0] / 1000),
    open:  parseFloat(k[1]),
    high:  parseFloat(k[2]),
    low:   parseFloat(k[3]),
    close: parseFloat(k[4]),
  }));
}

async function fetchYahooCandles(symbol, interval) {
  const res  = await fetch(`${SERVER}/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function fetchAlphaVantageCandles(symbol, interval) {
  const apiKey = ALPHA_VANTAGE_KEY;
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&outputsize=full&apikey=${apiKey}`;
  const res  = await fetch(url);
  const data = await res.json();
  const key    = `Time Series (${interval})`;
  const series = data[key];
  if (!series) throw new Error('No data from Alpha Vantage');
  return Object.entries(series)
    .map(([time, v]) => ({
      time:  Math.floor(new Date(time).getTime() / 1000),
      open:  parseFloat(v['1. open']),
      high:  parseFloat(v['2. high']),
      low:   parseFloat(v['3. low']),
      close: parseFloat(v['4. close']),
    }))
    .reverse();
}

function toChartData(candles, startIndex = 0) {
  return candles
    .filter(c => c && c.open != null && c.high != null && c.low != null && c.close != null)
    .map((c, i) => {
      let time;
      if (c.time && typeof c.time === 'number' && c.time > 100000) {
        const d = new Date(c.time * 1000);
        time = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
      } else if (c.time && typeof c.time === 'string') {
        time = c.time;
      } else {
        const d = new Date();
        d.setDate(d.getDate() - (candles.length - startIndex - i));
        time = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      }
      return { time, open: c.open, high: c.high, low: c.low, close: c.close };
    });
}

function toChartDataForex(candles, startIndex = 0) {
  return candles
    .filter(c => c && c.open != null && c.high != null && c.low != null && c.close != null)
    .map((c, i) => {
      const time = c.time && typeof c.time === 'number' && c.time > 100000
        ? c.time
        : (() => {
            const d = new Date();
            d.setHours(d.getHours() - (candles.length - startIndex - i));
            return Math.floor(d.getTime() / 1000);
          })();
      return { time, open: c.open, high: c.high, low: c.low, close: c.close };
    });
}

function getChartHeight() {
  const vh = window.innerHeight;
  if (vh < 700) return 160;
  if (vh < 900) return 200;
  return 240;
}

const Chart = forwardRef(function Chart({ asset, externalCandles, onReady }, ref) {
  const containerRef  = useRef(null);
  const chartRef      = useRef(null);
  const seriesRef     = useRef(null);
  const candlesRef    = useRef([]);
  const revealPoolRef = useRef([]);
  const isForexRef    = useRef(false);
  const isUnixRef     = useRef(false);
  const allCandlesRef = useRef([]);

  useImperativeHandle(ref, () => ({
    getCandles: () => candlesRef.current,

    getRealReveal() {
      if (revealPoolRef.current.length >= 20) {
        return revealPoolRef.current.slice(0, 20);
      }
      return null;
    },

    reshuffleWindow() {
      if (!seriesRef.current || !allCandlesRef.current.length) return;
      const all      = allCandlesRef.current;
      const forex    = isForexRef.current;
      const fn       = forex ? toChartDataForex : toChartData;
      const maxStart = Math.max(0, all.length - 100);
      const start    = Math.floor(Math.random() * maxStart);
      candlesRef.current    = all.slice(start, start + 80);
      revealPoolRef.current = all.slice(start + 80, start + 100);
      seriesRef.current.setData(fn(candlesRef.current, 0));
      chartRef.current.timeScale().fitContent();
      chartRef.current.timeScale().applyOptions({ fixLeftEdge: true, fixRightEdge: false });
    },

    revealFuture(futureCandles, onDone) {
      if (!seriesRef.current) return;
      const fn = (isForexRef.current || isUnixRef.current) ? toChartDataForex : toChartData;

      const cleanFuture = futureCandles.filter(c =>
        c && c.open != null && c.open > 0 &&
        c.high != null && c.high > 0 &&
        c.low != null && c.low > 0 &&
        c.close != null && c.close > 0
      );

      const existing  = fn(candlesRef.current, 0);
      const lastTime  = existing[existing.length - 1]?.time;
      const useUnix   = isForexRef.current || isUnixRef.current;

      const futureMapped = cleanFuture.map((c, i) => {
        let time;
        if (useUnix) {
          const baseTime = typeof lastTime === 'number' ? lastTime : Math.floor(Date.now() / 1000);
          time = baseTime + (i + 1) * 3600;
        } else {
          const base = lastTime ? new Date(lastTime) : new Date();
          base.setDate(base.getDate() + i + 1);
          time = `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`;
        }
        return { time, open: c.open, high: c.high, low: c.low, close: c.close };
      });

      let i = 0;
      const interval = setInterval(() => {
        if (!seriesRef.current || i >= futureMapped.length) {
          clearInterval(interval);
          if (onDone) onDone();
          return;
        }
        seriesRef.current.setData([
          ...existing,
          ...futureMapped.slice(0, i + 1).map(c => ({
            ...c,
            color:       c.close >= c.open ? 'rgba(34,211,165,0.5)' : 'rgba(240,84,84,0.5)',
            wickColor:   c.close >= c.open ? 'rgba(34,211,165,0.5)' : 'rgba(240,84,84,0.5)',
            borderColor: c.close >= c.open ? 'rgba(34,211,165,0.5)' : 'rgba(240,84,84,0.5)',
          })),
        ]);
        i++;
      }, 120);
    },
  }));

  useEffect(() => {
    if (!containerRef.current || !asset) return;

    let chart;
    let ro;

    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      const forex = FOREX.includes(asset.name);
      isForexRef.current = forex;

      chart = createChart(containerRef.current, {
        width:  containerRef.current.clientWidth,
        height: getChartHeight(),
        layout: { background: { color: 'transparent' }, textColor: '#3a4455' },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.03)' },
          horzLines: { color: 'rgba(255,255,255,0.04)' },
        },
        rightPriceScale: { borderColor: 'transparent' },
        timeScale: {
          borderColor:  'transparent',
          barSpacing:   6,
          rightOffset:  3,
          timeVisible:  false,
          visible:      false,
          fixLeftEdge:  true,
          fixRightEdge: false,
        },
        localization: {
          priceFormatter: (price) => {
            if (isForexRef.current) return price.toFixed(4);
            return price.toFixed(2);
          },
        },
        crosshair:    { mode: 0 },
        handleScroll: true,
        handleScale:  true,
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor:         '#22d3a5',
        downColor:       '#f05454',
        borderUpColor:   '#22d3a5',
        borderDownColor: '#f05454',
        wickUpColor:     '#22d3a5',
        wickDownColor:   '#f05454',
        priceFormat: forex
          ? { type: 'price', precision: 4, minMove: 0.0001 }
          : { type: 'price', precision: 2, minMove: 0.01 },
      });

      chartRef.current  = chart;
      seriesRef.current = series;

      // ── External candles (Portfolio Mode) ────────────────────────
      if (externalCandles && externalCandles.length > 0) {
        const cleaned = externalCandles
          .filter(c => c && parseFloat(c.open) > 0 && parseFloat(c.high) > 0 && parseFloat(c.low) > 0 && parseFloat(c.close) > 0)
          .map(c => ({
            time:  c.time,
            open:  parseFloat(c.open),
            high:  parseFloat(c.high),
            low:   parseFloat(c.low),
            close: parseFloat(c.close),
          }));
        const isForexAsset     = FOREX.includes(asset.name);
        const dates            = cleaned.map(c => new Date(c.time * 1000).toDateString());
        const hasDuplicateDates = dates.length !== new Set(dates).size;
        isUnixRef.current      = isForexAsset || hasDuplicateDates;
        const mapped           = (isForexAsset || hasDuplicateDates) ? toChartDataForex(cleaned, 0) : toChartData(cleaned, 0);
        allCandlesRef.current  = cleaned;
        candlesRef.current     = cleaned;
        revealPoolRef.current  = [];
        series.setData(mapped);
        chart.timeScale().fitContent();
        if (onReady) onReady();
        ro = new ResizeObserver(() => {
          if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
        });
        ro.observe(containerRef.current);
        return;
      }

      // ── Normal candles ────────────────────────────────────────────
      const interval = forex ? '1h'
        : asset.tf === '1m'  ? '1m'
        : asset.tf === '5m'  ? '5m'
        : asset.tf === '15m' ? '15m'
        : '1d';

      const isOnline = navigator.onLine;

      const loadCandles = !isOnline
        ? Promise.resolve(generateCandles(700, asset.base(), asset.vol))
        : asset._dailyVisible
        ? Promise.resolve([...asset._dailyVisible, ...asset._dailyFuture])
        : asset.binance
        ? fetchBinanceCandles(asset.binance, interval, 700)
        : asset.alphavantage
        ? fetchAlphaVantageCandles(asset.alphavantage, asset.tf === '1m' ? '1min' : asset.tf === '5m' ? '5min' : '15min')
        : asset.yahoo
        ? fetchYahooCandles(asset.yahoo, interval)
        : Promise.resolve(generateCandles(700, asset.base(), asset.vol));

      loadCandles.then(candles => {
        allCandlesRef.current = candles;
        if (candles.length > 1 && typeof candles[0].time === 'number') {
          const dates = candles.slice(0, 10).map(c => new Date(c.time * 1000).toDateString());
          isUnixRef.current = dates.length !== new Set(dates).size;
        }
        const fnFinal = (isForexRef.current || isUnixRef.current) ? toChartDataForex : toChartData;
        if (asset._dailyVisible) {
          candlesRef.current    = asset._dailyVisible;
          revealPoolRef.current = asset._dailyFuture;
        } else {
          const maxStart = Math.max(0, candles.length - 100);
          const start    = Math.floor(Math.random() * maxStart);
          candlesRef.current    = candles.slice(start, start + 80);
          revealPoolRef.current = candles.slice(start + 80, start + 100);
        }
        series.setData(fnFinal(candlesRef.current, 0));
        chart.timeScale().fitContent();
        if (onReady) onReady();
      }).catch(() => {
        const candles = generateCandles(500, asset.base(), asset.vol);
        allCandlesRef.current = candles;
        candlesRef.current    = candles.slice(0, 80);
        revealPoolRef.current = candles.slice(80, 100);
        const fnFallback = (isForexRef.current || isUnixRef.current) ? toChartDataForex : toChartData;
        series.setData(fnFallback(candlesRef.current, 0));
        chart.timeScale().fitContent();
        if (onReady) onReady();
      });

      ro = new ResizeObserver(() => {
        if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
      });
      ro.observe(containerRef.current);
    }, 10);

    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      if (chart) chart.remove();
    };
  }, [asset, externalCandles]);

  return <div ref={containerRef} style={{ width: '100%', height: `${getChartHeight()}px` }} />;
});

export default Chart;
export { generateCandles };