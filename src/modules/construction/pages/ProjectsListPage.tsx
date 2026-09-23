/**
 * The project register — the module's front door.
 *
 * One card per project, each showing the two things that matter at a glance:
 * how much of the budget is gone, and how much of the time. The filter lives
 * in the URL so a filtered list is a link somebody can send.
 */
import { AlertTriangle, Clock, HardHat, Plus, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { CONSTRUCTION_PERMISSIONS } from '@/config/permissions';
import { useHasPermission } from '@/core/auth/hooks/usePermission';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn } from '@/shared/utils';

import { useProjects } from '../api';
import { BudgetBar, ProjectFormDialog, ProjectStatusBadge, TimeBar } from '../components';
import type { ProjectFilters, ProjectStatus } from '../types';

const TABS: { key: string; label: string; status?: string }[] = [
  { key: 'live', label: 'Live', status: 'APPROVED,IN_PROGRESS,ON_HOLD' },
  { key: 'waiting', label: 'Waiting', status: 'DRAFT,PENDING_APPROVAL,REJECTED' },
  { key: 'done', label: 'Finished', status: 'COMPLETED,CANCELLED' },
  { key: 'all', label: 'All' },
];

export default function ProjectsListPage() {
  const canCreate = useHasPermission(CONSTRUCTION_PERMISSIONS.CREATE_PROJECT);
  const [formOpen, setFormOpen] = useState(false);
  //: null while raising a new project, the project's id while resuming a draft.
  const [editingId, setEditingId] = useState<number | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'live';
  const urlSearch = searchParams.get('q') || '';
  const flag = searchParams.get('flag') || '';

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debounced = useDebounce(searchInput, 350);

  // A link opened with ?q=… (or the back button) has to load into the box.
  // Adjusted during render rather than in an effect: an effect would render
  // once with the stale value and again with the fresh one, and these screens
  // run on site phones.
  const [seenUrlSearch, setSeenUrlSearch] = useState(urlSearch);
  if (urlSearch !== seenUrlSearch) {
    setSeenUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }

  useEffect(() => {
    if (debounced === urlSearch) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debounced) next.set('q', debounced);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  }, [debounced, setSearchParams, urlSearch]);

  function setParam(key: string, value: string | null) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }

  const filters: ProjectFilters = {
    status: TABS.find((t) => t.key === tab)?.status,
    search: urlSearch || undefined,
    ...(flag === 'over_budget' ? { over_budget: 'true' as const } : {}),
    ...(flag === 'overdue' ? { overdue: 'true' as const } : {}),
    ...(flag === 'mine' ? { mine: 'true' as const } : {}),
  };

  const { data: projects, isLoading, isError, error } = useProjects(filters);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <HardHat className="h-6 w-6" />
            Construction
          </h1>
          <p className="text-sm text-muted-foreground">
            What the factory is building, what it is costing, and when it finishes.
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditingId(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New project
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setParam('tab', t.key === 'live' ? null : t.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search code or name"
            className="pl-8"
          />
        </div>

        {[
          { key: 'mine', label: 'Mine' },
          { key: 'over_budget', label: 'Over budget' },
          { key: 'overdue', label: 'Late' },
        ].map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setParam('flag', flag === chip.key ? null : chip.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              flag === chip.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>}

      {isError && (
        <Card>
          <CardContent className="flex items-center gap-2 py-6 text-sm text-rose-600">
            <AlertTriangle className="h-4 w-4" />
            Could not load projects. {(error as Error)?.message}
          </CardContent>
        </Card>
      )}

      {projects && projects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <HardHat className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Nothing here</p>
            <p className="text-sm text-muted-foreground">
              {urlSearch || flag
                ? 'No project matches that filter.'
                : 'No construction project has been raised yet.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/*
        One project per row rather than a grid of cards. The same facts either
        way, but a row puts every project's money under every other project's
        money and every timeline under every other timeline, so the page can be
        read down a column instead of hunted around a grid. No header row: the
        bars label themselves ("₹17,000 of ₹20,00,000", "22 Sept → 01 Oct"), and
        a heading saying Budget over a bar that already says so is the same
        sentence twice.
      */}
      {projects && projects.length > 0 && (
        <div className="divide-y overflow-hidden rounded-lg border">
          {projects.map((project) => {
            // A draft is an unfinished form, so it reopens as one. Everything
            // else has a project behind it -- days, spend, papers -- and goes
            // to the page that holds them.
            const isDraft = project.status === 'DRAFT';
            const rowClass =
              'grid w-full grid-cols-1 items-center gap-x-4 gap-y-3 p-3 text-left transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(0,1fr)_8rem_minmax(0,16rem)_minmax(0,16rem)_8rem]';

            const row = (
              <>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{project.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {project.code}
                    {project.location ? ` · ${project.location}` : ''}
                  </p>
                </div>

                <div className="justify-self-start">
                  <ProjectStatusBadge
                    status={project.status as ProjectStatus}
                    label={project.status_display}
                  />
                </div>

                <BudgetBar
                  spent={project.spent_amount}
                  sanctioned={project.sanctioned_budget}
                  percentUsed={project.percent_used}
                  isOver={project.is_over_budget}
                />

                <TimeBar
                  startDate={project.start_date}
                  expectedEnd={project.expected_end_date}
                  actualEnd={project.actual_end_date}
                  daysLeft={project.days_left}
                  isOverdue={project.is_overdue}
                />

                {/* Side by side on a phone, stacked and right-aligned once the
                    row is a real row, so the numbers line up down the page. */}
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground lg:flex-col lg:items-end lg:justify-center lg:gap-0.5">
                  <span className="flex min-w-0 items-center gap-1">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">{project.manager_name ?? '—'}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Number(project.progress_percent).toFixed(0)}% done
                  </span>
                </div>
              </>
            );

            return isDraft ? (
              <button
                key={project.id}
                type="button"
                className={rowClass}
                onClick={() => {
                  setEditingId(project.id);
                  setFormOpen(true);
                }}
                aria-label={`Carry on with the draft ${project.name}`}
              >
                {row}
              </button>
            ) : (
              <Link
                key={project.id}
                to={`/construction/projects/${project.id}`}
                className={rowClass}
              >
                {row}
              </Link>
            );
          })}
        </div>
      )}

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        projectId={editingId}
        onSavedDraft={() => {
          if (tab === 'live' || tab === 'done') setParam('tab', 'waiting');
        }}
      />
    </div>
  );
}
