/**
 * Where one employee sits in the organisation, answered in full on one screen.
 *
 * The brief asks for seven facts about every employee — direct manager, direct
 * reports, the manager's manager, the complete management chain, peers, all
 * subordinates and the organisational path. They arrive in a single request,
 * and this panel is the shape they take.
 *
 * The **chain ribbon** across the top is the piece that does the most work. It
 * prints the path the way people say it — CEO → CTO → Engineering Manager →
 * *this person* — as a horizontal, scrollable row of avatars, each one a link
 * to that person. Two levels of hierarchy are easy to hold in your head; five
 * are not, and this is the difference between a page that answers "who do I
 * escalate to?" and one that makes you click upwards four times to find out.
 *
 * Peers are shown but kept quiet: they are useful context ("who else reports to
 * my manager?") and they are also the group whose salaries a viewer most often
 * has no business seeing, so they appear as plain chips with no figures at all.
 */
import { ArrowRight, Building2, ChevronRight, Users, UserSquare2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/shared/utils';

import type { EmployeeBrief, ReportingInfo } from '../types';
import { EmployeeAvatar, EmptyState, LevelChip, SalaryValue, StatusChip, TeamCount } from './EmployeeBits';

function personHref(employee: Pick<EmployeeBrief, 'id'>) {
  return `/employees/${employee.id}`;
}

/** One avatar + name, as a link. The unit the ribbon and the peer list are made of. */
function PersonChip({
  employee,
  subtitle,
  className,
}: {
  employee: EmployeeBrief;
  subtitle?: string;
  className?: string;
}) {
  return (
    <Link
      to={personHref(employee)}
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-left transition-colors hover:bg-muted',
        className,
      )}
    >
      <EmployeeAvatar employee={employee} size="sm" showStatus={false} />
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium leading-tight">
          {employee.full_name}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {subtitle ?? employee.job_title ?? employee.designation_name ?? '—'}
        </span>
      </span>
    </Link>
  );
}

/** CEO → CTO → … → this person. Scrolls sideways on a narrow screen. */
export function ReportingChainRibbon({
  chain,
  employee,
  className,
}: {
  chain: EmployeeBrief[];
  employee: EmployeeBrief;
  className?: string;
}) {
  if (!chain.length) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground',
          className,
        )}
      >
        <UserSquare2 className="h-4 w-4" />
        Top of the organisation — {employee.full_name} reports to nobody.
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-xl border bg-muted/20 p-2', className)}>
      <div className="flex min-w-fit items-center gap-1.5">
        {chain.map((person) => (
          <div key={person.id} className="flex items-center gap-1.5">
            <PersonChip employee={person} />
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        ))}
        <div className="flex min-w-0 items-center gap-2 rounded-lg border-2 border-primary/40 bg-card px-2.5 py-1.5">
          <EmployeeAvatar employee={employee} size="sm" showStatus={false} />
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold leading-tight">
              {employee.full_name}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {employee.job_title || employee.designation_name || '—'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function ReportingPanel({
  info,
  isLoading,
  className,
}: {
  info: ReportingInfo | undefined;
  isLoading?: boolean;
  className?: string;
}) {
  if (isLoading || !info) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="h-16 animate-pulse rounded-xl border bg-muted/40" />
        <div className="h-48 animate-pulse rounded-xl border bg-muted/40" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <ReportingChainRibbon chain={info.management_chain} employee={info.employee} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* -- who they report to ----------------------------------- */}
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            Reports to
          </h3>
          {info.manager ? (
            <div className="space-y-3">
              <Link
                to={personHref(info.manager)}
                className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted"
              >
                <EmployeeAvatar employee={info.manager} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{info.manager.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {info.manager.job_title || info.manager.designation_name || '—'}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5">
                    <LevelChip level={info.manager.hierarchy_level} />
                    <span className="truncate text-[11px] text-muted-foreground">
                      {info.manager.department_name || '—'}
                    </span>
                  </p>
                </div>
              </Link>
              {info.managers_manager && (
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    And above them
                  </p>
                  <PersonChip employee={info.managers_manager} />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nobody — this is a top-level position.
            </p>
          )}

          {info.department_path.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Department path
              </p>
              <p className="text-sm">{info.department_path.join(' › ')}</p>
            </div>
          )}
        </section>

        {/* -- their team ------------------------------------------- */}
        <section className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
          <h3 className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Direct reports
            </span>
            <TeamCount direct={info.direct_report_count} total={info.subordinate_count} />
          </h3>

          {info.direct_reports.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No direct reports. {info.employee.is_manager ? 'Their team has moved elsewhere.' : ''}
            </p>
          ) : (
            <ul className="divide-y">
              {info.direct_reports.map((report) => (
                <li key={report.id}>
                  <Link
                    to={personHref(report)}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                  >
                    <EmployeeAvatar employee={report} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{report.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {report.job_title || report.designation_name || '—'}
                        {report.department_name ? ` · ${report.department_name}` : ''}
                      </p>
                    </div>
                    {report.direct_report_count > 0 && (
                      <TeamCount direct={report.direct_report_count} />
                    )}
                    <StatusChip
                      status={report.employment_status}
                      label={report.status_display}
                      className="hidden sm:inline-flex"
                    />
                    <span className="w-24 text-right">
                      <SalaryValue salary={report.salary} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* -- peers ------------------------------------------------- */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <UserSquare2 className="h-4 w-4 text-muted-foreground" />
          Peers
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Everyone else reporting to the same manager.
        </p>
        {info.peers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {info.manager ? 'The only person on this team.' : 'A top-level position has no peers.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {info.peers.map((peer) => (
              <PersonChip key={peer.id} employee={peer} className="max-w-[220px]" />
            ))}
          </div>
        )}
      </section>

      {info.subordinate_count === 0 && info.direct_report_count === 0 && !info.manager && (
        <EmptyState
          icon={Users}
          title="Not connected to the tree yet"
          hint="Give this employee a reporting manager, or a team, and their place in the organisation appears here."
        />
      )}
    </div>
  );
}
