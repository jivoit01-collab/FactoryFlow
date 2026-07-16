import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadWithRetry, reloadForStaleChunk } from '@/core/pwa/chunkReload';

// ═══════════════════════════════════════════════════════════════
// chunkReload — stale-chunk recovery for lazy route imports
//
// Covers the three guarantees:
//  1. A successful import returns immediately, no reload.
//  2. A transient failure recovers via retry, WITHOUT a reload (the operator's
//     work is preserved).
//  3. Exhausted retries (stale chunk after a deploy) reload exactly once, and the
//     reload is guarded against loops.
// ═══════════════════════════════════════════════════════════════

const reloadSpy = vi.fn();

beforeEach(() => {
  sessionStorage.clear();
  reloadSpy.mockClear();
  // jsdom's location.reload throws "Not implemented"; replace it with a spy.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload: reloadSpy },
  });
});

const Page = () => null;

describe('loadWithRetry', () => {
  it('returns the module on first success without reloading', async () => {
    const mod = { default: Page };
    const factory = vi.fn().mockResolvedValue(mod);

    const result = await loadWithRetry(factory, 2, 1);

    expect(result).toBe(mod);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('retries a transient failure and recovers in place (no reload)', async () => {
    const mod = { default: Page };
    const factory = vi
      .fn()
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce(mod);

    const result = await loadWithRetry(factory, 2, 1);

    expect(result).toBe(mod);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('reloads once after exhausting retries on a stale chunk', async () => {
    const factory = vi
      .fn()
      .mockRejectedValue(new Error('Failed to fetch dynamically imported module'));

    let settled = false;
    // On exhaustion it reloads and returns a never-resolving promise, so it must
    // not settle. Race it against a short tick.
    void loadWithRetry(factory, 2, 1).then(() => {
      settled = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(factory).toHaveBeenCalledTimes(3); // initial + 2 retries
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);
  });

  it('surfaces the error (no infinite reload) when the loop guard is already tripped', async () => {
    // Simulate a reload having just happened (guard tripped).
    reloadForStaleChunk();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    reloadSpy.mockClear();

    const err = new Error('still failing right after a reload');
    const factory = vi.fn().mockRejectedValue(err);

    // Now the guard suppresses another reload, so the error propagates to the
    // ErrorBoundary instead of looping.
    await expect(loadWithRetry(factory, 1, 1)).rejects.toBe(err);
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});

describe('reloadForStaleChunk', () => {
  it('reloads the first time and is debounced against loops', () => {
    expect(reloadForStaleChunk()).toBe(true);
    expect(reloadForStaleChunk()).toBe(false); // suppressed within the window
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
