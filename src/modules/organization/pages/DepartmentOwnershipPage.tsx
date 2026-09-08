import { Network, Pencil, Plus, Save, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { confirmDialog, PageLoadError } from '@/shared/components';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useOrgChart, useSaveOrgChart } from '../api';
import { CHART } from '../components/chartTheme';
import { DepartmentRows } from '../components/DepartmentRows';
import { ORG_LEVELS } from '../components/levels';
import type {
  OrgChart,
  OrgChartSavePayload,
  OrgDepartmentBlock,
  OrgDepartmentDraft,
} from '../types';

/**
 * The organizational structure of whichever plant the user is currently in —
 * who leads each section (L1), who supports them (L2), and the team behind
 * them (L3).
 *
 * Drawn as the printed chart it replaces: one table, a rail of numbered
 * departments down the left, five columns across. That is deliberate — people
 * arrive here already knowing the wall chart, and the fastest page is the one
 * that looks like the thing they remember.
 *
 * The whole chart is edited at once and saved once: renaming a section, moving
 * a row and swapping two leaders is one sitting, and one Save. Until Save is
 * pressed nothing has left the browser, so Cancel really does restore the chart
 * as it stands on the server.
 *
 * Only the edit holds local state. Reading the chart renders the server's copy
 * straight through, so a refetch can never fight a draft for the screen.
 */

let draftKeySeed = 0;
function nextKey(prefix: string) {
  draftKeySeed += 1;
  return `${prefix}-${draftKeySeed}`;
}

/** The whole chart while it is being edited: its heading and its blocks. */
interface ChartDraft {
  plant_name: string;
  plant_head: string;
  departments: OrgDepartmentDraft[];
}

/** Server chart → editable draft. Existing rows keep their id and identity. */
function toBlockDrafts(departments: OrgDepartmentBlock[]): OrgDepartmentDraft[] {
  return departments.map((department) => ({
    key: `department-${department.id}`,
    id: department.id,
    name: department.name,
    head: department.head,
    functions: department.functions.map((row) => ({
      key: `function-${row.id}`,
      id: row.id,
      name: row.name,
      subtitle: row.subtitle,
      owners: [...row.owners],
      level_1: [...row.level_1],
      level_2: [...row.level_2],
    })),
  }));
}

const EMPTY_DRAFT: ChartDraft = { plant_name: '', plant_head: '', departments: [] };

/** The server's chart as a draft — the shape both reading and editing use. */
function toDraft(chart: OrgChart | undefined): ChartDraft {
  if (!chart) return EMPTY_DRAFT;
  return {
    plant_name: chart.plant_name,
    plant_head: chart.plant_head,
    departments: toBlockDrafts(chart.departments),
  };
}

/** Draft → the payload the API takes. Order on the page is order on the chart. */
function toPayload(draft: ChartDraft): OrgChartSavePayload {
  return {
    plant_name: draft.plant_name.trim(),
    plant_head: draft.plant_head.trim(),
    departments: draft.departments.map((department) => ({
      ...(department.id ? { id: department.id } : {}),
      name: department.name.trim(),
      head: department.head.trim(),
      functions: department.functions.map((row) => ({
        ...(row.id ? { id: row.id } : {}),
        name: row.name.trim(),
        subtitle: row.subtitle.trim(),
        owners: row.owners,
        level_1: row.level_1,
        level_2: row.level_2,
      })),
    })),
  };
}

function DepartmentOwnershipPage() {
  const { data, isLoading, isError } = useOrgChart();
  const saveChart = useSaveOrgChart();

  /** null = not editing; the chart on screen is the server's. */
  const [draft, setDraft] = useState<ChartDraft | null>(null);

  const serverDraft = useMemo(() => toDraft(data), [data]);
  const editing = draft !== null;
  const chart = draft ?? serverDraft;
  const departments = chart.departments;

  const isDirty = useMemo(
    () =>
      draft !== null &&
      JSON.stringify(toPayload(draft)) !== JSON.stringify(toPayload(serverDraft)),
    [draft, serverDraft],
  );

  const canManage = Boolean(data?.can_manage);

  /** Every edit works on the draft, seeding it from the server on first touch. */
  const editChart = (change: (current: ChartDraft) => ChartDraft) => {
    setDraft((current) => change(current ?? serverDraft));
  };

  const editDrafts = (change: (current: OrgDepartmentDraft[]) => OrgDepartmentDraft[]) => {
    editChart((current) => ({ ...current, departments: change(current.departments) }));
  };

  const cancelEditing = async () => {
    if (isDirty) {
      const discard = await confirmDialog({
        title: 'Discard your changes?',
        description: 'The chart goes back to the version everyone else can see.',
        confirmLabel: 'Discard',
        destructive: true,
      });
      if (!discard) return;
    }
    setDraft(null);
  };

  const moveDepartment = (key: string, direction: -1 | 1) => {
    editDrafts((current) => {
      const position = current.findIndex((department) => department.key === key);
      const target = position + direction;
      if (position < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[position], next[target]] = [next[target], next[position]];
      return next;
    });
  };

  const deleteDepartment = async (department: OrgDepartmentDraft) => {
    const confirmed = await confirmDialog({
      title: `Remove ${department.name || 'this department'}?`,
      description:
        department.functions.length > 0
          ? `Its ${department.functions.length} section(s) go with it. Nothing is saved until you press Save.`
          : 'Nothing is saved until you press Save.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    editDrafts((current) => current.filter((entry) => entry.key !== department.key));
  };

  const save = async () => {
    if (!draft) return;
    if (draft.departments.some((department) => !department.name.trim())) {
      toast.error('Every department needs a name.');
      return;
    }
    try {
      await saveChart.mutateAsync(toPayload(draft));
      setDraft(null);
      toast.success('Ownership chart saved.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the ownership chart.'));
    }
  };

  if (isError) return <PageLoadError />;

  return (
    <div className="p-4 md:p-6">
      <div className={cn('mx-auto max-w-6xl rounded-xl border p-5 md:p-10', CHART.sheet)}>
        {/* Editing lives in the corner; the chart itself is the page. */}
        <div className="mb-2 flex min-h-9 justify-end gap-2">
          {canManage &&
            (editing ? (
              <>
                <Button variant="outline" onClick={cancelEditing} disabled={saveChart.isPending}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={save} disabled={saveChart.isPending || !isDirty}>
                  <Save className="mr-2 h-4 w-4" />
                  {saveChart.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setDraft(serverDraft)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit chart
              </Button>
            ))}
        </div>

        {/* The masthead of the printed chart. */}
        <header className="text-center">
          <p
            className={cn(
              'text-xs font-semibold uppercase tracking-[0.12em]',
              CHART.eyebrow,
            )}
          >
            Organizational structure
          </p>
          {editing ? (
            <div className="mx-auto mt-3 grid max-w-lg gap-3 text-left sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Plant
                </span>
                <Input
                  value={chart.plant_name}
                  onChange={(event) =>
                    editChart((current) => ({ ...current, plant_name: event.target.value }))
                  }
                  placeholder="Plant name"
                  aria-label="Plant name"
                  className="h-9 bg-background"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Plant head
                </span>
                <Input
                  value={chart.plant_head}
                  onChange={(event) =>
                    editChart((current) => ({ ...current, plant_head: event.target.value }))
                  }
                  placeholder="Plant head"
                  aria-label="Plant head"
                  className="h-9 bg-background"
                />
              </label>
            </div>
          ) : (
            <>
              <h1 className="mt-2 font-serif text-4xl font-normal tracking-tight md:text-5xl">
                {chart.plant_name}
              </h1>
              {chart.plant_head && (
                <p className="mt-3 text-[15px] text-muted-foreground">
                  Plant head —{' '}
                  <span className={cn('font-semibold', CHART.departmentName)}>
                    {chart.plant_head}
                  </span>
                </p>
              )}
            </>
          )}
        </header>

        <hr className={cn('mt-8 border-t-2', CHART.rule)} />

        {isLoading && !data ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading the chart…</p>
        ) : departments.length === 0 && !editing ? (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Network className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {chart.plant_name || 'This plant'} has no chart yet.
              </p>
              {canManage && (
                <Button variant="outline" onClick={() => setDraft(serverDraft)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Build the chart
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Five columns will not fold; on a narrow screen the table scrolls. */}
            <div className={cn('mt-8 overflow-x-auto rounded-lg border', CHART.line)}>
              <table className="w-full min-w-[56rem] border-collapse bg-background text-left">
                <thead>
                  <tr className={CHART.headerBand}>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider">
                      Department
                    </th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider">
                      Section
                    </th>
                    {ORG_LEVELS.map((level) => (
                      <th
                        key={level.key}
                        className="p-4 text-xs font-semibold uppercase tracking-wider"
                      >
                        {level.label}
                      </th>
                    ))}
                    {editing && <th className="p-4" />}
                  </tr>
                </thead>
                {departments.map((department, index) => (
                  <DepartmentRows
                    key={department.key}
                    index={index + 1}
                    department={department}
                    editing={editing}
                    isFirst={index === 0}
                    isLast={index === departments.length - 1}
                    onChange={(next) =>
                      editDrafts((current) =>
                        current.map((entry) => (entry.key === department.key ? next : entry)),
                      )
                    }
                    onMove={(direction) => moveDepartment(department.key, direction)}
                    onDelete={() => deleteDepartment(department)}
                  />
                ))}
              </table>
            </div>

            {editing && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() =>
                  editDrafts((current) => [
                    ...current,
                    { key: nextKey('new-department'), name: '', head: '', functions: [] },
                  ])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add department
              </Button>
            )}

            {/* What each of the three people columns means. */}
            <p className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-1 text-center text-[13px] text-muted-foreground">
              {ORG_LEVELS.map((level) => (
                <span key={level.key}>
                  <span className={cn('font-semibold', CHART.leader)}>{level.short}</span> —{' '}
                  {level.legend}
                </span>
              ))}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default DepartmentOwnershipPage;
