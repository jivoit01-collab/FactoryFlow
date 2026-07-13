import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Detects when a newer build has been deployed and offers a one-tap refresh.
 *
 * Each build bakes in a unique `__BUILD_ID__` and writes the same id to
 * `/version.json`. This component polls that file (bypassing the HTTP cache) and,
 * when the server's id differs from the running bundle's, shows a single
 * non-blocking "new version available" toast. There is **no service worker**
 * here, so push-notification registration is untouched.
 *
 * The toast is shown at most once per new version per tab session, so it can
 * never loop even if a reload is served a stale document.
 */
const CHECK_INTERVAL_MS = 3600_000;

async function fetchServerVersion(): Promise<string | null> {
  try {
    const response = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = (await response.json()) as { version?: string };
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null; // offline / not deployed (e.g. dev) — nothing to do
  }
}

export function AppVersionWatcher() {
  const promptedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (cancelled || promptedRef.current) return;
      const serverVersion = await fetchServerVersion();
      if (cancelled || !serverVersion || serverVersion === __BUILD_ID__) return;

      // At most one prompt per new version per session.
      const key = `app-update-prompt-${serverVersion}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      promptedRef.current = true;

      toast('A new version is available', {
        description: 'Refresh to load the latest updates.',
        duration: Infinity,
        action: { label: 'Refresh', onClick: () => window.location.reload() },
      });
    };

    void check();
    const intervalId = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    const onFocus = () => void check();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return null;
}
