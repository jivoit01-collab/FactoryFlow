/**
 * The employee directory — the module's front door.
 *
 * Four things stacked, in the order somebody uses them: what the workforce
 * looks like (four tiles), how to narrow it (search and filters), the results
 * (a table or cards), and a pager.
 *
 * The filter lives in the **URL**, so a filtered directory is a link somebody
 * can send: "everyone in QA on probation" is a URL, not a set of instructions.
 * The search box is debounced before it reaches the URL, so typing does not
 * fire a request per keystroke or fill the browser's history with fragments of
 * a name.
 *
 * The table / cards choice is remembered per user in local storage. It is a
 * preference about how somebody reads, not a filter, so it does not belong in
 * the URL — a link shared with a colleague should not change how their
 * directory looks.
 */
import { Building2, Layers, Network, Plus, UserCog, Users } from 'lucide-react';
import { LayoutGrid, Table2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { EMPLOYEE_PERMISSIONS } from '@/config/permissions';
import { useHasPermission } from '@/core/auth/hooks/usePermission';
import { ACCENTS, DashboardError, KpiStat } from '@/shared/components/dashboard';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Button } from '@/shared/components/ui';
import { useDebounce, useLocalStorage } from '@/shared/hooks';

import { useEmployeeMeta, useEmployees } from '../api';
import { EmployeeFilterBar } from '../components/EmployeeFilterBar';
import { EmployeeFormDialog } from '../components/EmployeeFormDialog';
import { EmployeeCardGrid, EmployeeTable } from '../components/EmployeeTable';
import type { EmployeeFilters, EmploymentStatus } from '../types';

/** Params that live in the URL, and how to read them back out of it. */
function filtersFromParams(params: URLSearchParams): EmployeeFilters {
  const numbers = (key: string) =>
    params.getAll(key).map(Number).filter((value) => Number.isFinite(value) && value > 0);
  return {
    q: params.get('q') || undefined,
    department: numbers('department'),
    designation: numbers('designation'),
    manager: params.get('manager') ? Number(params.get('manager')) : undefined,
    status: (params.getAll('status') as EmploymentStatus[]) ?? [],
    level: numbers('level'),
    location: params.get('location') || undefined,
    managers_only: params.get('managers_only') === '1' || undefined,
    top_level_only: params.get('top_level_only') === '1' || undefined,
    joined_from: params.get('joined_from') || undefined,
    joined_to: params.get('joined_to') || undefined,
    salary_min: params.get('salary_min') || undefined,
    salary_max: params.get('salary_max') || undefined,
    include_past: params.get('include_past') === '1' || undefined,
    sort: params.get('sort') || 'name',
    page: Number(params.get('page') || 1),
    page_size: Number(params.get('page_size') || 25),
  };
}

export default function EmployeeDirectoryPage() {
  const navigate = useNavigate();
  const canManage = useHasPermission(EMPLOYEE_PERMISSIONS.MANAGE);
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useLocalStorage<'table' | 'cards'>('employees.directory.view', 'table');
  const [hiring, setHiring] = useState(false);

  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const urlQuery = filters.q ?? '';

  // Typed into freely; only the debounced value reaches the URL and the request.
  const [queryInput, setQueryInput] = useState(urlQuery);
  const debouncedQuery = useDebounce(queryInput, 350);

  useEffect(() => {
    setQueryInput(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (debouncedQuery === urlQuery) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debouncedQuery) next.set('q', debouncedQuery);
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [debouncedQuery, urlQuery, setSearchParams]);

  function applyChanges(changes: Partial<EmployeeFilters>) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => {
        next.delete(key);
        if (value === undefined || value === null || value === '' || value === false) return;
        if (Array.isArray(value)) {
          value.forEach((entry) => next.append(key, String(entry)));
          return;
        }
        next.set(key, value === true ? '1' : String(value));
      });
      return next;
    });
  }

  const meta = useEmployeeMeta();
  const employees = useEmployees(filters);

  const rows = useMemo(() => employees.data?.results ?? [], [employees.data]);
  const permissions = meta.data?.permissions;
  const totals = meta.data;

  if (employees.isError) {
    return (
      <DashboardError
        message="The directory could not be loaded."
        onRetry={() => void employees.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Everyone in the company, who they report to, and — where you are allowed to see
            it — what they are paid.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/employees/chart">
              <Network className="mr-1.5 h-4 w-4" />
              Org chart
            </Link>
          </Button>
          {permissions?.can_view_reports && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/employees/reports">Reports</Link>
            </Button>
          )}
          {canManage && (
            <Button size="sm" onClick={() => setHiring(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add employee
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStat
          icon={Users}
          label="People on the payroll"
          value={totals?.headcount ?? '—'}
          sub={
            employees.data
              ? `${employees.data.count} match the current filter`
              : 'Active, on probation, on leave or suspended'
          }
          accent={ACCENTS.indigo}
        />
        <KpiStat
          icon={UserCog}
          label="Managers"
          value={totals?.managers.length ?? '—'}
          sub="People with a team under them"
          accent={ACCENTS.blue}
          delayMs={60}
        />
        <KpiStat
          icon={Building2}
          label="Departments"
          value={totals?.departments.length ?? '—'}
          sub="Including sub-departments"
          accent={ACCENTS.teal}
          delayMs={120}
          onClick={
            permissions?.can_manage_structure ? () => navigate('/employees/structure') : undefined
          }
        />
        <KpiStat
          icon={Layers}
          label="Designations"
          value={totals?.designations.length ?? '—'}
          sub="Rungs of the ladder"
          accent={ACCENTS.cyan}
          delayMs={180}
          onClick={
            permissions?.can_manage_structure ? () => navigate('/employees/structure') : undefined
          }
        />
      </div>

      <EmployeeFilterBar
        filters={filters}
        onChange={applyChanges}
        onReset={() => setSearchParams(new URLSearchParams())}
        departments={meta.data?.departments ?? []}
        designations={meta.data?.designations ?? []}
        managers={meta.data?.managers ?? []}
        statuses={meta.data?.employment_statuses ?? []}
        statusCounts={employees.data?.status_counts ?? {}}
        canSeeSalary={!!permissions?.salary.any}
        salaryScopeIsAll={!!permissions?.salary.all}
        searchValue={queryInput}
        onSearchChange={setQueryInput}
      />

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-sm text-muted-foreground">
            {employees.isLoading
              ? 'Loading…'
              : `${employees.data?.count ?? 0} employee${
                  employees.data?.count === 1 ? '' : 's'
                }`}
          </p>
          <div className="flex items-center gap-0.5 rounded-md border p-0.5">
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setView('table')}
            >
              <Table2 className="h-3.5 w-3.5" />
              Table
            </Button>
            <Button
              variant={view === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setView('cards')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </Button>
          </div>
        </div>

        <div className={view === 'cards' ? 'p-3' : ''}>
          {view === 'table' ? (
            <EmployeeTable
              employees={rows}
              onOpen={(employee) => navigate(`/employees/${employee.id}`)}
              selfEmployeeId={permissions?.self_employee_id}
              isLoading={employees.isFetching}
            />
          ) : (
            <EmployeeCardGrid
              employees={rows}
              onOpen={(employee) => navigate(`/employees/${employee.id}`)}
              selfEmployeeId={permissions?.self_employee_id}
              isLoading={employees.isFetching}
            />
          )}
        </div>

        {!!employees.data?.count && (
          <PaginationControls
            page={employees.data.page}
            pageSize={employees.data.page_size}
            total={employees.data.count}
            totalPages={employees.data.total_pages}
            isLoading={employees.isFetching}
            onPageChange={(page) => applyChanges({ page })}
            onPageSizeChange={(pageSize) => applyChanges({ page_size: pageSize, page: 1 })}
          />
        )}
      </div>

      {/* Mounted only while open, so the form is empty every time. */}
      {hiring && (
        <EmployeeFormDialog
          open
          onOpenChange={setHiring}
          meta={meta.data}
          onSaved={(employee) => navigate(`/employees/${employee.id}`)}
        />
      )}
    </div>
  );
}
