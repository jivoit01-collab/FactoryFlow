import { Network, Pencil, Plus, Save, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { confirmDialog, PageLoadError } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useOrgChart, useSaveOrgChart } from '../api';
import { DepartmentCard } from '../components/DepartmentCard';
import { ORG_LEVELS } from '../components/levels';
import type { OrgChartSavePayload, OrgDepartmentBlock, OrgDepartmentDraft } from '../types';

/**
 * Department Ownership Flow — who owns each function, who is level-01 support
 * behind them, and who is level-02.
 *
 * The whole chart is edited at once and saved once: renaming a function, moving
 * a row and swapping two owners is one sitting, and one Save. Until Save is
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

/** Server chart → editable draft. Existing rows keep their id and identity. */
function toDrafts(departments: OrgDepartmentBlock[]): OrgDepartmentDraft[] {
  return departments.map((department) => ({
    key: `department-${department.id}`,
    id: department.id,
    name: department.name,
    functions: department.functions.map((row) => ({
      key: `function-${row.id}`,
      id: row.id,
      name: row.name,
      owners: [...row.owners],
      level_1: [...row.level_1],
      level_2: [...row.level_2],
    })),
  }));
}

/** Draft → the payload the API takes. Order on the page is order on the chart. */
function toPayload(departments: OrgDepartmentDraft[]): OrgChartSavePayload {
  return {
    departments: departments.map((department) => ({
      ...(department.id ? { id: department.id } : {}),
      name: department.name.trim(),
      functions: department.functions.map((row) => ({
        ...(row.id ? { id: row.id } : {}),
        name: row.name.trim(),
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
  const [drafts, setDrafts] = useState<OrgDepartmentDraft[] | null>(null);

  const serverDrafts = useMemo(() => (data ? toDrafts(data.departments) : []), [data]);
  const editing = drafts !== null;
  const departments = drafts ?? serverDrafts;

  const isDirty = useMemo(
    () =>
      drafts !== null &&
      JSON.stringify(toPayload(drafts)) !== JSON.stringify(toPayload(serverDrafts)),
    [drafts, serverDrafts],
  );

  const canManage = Boolean(data?.can_manage);

  /** "7 departments · 17 functions · 24 people" — the shape of the chart at a glance. */
  const summary = useMemo(() => {
    const functions = departments.flatMap((department) => department.functions);
    const people = new Set(
      functions.flatMap((row) => [...row.owners, ...row.level_1, ...row.level_2]),
    );
    return [
      `${departments.length} ${departments.length === 1 ? 'department' : 'departments'}`,
      `${functions.length} ${functions.length === 1 ? 'function' : 'functions'}`,
      `${people.size} named`,
    ].join(' · ');
  }, [departments]);

  /** Every edit works on the draft, seeding it from the server on first touch. */
  const editDrafts = (change: (current: OrgDepartmentDraft[]) => OrgDepartmentDraft[]) => {
    setDrafts((current) => change(current ?? serverDrafts));
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
    setDrafts(null);
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
          ? `Its ${department.functions.length} function row(s) go with it. Nothing is saved until you press Save.`
          : 'Nothing is saved until you press Save.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    editDrafts((current) => current.filter((entry) => entry.key !== department.key));
  };

  const save = async () => {
    if (!drafts) return;
    if (drafts.some((department) => !department.name.trim())) {
      toast.error('Every department needs a name.');
      return;
    }
    try {
      await saveChart.mutateAsync(toPayload(drafts));
      setDrafts(null);
      toast.success('Ownership chart saved.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the ownership chart.'));
    }
  };

  if (isError) return <PageLoadError />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <DashboardHeader
        title="Department Ownership Flow"
        description="How each function moves from its owner to its support levels."
      >
        {canManage &&
          (editing ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={cancelEditing} disabled={saveChart.isPending}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={save} disabled={saveChart.isPending || !isDirty}>
                <Save className="mr-2 h-4 w-4" />
                {saveChart.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setDrafts(serverDrafts)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit chart
            </Button>
          ))}
      </DashboardHeader>

      {departments.length > 0 && <p className="-mt-3 text-sm text-muted-foreground">{summary}</p>}

      {isLoading && !data ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading the chart…
          </CardContent>
        </Card>
      ) : (
        <>
          {departments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Network className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  The ownership chart has not been filled in yet.
                </p>
                {canManage && !editing && (
                  <Button variant="outline" onClick={() => setDrafts([])}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Build the chart
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {departments.map((department, index) => (
                <DepartmentCard
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
            </div>
          )}

          {editing && (
            <Button
              variant="outline"
              onClick={() =>
                editDrafts((current) => [
                  ...current,
                  { key: nextKey('new-department'), name: '', functions: [] },
                ])
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add department
            </Button>
          )}

          {/* What each column on the chart actually means. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ORG_LEVELS.map((level) => (
              <Card key={level.key} className="border-dashed">
                <CardContent className="space-y-1.5 p-4">
                  <p
                    className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider ${level.label_tone}`}
                  >
                    <span aria-hidden className={`h-2.5 w-2.5 rounded-full border ${level.chip}`} />
                    {level.label}
                  </p>
                  <p className="text-sm text-muted-foreground">{level.meaning}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default DepartmentOwnershipPage;
