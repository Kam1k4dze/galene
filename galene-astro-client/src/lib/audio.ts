export function getAudioContext() {
  if (typeof window === "undefined") return null;

  // @ts-expect-error webkitAudioContext is not in standard types
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  if (!window._galeneAudioContext) {
    window._galeneAudioContext = new AudioContext();
  }

  const ctx = window._galeneAudioContext;
  if (ctx.state === "suspended") {
    ctx.resume().catch(console.error);
  }

  return ctx;
}

export function playDisconnectSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  // Descending tone: 880Hz -> 440Hz
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);

  // Fade out
  gain.gain.setValueAtTime(0.0001, now); // start near 0 to avoid click
  gain.gain.exponentialRampToValueAtTime(0.8, now + 0.01); // quick attack to louder level
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3); // fade out

  osc.start(now);
  osc.stop(now + 0.31);
}

declare global {
  interface Window {
    _galeneAudioContext?: AudioContext;
  }
}
