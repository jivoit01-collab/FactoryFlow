/**
 * Compensation review: what is waiting to be approved, and every revision that
 * ever was.
 *
 * The approval queue is the working half. It leads with the *change* rather
 * than the new figure — "₹6,00,000 → ₹7,20,000, +20%, annual increment" —
 * because that is the thing being decided, and an approver looking at eleven
 * proposals is comparing increases, not absolute packages.
 *
 * The revision log is the reporting half: filterable by type and year, one row
 * per decision, and it is where "what did we do last April?" gets answered.
 *
 * Both are restricted to the viewer's own salary reach, which is enforced by
 * the API and stated on the page. An approver cleared for one department must
 * not learn the rest of the company's numbers from their own inbox — so this
 * page never claims to be complete unless the viewer's reach actually is.
 */
import { CalendarClock, Check, FileClock, Lock, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { EMPLOYEE_PERMISSIONS } from '@/config/permissions';
import { useHasPermission } from '@/core/auth/hooks/usePermission';
import { PaginationControls } from '@/shared/components/PaginationControls';
import {
  Button,
  NativeSelect,
  SelectOption,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { employeesApi, useEmployeeMeta, useSalaryApprovals, useSalaryRevisions } from '../api';
import { EmployeeAvatar, EmptyState, RevisionChip, SalaryStatusChip } from '../components/EmployeeBits';
import { dateLabel, money } from '../utils';

export default function CompensationReviewPage() {
  const canApprove = useHasPermission(EMPLOYEE_PERMISSIONS.APPROVE_SALARY);
  const meta = useEmployeeMeta();
  const hasSalaryAccess = !!meta.data?.permissions.salary.any;

  const [approvalPage, setApprovalPage] = useState(1);
  const [revisionPage, setRevisionPage] = useState(1);
  const [revisionType, setRevisionType] = useState('');
  const [year, setYear] = useState('');
  const [deciding, setDeciding] = useState<number | null>(null);

  const approvals = useSalaryApprovals(approvalPage, hasSalaryAccess);
  const revisions = useSalaryRevisions(
    {
      page: revisionPage,
      revision_type: revisionType || undefined,
      year: year ? Number(year) : undefined,
    },
    hasSalaryAccess,
  );

  const scopeIsAll = !!meta.data?.permissions.salary.all;
  const thisYear = new Date().getFullYear();

  async function decide(recordId: number, decision: 'approve' | 'reject') {
    setDeciding(recordId);
    try {
      await employeesApi.decideSalary(recordId, decision);
      toast.success(decision === 'approve' ? 'Revision approved.' : 'Revision rejected.');
      await Promise.all([approvals.refetch(), revisions.refetch()]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Nothing was changed.'));
    } finally {
      setDeciding(null);
    }
  }

  if (!hasSalaryAccess) {
    return (
      <EmptyState
        icon={Lock}
        title="Compensation review is restricted"
        hint="Salary information has its own access control, separate from the employee directory."
      />
    );
  }

  const pending = approvals.data?.results ?? [];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compensation review</h1>
          <p className="text-sm text-muted-foreground">
            Revisions waiting for a decision, and the full history of every change.
            {!scopeIsAll && ' Limited to the employees you have salary access to.'}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/employees/reports">Workforce reports</Link>
        </Button>
      </header>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue" className="gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            Awaiting approval
            {approvals.data?.count ? (
              <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white tabular-nums">
                {approvals.data.count}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5">
            <FileClock className="h-3.5 w-3.5" />
            Revision log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          {approvals.isLoading ? (
            <div className="h-48 animate-pulse rounded-xl border bg-muted/40" />
          ) : pending.length === 0 ? (
            <EmptyState
              icon={Check}
              title="Nothing is waiting"
              hint="Every salary revision within your access has been decided."
            />
          ) : (
            <div className="space-y-3">
              {pending.map((record) => {
                const change = record.revision?.change_amount
                  ? Number(record.revision.change_amount)
                  : null;
                return (
                  <article
                    key={record.id}
                    className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 shadow-sm"
                  >
                    <Link
                      to={`/employees/${record.employee.id}?tab=compensation`}
                      className="flex min-w-[220px] flex-1 items-center gap-3"
                    >
                      <EmployeeAvatar employee={record.employee} size="md" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {record.employee.full_name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {record.employee.job_title || record.employee.designation_name || '—'}
                          {record.employee.department_name
                            ? ` · ${record.employee.department_name}`
                            : ''}
                        </span>
                      </span>
                    </Link>

                    {/* The change, which is what is being decided. */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground tabular-nums line-through decoration-muted-foreground/40">
                        {record.revision?.previous_amount
                          ? money(record.revision.previous_amount, record.currency)
                          : 'First salary'}
                      </span>
                      <span aria-hidden="true" className="text-muted-foreground">
                        →
                      </span>
                      <span className="text-lg font-bold tabular-nums">
                        {money(record.total_compensation, record.currency)}
                      </span>
                      {change !== null && (
                        <span
                          className={cn(
                            'text-sm font-semibold tabular-nums',
                            change >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400',
                          )}
                        >
                          {change >= 0 ? '+' : '−'}
                          {money(Math.abs(change))}
                          {record.revision?.change_percent !== null &&
                            record.revision?.change_percent !== undefined && (
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                {record.revision.change_percent.toFixed(1)}%
                              </span>
                            )}
                        </span>
                      )}
                    </div>

                    <div className="min-w-[160px]">
                      {record.revision && (
                        <RevisionChip
                          type={record.revision.revision_type}
                          label={record.revision.revision_type_display}
                        />
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Starts {dateLabel(record.effective_from)}
                      </p>
                      {record.created_by_detail && (
                        <p className="text-[11px] text-muted-foreground">
                          Proposed by {record.created_by_detail.full_name}
                        </p>
                      )}
                    </div>

                    {canApprove ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => void decide(record.id, 'approve')}
                          disabled={deciding === record.id}
                          className="gap-1.5"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void decide(record.id, 'reject')}
                          disabled={deciding === record.id}
                          className="gap-1.5"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <SalaryStatusChip status={record.status} />
                    )}
                  </article>
                );
              })}

              {!!approvals.data?.count && approvals.data.total_pages > 1 && (
                <div className="rounded-xl border bg-card">
                  <PaginationControls
                    page={approvals.data.page}
                    pageSize={approvals.data.page_size}
                    total={approvals.data.count}
                    totalPages={approvals.data.total_pages}
                    isLoading={approvals.isFetching}
                    onPageChange={setApprovalPage}
                    onPageSizeChange={() => undefined}
                  />
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <div className="rounded-xl border bg-card shadow-sm">
            <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
              <h2 className="mr-auto text-sm font-semibold">Every salary revision</h2>
              <NativeSelect
                className="w-[190px]"
                aria-label="Filter by revision type"
                value={revisionType}
                onChange={(event) => {
                  setRevisionType(event.target.value);
                  setRevisionPage(1);
                }}
              >
                <SelectOption value="">Every type</SelectOption>
                {(meta.data?.revision_types ?? []).map((choice) => (
                  <SelectOption key={choice.value} value={choice.value}>
                    {choice.label}
                  </SelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                className="w-[120px]"
                aria-label="Filter by year"
                value={year}
                onChange={(event) => {
                  setYear(event.target.value);
                  setRevisionPage(1);
                }}
              >
                <SelectOption value="">Every year</SelectOption>
                {Array.from({ length: 6 }).map((_, index) => {
                  const value = thisYear - index;
                  return (
                    <SelectOption key={value} value={String(value)}>
                      {value}
                    </SelectOption>
                  );
                })}
              </NativeSelect>
            </header>

            {revisions.isLoading ? (
              <div className="m-3 h-48 animate-pulse rounded-lg bg-muted/40" />
            ) : !revisions.data?.results.length ? (
              <EmptyState
                icon={FileClock}
                title="No revisions match this filter"
                className="m-3 border-0"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="px-3 py-2 font-medium">
                        Employee
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Type
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">
                        Previous
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">
                        New
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">
                        Change
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Effective
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Approved by
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {revisions.data.results.map((row) => {
                      const change = row.change_amount === null ? null : Number(row.change_amount);
                      return (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <Link
                              to={`/employees/${row.employee}?tab=compensation`}
                              className="flex items-center gap-2 hover:underline"
                            >
                              <EmployeeAvatar
                                employee={row.employee_detail}
                                size="xs"
                                showStatus={false}
                              />
                              <span className="min-w-0">
                                <span className="block truncate font-medium">
                                  {row.employee_detail.full_name}
                                </span>
                                <span className="block truncate font-mono text-[10px] text-muted-foreground">
                                  {row.employee_detail.employee_code}
                                </span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <RevisionChip
                              type={row.revision_type}
                              label={row.revision_type_display}
                            />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {row.previous_amount ? money(row.previous_amount, row.currency) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">
                            {money(row.new_amount, row.currency)}
                          </td>
                          <td
                            className={cn(
                              'px-3 py-2 text-right font-medium tabular-nums',
                              change === null
                                ? 'text-muted-foreground'
                                : change >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400',
                            )}
                          >
                            {change === null
                              ? '—'
                              : `${change >= 0 ? '+' : '−'}${money(Math.abs(change))}`}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            {dateLabel(row.effective_date)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.approved_by_detail?.full_name ?? (
                              <SalaryStatusChip status={row.status} />
                            )}
                          </td>
                          <td className="max-w-[220px] truncate px-3 py-2 text-muted-foreground">
                            {row.reason || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!!revisions.data?.count && (
              <PaginationControls
                page={revisions.data.page}
                pageSize={revisions.data.page_size}
                total={revisions.data.count}
                totalPages={revisions.data.total_pages}
                isLoading={revisions.isFetching}
                onPageChange={setRevisionPage}
                onPageSizeChange={() => undefined}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
