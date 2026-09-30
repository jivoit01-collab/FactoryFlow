/**
 * The chart as a table: a row per day, newest first, a column per line drawn,
 * each figure with its change from the day before it in the range. EXIM's
 * Compare view of its saved prices.
 *
 * In each column the range's highest is tinted rose and its lowest emerald,
 * faintly: where a commodity peaked and bottomed, found without reading every
 * figure. The day column stays pinned while the figures scroll under it.
 */
import { useMemo, useState } from 'react';

import { ROW_CLASSES, TABLE_CLASSES, TableCard, Td, Th, THEAD_CLASSES } from '@/shared/components';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { cn } from '@/shared/utils';

import { ChangeMark, SeriesKey } from './PriceBits';
import { changeOf, type DayRow, type SeriesDef, type SeriesStats, tooltipDay } from './priceFormat';

const PIN_HEAD = 'bg-card bg-[linear-gradient(hsl(var(--muted)/0.4),hsl(var(--muted)/0.4))]';
const PIN_ROW =
  'bg-card group-hover:bg-[linear-gradient(hsl(var(--muted)/0.4),hsl(var(--muted)/0.4))]';
const PIN_EDGE = 'sticky left-0 z-10 shadow-[inset_-1px_0_0_hsl(var(--border))]';

function valueOf(row: DayRow | undefined, slot: string): number | null {
  const value = row?.[slot];
  return typeof value === 'number' ? value : null;
}

export function DayByDayTable({
  rows,
  series,
  stats,
  format,
  summary,
}: {
  /** Oldest first, as the chart draws them. */
  rows: DayRow[];
  /** The lines drawn. */
  series: SeriesDef[];
  stats: Map<string, SeriesStats>;
  format: (value: number) => string;
  summary?: string;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /** Each row beside the one before it, per series: the last day that series was quoted. */
  const lines = useMemo(() => {
    const lastSeen = new Map<string, number>();
    const built = rows.map((row) => {
      const cells = series.map((s) => {
        const value = valueOf(row, s.slot);
        const before = lastSeen.get(s.slot) ?? null;
        if (value !== null) lastSeen.set(s.slot, value);
        return { s, value, change: value === null ? null : changeOf(value, before) };
      });
      return { date: row.date, cells };
    });
    return built.reverse();
  }, [rows, series]);

  const totalPages = Math.max(1, Math.ceil(lines.length / pageSize));
  const current = Math.min(page, totalPages);
  const shown = lines.slice((current - 1) * pageSize, current * pageSize);

  return (
    <TableCard
      summary={
        <span>
          {summary}
          {summary ? ' · ' : ''}
          <span className="rounded bg-rose-500/10 px-1 text-foreground">highest</span> and{' '}
          <span className="rounded bg-emerald-500/10 px-1 text-foreground">lowest</span> in the
          range tinted
        </span>
      }
    >
      <table className={TABLE_CLASSES}>
        <thead className={THEAD_CLASSES}>
          <tr>
            <Th className={cn(PIN_EDGE, PIN_HEAD)}>Day</Th>
            {series.map((s) => (
              <Th key={s.key} align="right">
                <span className="inline-flex items-center gap-1.5">
                  <SeriesKey color={s.color} dash={s.dash} />
                  {s.label}
                </span>
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((line) => (
            <tr key={line.date} className={cn(ROW_CLASSES, 'group')}>
              <Td className={cn(PIN_EDGE, PIN_ROW, 'whitespace-nowrap font-medium')}>
                {tooltipDay(line.date)}
              </Td>
              {line.cells.map(({ s, value, change }) => {
                const st = stats.get(s.key);
                const high =
                  value !== null && st && st.high.value !== st.low.value && value === st.high.value;
                const low =
                  value !== null && st && st.high.value !== st.low.value && value === st.low.value;
                return (
                  <Td
                    key={s.key}
                    numeric
                    className={cn(
                      'whitespace-nowrap',
                      high && 'bg-rose-500/10',
                      low && 'bg-emerald-500/10',
                    )}
                    title={high ? 'Highest in the range' : low ? 'Lowest in the range' : undefined}
                  >
                    {value === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>
                        <span className="block font-medium">{format(value)}</span>
                        <ChangeMark change={change} empty="" className="justify-end" />
                      </>
                    )}
                  </Td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {lines.length > pageSize && (
        <PaginationControls
          page={current}
          pageSize={pageSize}
          total={lines.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </TableCard>
  );
}
