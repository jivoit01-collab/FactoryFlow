/** The daily operating loop — the morning routine, on one page.
 *
 *   GENERATED -> REVIEWED -> PUBLISHED -> verdicts recorded
 *
 * The order of the tabs is the order of the playbook: Data Quality is read
 * FIRST, because knowing what the system could not work out changes how much
 * weight the alarms deserve.
 */
import { AlertTriangle, CheckCircle2, Play, Send } from 'lucide-react';
import { useState } from 'react';

import { SUPPLY_CHAIN_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useDailyRun,
  useGenerateRun,
  usePublishRun,
  useReviewRun,
  useSetRowOwner,
  useSetVerdict,
} from '../api/supply-chain.queries';
import { DailyRunRows } from '../components/DailyRunRows';
import type { CoverVerdict } from '../types';

type TabKey = 'quality' | 'alarms' | 'verdicts';

const STATUS_STYLE: Record<string, string> = {
  GENERATED: 'bg-muted text-muted-foreground',
  REVIEWED: 'bg-blue-600 text-white',
  PUBLISHED: 'bg-emerald-600 text-white',
  BLOCKED: 'bg-destructive text-destructive-foreground',
};

export default function SupplyChainDailyRunPage() {
  const { hasPermission } = usePermission();
  const canAct = hasPermission(SUPPLY_CHAIN_PERMISSIONS.MANAGE_REFERENCE);

  const [tab, setTab] = useState<TabKey>('quality');
  const [comment, setComment] = useState('');

  const query = useDailyRun();
  const runId = query.data?.run.id;

  const generate = useGenerateRun();
  const review = useReviewRun(runId);
  const publish = usePublishRun(runId);
  const setOwner = useSetRowOwner();
  const setVerdict = useSetVerdict();

  if (query.isLoading) {
    return (
      <div className="p-6">
        <DashboardHeader title="Daily run" description="Loading…" />
      </div>
    );
  }

  // No run yet is a normal state on day one, not an error.
  if (!query.data) {
    return (
      <div className="space-y-4 p-6">
        <DashboardHeader title="Daily run" />
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {query.isError
                ? getErrorMessage(query.error, 'No run has been built yet.')
                : 'No run has been built yet.'}
            </p>
            {canAct && (
              <Button onClick={() => generate.mutate(undefined)} disabled={generate.isPending}>
                <Play className="mr-2 h-4 w-4" />
                {generate.isPending ? 'Building…' : "Build today's run"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { run, rows, issues, verdict_progress: progress, unassigned_red_rows: unowned } =
    query.data;
  const blocking = issues.filter((i) => i.blocking);
  const redRows = rows.filter((r) => r.verdict === 'RED');
  const order: CoverVerdict[] = ['RED', 'AMBER', 'UNKNOWN', 'GREEN'];
  const sorted = [...rows].sort(
    (a, b) => order.indexOf(a.verdict) - order.indexOf(b.verdict) || b.days_late - a.days_late,
  );

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'quality', label: 'Data quality', count: issues.length },
    { key: 'alarms', label: 'Materials', count: rows.length },
    { key: 'verdicts', label: 'Verdict log', count: progress.outstanding },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title={`Daily run — ${run.run_date}`}
        description="Days of stock we have, against days the supplier takes."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={STATUS_STYLE[run.status]}>{run.status}</Badge>
          {canAct && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generate.mutate(undefined)}
                disabled={generate.isPending}
              >
                <Play className="mr-2 h-4 w-4" />
                Rebuild
              </Button>
              {run.status !== 'PUBLISHED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => review.mutate({ comment, override: !run.is_credible })}
                  disabled={review.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Review
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => publish.mutate(comment)}
                disabled={publish.isPending || run.status !== 'REVIEWED'}
              >
                <Send className="mr-2 h-4 w-4" />
                Publish
              </Button>
            </>
          )}
        </div>
      </DashboardHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Order today', value: run.red_count, alert: run.red_count > 0 },
          { label: 'Getting close', value: run.amber_count, alert: false },
          { label: 'Cannot judge', value: run.unknown_count, alert: run.unknown_count > 0 },
          { label: 'Data issues', value: run.issue_count, alert: blocking.length > 0 },
        ].map((tile) => (
          <Card key={tile.label} className={tile.alert ? 'border-destructive/40' : undefined}>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold">{tile.value}</p>
              <p className="text-sm text-muted-foreground">{tile.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* The playbook's rule, enforced rather than remembered: a flood of alarms
          means the inputs are wrong, not that the factory is on fire. */}
      {!run.is_credible && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">
              {run.red_count} red rows is more than this company treats as credible.
            </p>
            <p className="text-muted-foreground">
              That usually points at the stock or purchase-order data, not the factory. Fix
              the inputs and rebuild, or review with a comment saying why it is genuine.
            </p>
          </div>
        </div>
      )}

      {unowned > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          {unowned} red row(s) have nobody&apos;s name against them. A red alarm nobody owns
          will not get done.
        </div>
      )}

      {canAct && run.status !== 'PUBLISHED' && (
        <Input
          placeholder="One line: what changed since yesterday"
          value={comment || run.comment}
          onChange={(e) => setComment(e.target.value)}
        />
      )}

      {run.status === 'PUBLISHED' && (
        <p className="text-sm text-muted-foreground">
          Published by {run.published_by || 'someone'} to {run.recipients} user(s).
          {progress.complete
            ? ' All verdicts recorded.'
            : ` ${progress.outstanding} verdict(s) still outstanding.`}
        </p>
      )}

      <div className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === t.key
                ? 'border-primary font-medium'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-muted-foreground">({t.count})</span>
          </button>
        ))}
      </div>

      {tab === 'quality' && (
        <Card>
          <CardContent className="p-4">
            {issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing the system could not work out. Every material was judged.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {issues.map((issue) => (
                  <li key={issue.id} className="flex items-start gap-2">
                    <Badge
                      className={
                        issue.blocking
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-amber-500 text-white'
                      }
                    >
                      {issue.blocking ? 'Blocking' : 'Note'}
                    </Badge>
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'alarms' && (
        <Card>
          <CardContent className="p-0">
            <DailyRunRows
              rows={sorted}
              canAct={canAct}
              onSetOwner={(rowId, owner) => setOwner.mutate({ rowId, owner })}
              onSetVerdict={(rowId, outcome, note) =>
                setVerdict.mutate({ rowId, outcome, note })
              }
            />
          </CardContent>
        </Card>
      )}

      {tab === 'verdicts' && (
        <Card>
          <CardContent className="p-0">
            <div className="border-b p-3 text-sm text-muted-foreground">
              {progress.verdicts_recorded} of {progress.red_rows} red rows judged.
              {progress.outstanding > 0 &&
                ' An empty verdict log at the end of the month means we learned nothing.'}
            </div>
            <DailyRunRows
              rows={redRows}
              canAct={canAct}
              onSetOwner={(rowId, owner) => setOwner.mutate({ rowId, owner })}
              onSetVerdict={(rowId, outcome, note) =>
                setVerdict.mutate({ rowId, outcome, note })
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
