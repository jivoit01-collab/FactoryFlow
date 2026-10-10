/**
 * Step 3, Issue — the order's lines (its BOM) go out at their planned
 * quantities, as SAP requires. Asked for: the date, the variety, and, for the
 * batch-tracked lines, which batches. Those are filled oldest first; change
 * them only if something else should go.
 */
import { Save, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { confirmSapPost } from '@/shared/components';
import {
  EmptyPanel,
  PageSection,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button, Input, Label, NativeSelect, SelectOption } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  type EntryDetail,
  type IssueLine,
  type IssuePreview,
  type ProductionOrdersMe,
  useIssuePreview,
  useSaveStep,
  useVarieties,
} from '../api';
import { LinesTable } from '../components/LinesTable';
import { StepShell } from '../components/StepShell';
import { useStepEntry } from '../hooks/useStepEntry';
import { batchesAddUp, dateLabel, qty, todayIso } from '../utils/format';
import { afterSave, saveFailed } from '../utils/postStep';

type Picks = Record<number, Record<string, string>>;

export default function IssueStepPage() {
  const { entryId, entry, me } = useStepEntry();
  const done = !!entry.data?.steps.find((step) => step.step === 'ISSUE')?.done;
  const preview = useIssuePreview(entryId ?? 0, !!entry.data && !done);
  if (entry.isLoading) return <EmptyPanel loading message="Loading the entry…" />;
  if (!entry.data) return <EmptyPanel message="This entry could not be loaded." />;
  if (done) {
    return (
      <StepShell entry={entry.data} step="ISSUE" sapLogin={me?.sap_login}>
        <p className="text-sm text-muted-foreground">
          Issued on {dateLabel(entry.data.issue_date)} under variety {entry.data.variety}.
        </p>
        <LinesTable lines={entry.data.lines} summary={`${entry.data.lines.length} lines issued`} />
      </StepShell>
    );
  }
  if (preview.isLoading) {
    return (
      <StepShell entry={entry.data} step="ISSUE" sapLogin={me?.sap_login}>
        <EmptyPanel loading message="Reading stock and batches from SAP…" />
      </StepShell>
    );
  }
  if (!preview.data) {
    return (
      <StepShell entry={entry.data} step="ISSUE" sapLogin={me?.sap_login}>
        <EmptyPanel message={getErrorMessage(preview.error, 'SAP could not be read.')} />
      </StepShell>
    );
  }
  return (
    <IssueForm key={preview.dataUpdatedAt} entry={entry.data} preview={preview.data} me={me} />
  );
}

function picksFrom(lines: IssueLine[]): Picks {
  return Object.fromEntries(
    lines
      .filter((line) => line.batch_managed)
      .map((line) => [
        line.id,
        Object.fromEntries(line.batches.map((b) => [b.batch_number, String(Number(b.quantity))])),
      ]),
  );
}

function oldestFirst(line: IssueLine): Record<string, string> {
  let left = Number(line.planned_quantity);
  const picks: Record<string, string> = {};
  for (const batch of line.available) {
    if (left <= 1e-9) break;
    if (!batch.released) continue;
    const take = Math.min(Number(batch.quantity), left);
    if (take <= 0) continue;
    picks[batch.batch_number] = String(Math.round(take * 1e6) / 1e6);
    left -= take;
  }
  return picks;
}

function BatchCell({
  line,
  picks,
  onChange,
  disabled,
}: {
  line: IssueLine;
  picks: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled: boolean;
}) {
  if (!line.batch_managed) return <span className="text-muted-foreground">—</span>;
  if (line.available.length === 0) {
    return <span className="text-destructive">No batch holds stock in {line.warehouse}.</span>;
  }
  const adds = batchesAddUp(
    line.planned_quantity,
    Object.values(picks).map((quantity) => ({ quantity })),
  );
  return (
    <div className="space-y-1">
      <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
        {line.available.map((batch) => (
          <div key={batch.batch_number} className="flex items-center gap-2">
            <span className="w-36 truncate font-mono" title={batch.batch_number}>
              {batch.batch_number}
            </span>
            <span className="w-24 tabular-nums text-muted-foreground">
              {qty(batch.quantity)} held
            </span>
            <Input
              aria-label={`Quantity from batch ${batch.batch_number}`}
              inputMode="decimal"
              disabled={disabled || !batch.released}
              value={picks[batch.batch_number] ?? ''}
              onChange={(event) => onChange({ ...picks, [batch.batch_number]: event.target.value })}
              className="h-7 w-24 text-right tabular-nums"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {!adds && (
          <span className="text-destructive">Must add up to {qty(line.planned_quantity, 6)}</span>
        )}
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => onChange(oldestFirst(line))}
          >
            Oldest first
          </Button>
        )}
      </div>
    </div>
  );
}

function IssueForm({
  entry,
  preview,
  me,
}: {
  entry: EntryDetail;
  preview: IssuePreview;
  me: ProductionOrdersMe | undefined;
}) {
  const navigate = useNavigate();
  const saveStep = useSaveStep(entry.id, 'ISSUE');
  const varieties = useVarieties();
  const [issueDate, setIssueDate] = useState(preview.issue_date);
  const [variety, setVariety] = useState(preview.variety);
  const [picks, setPicks] = useState<Picks>(() => picksFrom(preview.lines));
  const [touched, setTouched] = useState<number[]>([]);

  const row = entry.steps.find((step) => step.step === 'ISSUE');
  const canTake = !!row?.can_take;
  const due = entry.next_step === 'ISSUE';
  const problem = useMemo(() => {
    if (!variety) return 'Choose the variety.';
    for (const line of preview.lines) {
      if (!line.batch_managed || !touched.includes(line.id)) continue;
      const rows = Object.values(picks[line.id] ?? {}).map((quantity) => ({ quantity }));
      if (!batchesAddUp(line.planned_quantity, rows)) {
        return `${line.item_code}: the batches must add up to ${qty(line.planned_quantity, 6)}.`;
      }
    }
    return null;
  }, [variety, picks, touched, preview.lines]);

  const body = () => ({
    issue_date: issueDate,
    variety,
    lines: touched.map((lineId) => ({
      line_id: lineId,
      batches: Object.entries(picks[lineId] ?? {})
        .filter(([, quantity]) => Number(quantity) > 0)
        .map(([batch_number, quantity]) => ({ batch_number, quantity })),
    })),
  });

  const save = async (post: boolean) => {
    if (post) {
      const ok = await confirmSapPost({
        title: 'Post the issue for production to SAP?',
        details: [
          { label: 'Order', value: String(entry.sap_order_num ?? '—') },
          { label: 'Lines', value: `${preview.lines.length}, each at its planned quantity` },
          { label: 'Variety', value: variety },
          { label: 'Issue date', value: dateLabel(issueDate) },
        ],
        confirmLabel: 'Post issue',
      });
      if (!ok) return;
    }
    try {
      const next = afterSave(await saveStep.mutateAsync({ input: body(), post }), 'ISSUE');
      if (next) navigate(next);
    } catch (error) {
      saveFailed(error, post);
    }
  };

  const setLine = (lineId: number, next: Record<string, string>) => {
    setPicks((current) => ({ ...current, [lineId]: next }));
    setTouched((current) => (current.includes(lineId) ? current : [...current, lineId]));
  };

  return (
    <StepShell
      entry={entry}
      step="ISSUE"
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
              disabled={!due || !!problem || saveStep.isPending || !me?.sap_login.ready}
              title={!due ? 'Release the order first.' : undefined}
            >
              <Send className="mr-2 h-4 w-4" />
              {saveStep.isPending ? 'Saving…' : 'Post issue'}
            </Button>
          </>
        )
      }
    >
      {!due && (
        <p className="text-sm text-muted-foreground">
          The order has to be released before its materials can be issued. You can prepare the issue
          and save it as a draft now.
        </p>
      )}
      <PageSection title="Issue">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="issue-date">Issue date</Label>
            <Input
              id="issue-date"
              type="date"
              min={entry.posting_date}
              max={todayIso()}
              value={issueDate}
              disabled={!canTake}
              onChange={(event) => setIssueDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="issue-variety">Variety</Label>
            <NativeSelect
              id="issue-variety"
              value={variety}
              disabled={!canTake}
              onChange={(event) => setVariety(event.target.value)}
            >
              <SelectOption value="">Choose…</SelectOption>
              {(varieties.data ?? []).map((option) => (
                <SelectOption key={option.code} value={option.code}>
                  {option.name} ({option.code})
                </SelectOption>
              ))}
              {variety && !(varieties.data ?? []).some((option) => option.code === variety) && (
                <SelectOption value={variety}>{variety}</SelectOption>
              )}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Series</span>
            <p className="font-mono text-sm">{preview.series || '—'}</p>
          </div>
        </div>
        {preview.warnings.length > 0 && (
          <ul className="mt-4 space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            {preview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        {problem && <p className="mt-3 text-sm text-destructive">{problem}</p>}
      </PageSection>

      <TableCard summary={`${preview.lines.length} lines of order ${entry.sap_order_num ?? ''}`}>
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Item</Th>
              <Th align="right">Quantity</Th>
              <Th>Warehouse</Th>
              <Th align="right">In stock</Th>
              <Th>Batches</Th>
            </tr>
          </thead>
          <tbody>
            {preview.lines.map((line) => (
              <tr
                key={line.id}
                className={cn(
                  'border-b align-top last:border-0',
                  line.short && 'bg-amber-50/60 dark:bg-amber-950/20',
                )}
              >
                <Td>
                  <span className="font-mono text-xs font-semibold">{line.item_code}</span>
                  {line.item_type === 'resource' && (
                    <StatusPill tone="neutral" className="ml-2">
                      Resource
                    </StatusPill>
                  )}
                  <span className="block text-muted-foreground">{line.item_name}</span>
                </Td>
                <Td numeric className="font-medium">
                  {qty(line.planned_quantity)}{' '}
                  <span className="text-xs text-muted-foreground">{line.uom}</span>
                </Td>
                <Td className="font-mono text-xs">{line.warehouse}</Td>
                <Td
                  numeric
                  className={cn(line.short && 'font-semibold text-amber-700 dark:text-amber-400')}
                >
                  {line.item_type === 'resource' ? '—' : qty(line.on_hand)}
                  {line.short && <span className="block text-xs">{qty(line.short)} short</span>}
                </Td>
                <Td className="text-xs">
                  <BatchCell
                    line={line}
                    picks={picks[line.id] ?? {}}
                    onChange={(next) => setLine(line.id, next)}
                    disabled={!canTake}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </StepShell>
  );
}
