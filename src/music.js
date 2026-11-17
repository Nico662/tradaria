import { isSoundEnabled, onSoundChange } from './sounds.js';

const audio = new Audio('/audio/tradiko-lofi.mp3');
audio.loop    = true;
audio.volume  = 0.25;
audio.preload = 'none';

// Pause immediately when sound is globally disabled
onSoundChange(enabled => { if (!enabled) audio.pause(); });

export function playMusic() {
  if (!isSoundEnabled()) return;
  audio.play().catch(() => {});
}

export function pauseMusic() {
  audio.pause();
}
