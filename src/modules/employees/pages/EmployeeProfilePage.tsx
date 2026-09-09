/**
 * One employee, in full.
 *
 * A hero header carrying who they are and where they sit, then four tabs:
 * **Organisation** (manager, chain, reports, peers), **Compensation**,
 * **History** (their career here) and **Audit** (who changed what). The tab
 * lives in the URL so a link can point at somebody's salary history rather than
 * at the top of their profile.
 *
 * The header is where the design does its work. It carries the six facts people
 * come for — name, code, role, department, status, who they report to — and the
 * actions, and it stays legible when half of them are missing (a new joiner
 * with no manager, no photo and no salary is a normal state, not a broken one).
 *
 * Salary is fetched **only when the viewer may see it**, which the meta call
 * already tells us in a way that avoids a 403 on page load: a toast saying
 * "forbidden" every time somebody opens a colleague's profile would be noise
 * they can do nothing about. Instead the tab says plainly that compensation has
 * its own access control.
 *
 * Every action that changes structure goes through its own dialog, so each one
 * carries a reason into the audit trail — and each is offered only to somebody
 * who may perform it, because a button that 403s is worse than no button.
 */
import {
  ArrowUpRight,
  CalendarDays,
  IdCard,
  Mail,
  MapPin,
  Network,
  Pencil,
  Phone,
  ShieldCheck,
  UserCog,
  UserSquare2,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { EMPLOYEE_PERMISSIONS } from '@/config/permissions';
import { useHasPermission } from '@/core/auth/hooks/usePermission';
import { DashboardError } from '@/shared/components/dashboard';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui';

import {
  useEmployee,
  useEmployeeAudit,
  useEmployeeHistory,
  useEmployeeMeta,
  useEmployeeSalary,
  useReporting,
} from '../api';
import { EmployeeAvatar, Field, LevelChip, StatusChip, TeamCount } from '../components/EmployeeBits';
import { EmployeeFormDialog } from '../components/EmployeeFormDialog';
import { AuditTrail, CareerTimeline } from '../components/EmployeeTimeline';
import {
  ChangeDesignationDialog,
  ChangeManagerDialog,
  ChangeStatusDialog,
  PromoteDialog,
  ReviseSalaryDialog,
  TransferDepartmentDialog,
} from '../components/OrgActionDialogs';
import { ReportingPanel } from '../components/ReportingPanel';
import { SalaryPanel } from '../components/SalaryPanel';
import { dateLabel, tenure } from '../utils';

type Dialogs =
  | 'edit'
  | 'manager'
  | 'department'
  | 'designation'
  | 'promote'
  | 'status'
  | 'salary'
  | null;

export default function EmployeeProfilePage() {
  const { employeeId: employeeIdParam } = useParams<{ employeeId: string }>();
  const employeeId = Number(employeeIdParam);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'organisation';
  const [dialog, setDialog] = useState<Dialogs>(null);

  const canManage = useHasPermission(EMPLOYEE_PERMISSIONS.MANAGE);
  const canViewAudit = useHasPermission(EMPLOYEE_PERMISSIONS.VIEW_AUDIT);

  const meta = useEmployeeMeta();
  const employee = useEmployee(employeeId);
  const reporting = useReporting(employeeId);
  const history = useEmployeeHistory(employeeId);
  const audit = useEmployeeAudit(employeeId, canViewAudit && tab === 'audit');

  // `salary === null` on the employee payload is the API saying "not yours to
  // see". Asking for the detail anyway would be a guaranteed 403.
  const salaryVisible = !!employee.data && employee.data.salary !== null;
  const salary = useEmployeeSalary(employeeId, salaryVisible && tab === 'compensation');

  function setTab(next: string) {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      params.set('tab', next);
      return params;
    });
  }

  if (employee.isError) {
    return (
      <DashboardError
        message="That employee could not be loaded. They may belong to another company unit."
        onRetry={() => void employee.refetch()}
      />
    );
  }

  if (employee.isLoading || !employee.data) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-xl border bg-muted/40" />
        <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
      </div>
    );
  }

  const person = employee.data;
  const isSelf = meta.data?.permissions.self_employee_id === person.id;

  return (
    <div className="space-y-4">
      {/* -- the hero header -------------------------------------------- */}
      <header className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-start gap-4 p-4">
          <EmployeeAvatar employee={person} size="xl" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{person.full_name}</h1>
              {isSelf && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                  This is you
                </span>
              )}
              <StatusChip status={person.employment_status} label={person.status_display} />
              <LevelChip level={person.hierarchy_level} />
              {person.is_manager && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <UserCog className="h-3 w-3" />
                  Manager
                </span>
              )}
            </div>

            <p className="mt-0.5 text-sm text-muted-foreground">
              {person.job_title || person.designation_detail?.name || 'No job title recorded'}
              {person.department_detail ? ` · ${person.department_detail.name}` : ''}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
                <IdCard className="h-3.5 w-3.5" />
                {person.employee_code}
              </span>
              {person.email && (
                <a
                  href={`mailto:${person.email}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {person.email}
                </a>
              )}
              {person.phone && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {person.phone}
                </span>
              )}
              {person.location && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {person.location}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Joined {dateLabel(person.joining_date)} · {tenure(person.joining_date)}
              </span>
              {person.exit_date && (
                <span className="flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
                  Last working day {dateLabel(person.exit_date)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/employees/chart?root=${person.id}`}>
                <Network className="mr-1.5 h-4 w-4" />
                On the chart
              </Link>
            </Button>
            {canManage && (
              <>
                <Button variant="outline" size="sm" onClick={() => setDialog('edit')}>
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit
                </Button>
                <Button size="sm" onClick={() => setDialog('promote')}>
                  <ArrowUpRight className="mr-1.5 h-4 w-4" />
                  Promote
                </Button>
              </>
            )}
          </div>
        </div>

        {/* -- the facts, and the actions that change each one ---------- */}
        <dl className="grid gap-4 border-t bg-muted/20 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Reports to">
            {person.manager ? (
              <Link to={`/employees/${person.manager.id}`} className="hover:underline">
                {person.manager.full_name}
              </Link>
            ) : (
              'Top level'
            )}
            {canManage && (
              <button
                type="button"
                onClick={() => setDialog('manager')}
                className="ml-2 text-[11px] font-medium text-primary hover:underline"
              >
                Change
              </button>
            )}
          </Field>
          <Field label="Department">
            {person.department_detail?.name ?? 'Unassigned'}
            {canManage && (
              <button
                type="button"
                onClick={() => setDialog('department')}
                className="ml-2 text-[11px] font-medium text-primary hover:underline"
              >
                Transfer
              </button>
            )}
          </Field>
          <Field label="Designation">
            {person.designation_detail?.name ?? 'Unassigned'}
            {canManage && (
              <button
                type="button"
                onClick={() => setDialog('designation')}
                className="ml-2 text-[11px] font-medium text-primary hover:underline"
              >
                Change
              </button>
            )}
          </Field>
          <Field label="Employment status">
            {person.status_display}
            {canManage && (
              <button
                type="button"
                onClick={() => setDialog('status')}
                className="ml-2 text-[11px] font-medium text-primary hover:underline"
              >
                Change
              </button>
            )}
          </Field>
        </dl>
      </header>

      {/* -- the tabs --------------------------------------------------- */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="organisation" className="gap-1.5">
            <UserSquare2 className="h-3.5 w-3.5" />
            Organisation
            {reporting.data ? (
              <TeamCount
                direct={reporting.data.direct_report_count}
                total={reporting.data.subordinate_count}
              />
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="compensation" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Compensation
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            History
          </TabsTrigger>
          {canViewAudit && (
            <TabsTrigger value="audit" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Audit
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="organisation" className="mt-4">
          <ReportingPanel info={reporting.data} isLoading={reporting.isLoading} />
        </TabsContent>

        <TabsContent value="compensation" className="mt-4">
          <SalaryPanel
            employeeId={person.id}
            data={salary.data}
            restricted={!salaryVisible}
            isLoading={salary.isLoading}
            onRevise={
              meta.data?.permissions.salary.create || meta.data?.permissions.salary.update
                ? () => setDialog('salary')
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold">Career at this company</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Every promotion, transfer, manager change and salary revision, newest first.
              {person.salary === null && ' Salary amounts are hidden — you do not have access to them.'}
            </p>
            <CareerTimeline
              entries={history.data?.results ?? []}
              isLoading={history.isLoading}
            />
          </div>
        </TabsContent>

        {canViewAudit && (
          <TabsContent value="audit" className="mt-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold">Audit trail</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Administrative changes to this employee — who made each one, what it was
                before, and why. Includes who has opened their salary.
              </p>
              <AuditTrail entries={audit.data?.results ?? []} isLoading={audit.isLoading} />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* -- the dialogs ------------------------------------------------
          Mounted only while open, so each one's fields are seeded from this
          employee on the way in and thrown away on the way out. */}
      {dialog === 'edit' && (
        <EmployeeFormDialog
          open
          onOpenChange={(open) => setDialog(open ? 'edit' : null)}
          employee={person}
          meta={meta.data}
        />
      )}
      {dialog === 'manager' && (
        <ChangeManagerDialog
          open
          onOpenChange={(open) => setDialog(open ? 'manager' : null)}
          employee={person}
          meta={meta.data}
        />
      )}
      {dialog === 'department' && (
        <TransferDepartmentDialog
          open
          onOpenChange={(open) => setDialog(open ? 'department' : null)}
          employee={person}
          meta={meta.data}
        />
      )}
      {dialog === 'designation' && (
        <ChangeDesignationDialog
          open
          onOpenChange={(open) => setDialog(open ? 'designation' : null)}
          employee={person}
          meta={meta.data}
        />
      )}
      {dialog === 'promote' && (
        <PromoteDialog
          open
          onOpenChange={(open) => setDialog(open ? 'promote' : null)}
          employee={person}
          meta={meta.data}
          onDone={() => setTab('history')}
        />
      )}
      {dialog === 'status' && (
        <ChangeStatusDialog
          open
          onOpenChange={(open) => setDialog(open ? 'status' : null)}
          employee={person}
          meta={meta.data}
        />
      )}
      {dialog === 'salary' && (
        <ReviseSalaryDialog
          open
          onOpenChange={(open) => setDialog(open ? 'salary' : null)}
          employee={person}
          meta={meta.data}
          current={salary.data?.current}
          onDone={() => setTab('compensation')}
        />
      )}

      <p className="text-center text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => navigate('/employees')}
          className="hover:underline"
        >
          Back to the directory
        </button>
      </p>
    </div>
  );
}
