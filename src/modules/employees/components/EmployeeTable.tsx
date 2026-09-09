/**
 * The directory's results, as a table or as cards.
 *
 * Both exist because the two are used differently. The **table** is for work:
 * nine columns, thirty rows on a screen, everything comparable down a column —
 * which is what somebody reconciling a department against a headcount report
 * needs. The **cards** are for finding a person: a bigger photo, the role under
 * the name, and the manager on the face of it, which is how people search when
 * they half-remember a face and a team.
 *
 * The salary column is present for everybody and gated per row, because that is
 * how the API answers: a manager sees figures for their own team and the word
 * "Restricted" beside everybody else. Hiding the column entirely for a partial
 * viewer would be worse — they would not know the figures exist, and the
 * asymmetry between rows is exactly the thing worth showing.
 */
import { ChevronRight, Users } from 'lucide-react';

import { cn } from '@/shared/utils';

import type { EmployeeListItem } from '../types';
import { dateLabel, tenure } from '../utils';
import { EmployeeAvatar, EmptyState, LevelChip, SalaryValue, StatusChip, TeamCount } from './EmployeeBits';
import { statusStyle } from './theme';

export interface EmployeeResultsProps {
  employees: EmployeeListItem[];
  onOpen: (employee: EmployeeListItem) => void;
  selfEmployeeId?: number | null;
  isLoading?: boolean;
  className?: string;
}

export function EmployeeTable({
  employees,
  onOpen,
  selfEmployeeId,
  isLoading,
  className,
}: EmployeeResultsProps) {
  if (!employees.length && !isLoading) {
    return (
      <EmptyState
        icon={Users}
        title="No employees match this filter"
        hint="Try clearing a filter, or search by employee code."
      />
    );
  }

  return (
    // The table scrolls inside its own box; nine columns must never put the
    // whole page into a horizontal scroll.
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-medium">
              Employee
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Role
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Department
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Reports to
            </th>
            <th scope="col" className="px-3 py-2 text-center font-medium">
              Level
            </th>
            <th scope="col" className="px-3 py-2 text-center font-medium">
              Team
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Status
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Salary
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Joined
            </th>
          </tr>
        </thead>
        <tbody className={cn(isLoading && 'opacity-60 transition-opacity')}>
          {employees.map((employee) => {
            const style = statusStyle(employee.employment_status);
            return (
              <tr
                key={employee.id}
                onClick={() => onOpen(employee)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onOpen(employee);
                }}
                className={cn(
                  'cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50 focus:bg-muted/50 focus:outline-none',
                  style.gone && 'opacity-70',
                )}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <EmployeeAvatar employee={employee} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{employee.full_name}</span>
                        {employee.id === selfEmployeeId && (
                          <span className="rounded bg-primary/10 px-1 text-[10px] font-semibold text-primary">
                            You
                          </span>
                        )}
                      </div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">
                        {employee.employee_code}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="max-w-[180px] px-3 py-2">
                  <div className="truncate">{employee.job_title || '—'}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {employee.designation_name || '—'}
                  </div>
                </td>
                <td className="max-w-[150px] truncate px-3 py-2">
                  {employee.department_name || '—'}
                </td>
                <td className="max-w-[160px] px-3 py-2">
                  {employee.manager_name ? (
                    <>
                      <div className="truncate">{employee.manager_name}</div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">
                        {employee.manager_code}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">Top level</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <LevelChip level={employee.hierarchy_level} />
                </td>
                <td className="px-3 py-2 text-center">
                  {employee.direct_report_count ? (
                    <TeamCount direct={employee.direct_report_count} className="justify-center" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatusChip
                    status={employee.employment_status}
                    label={employee.status_display}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <SalaryValue salary={employee.salary} />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <div>{dateLabel(employee.joining_date)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {tenure(employee.joining_date)}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function EmployeeCardGrid({
  employees,
  onOpen,
  selfEmployeeId,
  isLoading,
  className,
}: EmployeeResultsProps) {
  if (!employees.length && !isLoading) {
    return (
      <EmptyState
        icon={Users}
        title="No employees match this filter"
        hint="Try clearing a filter, or search by employee code."
      />
    );
  }

  return (
    <div
      className={cn(
        'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        isLoading && 'opacity-60 transition-opacity',
        className,
      )}
    >
      {employees.map((employee) => {
        const style = statusStyle(employee.employment_status);
        return (
          <div
            key={employee.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(employee)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpen(employee);
              }
            }}
            className={cn(
              'group flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              style.gone && 'opacity-70',
            )}
          >
            <div className="flex items-start gap-3">
              <EmployeeAvatar employee={employee} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate font-semibold leading-tight">{employee.full_name}</h3>
                  {employee.id === selfEmployeeId && (
                    <span className="rounded bg-primary/10 px-1 text-[10px] font-semibold text-primary">
                      You
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {employee.job_title || employee.designation_name || '—'}
                </p>
                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/80">
                  {employee.employee_code}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <StatusChip status={employee.employment_status} label={employee.status_display} />
              <LevelChip level={employee.hierarchy_level} />
              {employee.direct_report_count > 0 && (
                <TeamCount direct={employee.direct_report_count} />
              )}
            </div>

            <dl className="grid grid-cols-2 gap-2 border-t pt-2.5 text-xs">
              <div className="min-w-0">
                <dt className="text-muted-foreground">Department</dt>
                <dd className="truncate font-medium">{employee.department_name || '—'}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Reports to</dt>
                <dd className="truncate font-medium">{employee.manager_name || 'Top level'}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Joined</dt>
                <dd className="truncate font-medium">{dateLabel(employee.joining_date)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Salary</dt>
                <dd className="truncate">
                  <SalaryValue salary={employee.salary} />
                </dd>
              </div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}
