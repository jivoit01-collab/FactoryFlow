import { useMemo, useState } from 'react';

import { DashboardError, DashboardHeader, DashboardLoading } from '@/shared/components/dashboard';
import { useTheme } from '@/shared/contexts';
import { getErrorMessage } from '@/shared/utils';

import { useCustomerReturnsDashboard } from '../api';
import {
  ConditionSplit,
  ReasonBreakdown,
  RecentReturnsTable,
  ReturnsFilterBar,
  ReturnsKpiRow,
  ReturnsTrend,
  StatusStrip,
  TopCustomerTable,
  TopSkuTable,
} from '../components';
import { DEFAULT_WINDOW_KEY, RETURNS_PALETTES, WINDOW_PRESETS } from '../constants';
import { dayLabel, windowDates } from '../utils/format';

/**
 * Customer returns, on one page.
 *
 * The reading order is the question people actually ask, top to bottom: how much
 * came back (the tiles), how that moved over the window (the trend), what state
 * it was in and why (the two panels beside it), which products and which
 * customers (the two tables), and finally the individual returns behind all of it.
 *
 * Two things on this board are not what a reader will assume, and both are said
 * on the panel rather than only in a comment here:
 *
 *  - **"Why it came back" is inferred.** `LEAKED` is a stored condition now, but
 *    the returns booked before it exists are Damaged with the word only in their
 *    typed reason, so that panel still reads text. The Leaked tile unions both.
 *  - **A return counts on the day it arrived** — or, if it has not arrived, the
 *    day it was booked, which is the only date it has.
 */
export default function CustomerReturnsDashboardPage() {
  const { resolvedTheme } = useTheme();
  const [windowKey, setWindowKey] = useState(DEFAULT_WINDOW_KEY);
  const [allCompanies, setAllCompanies] = useState(false);

  const filters = useMemo(() => {
    const preset =
      WINDOW_PRESETS.find((option) => option.key === windowKey) ?? WINDOW_PRESETS[2];
    return { ...windowDates(preset.days), allCompanies };
  }, [windowKey, allCompanies]);

  const palette = RETURNS_PALETTES[resolvedTheme === 'dark' ? 'dark' : 'light'];
  const { data, isLoading, isFetching, error, refetch } = useCustomerReturnsDashboard(filters);

  return (
    <div className="space-y-5">
      <DashboardHeader
        title="Customer Returns"
        description={
          data
            ? `${dayLabel(data.window.from_date)} to ${dayLabel(data.window.to_date)} — what came back, in what state, and from whom`
            : 'What came back, in what state, and from whom'
        }
      />

      <ReturnsFilterBar
        windowKey={windowKey}
        onWindowChange={setWindowKey}
        allCompanies={allCompanies}
        onAllCompaniesChange={setAllCompanies}
        onRefresh={() => void refetch()}
        isFetching={isFetching}
      />

      {error && <DashboardError message={getErrorMessage(error)} onRetry={() => void refetch()} />}

      {isLoading && !data ? (
        <DashboardLoading />
      ) : data ? (
        <>
          <ReturnsKpiRow totals={data.totals} conditions={data.by_condition} />

          <ReturnsTrend trend={data.trend} window={data.window} palette={palette} />

          <div className="grid gap-4 lg:grid-cols-3">
            <ConditionSplit rows={data.by_condition} palette={palette} />
            <ReasonBreakdown rows={data.by_reason} palette={palette} />
            <StatusStrip statuses={data.by_status} bases={data.by_basis} />
          </div>

          <TopSkuTable rows={data.top_skus} palette={palette} />

          <div className="grid gap-4 xl:grid-cols-2">
            <TopCustomerTable rows={data.top_customers} palette={palette} />
            <RecentReturnsTable rows={data.recent_returns} />
          </div>
        </>
      ) : null}
    </div>
  );
}
