import { CheckCircle2, ChevronRight, Circle, MinusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { DailyJob } from '../types';

export interface DailyJobRowProps {
  job: DailyJob;
}

function timeOnly(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * One job on the sheet, in exactly one of three states.
 *
 * This component is where "show, don't score" is actually implemented, so the colour
 * choices are load-bearing:
 *
 * - Done       — emerald tick. The only colour on the row.
 * - Not yet    — muted circle and the words "Not yet today". Deliberately NOT red and
 *                NOT a warning triangle: we have no attendance data, so we cannot know
 *                the job was owed today, and a red row would accuse someone of nothing.
 * - Not tracked — the record does not store who acted, so completion is unknowable.
 *                Muted whole-row, an explicit badge, and the pending count and link
 *                stay live so the row is still useful.
 */
export function DailyJobRow({ job }: DailyJobRowProps) {
  const notTracked = !job.countable;
  const done = job.countable && (job.done_today ?? 0) > 0;

  return (
    <tr
      className={cn(
        'border-b border-border/60 last:border-0 transition-colors',
        notTracked ? 'bg-muted/20 text-muted-foreground' : 'hover:bg-muted/30',
      )}
    >
      <td className="px-4 py-2.5">
        <div className="font-medium">{job.label}</div>
        <div className="text-xs text-muted-foreground">{job.module}</div>
      </td>

      <td className="whitespace-nowrap px-4 py-2.5">
        {notTracked ? (
          <Badge
            variant="outline"
            title="This job does not record who did it, so it cannot be counted. Open the screen to check."
          >
            <MinusCircle className="mr-1 h-3 w-3" />
            Not tracked
          </Badge>
        ) : done ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {(job.done_today ?? 0) > 1 && <span className="tabular-nums">×{job.done_today}</span>}
            <span className="text-xs font-normal text-muted-foreground">
              {timeOnly(job.last_done_at)}
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Circle className="h-4 w-4" />
            Not yet today
          </span>
        )}
      </td>

      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
        {job.pending_now > 0 ? job.pending_now.toLocaleString('en-IN') : '—'}
      </td>

      <td className="whitespace-nowrap px-4 py-2.5 text-right">
        {/* Ageing is information, never blame — amber only, and only past a week. */}
        {job.oldest_pending_days === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs tabular-nums',
              job.oldest_pending_days > 7
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                : 'text-muted-foreground',
            )}
          >
            {job.oldest_pending_days}d
          </span>
        )}
      </td>

      <td className="w-10 px-2 py-2.5 text-right">
        {job.url && (
          <Link
            to={job.url}
            aria-label={`Open ${job.label}`}
            className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </td>
    </tr>
  );
}
