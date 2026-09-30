/**
 * The range a trend is drawn over: a from and a to day, or the last 7, 30 or 90
 * days in one press, and whatever else narrows it (the figure, the pack). It
 * scopes everything under it: the chart, the table and the spreadsheet.
 */
import type { ReactNode } from 'react';

import { FilterBar, FilterField } from '@/shared/components';
import { Input } from '@/shared/components/ui';

import { todayISO } from '../../utils';
import { Segmented } from '../farm/FarmBits';
import { QUICK_RANGES, rangeEnding } from './priceFormat';

type Quick = `${(typeof QUICK_RANGES)[number]}` | 'custom';

const QUICK_OPTIONS = QUICK_RANGES.map((days) => ({
  value: String(days) as Quick,
  label: `${days} days`,
}));

export function RangeBar({
  id,
  from,
  to,
  onRange,
  problem,
  isFetching,
  activeCount,
  onReset,
  actions,
  children,
}: {
  id: string;
  from: string;
  to: string;
  onRange: (from: string, to: string) => void;
  /** What is wrong with the range, if anything: nothing is read until it is fixed. */
  problem: string | null;
  isFetching: boolean;
  activeCount: number;
  onReset?: () => void;
  actions?: ReactNode;
  /** More fields, after the days. */
  children?: ReactNode;
}) {
  const today = todayISO();
  const quick: Quick =
    QUICK_OPTIONS.find(
      (option) => to === today && from === rangeEnding(today, Number(option.value)).from,
    )?.value ?? 'custom';

  return (
    <FilterBar
      label="Range"
      isFetching={isFetching}
      activeCount={activeCount}
      onReset={onReset}
      actions={actions}
    >
      <FilterField label="From" htmlFor={`${id}-from`} className="sm:w-44">
        <Input
          id={`${id}-from`}
          type="date"
          className="h-9"
          value={from}
          max={today}
          onChange={(event) => event.target.value && onRange(event.target.value, to)}
        />
      </FilterField>
      <FilterField
        label="To"
        htmlFor={`${id}-to`}
        className="sm:w-44"
        hint={
          problem ? <span className="text-rose-600 dark:text-rose-400">{problem}</span> : undefined
        }
      >
        <Input
          id={`${id}-to`}
          type="date"
          className="h-9"
          value={to}
          max={today}
          onChange={(event) => event.target.value && onRange(from, event.target.value)}
        />
      </FilterField>
      <FilterField label="The last">
        <Segmented
          label="The last few days"
          value={quick}
          options={QUICK_OPTIONS}
          onChange={(value) => {
            const range = rangeEnding(todayISO(), Number(value));
            onRange(range.from, range.to);
          }}
          className="h-9 w-fit"
        />
      </FilterField>
      {children}
    </FilterBar>
  );
}
