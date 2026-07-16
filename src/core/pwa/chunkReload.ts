import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Recovery for failed dynamic-import (lazy route chunk) loads.
 *
 * Why this exists: pages are code-split into hashed chunks. When a new build is
 * deployed while a tab stays open, the old chunk filenames the running page
 * references no longer exist on the server (and the autoUpdate service worker has
 * purged them from cache). The next link click tries to import a now-404 chunk,
 * the dynamic import rejects, and React.lazy re-throws it on render — landing on
 * the app-level ErrorBoundary ("Something went wrong"). A full reload fetches the
 * fresh index.html + new chunk URLs and fixes it; that's the only real recovery
 * (React caches the rejected import promise, so "Try Again" just re-throws it).
 *
 * Strategy:
 *  - lazyWithRetry retries the import a couple of times first, so a transient
 *    network blip (spotty factory wifi/mobile) recovers in place WITHOUT a reload,
 *    preserving whatever the operator was doing.
 *  - Only when retries are exhausted (the chunk is genuinely gone → stale deploy)
 *    do we reload, once, guarded against loops.
 *  - A global vite:preloadError listener is a safety net for any dynamic import
 *    that is NOT wrapped by lazyWithRetry; it defers while a retry is in flight so
 *    the two mechanisms never fight.
 */

const RELOAD_TS_KEY = 'chunk-reload-ts';
// If we already reloaded within this window and a chunk STILL fails, the chunk is
// truly missing (broken deploy / offline) rather than merely stale — stop
// reloading and let the ErrorBoundary surface, so we never trap the user in a loop.
const RELOAD_DEBOUNCE_MS = 10_000;

/**
 * Reload the page once to pick up fresh chunk URLs. No-ops if a reload already
 * happened within RELOAD_DEBOUNCE_MS (loop guard). Returns true if it reloaded.
 */
export function reloadForStaleChunk(): boolean {
  const now = Date.now();
  try {
    const last = Number(sessionStorage.getItem(RELOAD_TS_KEY) || '0');
    if (now - last < RELOAD_DEBOUNCE_MS) return false;
    sessionStorage.setItem(RELOAD_TS_KEY, String(now));
  } catch {
    // sessionStorage blocked (private mode / SSR) — fall through and still reload
    // once; without the guard a truly-broken chunk could loop, but that beats a
    // dead page, and this path is rare.
  }
  window.location.reload();
  return true;
}

// Number of lazyWithRetry factories currently mid-retry. While > 0, the global
// vite:preloadError listener defers, letting the wrapper own the recovery.
let activeRetryCount = 0;

/** True while a lazyWithRetry import is retrying — used to coordinate with the
 *  global listener so it doesn't reload out from under an in-flight retry. */
export function isRetryingChunk(): boolean {
  return activeRetryCount > 0;
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

/**
 * Import a lazy module, retrying transient failures, then reloading once for a
 * stale chunk. Exported for tests; prefer lazyWithRetry in app code.
 */
export async function loadWithRetry<T extends AnyComponent>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
  baseDelayMs = 300,
): Promise<{ default: T }> {
  activeRetryCount++;
  try {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await factory();
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          // Linear backoff: 300ms, 600ms, … enough to ride out a brief blip.
          await delay(baseDelayMs * (attempt + 1));
        }
      }
    }
    // Every attempt failed — almost certainly a stale chunk after a deploy.
    // Reload to fetch fresh chunk URLs; if the loop guard suppresses the reload,
    // rethrow so the ErrorBoundary can surface rather than hanging.
    if (!reloadForStaleChunk()) {
      throw lastError;
    }
    // Reload scheduled; return a never-resolving module so React keeps showing
    // the Suspense fallback until the navigation happens (instead of flashing
    // the error boundary in the brief gap before reload).
    return await new Promise<{ default: T }>(() => {});
  } finally {
    activeRetryCount--;
  }
}

/**
 * Drop-in replacement for React.lazy that retries a failed dynamic import before
 * giving up, then reloads once for stale chunks. See the module comment above.
 */
export function lazyWithRetry<T extends AnyComponent>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
  baseDelayMs = 300,
): LazyExoticComponent<T> {
  return lazy(() => loadWithRetry(factory, retries, baseDelayMs));
}

/**
 * Install the global safety-net listener. Call once at app bootstrap. Handles
 * dynamic-import failures that aren't wrapped by lazyWithRetry (e.g. background
 * prefetches). Wrapped route chunks are handled by lazyWithRetry itself, which is
 * why we defer while a retry is in flight.
 */
export function installChunkErrorHandler(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('vite:preloadError', () => {
    if (isRetryingChunk()) return; // a lazyWithRetry wrapper owns this recovery
    reloadForStaleChunk();
  });
}
