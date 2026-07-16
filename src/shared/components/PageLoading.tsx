import { useEffect, useState } from 'react';

/**
 * PageLoading
 *
 * Suspense fallback shown while a lazy route chunk loads. For the common fast
 * load it's just a brief spinner. If loading drags on past SLOW_THRESHOLD_MS it
 * surfaces a "taking longer than expected" message with a manual reload — so an
 * operator on slow wifi is never left staring at a spinner that never resolves,
 * quietly blaming their connection. (A genuinely failed chunk is handled
 * separately by lazyWithRetry, which retries then reloads.)
 */
const SLOW_THRESHOLD_MS = 10_000;

export function PageLoading() {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), SLOW_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      {isSlow ? (
        <>
          <p className="max-w-md text-sm text-muted-foreground">
            This is taking longer than expected. Check your connection, or reload the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reload Page
          </button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
    </div>
  );
}
