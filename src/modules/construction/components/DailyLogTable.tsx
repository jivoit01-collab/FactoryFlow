/**
 * The site diary as a sheet.
 *
 * A table because the questions asked of this list are the ones a table
 * answers — how many days did we lose to rain, which days had forty men on
 * site, what did the week cost — and the funnels here work exactly as they do
 * on the Expenses tab and the dispatch sheet.
 *
 * A row holds the facts of a day. The prose and the photos do not fit a cell,
 * so **clicking anywhere on the row opens the day** — the same dialog that
 * writes it up, which for somebody without the permission, or on a project
 * whose status has closed the diary, opens as a plain read view. That is why
 * every row is clickable and not only the ones you may edit: it is the only
 * way to read a day in full.
 *
 * One honest limitation: a day can be stopped for several reasons at once, and
 * the shared kit filters on a cell's whole text — so the Why funnel offers
 * "Rain, Safety" as one entry rather than Rain and Safety separately. The
 * separate **Stopped** column is the clean filter, and the per-reason totals
 * live on the spend summary, which counts each reason properly.
 */
import { Camera } from 'lucide-react';
import { useState } from 'react';

import {
  ColumnFilter,
  type ColumnSpec,
  TOTALS_ROW_CLASS,
  useLocalColumns,
} from '@/shared/components/sheetGrid';
import { Button } from '@/shared/components/ui';

import { useDailyLogs } from '../api';
import type { DailyLog } from '../types';
import { formatMoney, formatShortDate, STOP_REASON_LABELS } from '../utils';

const COLUMNS: { key: string; label: string; align?: 'left' | 'right' }[] = [
  { key: 'log_date', label: 'Date' },
  { key: 'work_done', label: 'What got done' },
  { key: 'workers', label: 'On site', align: 'right' },
  { key: 'progress', label: 'Done', align: 'right' },
  { key: 'stopped', label: 'Stopped' },
  { key: 'why', label: 'Why' },
  { key: 'spent', label: 'Spent', align: 'right' },
];

function reasonsOf(log: DailyLog): string {
  return log.stopped_reasons.map((value) => STOP_REASON_LABELS[value]).join(', ');
}

export function DailyLogTable({
  projectId,
  onOpenDay,
}: {
  projectId: number;
  onOpenDay: (date: string) => void;
}) {
  const { data: logs } = useDailyLogs(projectId);
  const rows = logs ?? [];
  const [openColumn, setOpenColumn] = useState<string | null>(null);

  const specs: Record<string, ColumnSpec<DailyLog>> = {
    log_date: {
      value: (row) => formatShortDate(row.log_date),
      // Sorted on the ISO date -- "22 Sept" would otherwise list by its day.
      sortValue: (row) => row.log_date,
    },
    work_done: { value: (row) => row.work_done },
    workers: {
      value: (row) => String(row.workers_count),
      sortValue: (row) => row.workers_count,
      total: (row) => row.workers_count,
    },
    progress: {
      value: (row) =>
        row.progress_percent === null ? '' : `${Number(row.progress_percent)}%`,
      sortValue: (row) =>
        row.progress_percent === null ? null : Number(row.progress_percent),
    },
    stopped: { value: (row) => (row.work_stopped ? 'Stopped' : 'Worked') },
    why: { value: (row) => reasonsOf(row) },
    spent: {
      value: (row) => formatMoney(row.spent_on_day),
      sortValue: (row) => Number(row.spent_on_day),
      total: (row) => Number(row.spent_on_day),
    },
  };

  const {
    rows: visible,
    column: columnProps,
    filteredColumns,
    clearFilters,
    totals,
  } = useLocalColumns(rows, specs, { key: 'log_date', direction: 'desc' }, {
    activeColumn: openColumn,
  });

  return (
    <div className="space-y-2">
      {filteredColumns.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            Filtered by {filteredColumns.join(', ')} · {visible.length} of {rows.length}{' '}
            days
          </span>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {COLUMNS.map((column) => (
                <ColumnFilter
                  key={column.key}
                  {...columnProps(column.key, column.label, column.align ?? 'left')}
                  onOpen={() => setOpenColumn(column.key)}
                />
              ))}
            </tr>
          </thead>

          <tbody>
            {visible.length > 0 && (
              <tr className={TOTALS_ROW_CLASS}>
                <td colSpan={2}>
                  {visible.length} day{visible.length === 1 ? '' : 's'}
                </td>
                <td className="text-right tabular-nums">{totals.workers ?? 0}</td>
                <td colSpan={3} />
                <td className="text-right tabular-nums">
                  {formatMoney(String(totals.spent ?? 0))}
                </td>
              </tr>
            )}

            {visible.map((log) => (
              <tr
                key={log.id}
                onClick={() => onOpenDay(log.log_date)}
                className="cursor-pointer border-b hover:bg-muted/40"
              >
                <td className="whitespace-nowrap px-3 py-2">
                  {/*
                    The row carries the click for the mouse. This button carries
                    the same action for the keyboard and the screen reader, which
                    cannot reach a <tr> at all. Both call the same setter with the
                    same date, so the click bubbling out of the button is a no-op
                    rather than a second open -- which is why there is no
                    stopPropagation here.
                  */}
                  <button
                    type="button"
                    onClick={() => onOpenDay(log.log_date)}
                    className="rounded font-medium hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label={`Open ${formatShortDate(log.log_date)}`}
                  >
                    {formatShortDate(log.log_date)}
                  </button>
                </td>
                <td className="max-w-[320px] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate">{log.work_done}</span>
                    {log.photos.length > 0 && (
                      <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                        <Camera className="h-3 w-3" />
                        {log.photos.length}
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {log.workers_count}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {log.progress_percent === null
                    ? '—'
                    : `${Number(log.progress_percent)}%`}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {log.work_stopped ? (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                      Stopped
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Worked</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{reasonsOf(log) || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                  {formatMoney(log.spent_on_day)}
                </td>
              </tr>
            ))}

            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  {rows.length === 0
                    ? 'Nothing written up yet.'
                    : 'No day matches those filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
