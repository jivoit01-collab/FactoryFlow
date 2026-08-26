import { AlertTriangle, ExternalLink } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useCommitments } from '../api';
import { qty, qtyPrecise, shortDate } from './format';

/**
 * Why a committed figure is what it is.
 *
 * SAP publishes `IsCommited` as one number with no explanation, and it is the
 * figure that decides whether a component reads as available. On this company
 * most components are over-committed — more reserved than physically present —
 * so a buyer staring at a shortage has no way to tell whether the reservation is
 * a run next week or an order somebody abandoned two years ago.
 *
 * The answer is usually the latter, which is why staleness is the loudest thing
 * on this dialog: every commitment on the plan checked was held by a document
 * between 190 and 644 days overdue.
 */
export function CommitmentDialog({
  itemCode,
  warehouse,
  onClose,
}: {
  itemCode?: string;
  warehouse?: string;
  onClose: () => void;
}) {
  const open = Boolean(itemCode && warehouse);
  const query = useCommitments(itemCode, warehouse);
  const data = query.data;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Committed stock — {itemCode} in {warehouse}
          </DialogTitle>
          <DialogDescription>
            {data
              ? `${data.item_name || itemCode} · ${qty(data.committed_qty)} ${data.uom} reserved by ${data.meta.document_count} document${data.meta.document_count === 1 ? '' : 's'}`
              : 'Reading the documents that reserve this stock…'}
          </DialogDescription>
        </DialogHeader>

        {query.isError ? (
          <p className="text-sm text-destructive">
            {getErrorMessage(query.error, 'Could not read the commitments.')}
          </p>
        ) : null}

        {data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="On hand" value={`${qty(data.on_hand_qty)} ${data.uom}`} />
              <Figure
                label="Committed"
                value={`${qty(data.committed_qty)} ${data.uom}`}
                tone="warning"
              />
              <Figure
                label="Free"
                value={`${qty(data.free_qty)} ${data.uom}`}
                tone={Number(data.free_qty) < 0 ? 'critical' : 'neutral'}
              />
              <Figure label="On order" value={`${qty(data.on_order_qty)} ${data.uom}`} />
            </div>

            {/* The honesty check. A partial explanation presented as complete
                would send a buyer chasing the wrong documents. */}
            {!data.meta.reconciles ? (
              <p className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  These documents account for {qty(data.meta.explained_qty)} of the{' '}
                  {qty(data.committed_qty)} {data.uom} SAP reports as committed —{' '}
                  {qty(data.meta.unexplained_qty)} is unexplained. SAP recalculates
                  the figure on its own schedule, so this can be timing rather than
                  a missing document.
                </span>
              </p>
            ) : null}

            {data.meta.stale_document_count > 0 ? (
              <p className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {qty(data.meta.stale_qty)} {data.uom} is held by{' '}
                  {data.meta.stale_document_count} document
                  {data.meta.stale_document_count === 1 ? '' : 's'} overdue by more
                  than {data.meta.stale_after_days} days. Closing or cancelling those
                  in SAP would release the stock and reduce the shortage.
                </span>
              </p>
            ) : null}

            {data.by_source.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {data.by_source.map((source) => (
                  <span
                    key={source.source}
                    className="rounded border bg-card px-2.5 py-1 text-xs"
                  >
                    {source.source_label}:{' '}
                    <span className="font-mono font-medium tabular-nums">
                      {qty(source.committed_qty)}
                    </span>{' '}
                    <span className="text-muted-foreground">
                      ({source.document_count})
                    </span>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Document</th>
                    <th className="px-3 py-2 text-left font-medium">For</th>
                    <th className="px-3 py-2 text-right font-medium">Reserved</th>
                    <th className="px-3 py-2 text-right font-medium">Of planned</th>
                    <th className="px-3 py-2 text-left font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {data.documents.map((doc) => (
                    <tr
                      key={`${doc.source}-${doc.doc_entry}-${doc.doc_num}`}
                      className={cn('border-t', doc.is_stale ? 'bg-destructive/5' : '')}
                    >
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs">{doc.doc_num}</span>
                        <div className="text-xs text-muted-foreground">
                          {doc.source_label}
                          {doc.doc_status ? ` · ${doc.doc_status}` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs">{doc.reference_code}</span>
                        {doc.reference_name ? (
                          <div className="max-w-[220px] truncate text-xs text-muted-foreground">
                            {doc.reference_name}
                          </div>
                        ) : null}
                        {doc.to_warehouse ? (
                          <div className="text-xs text-muted-foreground">
                            to {doc.to_warehouse}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium tabular-nums">
                        {qtyPrecise(doc.committed_qty)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {/* Planned minus issued is what it still has to draw, so
                            showing both explains the reserved figure. */}
                        {qtyPrecise(doc.planned_qty)}
                        {Number(doc.issued_qty) > 0
                          ? ` − ${qtyPrecise(doc.issued_qty)} issued`
                          : ''}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {shortDate(doc.due_date)}
                        {doc.days_overdue > 0 ? (
                          <div
                            className={cn(
                              'text-[11px]',
                              doc.is_stale
                                ? 'font-medium text-destructive'
                                : 'text-muted-foreground',
                            )}
                          >
                            {doc.days_overdue} days overdue
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}

                  {!data.documents.length ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-sm text-muted-foreground"
                      >
                        No open document reserves this stock, yet SAP reports{' '}
                        {qty(data.committed_qty)} {data.uom} committed. That gap is
                        flagged above.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              {data.meta.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Figure({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'warning' | 'critical';
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 font-mono text-sm font-semibold tabular-nums',
          tone === 'critical' && 'text-destructive',
          tone === 'warning' && 'text-amber-600 dark:text-amber-400',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** The clickable Committed cell. Looks like a link because it is one. */
export function CommittedCell({
  value,
  onClick,
  className,
}: {
  value: string;
  onClick: () => void;
  className?: string;
}) {
  const committed = Number(value) || 0;

  if (committed === 0) {
    return <span className={cn('text-muted-foreground', className)}>—</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="Show the documents reserving this stock"
      className={cn(
        'inline-flex items-center gap-1 font-mono tabular-nums text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid',
        className,
      )}
    >
      {qty(value)}
      <ExternalLink className="h-3 w-3 opacity-60" />
    </button>
  );
}
