export function purchaseWithStoreKit(productID) {
  return new Promise((resolve, reject) => {
    window.__iapResult = null;
    window.webkit.messageHandlers.iapPurchase.postMessage(productID);
    const interval = setInterval(() => {
      if (window.__iapResult !== null) {
        clearInterval(interval);
        if (window.__iapResult.success) {
          resolve(window.__iapResult.productID);
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
