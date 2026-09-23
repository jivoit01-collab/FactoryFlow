/**
 * One project: the header everything hangs off, plus three tabs.
 *
 * The header is a budget bar and a time bar side by side, because over budget
 * and over time are the two things worth seeing at once. When either goes red
 * the button that fixes it appears beside it — that is the loop closing itself
 * rather than a dashboard that only scolds.
 */
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Send,
  Table2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
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
  DropdownMenuTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import type { ProjectAction } from '../api';
import type { ProjectRevision } from '../types';

/** One line putting the figures in front of the decider. */
function revisionSummary(revision: ProjectRevision): string {
  const parts: string[] = [];
  if (Number(revision.additional_amount) > 0) {
    parts.push(`${formatMoney(revision.budget_before)} → ${formatMoney(revision.budget_after)}`);
  }
  if (revision.extension_days > 0) {
    parts.push(
      `${formatShortDate(revision.end_date_before)} → ${formatShortDate(
        revision.end_date_after,
      )} (+${revision.extension_days}d)`,
    );
  }
  return parts.join(' · ');
}
import {
  useDailyLogs,
  useExpenseBatches,
  useProject,
  useProjectAction,
  useProjectSummary,
  useRevisionDecision,
  useRevisions,
  useSpendSummary,
} from '../api';
import {
  AttachmentsPanel,
  BudgetBar,
  ConfirmDialog,
  DailyLogTable,
  DayEntryDialog,
  type Decision,
  DecisionDialog,
  EstimateSheetDialog,
  ExpensesPanel,
  ProjectFormDialog,
  ProjectStatusBadge,
  RevisionDialog,
  RevisionStatusBadge,
  Stat,
  TimeBar,
} from '../components';
import {
  CATEGORY_LABELS,
  CATEGORY_TINTS,
  formatDate,
  formatDimensions,
  formatMoney,
  formatShortDate,
  todayISO,
} from '../utils';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'daily';

  const canEdit = useHasPermission(CONSTRUCTION_PERMISSIONS.EDIT_PROJECT);
  const canApprove = useHasPermission(CONSTRUCTION_PERMISSIONS.APPROVE_PROJECT);
  const canClose = useHasPermission(CONSTRUCTION_PERMISSIONS.CLOSE_PROJECT);
  const canLog = useHasPermission(CONSTRUCTION_PERMISSIONS.LOG_DAILY_WORK);
  const canCreate = useHasPermission(CONSTRUCTION_PERMISSIONS.CREATE_PROJECT);
  const canSpend = useHasPermission(CONSTRUCTION_PERMISSIONS.RECORD_EXPENSE);

  const { data: project, isLoading } = useProject(id);
  const { data: summary } = useProjectSummary(id);
  const { data: logs } = useDailyLogs(id);
  // The panel below fetches this too; TanStack serves both from one request.
  const { data: batchData } = useExpenseBatches(id);
  const { data: revisions } = useRevisions(id);
  const { data: spend } = useSpendSummary(id);

  const action = useProjectAction(id);
  const revisionDecision = useRevisionDecision(id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  // The Expenses tab's actions live in the tab row, so the selection and the
  // two dialogs they drive are held here rather than inside the panel.
  const [picked, setPicked] = useState<number[]>([]);
  const [addingExpense, setAddingExpense] = useState(false);
  const [sendingExpenses, setSendingExpenses] = useState(false);
  // Submitting freezes the budget and the dates until somebody decides, so it
  // asks first.
  const [submitting, setSubmitting] = useState(false);
  // The day's entry is a short form about one day — it opens over the project
  // rather than navigating away from it. `null` is closed; a date opens on it.
  const [dayOpen, setDayOpen] = useState<string | null>(null);

  const [revisionOpen, setRevisionOpen] = useState(false);
  // Approving and rejecting both open a dialog so the decider can leave a note
  // — required on a rejection, since a refusal with no reason is unactionable.
  const [pendingDecision, setPendingDecision] = useState<{
    decision: Decision;
    kind: 'project' | 'revision';
    revisionId?: number;
    what: string;
    summary?: string;
  } | null>(null);
  const [prefill, setPrefill] = useState<string | undefined>();

  async function run(kind: ProjectAction, label: string) {
    try {
      await action.mutateAsync({ action: kind });
      toast.success(label);
    } catch (error) {
      toast.error(getErrorMessage(error, `Could not ${kind} the project.`));
    }
  }

  if (isLoading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>;
  }
  if (!project) {
    return (
      <div className="py-12 text-center">
        <p className="font-medium">Project not found</p>
        <Button variant="outline" asChild className="mt-3">
          <Link to="/construction/projects">Back to projects</Link>
        </Button>
      </div>
    );
  }

  // A day can only be written up while the project is live. Every route into
  // that form is gated on this, so nobody is offered a page that will refuse
  // them after they have typed a day's work into it.
  const canWriteDays = canLog && ['APPROVED', 'IN_PROGRESS', 'ON_HOLD'].includes(project.status);
  const projectIsLive = ['APPROVED', 'IN_PROGRESS', 'ON_HOLD'].includes(project.status);

  // What the Expenses tab's two buttons need: whether the batch is still the
  // site's to change, and what the ticked rows come to.
  const openBatch = batchData?.open ?? null;
  const openBatchIsEditable = !openBatch || openBatch.is_editable;
  const pickedTotal =
    openBatch?.expenses
      .filter((expense) => picked.includes(expense.id))
      .reduce((sum, expense) => sum + Number(expense.amount), 0) ?? 0;

  const overBy =
    summary && summary.is_over_budget
      ? String(Number(summary.spent_amount) - Number(summary.sanctioned_budget))
      : undefined;

  const pendingRevision = revisions?.find((revision) => revision.status === 'PENDING');

  return (
    <div className="space-y-4">
      {/* ---- header ---- */}
      <Card>
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold md:text-2xl">{project.name}</h1>
                <ProjectStatusBadge status={project.status} label={project.status_display} />
              </div>
              {/* No project code: the breadcrumb above already identifies the
                  project, and the sides are what somebody actually checks it
                  against. */}
              <p className="truncate text-sm text-muted-foreground">
                {[project.location, formatDimensions(project), project.manager_name]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>

            {/* The one action that matters now, plus a menu. Six buttons across
                the top pushed the day list off the screen. */}
            <div className="flex shrink-0 items-center gap-2">
              {project.status === 'PENDING_APPROVAL' && canApprove && (
                <>
                  <Button
                    size="sm"
                    onClick={() =>
                      setPendingDecision({
                        decision: 'approve',
                        kind: 'project',
                        what: 'this project',
                        summary: `${formatMoney(project.estimated_cost)}, finishing ${formatDate(
                          project.expected_end_date,
                        )}`,
                      })
                    }
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPendingDecision({
                        decision: 'reject',
                        kind: 'project',
                        what: 'this project',
                        summary: `${formatMoney(project.estimated_cost)} was asked for`,
                      })
                    }
                  >
                    Reject
                  </Button>
                </>
              )}

              {canWriteDays && (
                <Button size="sm" onClick={() => setDayOpen(todayISO())}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Today's entry
                </Button>
              )}

              {project.is_editable && canEdit && (
                <Button size="sm" onClick={() => setSubmitting(true)}>
                  <Send className="mr-1.5 h-4 w-4" />
                  Submit
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {project.is_editable && canEdit && (
                    <DropdownMenuItem onSelect={() => setFormOpen(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit project
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => setSheetOpen(true)}>
                    <Table2 className="mr-2 h-4 w-4" />
                    Estimate in detail
                  </DropdownMenuItem>
                  {(project.status === 'APPROVED' || project.status === 'IN_PROGRESS') &&
                    canClose && (
                      <DropdownMenuItem onSelect={() => run('hold', 'Project put on hold')}>
                        <PauseCircle className="mr-2 h-4 w-4" />
                        Put on hold
                      </DropdownMenuItem>
                    )}
                  {project.status === 'ON_HOLD' && canClose && (
                    <DropdownMenuItem onSelect={() => run('resume', 'Project resumed')}>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Resume
                    </DropdownMenuItem>
                  )}
                  {['APPROVED', 'IN_PROGRESS', 'ON_HOLD'].includes(project.status) && canClose && (
                    <DropdownMenuItem onSelect={() => run('complete', 'Project completed')}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark finished
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
          </div>

          {/* The two banners that turn a red bar into an action. */}
          {summary?.is_over_budget && canCreate && !pendingRevision && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40">
              <p className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Over the sanctioned budget by {formatMoney(overBy)}.
                {!summary.can_request_revision &&
                  ' More budget cannot be asked for until the spend is approved.'}
              </p>
              {summary.can_request_revision ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setPrefill(overBy);
                    setRevisionOpen(true);
                  }}
                >
                  Request more budget
                </Button>
              ) : (
                // The way out is blocked, so say what unblocks it rather than
                // offering a button that would be refused.
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSearchParams((current) => {
                      const next = new URLSearchParams(current);
                      next.set('tab', 'expenses');
                      return next;
                    })
                  }
                >
                  Get the spend approved first
                </Button>
              )}
            </div>
          )}

          {project.is_overdue && canCreate && !pendingRevision && summary?.can_request_revision && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
              <p className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                <Clock className="h-4 w-4 shrink-0" />
                Past its expected ending of {formatDate(project.expected_end_date)}.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPrefill(undefined);
                  setRevisionOpen(true);
                }}
              >
                Extend timeline
              </Button>
            </div>
          )}

          {pendingRevision && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-900 dark:bg-sky-950/40">
              <p className="text-sky-800 dark:text-sky-300">
                Revision {pendingRevision.revision_no} is waiting for a decision:
                {Number(pendingRevision.additional_amount) > 0 &&
                  ` ${formatMoney(pendingRevision.additional_amount)} more`}
                {pendingRevision.extension_days > 0 &&
                  `${Number(pendingRevision.additional_amount) > 0 ? ',' : ''} ${
                    pendingRevision.extension_days
                  } more days`}
                .
              </p>
            </div>
          )}

          {summary && (
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-t pt-2.5">
              <Stat label="Progress" value={`${Number(summary.progress_percent).toFixed(0)}%`} />
              <Stat label="Spent today" value={formatMoney(summary.spent_today)} />
              <Stat
                label="Last site entry"
                value={
                  summary.days_since_last_log === null
                    ? 'none yet'
                    : summary.days_since_last_log === 0
                      ? 'today'
                      : `${summary.days_since_last_log} days ago`
                }
                tone={
                  summary.days_since_last_log !== null && summary.days_since_last_log > 3
                    ? 'danger'
                    : 'default'
                }
              />
              <Stat
                label="Spend not yet approved"
                value={formatMoney(summary.pending_amount)}
                hint={
                  summary.pending_count > 0
                    ? `${summary.pending_count} payment${summary.pending_count === 1 ? '' : 's'}`
                    : undefined
                }
                tone={summary.pending_count > 0 ? 'danger' : 'good'}
              />
              <Stat
                label="Days worked"
                value={String(spend?.days_logged ?? 0)}
                hint={
                  spend && spend.days_lost_total > 0
                    ? `${spend.days_lost_total} stopped`
                    : undefined
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- tabs ---- */}
      <Tabs
        value={tab}
        onValueChange={(value) =>
          setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set('tab', value);
            return next;
          })
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="revisions">
              Revisions{revisions?.length ? ` (${revisions.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          {/* An action on the whole tab belongs beside the tab, not stacked
              above the table it acts on. */}
          {tab === 'expenses' && canSpend && (
            <div className="flex items-center gap-2">
              {openBatchIsEditable && projectIsLive && (
                <Button variant="outline" size="sm" onClick={() => setAddingExpense(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Record a payment
                </Button>
              )}
              {openBatchIsEditable && (
                <Button
                  size="sm"
                  // Faded, not disabled. A disabled button swallows the click
                  // and teaches nothing; this one says what is missing.
                  className={cn(picked.length === 0 && 'opacity-50')}
                  onClick={() => {
                    if (picked.length === 0) {
                      toast.error('Select an expense to send it for approval.');
                      return;
                    }
                    setSendingExpenses(true);
                  }}
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  Send for approval
                  {picked.length > 0 ? ` · ${formatMoney(String(pickedTotal))}` : ''}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ---- daily ---- */}
        <TabsContent value="daily" className="space-y-2">
          {logs && logs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <CalendarDays className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                <p className="font-medium">Nothing written up yet</p>
                <p className="text-sm text-muted-foreground">
                  The site in-charge fills one short form at the end of each day.
                </p>
                {canWriteDays && (
                  <Button className="mt-3" onClick={() => setDayOpen(todayISO())}>
                    Write today up
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <DailyLogTable projectId={id} onOpenDay={setDayOpen} />
          )}
        </TabsContent>

        {/* ---- expenses ---- */}
        <TabsContent value="expenses" className="space-y-3">
          {/* A single full-width bar showing that 100% of the money went on one
              thing is noise, so the chart waits until there is a comparison to
              draw. */}
          {spend && spend.by_category.length > 1 && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium">Where the money went</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatMoney(spend.total_spent)}
                  </p>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  {spend.by_category.map((row) => (
                    <div
                      key={row.category}
                      className={cn('h-full', CATEGORY_TINTS[row.category])}
                      style={{
                        width: `${(Number(row.amount) / Number(spend.total_spent || 1)) * 100}%`,
                      }}
                      title={`${CATEGORY_LABELS[row.category]}: ${formatMoney(row.amount)}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {spend.by_category.map((row) => (
                    <span
                      key={row.category}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <span className={cn('h-2 w-2 rounded-full', CATEGORY_TINTS[row.category])} />
                      {CATEGORY_LABELS[row.category]} {formatMoney(row.amount)}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <ExpensesPanel
            projectId={id}
            canSpend={canSpend}
            picked={picked}
            onPickedChange={setPicked}
            adding={addingExpense}
            onAddingChange={setAddingExpense}
            sending={sendingExpenses}
            onSendingChange={setSendingExpenses}
          />
        </TabsContent>

        {/* ---- revisions ---- */}
        <TabsContent value="revisions" className="space-y-2">
          <div className="flex justify-end">
            {canCreate &&
              project.sanctioned_at &&
              !pendingRevision &&
              summary?.can_request_revision && (
                <Button
                  size="sm"
                  onClick={() => {
                    setPrefill(overBy);
                    setRevisionOpen(true);
                  }}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Ask for more
                </Button>
              )}
          </div>

          {revisions && revisions.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No revision has been asked for. The budget and the end date are as sanctioned.
              </CardContent>
            </Card>
          )}

          {revisions?.map((revision) => (
            <Card key={revision.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Revision {revision.revision_no}</span>
                    <RevisionStatusBadge status={revision.status} label={revision.status_display} />
                  </div>
                  {revision.status === 'PENDING' && canApprove && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          setPendingDecision({
                            decision: 'approve',
                            kind: 'revision',
                            revisionId: revision.id,
                            what: `revision ${revision.revision_no}`,
                            summary: revisionSummary(revision),
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPendingDecision({
                            decision: 'reject',
                            kind: 'revision',
                            revisionId: revision.id,
                            what: `revision ${revision.revision_no}`,
                            summary: revisionSummary(revision),
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {/* The before and the after — the difference between an approval
                    and a rubber stamp. */}
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  {Number(revision.additional_amount) > 0 && (
                    <p className="text-muted-foreground">
                      Budget {formatMoney(revision.budget_before)} →{' '}
                      <span className="font-medium text-foreground">
                        {formatMoney(revision.budget_after)}
                      </span>{' '}
                      (+{formatMoney(revision.additional_amount)})
                    </p>
                  )}
                  {revision.extension_days > 0 && (
                    <p className="text-muted-foreground">
                      Ends {formatShortDate(revision.end_date_before)} →{' '}
                      <span className="font-medium text-foreground">
                        {formatShortDate(revision.end_date_after)}
                      </span>{' '}
                      (+{revision.extension_days}d)
                    </p>
                  )}
                </div>

                <p className="whitespace-pre-wrap text-sm">{revision.reason}</p>
                <p className="text-xs text-muted-foreground">
                  Asked by {revision.requested_by_name ?? '—'} on{' '}
                  {formatDate(revision.requested_at)}
                  {revision.decided_by_name
                    ? ` · decided by ${revision.decided_by_name} on ${formatDate(
                        revision.decided_at,
                      )}`
                    : ''}
                </p>
                {revision.decision_note && (
                  <p className="text-xs italic text-muted-foreground">“{revision.decision_note}”</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ---- files ---- */}
        <TabsContent value="files">
          <Card>
            <CardContent className="p-4">
              <AttachmentsPanel projectId={id} canEdit={canEdit} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {pendingDecision && (
        <DecisionDialog
          open
          onOpenChange={(next) => !next && setPendingDecision(null)}
          decision={pendingDecision.decision}
          what={pendingDecision.what}
          summary={pendingDecision.summary}
          pending={action.isPending || revisionDecision.isPending}
          onConfirm={(note) =>
            pendingDecision.kind === 'project'
              ? action.mutateAsync({ action: pendingDecision.decision, payload: { note } })
              : revisionDecision.mutateAsync({
                  revisionId: pendingDecision.revisionId!,
                  decision: pendingDecision.decision,
                  payload: { note },
                })
          }
        />
      )}

      {submitting && (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && setSubmitting(false)}
          tone="default"
          title="Send this project for approval?"
          description={`${formatMoney(project.estimated_cost)}, finishing ${formatDate(
            project.expected_end_date,
          )}. You will not be able to edit it until your approver decides.`}
          confirmLabel="Send for approval"
          successMessage="Sent for approval"
          errorMessage="Could not send the project for approval."
          onConfirm={() => action.mutateAsync({ action: 'submit' })}
        />
      )}

      <DayEntryDialog
        projectId={id}
        open={dayOpen !== null}
        onOpenChange={(next) => !next && setDayOpen(null)}
        initialDate={dayOpen ?? undefined}
        canWrite={canWriteDays}
      />

      <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} projectId={id} />

      <EstimateSheetDialog
        projectId={id}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        canEdit={canEdit}
      />

      <RevisionDialog
        projectId={id}
        open={revisionOpen}
        onOpenChange={setRevisionOpen}
        currentBudget={project.sanctioned_budget}
        currentEndDate={project.expected_end_date}
        prefillAmount={prefill}
      />
    </div>
  );
}
