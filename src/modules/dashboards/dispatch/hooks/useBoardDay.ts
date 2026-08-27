import { useMemo } from 'react';

import {
  shiftISO,
  todayISO,
  toLocalISODate,
  TRACKING_DAYS_BACK,
  TREND_DAYS,
} from '../constants/dispatch-day.constants';
import { useNow } from './useNow';

export interface BoardDay {
  /** Today, local, YYYY-MM-DD. */
  today: string;
  /** Yesterday — the baseline every "vs" chip compares against. */
  yesterday: string;
  /** Fulfilment window for the trend chart. */
  trendFrom: string;
  /** Look-back for the on-the-road panel. */
  trackingFrom: string;
}

/**
 * Every window the board queries, recomputed only when the local date changes.
 *
 * A wall screen is never reloaded — it is opened once and left running for
 * weeks. So the day cannot be frozen at mount: this re-derives the moment the
 * clock crosses midnight, and the query keys change with it, which rolls the
 * whole board over to the new day on its own.
 */
export function useBoardDay(): BoardDay {
  // Minute resolution is enough to catch the roll-over, and keeps the panels
  // that depend on this from re-rendering every second alongside the clock.
  const now = useNow(60_000);
  const dayKey = toLocalISODate(now);

  return useMemo(
    () => ({
      today: todayISO(),
      yesterday: shiftISO(-1),
      trendFrom: shiftISO(-(TREND_DAYS - 1)),
      trackingFrom: shiftISO(-TRACKING_DAYS_BACK),
    }),
    // Recomputed on the date, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayKey],
  );
}
