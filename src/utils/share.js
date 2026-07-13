export async function shareResult({ title, text, url = 'https://tradiko.dev' }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(text + '\n' + url).catch(() => {});
      }
      return false;
    }
  } else {
    await navigator.clipboard.writeText(text + '\n' + url).catch(() => {});
    return true;
  }
}
