import { createChart, CandlestickSeries } from "lightweight-charts";
import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { SERVER } from './config.js';
import { useLang } from './LangContext.jsx';

const FOREX = ['EUR/USD','GBP/USD','AUD/USD','USD/JPY','USD/CHF','USD/CAD'];

// generateCandles is kept for potential demo/tutorial use (TradingMode has its own copy).
// Not used in any scored game mode.
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

async function fetchBackendCandles(symbol, interval) {
  const url = `${SERVER}/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=700`;
  const res  = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Server error');
  return data;
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
      const bull = c.close >= c.open;
      return {
        time, open: c.open, high: c.high, low: c.low, close: c.close,
        color:       bull ? '#00c087' : '#e05585',
        borderColor: bull ? '#00c087' : '#e05585',
        wickColor:   bull ? '#00c087' : '#e05585',
      };
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
      const bull = c.close >= c.open;
      return {
        time, open: c.open, high: c.high, low: c.low, close: c.close,
        color:       bull ? '#00c087' : '#e05585',
        borderColor: bull ? '#00c087' : '#e05585',
        wickColor:   bull ? '#00c087' : '#e05585',
      };
    });
}

function getChartHeight() {
  const vh = window.innerHeight;
  if (vh < 700) return 160;
  if (vh < 900) return 200;
  return 240;
}

const Chart = forwardRef(function Chart({ asset, externalCandles, onReady }, ref) {
  const { t }         = useLang();
  const containerRef  = useRef(null);
  const chartRef      = useRef(null);
  const seriesRef     = useRef(null);
  const candlesRef    = useRef([]);
  const revealPoolRef = useRef([]);
  const isForexRef    = useRef(false);
  const isUnixRef     = useRef(false);
  const allCandlesRef = useRef([]);

  const [fetchError, setFetchError] = useState(false);
  const [retryKey,   setRetryKey]   = useState(0);

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
            color:       c.close >= c.open ? 'rgba(0,192,135,0.5)' : 'rgba(224,85,133,0.5)',
            wickColor:   c.close >= c.open ? 'rgba(0,192,135,0.5)' : 'rgba(224,85,133,0.5)',
            borderColor: c.close >= c.open ? 'rgba(0,192,135,0.5)' : 'rgba(224,85,133,0.5)',
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
    let cancelled = false;

    const timer = setTimeout(() => {
      if (!containerRef.current || cancelled) return;

      const forex = FOREX.includes(asset.name);
      isForexRef.current = forex;

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

        chart = createChart(containerRef.current, {
          width:  containerRef.current.clientWidth,
          height: getChartHeight(),
          layout: { background: { type: 'solid', color: '#111111' }, textColor: '#555555', attributionLogo: false },
          grid: {
            vertLines: { color: 'rgba(255,255,255,0.04)' },
            horzLines: { color: 'rgba(255,255,255,0.04)' },
          },
          rightPriceScale: { borderColor: 'transparent' },
          timeScale: { borderColor: 'transparent', barSpacing: 6, rightOffset: 3, timeVisible: false, visible: false, fixLeftEdge: true, fixRightEdge: false },
          localization: { priceFormatter: (price) => isForexRef.current ? price.toFixed(4) : price.toFixed(2) },
          crosshair: { mode: 0, vertLine: { color: 'rgba(224,85,133,0.4)', labelBackgroundColor: '#e05585' }, horzLine: { color: 'rgba(0,192,135,0.4)', labelBackgroundColor: '#00c087' } },
          handleScroll: true,
          handleScale:  true,
        });
        chartRef.current = chart;

        const series = chart.addSeries(CandlestickSeries, {
          upColor: '#00c087', downColor: '#e05585',
          borderUpColor: '#00c087', borderDownColor: '#e05585',
          wickUpColor: '#00c087', wickDownColor: '#e05585',
          priceFormat: isForexAsset ? { type: 'price', precision: 4, minMove: 0.0001 } : { type: 'price', precision: 2, minMove: 0.01 },
        });
        seriesRef.current = series;

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

      // ── Normal candles — fetch from backend, then build chart ─────
      const interval = forex ? '1h'
        : asset.tf === '1m'  ? '1m'
        : asset.tf === '5m'  ? '5m'
        : asset.tf === '15m' ? '15m'
        : '1d';

      const loadPromise = asset._dailyVisible
        ? Promise.resolve([...asset._dailyVisible, ...asset._dailyFuture])
        : asset.candle
        ? fetchBackendCandles(asset.candle, interval)
        : Promise.reject(new Error('No candle symbol for ' + asset.name));

      loadPromise.then(candles => {
        if (cancelled || !containerRef.current) return;

        chart = createChart(containerRef.current, {
          width:  containerRef.current.clientWidth,
          height: getChartHeight(),
          layout: { background: { type: 'solid', color: '#111111' }, textColor: '#555555', attributionLogo: false },
          grid: {
            vertLines: { color: 'rgba(255,255,255,0.04)' },
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
          crosshair: {
            mode: 0,
            vertLine: { color: 'rgba(224,85,133,0.4)', labelBackgroundColor: '#e05585' },
            horzLine: { color: 'rgba(0,192,135,0.4)',   labelBackgroundColor: '#00c087' },
          },
          handleScroll: true,
          handleScale:  true,
        });

        const series = chart.addSeries(CandlestickSeries, {
          upColor:         '#00c087',
          downColor:       '#e05585',
          borderUpColor:   '#00c087',
          borderDownColor: '#e05585',
          wickUpColor:     '#00c087',
          wickDownColor:   '#e05585',
          priceFormat: forex
            ? { type: 'price', precision: 4, minMove: 0.0001 }
            : { type: 'price', precision: 2, minMove: 0.01 },
        });

        series.applyOptions({
          upColor:         '#00c087',
          downColor:       '#e05585',
          borderUpColor:   '#00c087',
          borderDownColor: '#e05585',
          wickUpColor:     '#00c087',
          wickDownColor:   '#e05585',
        });

        chartRef.current  = chart;
        seriesRef.current = series;

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

        ro = new ResizeObserver(() => {
          if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
        });
        ro.observe(containerRef.current);
      }).catch(err => {
        if (!cancelled) {
          console.error('[Chart] fetch failed:', err.message);
          setFetchError(true);
        }
      });
    }, 10);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (ro) ro.disconnect();
      if (chart) chart.remove();
    };
  }, [asset, externalCandles, retryKey]);

  if (fetchError) {
    return (
      <div style={{
        width: '100%', height: `${getChartHeight()}px`,
        background: '#111111',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12,
      }}>
        <span style={{ color: '#555', fontSize: 13 }}>
          {t.game ? t.game.chartError : 'Failed to load chart data'}
        </span>
        <button
          onClick={() => { setFetchError(false); setRetryKey(k => k + 1); }}
          style={{
            padding: '6px 18px',
            background: 'transparent',
            border: '1px solid #444',
            color: '#888',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          {t.game ? t.game.retry : 'Retry'}
        </button>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: `${getChartHeight()}px` }} />;
});

export default Chart;
export { generateCandles };
