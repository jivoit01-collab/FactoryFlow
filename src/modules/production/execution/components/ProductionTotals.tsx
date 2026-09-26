import { useMemo } from 'react';

import { Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { ProductionRun } from '../types';
import { dateRangeLabel, formatCases, summariseProduction } from '../utils';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

interface ProductionTotalsProps {
  /** The runs on the board — already narrowed to the chosen dates and filters. */
  runs: ProductionRun[];
  dateFrom: string;
  dateTo: string;
  /** A line, status or search is narrowing the runs too. */
  filtered: boolean;
}

function Figure({
  label,
  value,
  sub,
  lead,
}: {
  label: string;
  value: string;
  sub?: string;
  lead?: boolean;
}) {
  return (
    <div className="min-w-0 lg:px-6 lg:first:pl-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('tabular-nums', lead ? 'text-2xl font-bold' : 'text-xl font-semibold')}>
        {value}
      </p>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** What the runs on the board produced, for the dates chosen above them. */
export function ProductionTotals({ runs, dateFrom, dateTo, filtered }: ProductionTotalsProps) {
  const { completed, running, total, unsized } = useMemo(() => summariseProduction(runs), [runs]);

  const litres = total.litres.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <Card role="region" aria-label="Production totals">
      <CardContent className="p-4">
        <p className="text-sm font-medium">
          Production, {dateRangeLabel(dateFrom, dateTo)}
          {filtered && ' · matching the filters'}
        </p>
        {/* Four equal columns across the card, two a row on a phone. */}
        <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-0 lg:divide-x">
          <Figure
            lead
            label="Total"
            value={`${formatCases(total.cases)} cases`}
            sub={plural(total.runs, 'run')}
          />
          <Figure
            label="Litres"
            value={`${litres} L`}
            sub={
              unsized > 0 ? `${plural(unsized, 'run')} without a litre size left out` : undefined
            }
          />
          <Figure
            label="Completed"
            value={`${formatCases(completed.cases)} cases`}
            sub={plural(completed.runs, 'run')}
          />
          <Figure
            label="In progress"
            value={`${formatCases(running.cases)} cases so far`}
            sub={plural(running.runs, 'run')}
          />
        </div>
      </CardContent>
    </Card>
  );
}
