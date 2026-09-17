import { ArrowLeft, Loader2, PackageMinus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { useShortDispatch } from '../api';
import { ShortDispatchPrintButton } from '../components/ShortDispatchPrintButton';
import { formatDateTime, formatQty } from '../utils';

/**
 * One posted short dispatch, read-only.
 *
 * There is nothing to edit here: the A/R Return is already in SAP and this app
 * cannot withdraw it (SAP restricts cancelling one to a named list of users). A
 * mistake is corrected in SAP, and the page says so rather than offering a button
 * that would not work.
 */
export default function ShortDispatchDetailPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useShortDispatch(Number(entryId));

  if (isLoading || !entry) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/warehouse/short-dispatch')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <PackageMinus className="h-6 w-6 text-amber-600" />
              {entry.entry_no}
            </h2>
            <p className="text-sm text-muted-foreground">
              Against invoice {entry.sap_invoice_doc_num} ·{' '}
              {entry.customer_name || entry.customer_code}
            </p>
          </div>
        </div>
        {entry.sap_return_doc_entry && (
          <ShortDispatchPrintButton id={entry.id} docNum={entry.sap_return_doc_num} />
        )}
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="SAP Return" value={entry.sap_return_doc_num || '-'} emphasis />
          <Field label="Returned Into" value={entry.warehouse_code} />
          <Field label="Posted" value={formatDateTime(entry.posted_at || entry.created_at)} />
          <Field label="Posted By" value={entry.posted_by_name || '-'} />
          {entry.remarks && (
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs uppercase text-muted-foreground">Remarks</p>
              <p className="text-sm">{entry.remarks}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Billed</th>
                  <th className="px-4 py-3">Short</th>
                  <th className="px-4 py-3">Billed Batch</th>
                  <th className="px-4 py-3">Billed From</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td className="px-4 py-3">
                      <p className="font-medium">{line.item_name || line.item_code}</p>
                      <p className="text-xs text-muted-foreground">{line.item_code}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatQty(line.invoice_quantity)} {line.uom}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatQty(line.short_quantity)} {line.uom}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.original_batch_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.source_warehouse_code || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="border-0 bg-slate-100 dark:bg-muted text-slate-700 dark:text-muted-foreground">
                        {line.reason_display}
                      </Badge>
                      {line.remarks && (
                        <p className="mt-1 text-xs text-muted-foreground">{line.remarks}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Said once, here, where somebody looking for an undo button will look. */}
      <p className="text-xs text-muted-foreground">
        SAP holds the returned stock under a new batch number of its own — it will not receive into
        a batch that already exists — so the batch above is what is physically on the floor, not
        what SAP now shows. A short dispatch cannot be withdrawn from this app; a mistake has to be
        corrected in SAP.
      </p>
    </div>
  );
}

function Field({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className={emphasis ? 'text-sm font-semibold text-emerald-700 dark:text-emerald-400' : 'text-sm'}>{value}</p>
    </div>
  );
}
