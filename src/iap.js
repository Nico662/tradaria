import { isIOSApp } from './AuthContext';

export function canPurchaseIAP() {
  if (!isIOSApp()) return true;
  return !!window.webkit?.messageHandlers?.iapRestore;
}

const RECEIPT_FIELDS = ['receiptData', 'receipt', 'receipt_data', 'transactionReceipt', 'appStoreReceipt'];

export function extractReceipt(obj) {
  if (!obj || typeof obj !== 'object') return null;
  for (const f of RECEIPT_FIELDS) {
    if (obj[f]) return obj[f];
  }
  return null;
}

export function purchaseWithStoreKit(productID) {
  return new Promise((resolve, reject) => {
    window.__iapResult = null;
    window.webkit.messageHandlers.iapPurchase.postMessage(productID);
    const interval = setInterval(() => {
      if (window.__iapResult !== null) {
        clearInterval(interval);
        clearTimeout(timer);
        const r = window.__iapResult;
        if (r.success) {
          const receiptData = extractReceipt(r);
          if (!receiptData) {
            console.warn('[iap] __iapResult sin recibo, claves:', Object.keys(r));
          }
          resolve({ productID: r.productID, receiptData, _iapKeys: Object.keys(r) });
        } else {
          reject(new Error(r.error || 'Purchase cancelled'));
        }
      }
    }, 200);
    const timer = setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Timeout'));
    }, 60000);
  });
}

export function restorePurchases() {
  return new Promise((resolve, reject) => {
    window.__iapRestoreResult = null;
    window.webkit.messageHandlers.iapRestore.postMessage({});
    const interval = setInterval(() => {
      if (window.__iapRestoreResult !== null) {
        clearInterval(interval);
        clearTimeout(timer);
        if (window.__iapRestoreResult.success) {
          resolve({
            productIDs: window.__iapRestoreResult.productIDs || [],
            receiptData: window.__iapRestoreResult.receiptData || null,
          });
        } else {
          reject(new Error(window.__iapRestoreResult.error || 'Restore failed'));
        }
      }
    }, 200);
    const timer = setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Timeout'));
    }, 30000);
  });
}

const KNOWN_ITEMS = new Set([
  'pro',
  'frame_gold', 'frame_neon', 'frame_fire', 'frame_diamond',
  'theme_matrix', 'theme_blood', 'theme_gold', 'theme_midnight',
  'avatar_bull', 'avatar_bear', 'avatar_whale', 'avatar_robot',
  'effect_confetti', 'effect_lightning', 'effect_explosion', 'effect_stars',
]);

export function productIdToItemId(productID) {
  if (!productID || typeof productID !== 'string') return null;
  const parts = productID.split('.');
  if (parts[2] === 'pro') return 'pro';
  if (parts.length >= 4) {
    const itemId = `${parts[2]}_${parts[3]}`;
    return KNOWN_ITEMS.has(itemId) ? itemId : null;
  }
  return null;
}
