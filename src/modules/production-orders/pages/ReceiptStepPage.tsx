/**
 * Step 4, Receipt — the finished goods come in, at the order's quantity (SAP
 * takes no other), under their batch. Asked for: the date, and the batch —
 * the line, the oil code from the WhatsApp group and the production date.
 * The batch's last two digits and the expiry fill themselves; change them
 * only if they should differ.
 */
import { Save, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { confirmSapPost } from '@/shared/components';
import { EmptyPanel, PageSection } from '@/shared/components/page';
import { Button, Input, Label, NativeSelect, SelectOption } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/utils';

import {
  type EntryDetail,
  type ProductionOrdersMe,
  type ReceiptInput,
  useReceiptPreview,
  useSaveStep,
} from '../api';
import { StepShell } from '../components/StepShell';
import { StockCaps } from '../components/StockCaps';
import { useStepEntry } from '../hooks/useStepEntry';
import { dateLabel, qty, todayIso } from '../utils/format';
import { afterSave, saveFailed } from '../utils/postStep';

export default function ReceiptStepPage() {
  const { entry, me } = useStepEntry();
  if (entry.isLoading) return <EmptyPanel loading message="Loading the entry…" />;
  if (!entry.data) return <EmptyPanel message="This entry could not be loaded." />;
  return <ReceiptForm key={entry.data.id} entry={entry.data} me={me} />;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function ReceiptForm({ entry, me }: { entry: EntryDetail; me: ProductionOrdersMe | undefined }) {
  const navigate = useNavigate();
  const saveStep = useSaveStep(entry.id, 'RECEIPT');
  const row = entry.steps.find((step) => step.step === 'RECEIPT');
  const done = !!row?.done;
  const canTake = !!row?.can_take && !done;
  const due = entry.next_step === 'RECEIPT';

  const [receiptDate, setReceiptDate] = useState(entry.receipt_date ?? todayIso());
  const [lineCode, setLineCode] = useState(entry.line_code);
  const [oilCode, setOilCode] = useState(entry.oil_code);
  const [mfgDate, setMfgDate] = useState(entry.mfg_date ?? todayIso());
  const [sequence, setSequence] = useState(
    entry.batch_sequence ? String(entry.batch_sequence) : '',
  );
  const [expiry, setExpiry] = useState('');

  const input = useMemo<ReceiptInput>(
    () => ({
      receipt_date: receiptDate || null,
      line_code: lineCode,
      oil_code: oilCode,
      mfg_date: mfgDate || null,
      batch_sequence: sequence ? Number(sequence) : null,
      expiry_date: expiry || null,
    }),
    [receiptDate, lineCode, oilCode, mfgDate, sequence, expiry],
  );
  const typed = useDebounce(input, 400);
  const preview = useReceiptPreview(entry.id, done ? null : typed);
  const built = preview.data;
  const ready = !!built?.complete && !preview.isError;

  const save = async (post: boolean) => {
    if (post) {
      const ok = await confirmSapPost({
        title: 'Post the receipt from production to SAP?',
        details: [
          { label: 'Product', value: `${entry.item_code} — ${entry.item_name}` },
          { label: 'Quantity', value: `${qty(entry.quantity)} pcs into ${entry.warehouse}` },
          { label: 'Batch', value: built?.batch_number ?? '' },
          {
            label: 'Made · expires',
            value: `${dateLabel(built?.mfg_date)} · ${dateLabel(built?.expiry_date)}`,
          },
          { label: 'Receipt date', value: dateLabel(receiptDate) },
        ],
        confirmLabel: 'Post receipt',
      });
      if (!ok) return;
    }
    try {
      const next = afterSave(await saveStep.mutateAsync({ input, post }), 'RECEIPT');
      if (next) navigate(next);
    } catch (error) {
      saveFailed(error, post);
    }
  };

  if (done) {
    return (
      <StepShell entry={entry} step="RECEIPT" sapLogin={me?.sap_login}>
        <PageSection title="Received">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div className="sm:col-span-3">
              <dt className="text-xs text-muted-foreground">Batch</dt>
              <dd className="font-mono text-base font-semibold">{entry.batch_number}</dd>
            </div>
            <Fact label="Quantity">
              {qty(entry.quantity)} pcs into {entry.warehouse}
            </Fact>
            <Fact label="Made · expires">
              {dateLabel(entry.mfg_date)} · {dateLabel(entry.expiry_date)}
            </Fact>
            <Fact label="Receipt date">{dateLabel(entry.receipt_date)}</Fact>
          </dl>
        </PageSection>
      </StepShell>
    );
  }

  return (
    <StepShell
      entry={entry}
      step="RECEIPT"
      sapLogin={me?.sap_login}
      footer={
        canTake && (
          <>
            <Button variant="outline" onClick={() => save(false)} disabled={saveStep.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Save draft
            </Button>
            <Button
              onClick={() => save(true)}
              disabled={!due || !ready || saveStep.isPending || !me?.sap_login.ready}
              title={!due ? 'Issue the materials first.' : undefined}
            >
              <Send className="mr-2 h-4 w-4" />
              {saveStep.isPending ? 'Saving…' : 'Post receipt'}
            </Button>
          </>
        )
      }
    >
      {!due && (
        <p className="text-sm text-muted-foreground">
          The materials have to be issued before the goods can be received. You can fill in the
          batch and save it as a draft now.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <PageSection title="The batch">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rc-line">Line</Label>
                <NativeSelect
                  id="rc-line"
                  value={lineCode}
                  disabled={!canTake}
                  onChange={(event) => setLineCode(event.target.value)}
                >
                  <SelectOption value="">Choose…</SelectOption>
                  {(me?.line_codes ?? []).map((line) => (
                    <SelectOption key={line.code} value={line.code}>
                      {line.code} — {line.label}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rc-oil">Oil code</Label>
                <Input
                  id="rc-oil"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6 digits"
                  disabled={!canTake}
                  value={oilCode}
                  onChange={(event) => setOilCode(event.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rc-mfg">Production date</Label>
                <Input
                  id="rc-mfg"
                  type="date"
                  max={todayIso()}
                  disabled={!canTake}
                  value={mfgDate}
                  onChange={(event) => setMfgDate(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rc-date">Receipt date</Label>
                <Input
                  id="rc-date"
                  type="date"
                  min={entry.posting_date}
                  max={todayIso()}
                  disabled={!canTake}
                  value={receiptDate}
                  onChange={(event) => setReceiptDate(event.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rc-seq">Batch's last digits</Label>
                <Input
                  id="rc-seq"
                  inputMode="numeric"
                  maxLength={2}
                  disabled={!canTake}
                  placeholder={
                    built?.batch_sequence ? String(built.batch_sequence).padStart(2, '0') : 'auto'
                  }
                  value={sequence}
                  onChange={(event) => setSequence(event.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rc-expiry">Expiry date</Label>
                <Input
                  id="rc-expiry"
                  type="date"
                  disabled={!canTake}
                  value={expiry || built?.expiry_date || ''}
                  onChange={(event) => setExpiry(event.target.value)}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Left alone, the next free number and two years less a day are used.
            </p>
          </div>
        </PageSection>

        <PageSection title="Into SAP">
          {preview.isError ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(preview.error, 'SAP could not be read.')}
            </p>
          ) : (
            <>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Batch</dt>
                  <dd className="font-mono text-base font-semibold">
                    {built?.batch_number || (
                      <span className="font-sans text-sm font-normal text-muted-foreground">
                        Choose the line, the oil code and the production date
                      </span>
                    )}
                  </dd>
                </div>
                <Fact label="Quantity">{qty(entry.quantity)} pcs, as planned</Fact>
                <Fact label="Received into">{entry.warehouse}</Fact>
                <Fact label="Variety">{entry.variety || '—'}</Fact>
                <Fact label="Series">
                  <span className="font-mono text-xs">{built?.series || '—'}</span>
                </Fact>
              </dl>
              {(built?.warnings.length ?? 0) > 0 && (
                <ul className="mt-4 space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                  {built?.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <StockCaps caps={built?.caps ?? []} />
              </div>
            </>
          )}
        </PageSection>
      </div>
    </StepShell>
  );
}
