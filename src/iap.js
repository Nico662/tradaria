export function purchaseWithStoreKit(productID) {
  return new Promise((resolve, reject) => {
    window.__iapResult = null;
    window.webkit.messageHandlers.iapPurchase.postMessage(productID);
    const interval = setInterval(() => {
      if (window.__iapResult !== null) {
        clearInterval(interval);
        if (window.__iapResult.success) {
          resolve({
            productID: window.__iapResult.productID,
            receiptData: window.__iapResult.receiptData || null,
          });
        } else {
          reject(new Error(window.__iapResult.error || 'Purchase cancelled'));
        }
      }
    }, 200);
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Timeout'));
    }, 60000);
  });
}
