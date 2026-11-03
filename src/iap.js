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
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Timeout'));
    }, 60000);
  });
}
