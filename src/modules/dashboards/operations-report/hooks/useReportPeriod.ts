import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useNow } from '../../dispatch/hooks';
import { localISODate, type MonthKey, shiftMonth } from '../../utils/month';
import type { ReportPeriod, ReportView } from '../types';
import { addDays, resolvePeriod } from '../utils';

export interface ReportPeriodControls extends ReportPeriod {
  setView: (view: ReportView) => void;
  setDate: (date: string) => void;
  setMonth: (month: MonthKey) => void;
  /** Opens one day on the day view — a bar or a ledger row clicked. */
  openDay: (date: string) => void;
  previous: () => void;
  next: () => void;
  toLatest: () => void;
}

/**
 * The day or month the report shows, kept in the URL (`?view=month&month=2026-09`,
 * `?date=2026-09-14`) so a link to "the report for the 14th" opens on the 14th
 * and a refresh keeps it. The defaults — the day view, on yesterday — are never
 * written there, so the plain address always means "the latest report".
 */
export function useReportPeriod(): ReportPeriodControls {
  const [searchParams, setSearchParams] = useSearchParams();
  // Read every minute, so a page left open past midnight moves on to the new
  // latest day instead of reporting the day before yesterday as "latest".
  const today = localISODate(useNow(60_000));

  const view = searchParams.get('view');
  const date = searchParams.get('date');
  const month = searchParams.get('month');

  const period = useMemo(
    () => resolvePeriod({ view, date, month }, today),
    [view, date, month, today],
  );

  const write = useCallback(
    (next: { view: ReportView; date: string; month: MonthKey }) => {
      const resolved = resolvePeriod(next, today);
      setSearchParams(
        (params) => {
          const out = new URLSearchParams(params);
          const put = (key: string, value: string, fallback: string) =>
            value === fallback ? out.delete(key) : out.set(key, value);
          put('view', resolved.view, 'day');
          put('date', resolved.date, resolved.latest);
          put('month', resolved.month, resolved.latest.slice(0, 7));
          return out;
        },
        { replace: true },
      );
    },
    [setSearchParams, today],
  );

  return useMemo(() => {
    const current = { view: period.view, date: period.date, month: period.month };
    return {
      ...period,
      // Switching view carries the place across: a month opens on the month the
      // day was in, and a day opens on the last day the month was read to.
      setView: (next) =>
        write(
          next === 'month'
            ? { ...current, view: 'month', month: period.date.slice(0, 7) }
            : { ...current, view: 'day', date: period.to },
        ),
      setDate: (next) => write({ ...current, date: next }),
      setMonth: (next) => write({ ...current, month: next }),
      openDay: (next) => write({ ...current, view: 'day', date: next }),
      previous: () =>
        period.view === 'day'
          ? write({ ...current, date: addDays(period.date, -1) })
          : write({ ...current, month: shiftMonth(period.month, -1) }),
      next: () =>
        period.view === 'day'
          ? write({ ...current, date: addDays(period.date, 1) })
          : write({ ...current, month: shiftMonth(period.month, 1) }),
      toLatest: () =>
        write({ view: period.view, date: period.latest, month: period.latest.slice(0, 7) }),
    };
  }, [period, write]);
}
