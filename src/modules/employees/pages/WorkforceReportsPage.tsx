/**
 * Workforce reporting: headcount, structure, and — for whoever may see it —
 * money.
 *
 * Laid out as answers, not as a wall of charts. Five tiles carry the numbers
 * that are single numbers (a chart of one value is never a chart), then the
 * distributions that are genuinely comparisons, then the trend, then the
 * salary half.
 *
 * Two things are worth saying about that salary half.
 *
 * **It is drawn only for a viewer with salary access, over exactly the people
 * they may see.** The API says which — `scope: 'all'` or `'partial'` — and the
 * page labels the figures accordingly. A department head's payroll total is
 * their department's, and a page that let them read it as the company's would
 * be worse than one that showed them nothing.
 *
 * **Every chart's numbers are also on the page as text.** The department bars
 * carry their values at the tip, the distribution its counts, the salary table
 * its rupees. Nothing here is gated behind hovering, and the page survives
 * being printed in black and white — which also satisfies the contrast relief
 * the third series colour needs in light mode.
 */
import {
  Building2,
  CalendarClock,
  Layers,
  Network,
  TrendingDown,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ACCENTS, DashboardError, KpiStat } from '@/shared/components/dashboard';
import { Button, Switch } from '@/shared/components/ui';

import { useWorkforceReports } from '../api';
import {
  ChartCard,
  CountBarChart,
  DistributionChart,
  HeadcountTrendChart,
  TeamSizeBars,
} from '../components/charts';
import { EmptyState, StatusChip } from '../components/EmployeeBits';
import { money, moneyShort } from '../utils';

export default function WorkforceReportsPage() {
  const [includePast, setIncludePast] = useState(false);
  const reports = useWorkforceReports(includePast);

  if (reports.isError) {
    return (
      <DashboardError
        message="The workforce reports could not be loaded."
        onRetry={() => void reports.refetch()}
      />
    );
  }

  if (reports.isLoading || !reports.data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl border bg-muted/40" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl border bg-muted/40" />
      </div>
    );
  }

  const { totals, by_department: byDepartment, by_designation: byDesignation } = reports.data;
  const { by_level: byLevel, by_status: byStatus, by_manager: byManager } = reports.data;
  const salary = reports.data.salary;
  const turnover = reports.data.turnover;

  // Joins and exits share a scale (both are counts of people), so they belong
  // on one axis in one chart rather than two charts side by side.
  const trend = reports.data.joining_trend.map((month, index) => ({
    label: month.label,
    joined: month.joined,
    exits: turnover.series[index]?.exits ?? 0,
  }));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workforce reports</h1>
          <p className="text-sm text-muted-foreground">
            Headcount by department, designation and level; joining and turnover trends; and
            salary distribution where you have access to it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="reports-include-past"
            className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground"
          >
            Include people who have left
            <Switch
              id="reports-include-past"
              checked={includePast}
              onChange={setIncludePast}
            />
          </label>
          <Button variant="outline" size="sm" asChild>
            <Link to="/employees">Directory</Link>
          </Button>
        </div>
      </header>

      {/* -- the single numbers ----------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiStat
          icon={Users}
          label="Total employees"
          value={totals.headcount}
          sub={`${totals.joined_this_year} joined this year`}
          accent={ACCENTS.indigo}
        />
        <KpiStat
          icon={UserCog}
          label="Managers"
          value={totals.managers_with_reports}
          sub={`Average team of ${totals.average_team_size}`}
          accent={ACCENTS.blue}
          delayMs={60}
        />
        <KpiStat
          icon={Network}
          label="Levels deep"
          value={totals.levels_deep}
          sub={`${totals.top_level} top-level position(s)`}
          accent={ACCENTS.sky}
          delayMs={120}
        />
        <KpiStat
          icon={Building2}
          label="Departments"
          value={totals.departments}
          sub={`${totals.designations} designations`}
          accent={ACCENTS.teal}
          delayMs={180}
        />
        <KpiStat
          icon={TrendingDown}
          label="Turnover, 12 months"
          value={`${turnover.rate_percent}%`}
          sub={`${turnover.exits_12m} left, ${turnover.in_service} still here`}
          accent={ACCENTS.amber}
          delayMs={240}
        />
      </div>

      {/* -- the distributions ------------------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Employees by department"
          subtitle="People assigned directly to each department"
        >
          {byDepartment.length ? (
            <CountBarChart
              rows={byDepartment.map((row) => ({ name: row.name, count: row.count }))}
            />
          ) : (
            <EmptyState icon={Building2} title="No departments yet" className="border-0" />
          )}
        </ChartCard>

        <ChartCard
          title="Employees by designation"
          subtitle="Ordered by the rung's level, most senior first"
        >
          {byDesignation.length ? (
            <CountBarChart
              rows={byDesignation.map((row) => ({ name: row.name, count: row.count }))}
            />
          ) : (
            <EmptyState icon={Layers} title="No designations yet" className="border-0" />
          )}
        </ChartCard>

        <ChartCard
          title="Employees by hierarchy level"
          subtitle="Reporting hops from the top — the shape of the company"
        >
          <CountBarChart
            rows={byLevel.map((row) => ({ name: `Level ${row.level}`, count: row.count }))}
          />
        </ChartCard>

        <ChartCard
          title="Employment status"
          subtitle="Everybody on record, including people who have left"
        >
          <ul className="space-y-2">
            {byStatus.map((row) => (
              <li key={row.status} className="flex items-center gap-3">
                <StatusChip status={row.status} label={row.label} />
                <span className="h-px flex-1 bg-border" />
                <span className="text-sm font-semibold tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      {/* -- the trend --------------------------------------------------- */}
      <ChartCard
        title="Joining and leaving, last 12 months"
        subtitle="Both are counts of people, so both sit on one axis"
      >
        <HeadcountTrendChart rows={trend} />
      </ChartCard>

      {/* -- manager team sizes ------------------------------------------ */}
      <ChartCard
        title="Team size by manager"
        subtitle="Their direct reports, and everybody further down their organisation"
      >
        {byManager.length ? (
          <TeamSizeBars rows={byManager} />
        ) : (
          <EmptyState
            icon={UserCog}
            title="Nobody has a team yet"
            hint="Once employees have a reporting manager, team sizes appear here."
            className="border-0"
          />
        )}
      </ChartCard>

      {/* -- money ------------------------------------------------------- */}
      {salary.visible ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Wallet className="h-4 w-4" />
              Compensation
            </h2>
            <p className="text-xs text-muted-foreground">
              {salary.scope === 'all'
                ? 'Across the whole company.'
                : 'Across the employees you have salary access to — not the whole company.'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiStat
              icon={Wallet}
              label="Annual payroll"
              value={moneyShort(salary.total_payroll, salary.currency)}
              sub={`${salary.people_with_salary} employee(s) with a salary on record`}
              accent={ACCENTS.emerald}
            />
            <KpiStat
              icon={Users}
              label="Average"
              value={moneyShort(salary.average, salary.currency)}
              sub={`Median ${moneyShort(salary.median, salary.currency)}`}
              accent={ACCENTS.cyan}
              delayMs={60}
            />
            <KpiStat
              icon={TrendingDown}
              label="Range"
              value={moneyShort(salary.lowest, salary.currency)}
              sub={`up to ${moneyShort(salary.highest, salary.currency)}`}
              accent={ACCENTS.violet}
              delayMs={120}
            />
            <KpiStat
              icon={CalendarClock}
              label="Awaiting approval"
              value={salary.pending_approvals ?? 0}
              sub="Revisions not yet in force"
              accent={ACCENTS.amber}
              delayMs={180}
              onClick={undefined}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Salary distribution"
              subtitle="Annual compensation, in fixed bands so months can be compared"
            >
              {salary.distribution?.length ? (
                <DistributionChart rows={salary.distribution} />
              ) : (
                <EmptyState icon={Wallet} title="No salaries on record" className="border-0" />
              )}
            </ChartCard>

            <ChartCard
              title="Department-wise salary"
              subtitle="Total and average annual compensation"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="py-1.5 font-medium">
                        Department
                      </th>
                      <th scope="col" className="py-1.5 text-right font-medium">
                        People
                      </th>
                      <th scope="col" className="py-1.5 text-right font-medium">
                        Total
                      </th>
                      <th scope="col" className="py-1.5 text-right font-medium">
                        Average
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(salary.by_department ?? []).map((row) => (
                      <tr key={row.id ?? row.name} className="border-b last:border-0">
                        <td className="py-1.5">{row.name}</td>
                        <td className="py-1.5 text-right tabular-nums">{row.people}</td>
                        <td className="py-1.5 text-right font-medium tabular-nums">
                          {money(row.total, salary.currency)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                          {money(row.average, salary.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>

          <ChartCard
            title="Salary revisions by type"
            subtitle="Why pay has changed, across every revision on record"
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to="/employees/compensation">Open the revision log</Link>
              </Button>
            }
          >
            {salary.revisions_by_type?.length ? (
              <CountBarChart
                rows={salary.revisions_by_type.map((row) => ({
                  name: row.label,
                  count: row.count,
                }))}
                valueLabel="Revisions"
              />
            ) : (
              <EmptyState icon={Wallet} title="No revisions recorded yet" className="border-0" />
            )}
          </ChartCard>
        </section>
      ) : (
        <EmptyState
          icon={Wallet}
          title="Salary reporting is restricted"
          hint="Compensation figures have their own access control, separate from headcount reporting. Ask HR if you need them for your work."
        />
      )}
    </div>
  );
}
