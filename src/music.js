const audio = new Audio('/audio/tradiko-lofi.mp3');
audio.loop    = true;
audio.volume  = 0.25;
audio.preload = 'none';

let _enabled = false;
try { _enabled = localStorage.getItem('tradaria_music') === 'on'; } catch {}

export function isMusicEnabled() { return _enabled; }

export function setMusicEnabled(val) {
  _enabled = val;
  try { localStorage.setItem('tradaria_music', val ? 'on' : 'off'); } catch {}
}

export function playMusic() {
  if (!_enabled) return;
  audio.play().catch(() => {});
}

export function pauseMusic() {
  audio.pause();
}
