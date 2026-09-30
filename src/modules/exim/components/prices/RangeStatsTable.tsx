/**
 * Each series over a range, a row each: where it started and ended, how far it
 * moved, and its highest and lowest with the day of each. Every series is
 * listed, drawn or not; the stroke beside a name keys its line on the chart,
 * grey while the line is switched off.
 *
 * EXIM showed one highest and one lowest across every commodity together,
 * which only ever named the dearest and the cheapest oil; per commodity is
 * what says how far each one moved.
 */
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import {
  ROW_CLASSES,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { formatDay } from '@/shared/utils';

import { ChangeMark, SeriesKey, type SortState, SortTh } from './PriceBits';
import type { DayValue, SeriesDef, SeriesStats } from './priceFormat';

type SortKey = 'name' | 'last' | 'change' | 'high' | 'low';

const COLUMNS = 7;

function DayFigure({ day, format }: { day: DayValue; format: (value: number) => string }) {
  return (
    <>
      <span className="block whitespace-nowrap font-medium">{format(day.value)}</span>
      <span className="block whitespace-nowrap text-xs text-muted-foreground">
        {formatDay(day.date)}
      </span>
    </>
  );
}

function sortValue(s: SeriesStats | undefined, key: SortKey): number {
  if (!s) return -Infinity;
  if (key === 'last') return s.last.value;
  if (key === 'high') return s.high.value;
  if (key === 'low') return s.low.value;
  return s.change?.pct ?? s.change?.amount ?? -Infinity;
}

export function RangeStatsTable({
  series,
  selected,
  stats,
  format,
  heading,
  summary,
  actions,
  loading,
  error,
  emptyMessage,
  emptyHint,
}: {
  series: SeriesDef[];
  selected: Set<string>;
  stats: Map<string, SeriesStats>;
  /** A figure in a cell: `1,234.50`. */
  format: (value: number) => string;
  /** The first column's heading: "Commodity". */
  heading: string;
  summary?: ReactNode;
  actions?: ReactNode;
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  emptyHint?: string;
}) {
  const [sort, setSort] = useState<SortState<SortKey>>({ key: null, dir: 'asc' });

  const rows = useMemo(() => {
    if (!sort.key || sort.key === 'name') {
      return sort.key === 'name' && sort.dir === 'desc' ? [...series].reverse() : series;
    }
    const key = sort.key;
    return [...series].sort((a, b) => {
      const cmp = sortValue(stats.get(a.key), key) - sortValue(stats.get(b.key), key);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [series, stats, sort]);

  function sortBy(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' },
    );
  }

  return (
    <TableCard summary={summary} actions={actions}>
      <table className={TABLE_CLASSES}>
        <thead className={THEAD_CLASSES}>
          <tr>
            <SortTh column="name" sort={sort} onSort={sortBy}>
              {heading}
            </SortTh>
            <Th align="right">First</Th>
            <SortTh column="last" align="right" sort={sort} onSort={sortBy}>
              Last
            </SortTh>
            <SortTh column="change" align="right" sort={sort} onSort={sortBy}>
              Change
            </SortTh>
            <SortTh column="high" align="right" sort={sort} onSort={sortBy}>
              Highest
            </SortTh>
            <SortTh column="low" align="right" sort={sort} onSort={sortBy}>
              Lowest
            </SortTh>
            <Th align="right">Days</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableLoading colSpan={COLUMNS} message="Reading the range…" />
          ) : error ? (
            <TableEmpty
              colSpan={COLUMNS}
              icon={AlertTriangle}
              message="The range could not be read"
              hint={error}
            />
          ) : series.length === 0 ? (
            <TableEmpty
              colSpan={COLUMNS}
              icon={TrendingUp}
              message={emptyMessage}
              hint={emptyHint}
            />
          ) : (
            rows.map((s) => {
              const st = stats.get(s.key);
              const on = selected.has(s.key);
              return (
                <tr key={s.key} className={ROW_CLASSES}>
                  <Td>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap font-medium">
                      <SeriesKey color={s.color} dash={s.dash} muted={!on} />
                      {s.label}
                    </span>
                  </Td>
                  {st ? (
                    <>
                      <Td numeric>
                        <DayFigure day={st.first} format={format} />
                      </Td>
                      <Td numeric>
                        <DayFigure day={st.last} format={format} />
                      </Td>
                      <Td numeric>
                        <ChangeMark
                          change={st.change}
                          pct
                          empty="one day"
                          emptyTitle="Quoted on one day only"
                        />
                      </Td>
                      <Td numeric>
                        <DayFigure day={st.high} format={format} />
                      </Td>
                      <Td numeric>
                        <DayFigure day={st.low} format={format} />
                      </Td>
                      <Td numeric className="text-muted-foreground">
                        {st.days}
                      </Td>
                    </>
                  ) : (
                    <Td colSpan={COLUMNS - 1} className="text-muted-foreground">
                      Not quoted in this range
                    </Td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </TableCard>
  );
}
