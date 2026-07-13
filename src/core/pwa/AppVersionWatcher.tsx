import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Detects when a newer build has been deployed and offers a one-tap refresh.
 *
 * Each build bakes in a unique `__BUILD_ID__` and writes the same id to
 * `/version.json`. This component polls that file (bypassing the HTTP cache) and,
 * when the server's id differs from the running bundle's, shows a non-blocking
 * "new version available" toast. No service worker is involved, so
 * push-notification registration is untouched.
 *
 * Cadence: the check runs on load and then once an hour. Returning to the tab
 * (visibilitychange) can also trigger a check, but only if an hour has elapsed
 * since the last one — so switching tabs never spams the request or the toast,
 * while a tab that was backgrounded (its timer throttled) for over an hour still
 * catches up on return. The toast uses a stable id, so a still-outdated app
 * re-surfaces the same toast each hour (it never stacks) until the user refreshes.
 *
 * Critical deploys: if `/version.json` carries `force: true`, or a `minVersion`
 * newer than the running build, the update is treated as mandatory and a
 * non-dismissible toast is shown instead of the gentle one. Ordinary deploys
 * leave those fields unset and get the hourly toast. `version.json` currently
 * emits only `version`; the `minVersion`/`force` fields are optional, so they can
 * be added later (ideally by serving version.json from the backend so ops can
 * flip the flag at runtime) without any change here.
 */
const CHECK_INTERVAL_MS = 3600_000; // 1 hour
const UPDATE_TOAST_ID = 'app-update';

interface VersionInfo {
  version: string;
  /** Builds older than this must update now (mandatory). Optional. */
  minVersion?: string;
  /** Force a mandatory update regardless of minVersion. Optional. */
  force?: boolean;
}

async function fetchVersionInfo(): Promise<VersionInfo | null> {
  try {
    const response = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<VersionInfo>;
    return typeof data.version === 'string' ? (data as VersionInfo) : null;
  } catch {
    return null; // offline / not deployed (e.g. dev) — nothing to do
  }
}

/** BUILD_ID is a `Date.now()` string, so a numeric compare gives build ordering. */
function isOlderThan(current: string, other: string): boolean {
  const a = Number(current);
  const b = Number(other);
  return Number.isFinite(a) && Number.isFinite(b) && a < b;
}

export function AppVersionWatcher() {
  const lastCheckRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (cancelled) return;
      lastCheckRef.current = Date.now();

      const info = await fetchVersionInfo();
      if (cancelled || !info || info.version === __BUILD_ID__) return;

      const mandatory =
        info.force === true ||
        (typeof info.minVersion === 'string' && isOlderThan(__BUILD_ID__, info.minVersion));

      if (mandatory) {
        // Critical update — cannot be dismissed; the user must refresh to go on.
        // (Kept as click-to-refresh rather than an auto-reload so we never yank
        // the page mid-action, and so a stale-serving reload can't loop. Switch
        // to a countdown + window.location.reload() if you want it hands-off.)
        toast('An update is required', {
          id: UPDATE_TOAST_ID,
          description: 'Refresh to continue on the latest version.',
          duration: Infinity,
          dismissible: false,
          action: { label: 'Refresh now', onClick: () => window.location.reload() },
        });
        return;
      }

      // Routine update — gentle and re-surfaces each hour while still outdated.
      // The stable id means repeated calls refresh the same toast, never stack;
      // if the user dismisses it, the next hourly check shows it again.
      toast('A new version is available', {
        id: UPDATE_TOAST_ID,
        description: 'Refresh to load the latest updates.',
        duration: Infinity,
        action: { label: 'Refresh', onClick: () => window.location.reload() },
      });
    };

    // Only re-check on tab return when an hour has passed since the last check,
    // so rapid tab switching can't spam it.
    const maybeCheck = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastCheckRef.current >= CHECK_INTERVAL_MS) void check();
    };

    void check();
    const intervalId = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', maybeCheck);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', maybeCheck);
    };
  }, []);

  return null;
}
