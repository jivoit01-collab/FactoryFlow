import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import {
  DOCKING_DAYS_BACK,
  endOfDayMs,
  HISTORY_AUTO_RETURN_MS,
  shiftFromISO,
  todayISO,
  toLocalISODate,
  TRACKING_DAYS_BACK,
  TREND_DAYS,
} from '../constants/dispatch-day.constants';
import { type BoardDay, BoardDayContext } from './boardDay.context';
import { useNow } from './useNow';

/**
 * The one day every panel on the board agrees on.
 *
 * A context rather than a prop: the fulfilment summary, the docking register and
 * the late-on-road count each resolve their own windows, and if any of them
 * disagreed about which day it is the screen would show three different days at
 * once without saying so.
 *
 * Two behaviours matter here, both because this is a wall screen:
 *   - on today the day is never frozen at mount. The board is opened once and
 *     left running for weeks, so it re-derives as the clock crosses midnight and
 *     every query key rolls with it.
 *   - on a back-date it returns to today on its own after a while. Somebody
 *     checks Tuesday, walks away, and without this the room stares at a stale
 *     day for the rest of the week.
 */
export function BoardDayProvider({ children }: { children: ReactNode }) {
  const [anchor, setAnchor] = useState<string | null>(null);

  // Minute resolution catches the midnight roll-over and keeps the panels from
  // re-rendering every second alongside the header clock.
  const now = useNow(60_000);
  const today = toLocalISODate(now);

  const resetToToday = useCallback(() => setAnchor(null), []);

  const setDate = useCallback((iso: string) => {
    if (!iso) return;
    // Never let the board be pointed at a day that has not happened; the
    // date input's own `max` can be worked around, this cannot.
    setAnchor(iso > todayISO() ? null : iso);
  }, []);

  // A back-date older than today by definition, so re-anchoring on the new
  // today after midnight is handled by `anchor === null` alone.
  useEffect(() => {
    if (anchor === null) return;
    const id = window.setTimeout(() => setAnchor(null), HISTORY_AUTO_RETURN_MS);
    return () => window.clearTimeout(id);
  }, [anchor]);

  const value = useMemo<BoardDay>(() => {
    const date = anchor ?? today;
    return {
      date,
      today,
      isToday: date === today,
      previous: shiftFromISO(date, -1),
      trendFrom: shiftFromISO(date, -(TREND_DAYS - 1)),
      trackingFrom: shiftFromISO(date, -TRACKING_DAYS_BACK),
      dockingFrom: shiftFromISO(date, -DOCKING_DAYS_BACK),
      endOfDay: endOfDayMs(date),
      setDate,
      resetToToday,
    };
  }, [anchor, today, setDate, resetToToday]);

  return <BoardDayContext.Provider value={value}>{children}</BoardDayContext.Provider>;
}
