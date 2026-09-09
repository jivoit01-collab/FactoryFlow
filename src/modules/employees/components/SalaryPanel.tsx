/**
 * One employee's compensation: what they are paid now, and everything it has
 * been.
 *
 * The screen is built around one question — *which figure is the one being
 * paid?* — because a page showing three amounts and a fourth awaiting approval
 * is exactly where a payroll mistake starts. So:
 *
 * **The figure in force is the hero.** One large number, with the date it
 * started under it, above a part-to-whole bar of the components it is made of.
 * Nothing else on the panel is that size.
 *
 * **History is a timeline, newest first, and it never rewrites itself.** Each
 * row is a record that was true from its date until the next one, with the
 * change from the previous figure printed beside it — because "₹6,00,000" means
 * much less than "₹6,00,000, up ₹1,00,000 · 20% on an annual increment".
 *
 * **A revision awaiting approval is visibly not yet real.** It sits in an amber
 * card above the history with its own Approve / Reject buttons, so nobody reads
 * a proposal as a salary. Approving is a separate right from proposing, and the
 * buttons only exist for somebody who holds it.
 *
 * **Access is stated, not implied.** When the viewer may see the current figure
 * but not the history, the panel says so rather than showing a suspiciously
 * short list — an empty history and a restricted history look identical
 * otherwise, and one of them would send somebody to ask payroll a question the
 * page could have answered.
 */
import {
  CalendarClock,
  Check,
  History,
  Lock,
  Plus,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useDecideSalary } from '../api';
import type { EmployeeSalaryResponse, SalaryRecord } from '../types';
import { changeLabel, dateLabel, money } from '../utils';
import { COMPOSITION_COLORS,CompositionBar } from './charts';
import { EmptyState, RevisionChip, SalaryStatusChip } from './EmployeeBits';

export interface SalaryPanelProps {
  employeeId: number;
  data: EmployeeSalaryResponse | undefined;
  /** The viewer may not see this employee's pay at all. */
  restricted?: boolean;
  isLoading?: boolean;
  onRevise?: () => void;
  className?: string;
}

export function SalaryPanel({
  employeeId,
  data,
  restricted,
  isLoading,
  onRevise,
  className,
}: SalaryPanelProps) {
  const decide = useDecideSalary(employeeId);
  const [deciding, setDeciding] = useState<number | null>(null);

  if (restricted) {
    return (
      <EmptyState
        icon={Lock}
        title="Salary information is restricted"
        hint="Compensation has its own access control, separate from the directory. Ask HR if you need it for your work."
        className={className}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="h-40 animate-pulse rounded-xl border bg-muted/40" />
        <div className="h-32 animate-pulse rounded-xl border bg-muted/40" />
      </div>
    );
  }

  const { current, records, can_view_history: canViewHistory, can_approve: canApprove } = data;
  const pending = records.filter(
    (record) => record.status === 'PENDING' || record.status === 'DRAFT',
  );
  const scheduled = records.filter((record) => record.status === 'SCHEDULED');
  const history = records
    .filter((record) => record.status === 'ACTIVE' || record.status === 'SUPERSEDED')
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from));

  function runDecision(record: SalaryRecord, decision: 'approve' | 'reject') {
    setDeciding(record.id);
    decide.mutate(
      { recordId: record.id, decision },
      {
        onSuccess: () =>
          toast.success(
            decision === 'approve'
              ? `Revision approved, effective ${dateLabel(record.effective_from)}.`
              : 'Revision rejected. The record stays on file.',
          ),
        onError: (error) => toast.error(getErrorMessage(error, 'Nothing was changed.')),
        onSettled: () => setDeciding(null),
      },
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* -- what they are paid now ------------------------------------- */}
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Current compensation
          </h3>
          {onRevise && data.can_create && (
            <Button size="sm" variant="outline" onClick={onRevise} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Revise salary
            </Button>
          )}
        </header>

        {current ? (
          <div className="grid gap-6 p-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Total annual compensation
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
                {money(current.total_compensation, current.currency)}
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <SalaryStatusChip status={current.status} />
                In force since {dateLabel(current.effective_from)}
              </p>
              {current.revision && (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <RevisionChip
                    type={current.revision.revision_type}
                    label={current.revision.revision_type_display}
                  />
                  {current.revision.change_amount !== null && (
                    <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {changeLabel(current.revision)}
                    </span>
                  )}
                </p>
              )}
              {current.approved_by_detail && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Approved by {current.approved_by_detail.full_name}
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                How it is made up
              </p>
              <CompositionBar
                total={Number(current.total_compensation)}
                formatAmount={(amount) => money(amount, current.currency)}
                slices={[
                  {
                    label: 'Basic',
                    amount: Number(current.basic_salary),
                    color: COMPOSITION_COLORS.basic,
                  },
                  {
                    label: 'Allowances',
                    amount: Number(current.allowances),
                    color: COMPOSITION_COLORS.allowances,
                  },
                  {
                    label: 'Bonuses',
                    amount: Number(current.bonuses),
                    color: COMPOSITION_COLORS.bonuses,
                  },
                ]}
              />
              {Number(current.deductions) > 0 && (
                <p className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">Deductions</span>
                  <span className="font-medium tabular-nums text-rose-600 dark:text-rose-400">
                    −{money(current.deductions, current.currency)}
                  </span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              icon={Wallet}
              title="No salary on record"
              hint="Nobody has entered a salary for this employee yet."
              action={
                onRevise && data.can_create ? (
                  <Button size="sm" onClick={onRevise} className="mt-1 gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Enter a salary
                  </Button>
                ) : undefined
              }
              className="border-0"
            />
          </div>
        )}
      </section>

      {/* -- proposals nobody has approved ------------------------------ */}
      {pending.map((record) => (
        <section
          key={record.id}
          className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-500/40 dark:bg-amber-500/5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="h-4 w-4" />
                Revision awaiting approval
              </h3>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {money(record.total_compensation, record.currency)}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                Would start {dateLabel(record.effective_from)}
                {record.revision && (
                  <>
                    <RevisionChip
                      type={record.revision.revision_type}
                      label={record.revision.revision_type_display}
                    />
                    <span className="font-medium">{changeLabel(record.revision)}</span>
                  </>
                )}
              </p>
              {record.revision?.reason && (
                <p className="mt-1.5 text-xs italic text-muted-foreground">
                  “{record.revision.reason}”
                </p>
              )}
              {record.created_by_detail && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Proposed by {record.created_by_detail.full_name}
                </p>
              )}
            </div>

            {canApprove ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => runDecision(record, 'approve')}
                  disabled={deciding === record.id}
                  className="gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runDecision(record, 'reject')}
                  disabled={deciding === record.id}
                  className="gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            ) : (
              <p className="max-w-[220px] text-xs text-muted-foreground">
                Waiting for somebody with approval rights. It is not being paid until then.
              </p>
            )}
          </div>
        </section>
      ))}

      {/* -- approved, but not started yet ------------------------------ */}
      {scheduled.map((record) => (
        <section
          key={record.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3 dark:border-indigo-500/40 dark:bg-indigo-500/5"
        >
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4" />
              Approved — starts {dateLabel(record.effective_from)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Until then, the figure above is what is being paid.
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums">
              {money(record.total_compensation, record.currency)}
            </p>
            {record.revision && (
              <p className="text-xs text-muted-foreground">{changeLabel(record.revision)}</p>
            )}
          </div>
        </section>
      ))}

      {/* -- the history ------------------------------------------------ */}
      <section className="rounded-xl border bg-card shadow-sm">
        <header className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4 text-muted-foreground" />
            Salary history
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {canViewHistory ? `${history.length} record(s)` : 'Restricted'}
          </span>
        </header>

        {!canViewHistory ? (
          <div className="flex items-start gap-2 px-4 py-4 text-sm text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              You can see what this employee is paid now, but not the revisions behind it.
              Salary history is a separate permission — how somebody has been paid over
              years says more than today&apos;s figure.
            </p>
          </div>
        ) : history.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No approved salary records yet.
          </p>
        ) : (
          <ol className="px-4 py-3">
            {history.map((record, index) => {
              const isCurrent = record.status === 'ACTIVE';
              const isLast = index === history.length - 1;
              return (
                <li key={record.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* The rail: a dot per record, filled for the one in force. */}
                  {!isLast && (
                    <span
                      className="absolute left-[5px] top-4 h-full w-px bg-border"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      'relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-card',
                      isCurrent ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-sm font-semibold tabular-nums">
                        {money(record.total_compensation, record.currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        from {dateLabel(record.effective_from)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {record.revision && (
                        <RevisionChip
                          type={record.revision.revision_type}
                          label={record.revision.revision_type_display}
                        />
                      )}
                      {record.revision?.change_amount !== null && record.revision && (
                        <span
                          className={cn(
                            'text-xs font-medium tabular-nums',
                            Number(record.revision.change_amount) >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400',
                          )}
                        >
                          {changeLabel(record.revision)}
                        </span>
                      )}
                      {isCurrent && <SalaryStatusChip status={record.status} />}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                      <span>
                        Basic {money(record.basic_salary, record.currency)} · Allowances{' '}
                        {money(record.allowances, record.currency)} · Bonus{' '}
                        {money(record.bonuses, record.currency)}
                      </span>
                      {record.approved_by_detail && (
                        <span>Approved by {record.approved_by_detail.full_name}</span>
                      )}
                    </div>
                    {record.revision?.reason && (
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        “{record.revision.reason}”
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
