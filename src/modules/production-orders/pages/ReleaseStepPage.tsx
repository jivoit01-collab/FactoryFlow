/**
 * Step 2, Release — nothing to ask: the planned order is released, so its
 * materials can be issued to it.
 *
 * A released order with nothing issued yet can go back to planned, as the
 * floor does in SAP to correct the quantity; it is then changed on the Plan
 * page and released again.
 */
import { Pencil, Send, Undo2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { confirmSapPost } from '@/shared/components';
import { EmptyPanel, PageSection } from '@/shared/components/page';
import { Button } from '@/shared/components/ui';

import { useSaveStep, useUnrelease } from '../api';
import { ChangeState } from '../components/ChangeState';
import { StepShell } from '../components/StepShell';
import { useStepEntry } from '../hooks/useStepEntry';
import { boxesLabel, dateLabel, qty } from '../utils/format';
import { afterSave, saveFailed } from '../utils/postStep';
import { stepPath } from '../utils/steps';

export default function ReleaseStepPage() {
  const navigate = useNavigate();
  const { entryId, entry: query, me } = useStepEntry();
  const release = useSaveStep(entryId ?? 0, 'RELEASE');
  const unrelease = useUnrelease(entryId ?? 0);
  if (query.isLoading) return <EmptyPanel loading message="Loading the entry…" />;
  if (!query.data) return <EmptyPanel message="This entry could not be loaded." />;
  const entry = query.data;
  const row = entry.steps.find((step) => step.step === 'RELEASE');
  const due = entry.next_step === 'RELEASE';
  // Released, nothing issued yet: it can still go back to planned.
  const canGoBack = entry.status === 'RELEASED' && !!row?.can_take;
  const canChangePlan = entry.status === 'PLANNED' && !!me?.rights.PLAN;
  const busy = release.isPending || unrelease.isPending;

  const post = async () => {
    const ok = await confirmSapPost({
      title: `Release production order ${entry.sap_order_num}?`,
      details: [
        { label: 'Product', value: `${entry.item_code} — ${entry.item_name}` },
        { label: 'Quantity', value: `${qty(entry.quantity)} pcs` },
      ],
      confirmLabel: 'Release order',
    });
    if (!ok) return;
    try {
      const next = afterSave(await release.mutateAsync({ input: {}, post: true }), 'RELEASE');
      if (next) navigate(next);
    } catch (error) {
      saveFailed(error, true);
    }
  };

  const goBack = async () => {
    const ok = await confirmSapPost({
      title: `Take production order ${entry.sap_order_num} back to planned?`,
      description:
        'Nothing has been issued to it yet. Once it is planned again you can change it on the Plan page, then release it again.',
      details: [
        { label: 'Product', value: `${entry.item_code} — ${entry.item_name}` },
        { label: 'Quantity', value: `${qty(entry.quantity)} pcs` },
      ],
      confirmLabel: 'Back to planned',
    });
    if (!ok) return;
    try {
      const response = await unrelease.mutateAsync();
      afterSave(response, 'RELEASE');
      if (response.result?.outcome === 'POSTED') navigate(stepPath(entry.id, 'PLAN'));
    } catch (error) {
      saveFailed(error, true);
    }
  };

  return (
    <StepShell
      entry={entry}
      step="RELEASE"
      sapLogin={me?.sap_login}
      footer={
        (canGoBack || canChangePlan || (due && row?.can_take)) && (
          <>
            {canGoBack && (
              <Button variant="outline" onClick={goBack} disabled={busy || !me?.sap_login.ready}>
                <Undo2 className="mr-2 h-4 w-4" />
                {unrelease.isPending ? 'Sending…' : 'Back to planned'}
              </Button>
            )}
            {canChangePlan && (
              <Button variant="outline" onClick={() => navigate(stepPath(entry.id, 'PLAN'))}>
                <Pencil className="mr-2 h-4 w-4" />
                Change the planned order
              </Button>
            )}
            {due && row?.can_take && (
              <Button onClick={post} disabled={busy || !me?.sap_login.ready}>
                <Send className="mr-2 h-4 w-4" />
                {release.isPending ? 'Releasing…' : 'Release order'}
              </Button>
            )}
          </>
        )
      }
    >
      <ChangeState posting={entry.changes.unrelease} />
      <PageSection title="The order">
        {!entry.sap_order_num ? (
          <p className="text-sm text-muted-foreground">Plan the order in SAP first.</p>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Product</dt>
              <dd className="font-medium">
                <span className="font-mono">{entry.item_code}</span> — {entry.item_name}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">SAP order</dt>
              <dd className="font-mono font-semibold">{entry.sap_order_num}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Planned</dt>
              <dd className="font-medium">
                {boxesLabel(entry.boxes, entry.loose_pieces)} ({qty(entry.quantity)} pcs) ·{' '}
                {dateLabel(entry.posting_date)}
              </dd>
            </div>
          </dl>
        )}
        {canGoBack && (
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing is issued to this order yet, so it can still go back to planned to be changed.
          </p>
        )}
      </PageSection>
    </StepShell>
  );
}
