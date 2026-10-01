import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useNow } from '../dispatch/hooks';
import {
  isMonthKey,
  localISODate,
  type MonthKey,
  monthLabel,
  type MonthWindow,
  monthWindow,
  shiftMonth,
} from '../utils/month';

/**
 * How long a board left on an ended month waits before going back to the
 * current one: thirty minutes with nobody touching it. The user's rule, chosen
 * over the production wall's ten minutes from the moment a day is picked —
 * somebody reading September at a desk keeps it as long as they are using it.
 */
export const BOARD_MONTH_AUTO_RETURN_MS = 30 * 60_000;

/**
 * What counts as somebody using the page. Movement is throttled below: it
 * fires constantly, and only has to prove a person is there.
 */
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
const ACTIVITY_THROTTLE_MS = 5_000;

export interface BoardMonth extends MonthWindow {
  /** The real today, whichever month is shown. */
  today: string;
  /** The month today is in. */
  currentMonth: MonthKey;
  /** "September 2026". */
  label: string;
  /** False on the current month: there is nothing to step forward to. */
  canGoForward: boolean;
  setMonth: (month: MonthKey) => void;
  previous: () => void;
  next: () => void;
  resetToCurrent: () => void;
}

export interface UseBoardMonthOptions {
  /**
   * Pinned to the current month, with the URL ignored. For a board shown as a
   * carousel slide: the carousel is a wall that has to say what is happening
   * now, and a slide must not inherit a month from the page around it.
   */
  locked?: boolean;
  /** Milliseconds of inactivity before returning to the current month; null never. */
  autoReturnMs?: number | null;
  /** The query parameter that carries the month. */
  param?: string;
}

/**
 * The calendar month a dashboard is showing, and the controls to change it.
 *
 * Kept in the URL (`?month=2026-09`) rather than in component state, so the
 * month survives a refresh and a link to "September on the operations board"
 * opens on September. The current month is never written there: a board on the
 * current month has a clean URL, which is what a wall screen is opened with.
 *
 * Two wall-screen behaviours, the same two the production wall has for a day:
 *
 *  - the current month is never frozen at mount. The clock is read every
 *    minute, so a board left running crosses into the next month at midnight on
 *    the 1st and every query keyed on the month rolls with it;
 *  - an ended month gives way to the current one after thirty minutes with
 *    nobody using the page, so a wall does not spend the rest of the week on
 *    last month because somebody checked it and walked off.
 *
 * Forward is refused past the current month, whatever the URL says: a month
 * that has not started has no figures, and an empty board reads as a broken one.
 */
export function useBoardMonth({
  locked = false,
  autoReturnMs = BOARD_MONTH_AUTO_RETURN_MS,
  param = 'month',
}: UseBoardMonthOptions = {}): BoardMonth {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = useNow(60_000);
  const today = localISODate(now);
  const currentMonth = today.slice(0, 7);

  const raw = locked ? null : searchParams.get(param);
  const requested = isMonthKey(raw) && raw < currentMonth ? raw : currentMonth;

  const setMonth = useCallback(
    (month: MonthKey) => {
      if (locked) return;
      setSearchParams(
        (params) => {
          const next = new URLSearchParams(params);
          if (!isMonthKey(month) || month >= localISODate(new Date()).slice(0, 7)) {
            next.delete(param);
          } else {
            next.set(param, month);
          }
          return next;
        },
        { replace: true },
      );
    },
    [locked, param, setSearchParams],
  );

  const resetToCurrent = useCallback(() => setMonth(currentMonth), [setMonth, currentMonth]);

  const isPast = requested !== currentMonth;

  useEffect(() => {
    if (!isPast || autoReturnMs === null) return;

    let timer = window.setTimeout(resetToCurrent, autoReturnMs);
    let lastActivity = Date.now();

    const onActivity = () => {
      const at = Date.now();
      if (at - lastActivity < ACTIVITY_THROTTLE_MS) return;
      lastActivity = at;
      window.clearTimeout(timer);
      timer = window.setTimeout(resetToCurrent, autoReturnMs);
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    return () => {
      window.clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, onActivity);
    };
  }, [isPast, autoReturnMs, resetToCurrent]);

  return useMemo(() => {
    const window_ = monthWindow(requested, today);
    return {
      ...window_,
      today,
      currentMonth,
      label: monthLabel(window_.month),
      canGoForward: !window_.isCurrent,
      setMonth,
      previous: () => setMonth(shiftMonth(window_.month, -1)),
      next: () => setMonth(shiftMonth(window_.month, 1)),
      resetToCurrent,
    };
  }, [requested, today, currentMonth, setMonth, resetToCurrent]);
}
