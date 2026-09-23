/**
 * The approver's queue: projects waiting for sanction and revisions waiting for
 * a decision, in one list, oldest first.
 *
 * Every row carries the numbers the decision turns on — a revision shows the
 * before and the after, not just the amount asked for.
 */
import { CheckCircle2, ClipboardCheck, IndianRupee, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, Card, CardContent } from '@/shared/components/ui';

import {
  useApprovalQueue,
  useDecideBatch,
  useProjectAction,
  useRevisionDecision,
} from '../api';
import { type Decision, DecisionDialog, ProjectStatusBadge } from '../components';
import type { ExpenseBatchDetail, ProjectListItem, ProjectRevision } from '../types';
import { CATEGORY_LABELS } from '../utils';
import { formatDate, formatMoney, formatShortDate } from '../utils';

function ProjectRow({ project }: { project: ProjectListItem }) {
  const action = useProjectAction(project.id);
  const [decision, setDecision] = useState<Decision | null>(null);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/construction/projects/${project.id}`}
              className="font-medium hover:underline"
            >
              {project.name}
            </Link>
            <ProjectStatusBadge status={project.status} label={project.status_display} />
          </div>
          <p className="text-xs text-muted-foreground">
            {project.code}
            {project.location ? ` · ${project.location}` : ''} · {project.manager_name ?? '—'}
          </p>
          <p className="mt-1 text-sm">
            Asking <span className="font-semibold">{formatMoney(project.estimated_cost)}</span>,
            {' '}
            {formatShortDate(project.start_date)} → {formatShortDate(project.expected_end_date)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setDecision('approve')}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDecision('reject')}>
            <XCircle className="mr-1.5 h-4 w-4" />
            Reject
          </Button>
        </div>

        {decision && (
          <DecisionDialog
            open
            onOpenChange={(next) => !next && setDecision(null)}
            decision={decision}
            what={project.code}
            summary={`${formatMoney(project.estimated_cost)}, ${formatShortDate(
              project.start_date,
            )} → ${formatShortDate(project.expected_end_date)}`}
            pending={action.isPending}
            onConfirm={(note) => action.mutateAsync({ action: decision, payload: { note } })}
          />
        )}
      </CardContent>
    </Card>
  );
}

function RevisionRow({ revision }: { revision: ProjectRevision }) {
  const mutation = useRevisionDecision(revision.project);
  const [decision, setDecision] = useState<Decision | null>(null);

  const wantsMoney = Number(revision.additional_amount) > 0;

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/construction/projects/${revision.project}?tab=revisions`}
              className="font-medium hover:underline"
            >
              {revision.project_name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {revision.project_code} · revision {revision.revision_no} · asked by{' '}
              {revision.requested_by_name ?? '—'} on {formatDate(revision.requested_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setDecision('approve')}>
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDecision('reject')}>
              Reject
            </Button>
          </div>
        </div>

        <div className="grid gap-1 text-sm sm:grid-cols-2">
          {wantsMoney && (
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
              (+{revision.extension_days} days)
            </p>
          )}
        </div>

        <p className="whitespace-pre-wrap text-sm">{revision.reason}</p>

        {decision && (
          <DecisionDialog
            open
            onOpenChange={(next) => !next && setDecision(null)}
            decision={decision}
            what={`revision ${revision.revision_no} of ${revision.project_code}`}
            summary={[
              wantsMoney
                ? `${formatMoney(revision.budget_before)} → ${formatMoney(
                    revision.budget_after,
                  )}`
                : null,
              revision.extension_days > 0
                ? `${formatShortDate(revision.end_date_before)} → ${formatShortDate(
                    revision.end_date_after,
                  )} (+${revision.extension_days}d)`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            pending={mutation.isPending}
            onConfirm={(note) =>
              mutation.mutateAsync({
                revisionId: revision.id,
                decision,
                payload: { note },
              })
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * One submitted batch: a site's spend since the last approval, settled together.
 *
 * The decision is "this week's spend is fine", not a hundred separate ones, so
 * the card shows the claim and its lines and carries a single Approve.
 */
function BatchCard({ batch }: { batch: ExpenseBatchDetail }) {
  const decide = useDecideBatch(batch.project);
  const [decision, setDecision] = useState<Decision | null>(null);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/construction/projects/${batch.project}?tab=expenses`}
              className="font-medium hover:underline"
            >
              {batch.project_name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {batch.project_code} · batch {batch.batch_no} · sent by{' '}
              {batch.submitted_by_name ?? '—'} on {formatDate(batch.submitted_at)}
            </p>
            <p className="mt-1 text-sm">
              <span className="font-semibold">{formatMoney(batch.total)}</span> across{' '}
              {batch.line_count} payment{batch.line_count === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setDecision('approve')}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Approve all
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDecision('reject')}>
              <XCircle className="mr-1.5 h-4 w-4" />
              Send back
            </Button>
          </div>
        </div>

        <ul className="divide-y border-t">
          {batch.expenses.map((expense) => (
            <li key={expense.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm">{expense.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatShortDate(expense.spend_date)} ·{' '}
                  {CATEGORY_LABELS[expense.category]}
                  {expense.paid_to ? ` · ${expense.paid_to}` : ''}
                  {expense.payment_mode === 'CREDIT' ? ' · on credit' : ''}
                  {expense.recorded_by_name ? ` · ${expense.recorded_by_name}` : ''}
                </p>
              </div>
              {expense.bill && (
                <a
                  href={expense.bill}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  bill
                </a>
              )}
              <span className="whitespace-nowrap text-sm font-medium tabular-nums">
                {formatMoney(expense.amount)}
              </span>
            </li>
          ))}
        </ul>

        {decision && (
          <DecisionDialog
            open
            onOpenChange={(next) => !next && setDecision(null)}
            decision={decision}
            what={`batch ${batch.batch_no} of ${batch.project_code}`}
            summary={
              decision === 'reject'
                ? 'The whole batch goes back to the site to be corrected and sent again. Nothing is un-spent.'
                : `${formatMoney(batch.total)} across ${batch.line_count} payment(s) — approving settles every line.`
            }
            pending={decide.isPending}
            onConfirm={(note) =>
              decide.mutateAsync({
                batchId: batch.id,
                payload: {
                  decision: decision === 'approve' ? 'APPROVED' : 'RETURNED',
                  note,
                },
              })
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function ConstructionApprovalsPage() {
  const { data, isLoading } = useApprovalQueue();
  const total =
    (data?.projects.length ?? 0) +
    (data?.revisions.length ?? 0) +
    (data?.batches.length ?? 0);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ClipboardCheck className="h-6 w-6" />
          Construction approvals
        </h1>
        <p className="text-sm text-muted-foreground">
          Projects waiting for a budget, revisions asking for more of one, and
          batches of site spend waiting to be checked.
        </p>
      </div>

      {isLoading && <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>}

      {data && total === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
            <p className="font-medium">Nothing waiting on you</p>
          </CardContent>
        </Card>
      )}

      {data && data.projects.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            New projects ({data.projects.length})
          </h2>
          {data.projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </section>
      )}

      {data && data.batches.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <IndianRupee className="h-3.5 w-3.5" />
            Spend to check ({data.batches.length} batch
            {data.batches.length === 1 ? '' : 'es'})
          </h2>
          {data.batches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} />
          ))}
        </section>
      )}

      {data && data.revisions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            More budget or time ({data.revisions.length})
          </h2>
          {data.revisions.map((revision) => (
            <RevisionRow key={revision.id} revision={revision} />
          ))}
        </section>
      )}
    </div>
  );
}
