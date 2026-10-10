/**
 * The civil works sheet — "JIVO CIVIL PROJECTS 2026" kept here instead of in
 * Excel.
 *
 * Laid out the way the sheet is, because that is what the site already reads:
 * projects numbered 1, 2, 3, the works under each lettered A, B, C, and for
 * every row its area, status, expected start and finish, days, and the area a
 * day has to get through. Kept as a table on a phone too — it scrolls sideways
 * rather than turning into cards, so a row still reads across like the sheet.
 *
 * Projects open collapsed: the first read is one line per project — how many
 * of its works are done, its earliest start and latest finish — and a project's
 * works are a click away.
 *
 * No approval and no money. That is Projects; this is only the schedule.
 */
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Ellipsis,
  LandPlot,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { CONSTRUCTION_PERMISSIONS } from '@/config/permissions';
import { useHasPermission } from '@/core/auth/hooks/usePermission';
import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useCivilWorkMutation, useCivilWorks } from '../api';
import { CivilStatusBadge, CivilWorkFormDialog, ConfirmDialog } from '../components';
import type { CivilProject, CivilWork } from '../types';
import { AREA_UNIT_LABELS, formatArea, formatSheetDate, sheetLetter } from '../utils';

type Editing = { work: CivilWork | null; parent: { id: number; name: string } | null };

/** The earliest start and latest finish across a project's works. */
function spanOf(works: CivilWork[]) {
  const starts = works.map((work) => work.start_date).filter((d): d is string => !!d);
  const ends = works.map((work) => work.end_date).filter((d): d is string => !!d);
  return {
    start: starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : null,
    end: ends.length ? ends.reduce((a, b) => (a > b ? a : b)) : null,
  };
}

export default function CivilWorksPage() {
  const canEdit = useHasPermission(CONSTRUCTION_PERMISSIONS.EDIT_CIVIL_WORKS);
  const { data: projects, isLoading, isError, error } = useCivilWorks();
  const mutation = useCivilWorkMutation();

  const [editing, setEditing] = useState<Editing | null>(null);
  const [removing, setRemoving] = useState<CivilWork | CivilProject | null>(null);
  //: Projects whose works are showing. Empty to start: everything collapsed.
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  function toggle(projectId: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  /** Opens the project too, so the new work is in view once it is saved. */
  function addWorkUnder(project: CivilProject) {
    setExpanded((current) => new Set(current).add(project.id));
    setEditing({ work: null, parent: { id: project.id, name: project.name } });
  }

  // The rows that are actual jobs: every work, and every project with none
  // under it. A project heading over five works is not a sixth job.
  const jobs = (projects ?? []).flatMap((project) =>
    project.works.length ? project.works : [project],
  );
  const counts = {
    projects: projects?.length ?? 0,
    inProgress: jobs.filter((job) => job.status === 'IN_PROGRESS').length,
    complete: jobs.filter((job) => job.status === 'COMPLETE').length,
    late: jobs.filter((job) => job.is_late).length,
    lateStart: jobs.filter((job) => job.is_late_start).length,
  };
  const everyRow = (projects ?? []).flatMap((project) => [project, ...project.works]);
  const lastChange = everyRow.reduce<string | null>(
    (latest, row) => (!latest || row.updated_at > latest ? row.updated_at : latest),
    null,
  );
  const withWorks = (projects ?? []).filter((project) => project.works.length > 0);
  const allOpen = withWorks.length > 0 && withWorks.every((project) => expanded.has(project.id));
  const contractors = [
    ...new Set(everyRow.map((row) => row.contractor.trim()).filter(Boolean)),
  ].sort();

  async function move(work: CivilWork, direction: 'up' | 'down') {
    try {
      await mutation.mutateAsync({ action: 'move', id: work.id, direction });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not move that row.'));
    }
  }

  function rowMenu(work: CivilWork, isFirst: boolean, isLast: boolean, project?: CivilProject) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`More for ${work.name}`}
          >
            <Ellipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing({ work, parent: null })}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          {project && (
            <DropdownMenuItem onSelect={() => addWorkUnder(project)}>
              <Plus className="mr-2 h-4 w-4" />
              Add a work under it
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={isFirst} onSelect={() => move(work, 'up')}>
            <ArrowUp className="mr-2 h-4 w-4" />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isLast} onSelect={() => move(work, 'down')}>
            <ArrowDown className="mr-2 h-4 w-4" />
            Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-rose-600 focus:text-rose-600"
            onSelect={() => setRemoving(project ?? work)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  /** The cells every row shares, from Area to Remarks. */
  function rowCells(work: CivilWork, summary?: { done: number; total: number; late: number }) {
    const span = summary && 'works' in work ? spanOf((work as CivilProject).works) : null;
    const start = work.start_date ?? span?.start ?? null;
    const end = work.end_date ?? span?.end ?? null;
    const derived = (own: string | null) => !own && !!span;
    const unit = AREA_UNIT_LABELS[work.area_unit];

    return (
      <>
        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
          {work.area !== null ? (
            <>
              {formatArea(work.area)} <span className="text-xs text-muted-foreground">{unit}</span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-2">
          {summary ? (
            <span className="text-xs whitespace-nowrap text-muted-foreground">
              {summary.done} of {summary.total} complete
              {summary.late > 0 && (
                <span className="font-medium text-rose-600"> · {summary.late} late</span>
              )}
            </span>
          ) : (
            <CivilStatusBadge status={work.status} />
          )}
          {work.stage && <p className="mt-0.5 text-xs text-muted-foreground">{work.stage}</p>}
        </td>
        <td
          className={cn(
            'px-3 py-2 whitespace-nowrap tabular-nums',
            derived(work.start_date) && 'text-muted-foreground italic',
            work.is_late_start && 'font-medium text-amber-600',
          )}
          title={
            work.is_late_start
              ? 'Should have started by now'
              : derived(work.start_date)
                ? 'Earliest start among its works'
                : undefined
          }
        >
          {formatSheetDate(start)}
        </td>
        <td
          className={cn(
            'px-3 py-2 whitespace-nowrap tabular-nums',
            derived(work.end_date) && 'text-muted-foreground italic',
            work.is_late && 'font-medium text-rose-600',
          )}
          title={
            work.is_late
              ? 'Past its finish date'
              : derived(work.end_date)
                ? 'Latest finish among its works'
                : undefined
          }
        >
          {formatSheetDate(end)}
          {work.is_late && <span className="ml-1 text-xs">late</span>}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">{work.days ?? '—'}</td>
        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
          {work.per_day !== null ? (
            <>
              {formatArea(work.per_day)}{' '}
              <span className="text-xs text-muted-foreground">{unit}</span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-2">
          {work.contractor || <span className="text-muted-foreground">—</span>}
        </td>
        <td className="max-w-[18rem] px-3 py-2 text-xs text-muted-foreground">
          <span className="line-clamp-3" title={work.remarks || undefined}>
            {work.remarks}
          </span>
        </td>
      </>
    );
  }

  function nameCell(work: CivilWork, bold: boolean) {
    const label = <span className={cn(bold && 'font-semibold')}>{work.name}</span>;
    return (
      <td className="px-3 py-2">
        {canEdit ? (
          <button
            type="button"
            className="text-left hover:underline"
            onClick={() => setEditing({ work, parent: null })}
          >
            {label}
          </button>
        ) : (
          label
        )}
      </td>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <LandPlot className="h-6 w-6" />
            Civil Works
          </h1>
          <p className="text-sm text-muted-foreground">
            Every civil project, the works under it, how much area each covers, and when it should
            start and finish.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setEditing({ work: null, parent: null })}>
            <Plus className="mr-1.5 h-4 w-4" />
            New project
          </Button>
        )}
      </div>

      {projects && projects.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{counts.projects}</span>{' '}
            {counts.projects === 1 ? 'project' : 'projects'}
          </span>
          <span>
            <span className="font-medium text-foreground">{counts.inProgress}</span> in progress
          </span>
          <span>
            <span className="font-medium text-foreground">{counts.complete}</span> of {jobs.length}{' '}
            complete
          </span>
          {counts.late > 0 && (
            <span className="font-medium text-rose-600">{counts.late} past their finish</span>
          )}
          {counts.lateStart > 0 && (
            <span className="font-medium text-amber-600">
              {counts.lateStart} should have started
            </span>
          )}
          <span className="ml-auto flex items-center gap-3">
            {withWorks.length > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-foreground hover:underline"
                onClick={() =>
                  setExpanded(allOpen ? new Set() : new Set(withWorks.map((p) => p.id)))
                }
              >
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            )}
            {lastChange && (
              <span className="text-xs">
                Last changed{' '}
                {new Date(lastChange).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </span>
        </div>
      )}

      {isLoading && <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>}

      {isError && (
        <Card>
          <CardContent className="flex items-center gap-2 py-6 text-sm text-rose-600">
            <AlertTriangle className="h-4 w-4" />
            Could not load the sheet. {(error as Error)?.message}
          </CardContent>
        </Card>
      )}

      {projects && projects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <LandPlot className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">The sheet is empty</p>
            <p className="text-sm text-muted-foreground">
              {canEdit
                ? 'Add the first project, then the works under it.'
                : 'No civil project has been put on it yet.'}
            </p>
          </CardContent>
        </Card>
      )}

      {projects && projects.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-16 px-3 py-2 font-medium">Sr</th>
                <th className="min-w-[14rem] px-3 py-2 font-medium">Project / work</th>
                <th className="px-3 py-2 text-right font-medium">Area</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Start</th>
                <th className="px-3 py-2 font-medium">Finish</th>
                <th className="px-3 py-2 text-right font-medium">Days</th>
                <th className="px-3 py-2 text-right font-medium">Per day</th>
                <th className="px-3 py-2 font-medium">Contractor</th>
                <th className="px-3 py-2 font-medium">Remarks</th>
                {canEdit && <th className="w-12 px-1 py-2" aria-label="Actions" />}
              </tr>
            </thead>
            {projects.map((project, projectIndex) => {
              const summary = project.works.length
                ? {
                    done: project.works.filter((work) => work.status === 'COMPLETE').length,
                    total: project.works.length,
                    late: project.works.filter((work) => work.is_late).length,
                  }
                : undefined;
              // A project that is one job in itself (its own area or dates, no
              // works) gets its works from the row menu; the line below is for
              // projects that hold works, or are still an empty heading.
              const isOwnJob =
                project.works.length === 0 &&
                (project.area !== null ||
                  !!project.start_date ||
                  !!project.end_date ||
                  project.days !== null);
              const isOpen = expanded.has(project.id);
              return (
                <tbody key={project.id} className="border-t">
                  <tr className="bg-muted/30 align-top">
                    {project.works.length > 0 ? (
                      <td className="px-1 py-1">
                        <button
                          type="button"
                          onClick={() => toggle(project.id)}
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? 'Hide' : 'Show'} the works under ${project.name}`}
                          className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 font-semibold tabular-nums hover:bg-muted"
                        >
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 text-muted-foreground transition-transform',
                              isOpen && 'rotate-90',
                            )}
                          />
                          {projectIndex + 1}
                        </button>
                      </td>
                    ) : (
                      <td className="py-2 pl-7 pr-3 font-semibold tabular-nums">
                        {projectIndex + 1}
                      </td>
                    )}
                    {nameCell(project, true)}
                    {rowCells(project, summary)}
                    {canEdit && (
                      <td className="px-1 py-1 text-right">
                        {rowMenu(
                          project,
                          projectIndex === 0,
                          projectIndex === projects.length - 1,
                          project,
                        )}
                      </td>
                    )}
                  </tr>
                  {isOpen &&
                    project.works.map((work, workIndex) => (
                      <tr key={work.id} className="border-t border-dashed align-top">
                        <td className="py-2 pl-9 pr-3 text-muted-foreground">
                          {sheetLetter(workIndex)}
                        </td>
                        {nameCell(work, false)}
                        {rowCells(work)}
                        {canEdit && (
                          <td className="px-1 py-1 text-right">
                            {rowMenu(work, workIndex === 0, workIndex === project.works.length - 1)}
                          </td>
                        )}
                      </tr>
                    ))}
                  {/* Under an open project, or an empty heading with nothing to open yet. */}
                  {canEdit && !isOwnJob && (isOpen || project.works.length === 0) && (
                    <tr>
                      <td />
                      <td colSpan={10} className="px-3 pb-2 pt-0.5">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => addWorkUnder(project)}
                        >
                          <Plus className="h-3 w-3" />
                          Add a work under {project.name}
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </table>
        </div>
      )}

      <CivilWorkFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        work={editing?.work ?? null}
        parent={editing?.parent ?? null}
        contractors={contractors}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.name ?? ''}?`}
        description={
          removing && 'works' in removing && removing.works.length > 0
            ? `Takes it off the sheet along with the ${removing.works.length} ${removing.works.length === 1 ? 'work' : 'works'} under it.`
            : 'Takes it off the sheet.'
        }
        confirmLabel="Remove"
        successMessage="Removed from the sheet"
        errorMessage="Could not remove it."
        onConfirm={() =>
          removing ? mutation.mutateAsync({ action: 'remove', id: removing.id }) : Promise.resolve()
        }
      />
    </div>
  );
}
