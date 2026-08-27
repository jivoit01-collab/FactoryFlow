import { useEffect, useState } from 'react';

import { DISPATCH_DAY_CLOCK_MS } from '../constants/dispatch-day.constants';

/**
 * A ticking clock. The wall shows a running time and every dwell figure ("2h
 * 14m at dock") is measured against *now*, so those have to age on their own —
 * the data refresh is 30 s apart and a frozen clock makes a live board look dead.
 */
export function useNow(intervalMs: number = DISPATCH_DAY_CLOCK_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
