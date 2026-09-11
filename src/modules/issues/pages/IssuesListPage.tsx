/**
 * The issue list — the tracker's front door.
 *
 * Laid out the way a GitHub issue list is, because the shape does real work:
 * Open / Closed tabs carrying live counts, one text box that takes both free
 * text and `key:value` qualifiers, and rows dense enough that thirty of them
 * fit on a screen. Each row leads with the state dot, then the title and its
 * labels, then the "#41 opened 3 days ago by Priya" line underneath.
 *
 * The filter lives in the URL, so a filtered list is a link somebody can send.
 */
import { AlertTriangle, CheckCircle2, CircleDot, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ISSUE_PERMISSIONS } from '@/config/permissions';
import { useHasPermission } from '@/core/auth/hooks/usePermission';
import { PaginationControls } from '@/shared/components/PaginationControls';
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn, getErrorMessage } from '@/shared/utils';

import { useBulkIssueState, useIssueMeta, useIssues } from '../api';
import { AvatarStack, LabelChip, PriorityChip, StateIcon } from '../components/IssueBits';
import { IssueFilterBar } from '../components/IssueFilterBar';
import type { IssueListItem, IssueStateFilter } from '../types';
import { exactTime, timeAgo, withQualifier } from '../utils';

export default function IssuesListPage() {
  const canCreate = useHasPermission(ISSUE_PERMISSIONS.CREATE);
  const canTriage = useHasPermission(ISSUE_PERMISSIONS.TRIAGE);

  const [searchParams, setSearchParams] = useSearchParams();
  const state = (searchParams.get('state') as IssueStateFilter) || 'OPEN';
  const sort = searchParams.get('sort') || 'updated';
  const urlQuery = searchParams.get('q') || '';
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('page_size') || 25);

  // The box is typed into freely; only the debounced value reaches the URL and
  // the request, so typing does not fire a query per keystroke.
  const [queryInput, setQueryInput] = useState(urlQuery);
  const debouncedQuery = useDebounce(queryInput, 350);
  const [selected, setSelected] = useState<number[]>([]);

  // A link opened with ?q=… (from a colleague, or the browser's back button)
  // has to load into the box.
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
  }, [debouncedQuery, setSearchParams, urlQuery]);

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

  const filters = useMemo(
    () => ({ q: urlQuery || undefined, state, sort, page, page_size: pageSize }),
    [urlQuery, state, sort, page, pageSize],
  );

  const meta = useIssueMeta();
  const issues = useIssues(filters);
  const bulkState = useBulkIssueState();

  const rows = issues.data?.results ?? [];
  const counts = issues.data?.state_counts ?? { open: 0, closed: 0 };
  const unknown = issues.data?.unknown_qualifiers ?? [];

  function applyQuery(next: string) {
    setQueryInput(next);
    updateParams({ q: next || null, page: null });
  }

  function runBulk(target: 'OPEN' | 'CLOSED', reason?: string) {
    bulkState.mutate(
      { numbers: selected, state: target, reason },
      {
        onSuccess: (result) => {
          toast.success(
            `${result.changed} issue${result.changed === 1 ? '' : 's'} ${
              target === 'CLOSED' ? 'closed' : 'reopened'
            }.`,
          );
          setSelected([]);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nothing was changed.')),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Issues</h1>
          <p className="text-sm text-muted-foreground">
            Problems and requests in this software. Anything broken, confusing or missing goes
            here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canTriage && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/issues/labels">Settings</Link>
            </Button>
          )}
          {canCreate && (
            <Button size="sm" asChild>
              <Link to="/issues/new">
                <Plus className="mr-1.5 h-4 w-4" />
                New issue
              </Link>
            </Button>
          )}
        </div>
      </div>

      <IssueFilterBar
        query={queryInput}
        onQueryChange={applyQuery}
        sort={sort}
        onSortChange={(next) => updateParams({ sort: next, page: null })}
        meta={meta.data}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search issues…  try  is:open label:bug assignee:@me"
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          className="pl-8 pr-9 font-mono text-sm"
        />
        {queryInput && (
          <button
            type="button"
            onClick={() => applyQuery('')}
            className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:bg-muted"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {unknown.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Ignored: <code className="font-mono">{unknown.join(' ')}</code>. Try{' '}
            <code className="font-mono">is:</code>, <code className="font-mono">label:</code>,{' '}
            <code className="font-mono">assignee:</code>, <code className="font-mono">author:</code>,{' '}
            <code className="font-mono">priority:</code>,{' '}
            <code className="font-mono">no:</code> or <code className="font-mono">sort:</code>.
          </span>
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b px-3 py-2 text-sm">
          {canTriage && rows.length > 0 && (
            <Checkbox
              checked={selected.length > 0 && selected.length === rows.length}
              onCheckedChange={(checked) =>
                setSelected(checked ? rows.map((row) => row.number) : [])
              }
            />
          )}

          {selected.length > 0 ? (
            <>
              <span className="font-medium">{selected.length} selected</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={bulkState.isPending}>
                    Mark as
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => runBulk('CLOSED', 'COMPLETED')}>
                    Closed as completed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => runBulk('CLOSED', 'NOT_PLANNED')}>
                    Closed as not planned
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => runBulk('OPEN')}>Open</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear
              </Button>
            </>
          ) : (
            <>
              <StateTab
                active={state === 'OPEN'}
                onClick={() => updateParams({ state: 'OPEN', page: null })}
                icon={<CircleDot className="h-4 w-4" />}
                label={`${counts.open} Open`}
              />
              <StateTab
                active={state === 'CLOSED'}
                onClick={() => updateParams({ state: 'CLOSED', page: null })}
                icon={<CheckCircle2 className="h-4 w-4" />}
                label={`${counts.closed} Closed`}
              />
              <StateTab
                active={state === 'ALL'}
                onClick={() => updateParams({ state: 'ALL', page: null })}
                label={`${counts.open + counts.closed} All`}
              />
            </>
          )}
        </div>

        <CardContent className="p-0">
          {issues.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : issues.isError ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {getErrorMessage(issues.error, 'The issue list could not be loaded.')}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => issues.refetch()}>
                Try again
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              hasFilter={Boolean(urlQuery)}
              onClear={() => applyQuery('')}
              canCreate={canCreate}
            />
          ) : (
            <ul className="divide-y">
              {rows.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  selectable={canTriage}
                  selected={selected.includes(issue.number)}
                  onSelect={(checked) =>
                    setSelected((current) =>
                      checked
                        ? [...current, issue.number]
                        : current.filter((number) => number !== issue.number),
                    )
                  }
                  onLabelClick={(name) => applyQuery(withQualifier(queryInput, 'label', name))}
                />
              ))}
            </ul>
          )}
        </CardContent>

        {issues.data && issues.data.count > 0 && (
          <PaginationControls
            page={issues.data.page}
            pageSize={issues.data.page_size}
            total={issues.data.count}
            totalPages={issues.data.total_pages}
            isLoading={issues.isFetching}
            onPageChange={(next) => updateParams({ page: String(next) })}
            onPageSizeChange={(next) =>
              updateParams({ page_size: String(next), page: null })
            }
          />
        )}
      </Card>
    </div>
  );
}

function StateTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors',
        active ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function IssueRow({
  issue,
  selectable,
  selected,
  onSelect,
  onLabelClick,
}: {
  issue: IssueListItem;
  selectable: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onLabelClick: (labelName: string) => void;
}) {
  return (
    <li className={cn('flex gap-3 px-3 py-2.5 hover:bg-muted/40', selected && 'bg-muted/60')}>
      {selectable && (
        <Checkbox
          className="mt-1"
          checked={selected}
          onCheckedChange={(checked) => onSelect(Boolean(checked))}
        />
      )}
      <StateIcon state={issue.state} reason={issue.state_reason} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/issues/${issue.number}`}
            className="font-medium leading-snug hover:text-primary hover:underline"
          >
            {issue.title}
          </Link>
          {issue.pinned && (
            <span className="rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
              Pinned
            </span>
          )}
          <PriorityChip priority={issue.priority} label={issue.priority_display} />
          {issue.labels.map((label) => (
            <LabelChip key={label.id} label={label} onClick={() => onLabelClick(label.name)} />
          ))}
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          #{issue.number}{' '}
          <span title={exactTime(issue.state === 'OPEN' ? issue.created_at : issue.closed_at)}>
            {issue.state === 'OPEN'
              ? `opened ${timeAgo(issue.created_at)}`
              : `closed ${timeAgo(issue.closed_at)}`}
          </span>
          {issue.author && <> by {issue.author.name}</>}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <AvatarStack users={issue.assignees} />
        {issue.comment_count > 0 && (
          <Link
            to={`/issues/${issue.number}`}
            className="text-xs text-muted-foreground hover:text-foreground"
            title={`${issue.comment_count} comments`}
          >
            💬 {issue.comment_count}
          </Link>
        )}
      </div>
    </li>
  );
}

function EmptyState({
  hasFilter,
  onClear,
  canCreate,
}: {
  hasFilter: boolean;
  onClear: () => void;
  canCreate: boolean;
}) {
  return (
    <div className="p-10 text-center">
      <p className="font-medium">No issues match.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasFilter
          ? 'Nothing here with that filter.'
          : 'Nothing on this tab. That is the good outcome.'}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        {hasFilter && (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear the search
          </Button>
        )}
        {canCreate && (
          <Button size="sm" asChild>
            <Link to="/issues/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New issue
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
