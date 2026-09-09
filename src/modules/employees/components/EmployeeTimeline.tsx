/**
 * Two histories of the same employee, drawn the same way and meaning different
 * things.
 *
 * **The career timeline** is the employee's story: joined, promoted, moved
 * department, salary revised, resigned. It is shown to anybody who may see the
 * employee, and it is grouped by month so a five-year career reads as a
 * sequence of chapters rather than a hundred undifferentiated rows.
 *
 * **The audit trail** is the record of administrative acts: who changed the
 * value, from what, to what, and why. It sits behind its own permission and
 * includes things that are nobody's career — such as who opened this person's
 * salary. It leads with the actor, because that is the question being asked of
 * it; the career timeline leads with the event, because that is the question
 * being asked of *that*.
 *
 * Both use icons keyed to the kind of event, so a long timeline can be scanned
 * for "when did they move team?" without reading every line.
 */
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRightLeft,
  Award,
  Building2,
  CalendarDays,
  Eye,
  FileText,
  IdCard,
  LogIn,
  LogOut,
  Pencil,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react';

import { cn } from '@/shared/utils';

import type { AuditEntry, HistoryEntry } from '../types';
import { dateLabel, monthLabel, timeAgo } from '../utils';
import { EmptyState } from './EmployeeBits';

/** Event → icon and tint. Colour is a hint here, never the only signal. */
const EVENT_STYLE: Record<string, { icon: LucideIcon; tint: string }> = {
  JOINED: { icon: LogIn, tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  MANAGER_CHANGED: { icon: UserCog, tint: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  MANAGER_REMOVED: { icon: UserCog, tint: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300' },
  DEPARTMENT_CHANGED: { icon: Building2, tint: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300' },
  DESIGNATION_CHANGED: { icon: IdCard, tint: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300' },
  PROMOTED: { icon: Award, tint: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  LEVEL_CHANGED: { icon: TrendingUp, tint: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' },
  LOCATION_CHANGED: { icon: ArrowRightLeft, tint: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  SALARY_REVISED: { icon: Wallet, tint: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  STATUS_CHANGED: { icon: FileText, tint: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300' },
  TEAM_MOVED: { icon: Users, tint: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  EXITED: { icon: LogOut, tint: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
};

const AUDIT_STYLE: Record<string, { icon: LucideIcon; tint: string }> = {
  ...EVENT_STYLE,
  EMPLOYEE_CREATED: EVENT_STYLE.JOINED,
  EMPLOYEE_UPDATED: { icon: Pencil, tint: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300' },
  SUBTREE_MOVED: { icon: Users, tint: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  SALARY_CREATED: EVENT_STYLE.SALARY_REVISED,
  SALARY_APPROVED: { icon: ShieldCheck, tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  SALARY_REJECTED: { icon: X, tint: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
  SALARY_VIEWED: { icon: Eye, tint: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300' },
};

const FALLBACK = { icon: FileText, tint: 'bg-muted text-muted-foreground' };

/** `Engineering → DevOps`, or just the new value when there was nothing before. */
function TransitionText({ from, to }: { from: string; to: string }) {
  if (!from && !to) return null;
  if (!from || from === '—') return <span className="font-medium">{to}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground line-through decoration-muted-foreground/40">
        {from}
      </span>
      <span aria-hidden="true">→</span>
      <span className="font-medium">{to}</span>
    </span>
  );
}

export function CareerTimeline({
  entries,
  isLoading,
  className,
}: {
  entries: HistoryEntry[];
  isLoading?: boolean;
  className?: string;
}) {
  if (isLoading) {
    return <div className={cn('h-64 animate-pulse rounded-xl border bg-muted/40', className)} />;
  }
  if (!entries.length) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nothing recorded yet"
        hint="Joining, promotions, transfers and salary revisions all land here as they happen."
        className={className}
      />
    );
  }

  // Grouped by month, so a long career reads as chapters.
  const groups: { month: string; rows: HistoryEntry[] }[] = [];
  entries.forEach((entry) => {
    const month = monthLabel(entry.occurred_on);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.rows.push(entry);
    else groups.push({ month, rows: [entry] });
  });

  return (
    <div className={cn('space-y-4', className)}>
      {groups.map((group) => (
        <section key={group.month}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.month}
          </h4>
          <ol className="space-y-1">
            {group.rows.map((entry) => {
              const style = EVENT_STYLE[entry.event] ?? FALLBACK;
              const Icon = style.icon;
              return (
                <li
                  key={entry.id}
                  className="flex items-start gap-3 rounded-lg border bg-card p-2.5 shadow-sm"
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      style.tint,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-sm font-medium">{entry.event_display}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {dateLabel(entry.occurred_on)}
                      </span>
                    </div>
                    {(entry.from_value || entry.to_value) && (
                      <p className="mt-0.5 text-sm">
                        <TransitionText from={entry.from_value} to={entry.to_value} />
                      </p>
                    )}
                    {entry.notes && (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">{entry.notes}</p>
                    )}
                    {entry.created_by_detail && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Recorded by {entry.created_by_detail.full_name}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function AuditTrail({
  entries,
  isLoading,
  className,
}: {
  entries: AuditEntry[];
  isLoading?: boolean;
  className?: string;
}) {
  if (isLoading) {
    return <div className={cn('h-64 animate-pulse rounded-xl border bg-muted/40', className)} />;
  }
  if (!entries.length) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No administrative changes recorded"
        hint="Manager moves, transfers, promotions, status changes and salary decisions are all recorded here, with who made them."
        className={className}
      />
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-xl border', className)}>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-medium">
              Action
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Changed
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              By
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Reason
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              When
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const style = AUDIT_STYLE[entry.action] ?? FALLBACK;
            const Icon = style.icon;
            return (
              <tr key={entry.id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded',
                        style.tint,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium">{entry.action_display}</span>
                  </span>
                </td>
                <td className="max-w-[260px] px-3 py-2">
                  {entry.previous_value || entry.new_value ? (
                    <TransitionText from={entry.previous_value} to={entry.new_value} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {entry.field && (
                    <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                      ({entry.field})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {entry.performed_by_detail?.full_name ?? (
                    <span className="text-muted-foreground">System</span>
                  )}
                </td>
                <td className="max-w-[220px] px-3 py-2 text-muted-foreground">
                  {entry.reason || entry.notes || '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  <span title={entry.performed_at}>{timeAgo(entry.performed_at)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
