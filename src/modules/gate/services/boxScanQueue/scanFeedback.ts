/**
 * Lightweight, non-blocking audio + haptic feedback for the scan hot path.
 *
 * A keyboard-wedge scanner already emits the device good/bad-read beep, but the
 * app needs to distinguish *accept* vs *duplicate* vs *reject* with its own
 * tones. These are synthesized with the Web Audio API (no asset loading) and
 * fired without `await`, so they add no latency to the scan handler.
 */

type ScanTone = 'accept' | 'duplicate' | 'reject';

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    try {
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }
  // Browsers suspend the context until a user gesture; scanning is a gesture.
  if (audioContext.state === 'suspended') {
    void audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function tone(frequency: number, durationMs: number, delayMs = 0, gain = 0.06): void {
  const ctx = getContext();
  if (!ctx) return;
  const start = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = frequency;
  amp.gain.value = gain;
  osc.connect(amp).connect(ctx.destination);
  osc.start(start);
  // Quick fade-out avoids an audible click at the tone tail.
  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
  osc.stop(start + durationMs / 1000);
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

/** Fire feedback for a scan result. Safe to call on every scan; never throws. */
export function scanFeedback(result: ScanTone): void {
  try {
    switch (result) {
      case 'accept':
        // Crisp high blip.
        tone(1320, 70);
        vibrate(35);
        break;
      case 'duplicate':
        // Soft, lower single note — "already have it".
        tone(680, 90, 0, 0.04);
        vibrate(20);
        break;
      case 'reject':
        // Distinct two-tone error buzz.
        tone(300, 120);
        tone(220, 160, 0.13);
        vibrate([60, 40, 60]);
        break;
    }
  } catch {
    /* feedback must never break scanning */
  }
}
