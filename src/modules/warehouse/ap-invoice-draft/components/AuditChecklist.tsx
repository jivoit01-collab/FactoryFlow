import { AlertTriangle, CheckCircle2, ChevronDown, CircleHelp, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { StatusPill } from '@/shared/components/page';
import { Button, Textarea } from '@/shared/components/ui';
import { cn, formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useReviewCheck } from '../api';
import type { APInvoiceDraftCheck, CheckStatus, ReviewDecision } from '../types';
import { CHECK_STATUS_LABELS, CHECK_STATUS_TONES } from '../utils';

const ICONS: Record<CheckStatus, typeof CheckCircle2> = {
  PASS: CheckCircle2,
  FAIL: XCircle,
  REVIEW: AlertTriangle,
  UNKNOWN: CircleHelp,
};

const ICON_CLASSES: Record<CheckStatus, string> = {
  PASS: 'text-emerald-600 dark:text-emerald-400',
  FAIL: 'text-destructive',
  REVIEW: 'text-amber-600 dark:text-amber-400',
  UNKNOWN: 'text-muted-foreground',
};

/** Column headings for the per-line facts the backend sends. */
const FACT_COLUMNS: Record<string, string> = {
  line: 'Line',
  item_code: 'Item',
  po_num: 'PO',
  warehouse: 'Warehouse',
  po_tax_code: 'PO tax code',
  invoice_kind: 'Bill GST',
  invoice_rate: 'Bill %',
  grpo_price: 'GRPO rate',
  po_price: 'PO rate',
  grpo_qty: 'GRPO qty',
  invoice_qty: 'Bill qty',
  received: 'Received',
  po_open: 'Open on PO',
  allowed: 'Allowed (+10%)',
  status: 'QC',
  report_no: 'Report',
  is_approved: 'Approved',
  approver: 'Approver on print',
};

function FactsTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = Object.keys(FACT_COLUMNS).filter((key) => rows.some((row) => key in row));
  if (!columns.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            {columns.map((key) => (
              <th key={key} scope="col" className="px-2 py-1 font-medium">
                {FACT_COLUMNS[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-border/60">
              {columns.map((key) => {
                const value = row[key];
                return (
                  <td key={key} className="px-2 py-1 tabular-nums">
                    {typeof value === 'boolean'
                      ? value
                        ? 'Yes'
                        : 'No'
                      : value == null
                        ? '—'
                        : String(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function factRows(check: APInvoiceDraftCheck): Record<string, unknown>[] {
  for (const key of ['lines', 'items', 'pos']) {
    const value = check.facts[key];
    if (Array.isArray(value) && value.length) return value as Record<string, unknown>[];
  }
  return [];
}

function ReviewControls({ entryId, check }: { entryId: number; check: APInvoiceDraftCheck }) {
  const review = useReviewCheck(entryId);
  const [deciding, setDeciding] = useState<Exclude<ReviewDecision, ''> | null>(null);
  const [remark, setRemark] = useState('');

  const save = (decision: ReviewDecision, note: string) => {
    review.mutate(
      { key: check.key, decision, remark: note },
      {
        onSuccess: () => {
          setDeciding(null);
          setRemark('');
          toast.success(decision ? 'Marked' : 'Decision cleared');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Could not save the decision.')),
      },
    );
  };

  if (deciding) {
    const needsReason = deciding === 'NOT_OK';
    return (
      <div className="space-y-2">
        <Textarea
          aria-label={`Remark for ${check.label}`}
          value={remark}
          onChange={(event) => setRemark(event.target.value)}
          rows={2}
          placeholder={needsReason ? 'Why is it not OK?' : 'What did you check? (optional)'}
          disabled={review.isPending}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={needsReason ? 'destructive' : 'default'}
            disabled={review.isPending || (needsReason && !remark.trim())}
            onClick={() => save(deciding, remark.trim())}
          >
            {needsReason ? 'Mark not OK' : 'Mark OK'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeciding(null)}
            disabled={review.isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => setDeciding('OK')}>
        OK
      </Button>
      <Button size="sm" variant="outline" onClick={() => setDeciding('NOT_OK')}>
        Not OK
      </Button>
      {check.review_decision && (
        <Button size="sm" variant="ghost" onClick={() => save('', '')} disabled={review.isPending}>
          Clear decision
        </Button>
      )}
    </div>
  );
}

function CheckRow({
  entryId,
  check,
  index,
  canReview,
}: {
  entryId: number;
  check: APInvoiceDraftCheck;
  index: number;
  canReview: boolean;
}) {
  const [open, setOpen] = useState(false);
  const status = check.effective_status;
  const Icon = ICONS[status];
  const rows = factRows(check);

  return (
    <li className="flex gap-3 px-4 py-3">
      <Icon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', ICON_CLASSES[status])} aria-hidden />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-medium">
            {index + 1}. {check.label}
          </p>
          <StatusPill tone={CHECK_STATUS_TONES[status]} dot>
            {CHECK_STATUS_LABELS[status]}
          </StatusPill>
        </div>
        <p className="text-sm text-muted-foreground">{check.detail}</p>

        {check.review_decision && (
          <p className="text-sm">
            Marked {check.review_decision === 'OK' ? 'OK' : 'not OK'} by{' '}
            {check.reviewed_by_name || 'someone'}
            {check.reviewed_at ? `, ${formatDateTimeShort(check.reviewed_at)}` : ''}
            {check.review_remark ? ` — “${check.review_remark}”` : ''}. The app found:{' '}
            {CHECK_STATUS_LABELS[check.status]}.
          </p>
        )}

        {rows.length > 0 && (
          <div>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
              />
              {open ? 'Hide' : 'Show'} details
            </button>
            {open && (
              <div className="mt-2 rounded-md border bg-muted/30 p-2">
                <FactsTable rows={rows} />
              </div>
            )}
          </div>
        )}

        {canReview && <ReviewControls entryId={entryId} check={check} />}
      </div>
    </li>
  );
}

/** The ten checks on a bill, in order, each with what it was judged on. */
export function AuditChecklist({
  entryId,
  checks,
  canReview,
}: {
  entryId: number;
  checks: APInvoiceDraftCheck[];
  canReview: boolean;
}) {
  if (!checks.length) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">The checks have not run yet.</p>;
  }
  return (
    <ol className="divide-y">
      {checks.map((check, index) => (
        <CheckRow
          key={check.key}
          entryId={entryId}
          check={check}
          index={index}
          canReview={canReview}
        />
      ))}
    </ol>
  );
}
