/**
 * Step 5, Close — asked for: the closing date. SAP closes the order and posts
 * its variance on that date.
 */
import { Send } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { confirmSapPost } from '@/shared/components';
import { EmptyPanel, PageSection } from '@/shared/components/page';
import { Button, Input, Label } from '@/shared/components/ui';

import { type EntryDetail, type ProductionOrdersMe, useSaveStep } from '../api';
import { StepShell } from '../components/StepShell';
import { useStepEntry } from '../hooks/useStepEntry';
import { dateLabel, qty, todayIso } from '../utils/format';
import { afterSave, saveFailed } from '../utils/postStep';

export default function CloseStepPage() {
  const { entry, me } = useStepEntry();
  if (entry.isLoading) return <EmptyPanel loading message="Loading the entry…" />;
  if (!entry.data) return <EmptyPanel message="This entry could not be loaded." />;
  return <CloseForm key={entry.data.id} entry={entry.data} me={me} />;
}

function CloseForm({ entry, me }: { entry: EntryDetail; me: ProductionOrdersMe | undefined }) {
  const navigate = useNavigate();
  const saveStep = useSaveStep(entry.id, 'CLOSE');
  const row = entry.steps.find((step) => step.step === 'CLOSE');
  const done = !!row?.done;
  const due = entry.next_step === 'CLOSE';
  const [closeDate, setCloseDate] = useState(entry.close_date ?? entry.receipt_date ?? todayIso());

  const post = async () => {
    const ok = await confirmSapPost({
      title: `Close production order ${entry.sap_order_num}?`,
      description: 'SAP closes the order and posts its variance on the closing date.',
      details: [
        { label: 'Issue', value: String(entry.sap_issue_num ?? '—') },
        { label: 'Receipt', value: `${entry.sap_receipt_num ?? '—'} (${qty(entry.quantity)} pcs)` },
        { label: 'Closing date', value: dateLabel(closeDate) },
      ],
      confirmLabel: 'Close order',
    });
    if (!ok) return;
    try {
      const next = afterSave(
        await saveStep.mutateAsync({ input: { close_date: closeDate }, post: true }),
        'CLOSE',
      );
      if (next) navigate(next);
    } catch (error) {
      saveFailed(error, true);
    }
  };

  return (
    <StepShell
      entry={entry}
      step="CLOSE"
      sapLogin={me?.sap_login}
      footer={
        !done &&
        row?.can_take && (
          <Button
            onClick={post}
            disabled={!due || saveStep.isPending || !me?.sap_login.ready}
            title={!due ? 'Receive the goods first.' : undefined}
          >
            <Send className="mr-2 h-4 w-4" />
            {saveStep.isPending ? 'Closing…' : 'Close order'}
          </Button>
        )
      }
    >
      <PageSection title="Close">
        <div className="grid gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">SAP order</p>
            <p className="font-mono font-semibold">{entry.sap_order_num ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Issue</p>
            <p className="font-mono">{entry.sap_issue_num ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receipt</p>
            <p className="font-mono">{entry.sap_receipt_num ?? '—'}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="close-date">Closing date</Label>
            {done ? (
              <p className="font-medium">{dateLabel(entry.close_date)}</p>
            ) : (
              <Input
                id="close-date"
                type="date"
                min={entry.posting_date}
                max={todayIso()}
                disabled={!row?.can_take}
                value={closeDate}
                onChange={(event) => setCloseDate(event.target.value)}
              />
            )}
          </div>
        </div>
        {!due && !done && (
          <p className="mt-4 text-sm text-muted-foreground">
            SAP closes an order only once its materials are issued and its goods received.
          </p>
        )}
      </PageSection>
    </StepShell>
  );
}
