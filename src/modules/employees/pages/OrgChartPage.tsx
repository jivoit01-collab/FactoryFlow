/**
 * The organisation chart.
 *
 * The whole company by default; one person's organisation when the chart is
 * re-rooted on them, which is what the crosshair on every card does. That
 * re-rooting is the feature that makes the page usable in a real company: the
 * full chart of four thousand people is a shape, while "the CTO's
 * organisation" is a thing somebody can actually read, and a manager arriving
 * from the sidebar wants their own team first.
 *
 * The root lives in the URL (`?root=42`), so a re-rooted chart is a link — the
 * same reasoning as the directory's filters. The chain above the root is drawn
 * as a breadcrumb, so somebody who has drilled into a subtree can always see
 * what they are inside of and step back out.
 *
 * The department filter narrows the *people*, not the tree: anybody whose
 * manager is filtered out becomes a root of their own, so a departmental chart
 * still reads as a chart rather than as a list of orphans. That behaviour lives
 * in the API's forest builder; this page only has to say so.
 */
import { AlertTriangle, ArrowLeft, Building2, Network, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { DashboardError } from '@/shared/components/dashboard';
import {
  Button,
  NativeSelect,
  SelectOption,
  Switch,
} from '@/shared/components/ui';
import { useLocalStorage } from '@/shared/hooks';

import { useEmployeeMeta, useOrgTree } from '../api';
import { EmployeeAvatar } from '../components/EmployeeBits';
import { OrgChart, type OrgChartView } from '../components/OrgChart';
import { treeDepth } from '../utils';

export default function OrgChartPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useLocalStorage<OrgChartView>('employees.chart.view', 'tree');

  const rootId = searchParams.get('root') ? Number(searchParams.get('root')) : undefined;
  const departmentId = searchParams.get('department')
    ? Number(searchParams.get('department'))
    : undefined;
  const includePast = searchParams.get('include_past') === '1';

  const meta = useEmployeeMeta();
  const tree = useOrgTree({ root: rootId, department: departmentId, include_past: includePast });

  const roots = useMemo(() => tree.data?.roots ?? [], [tree.data]);
  const depth = useMemo(() => treeDepth(roots), [roots]);

  function updateParams(changes: Record<string, string | null>) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      });
      return next;
    });
  }

  if (tree.isError) {
    return (
      <DashboardError
        message="The org chart could not be loaded."
        onRetry={() => void tree.refetch()}
      />
    );
  }

  const rootEmployee = tree.data?.root_employee;
  const chain = tree.data?.chain_to_root ?? [];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Org chart</h1>
          <p className="text-sm text-muted-foreground">
            Who reports to whom, from the top down. Click a card to open somebody; use the
            crosshair to see just their organisation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/employees">
              <Users className="mr-1.5 h-4 w-4" />
              Directory
            </Link>
          </Button>
        </div>
      </header>

      {/* -- what is being charted --------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
        {rootEmployee ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateParams({ root: null })}
              className="gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Whole company
            </Button>
            {chain.length > 0 && (
              <nav aria-label="Path to this part of the chart" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                {chain.map((person) => (
                  <span key={person.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateParams({ root: String(person.id) })}
                      className="rounded px-1 py-0.5 hover:bg-muted hover:text-foreground"
                    >
                      {person.full_name}
                    </button>
                    <span aria-hidden="true">›</span>
                  </span>
                ))}
              </nav>
            )}
            <span className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2 py-1">
              <EmployeeAvatar employee={rootEmployee} size="sm" showStatus={false} />
              <span className="text-sm font-semibold">{rootEmployee.full_name}</span>
              <span className="text-xs text-muted-foreground">
                {rootEmployee.job_title || rootEmployee.designation_name || '—'}
              </span>
            </span>
          </div>
        ) : (
          <p className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <Network className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{tree.data?.total ?? 0} people</span>
            <span className="text-muted-foreground">
              across {roots.length} top-level position{roots.length === 1 ? '' : 's'} and{' '}
              {depth} level{depth === 1 ? '' : 's'}
            </span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            className="w-[190px]"
            aria-label="Filter the chart by department"
            value={departmentId ? String(departmentId) : ''}
            onChange={(event) => updateParams({ department: event.target.value || null })}
          >
            <SelectOption value="">Every department</SelectOption>
            {(meta.data?.departments ?? []).map((department) => (
              <SelectOption key={department.id} value={String(department.id)}>
                {department.name}
              </SelectOption>
            ))}
          </NativeSelect>

          <label
            htmlFor="chart-include-past"
            className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground"
          >
            Include people who have left
            <Switch
              id="chart-include-past"
              checked={includePast}
              onChange={(checked) => updateParams({ include_past: checked ? '1' : null })}
            />
          </label>
        </div>
      </div>

      {departmentId && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/5 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <Building2 className="mr-1 inline h-3.5 w-3.5" />
            Only this department&apos;s people are shown, so anybody whose manager sits
            elsewhere appears as a top-level card here. The reporting lines themselves have not
            changed.
          </span>
        </p>
      )}

      {tree.isLoading ? (
        <div className="h-[420px] animate-pulse rounded-xl border bg-muted/40" />
      ) : (
        <OrgChart
          roots={roots}
          view={view}
          onViewChange={setView}
          rootId={rootId ?? null}
          selfEmployeeId={meta.data?.permissions.self_employee_id}
          onOpen={(node) => navigate(`/employees/${node.id}`)}
          onFocus={(node) => updateParams({ root: String(node.id) })}
        />
      )}
    </div>
  );
}
