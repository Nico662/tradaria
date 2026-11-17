const ctx = new (window.AudioContext || window.webkitAudioContext)();

let _enabled = true;
try { _enabled = localStorage.getItem('tradaria_sound') !== 'off'; } catch {}

export function isSoundEnabled() { return _enabled; }

export function setSoundEnabled(val) {
  _enabled = val;
  try { localStorage.setItem('tradaria_sound', val ? 'on' : 'off'); } catch {}
}

function playTone(freq, type, duration, vol = 0.3) {
  if (!_enabled) return;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type      = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playWin() {
  playTone(523, 'sine', 0.15);
  setTimeout(() => playTone(659, 'sine', 0.15), 100);
  setTimeout(() => playTone(784, 'sine', 0.25), 200);
}

export function playLose() {
  playTone(300, 'sawtooth', 0.15, 0.2);
  setTimeout(() => playTone(250, 'sawtooth', 0.3, 0.2), 150);
}

export function playClick() {
  playTone(800, 'sine', 0.08, 0.15);
}

export function playStreak() {
  playTone(523, 'sine', 0.1);
  setTimeout(() => playTone(659, 'sine', 0.1), 80);
  setTimeout(() => playTone(784, 'sine', 0.1), 160);
  setTimeout(() => playTone(1046, 'sine', 0.2), 240);
}

export function playReveal() {
  playTone(440, 'sine', 0.06, 0.1);
}
