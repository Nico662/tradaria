export const MAX_RATIO_DEVIATION = 0.015; // 1.5%

export function scaleCandles(candles, ratio) {
  if (ratio === 1) return candles;
  return candles.map(c => ({
    time:  c.time,
    open:  c.open  * ratio,
    high:  c.high  * ratio,
    low:   c.low   * ratio,
    close: c.close * ratio,
  }));
}

export function computeRatio(lastHistClose, refPrice) {
  if (!isFinite(lastHistClose) || lastHistClose <= 0) return null;
  if (!isFinite(refPrice)      || refPrice <= 0)      return null;
  return refPrice / lastHistClose;
}

/**
 * Combines historical candles (from server) with live candles (from liveCandles store).
 * Scales hist so the last hist close anchors to the first live open.
 * If ratio deviation > MAX_RATIO_DEVIATION, returns live candles only (avoids
 * a visible price jump at the splice that would mislead the user).
 */
export function combineCandles(histCandles, liveCandles) {
  if (!liveCandles || liveCandles.length === 0) return histCandles || [];
  if (!histCandles || histCandles.length === 0) return liveCandles;

  const lastHist = histCandles[histCandles.length - 1];
  const refPrice = liveCandles[0].open;
  const ratio    = computeRatio(lastHist.close, refPrice);

  if (ratio === null || Math.abs(ratio - 1) > MAX_RATIO_DEVIATION) {
    return liveCandles;
  }

  const liveStart   = liveCandles[0].time;
  const trimmedHist = histCandles.filter(c => c.time < liveStart);
  const scaledHist  = scaleCandles(trimmedHist, ratio);

  return [...scaledHist, ...liveCandles];
}
