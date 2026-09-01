import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  HISTORY_AUTO_RETURN_MS,
  shiftFromISO,
  todayISO,
  toLocalISODate,
} from '../../dispatch/constants/dispatch-day.constants';
import { useNow } from '../../dispatch/hooks';
import { PRODUCTION_TREND_DAYS } from '../constants/production-wall.constants';

export interface ProductionDay {
  /** The day the board is showing, local YYYY-MM-DD. */
  date: string;
  /** The real today, whatever the board happens to be showing. */
  today: string;
  /** False the moment somebody back-dates the board. Every "is this live"
   *  decision on the screen keys off this one flag. */
  isToday: boolean;
  /** First day of the trend window, ending on the shown day. */
  trendFrom: string;
  setDate: (iso: string) => void;
  resetToToday: () => void;
}

/**
 * The one day every panel on the production board agrees on.
 *
 * Two behaviours here exist only because this is a wall screen:
 *   - on today the day is never frozen at mount. The board is opened once and
 *     left running for weeks, so it re-derives as the clock crosses midnight
 *     and every query key rolls with it;
 *   - on a back-date it returns to today on its own. Somebody checks last
 *     Tuesday's output, walks away, and without this the room stares at a dead
 *     day for the rest of the week.
 */
export function useProductionDay(): ProductionDay {
  const [anchor, setAnchor] = useState<string | null>(null);

  // Minute resolution catches the midnight roll-over without re-rendering the
  // whole board alongside the header's ticking clock.
  const now = useNow(60_000);
  const today = toLocalISODate(now);

  const resetToToday = useCallback(() => setAnchor(null), []);

  const setDate = useCallback((iso: string) => {
    if (!iso) return;
    // Never let the board be pointed at a day that has not happened; the date
    // input's own `max` can be typed around, this cannot.
    setAnchor(iso > todayISO() ? null : iso);
  }, []);

  useEffect(() => {
    if (anchor === null) return;
    const id = window.setTimeout(() => setAnchor(null), HISTORY_AUTO_RETURN_MS);
    return () => window.clearTimeout(id);
  }, [anchor]);

  return useMemo(() => {
    const date = anchor ?? today;
    return {
      date,
      today,
      isToday: date === today,
      trendFrom: shiftFromISO(date, -(PRODUCTION_TREND_DAYS - 1)),
      setDate,
      resetToToday,
    };
  }, [anchor, today, setDate, resetToToday]);
}
