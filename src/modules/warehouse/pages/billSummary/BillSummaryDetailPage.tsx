import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Printer,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import { DISPATCH_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, Input, Label } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useBillSummary,
  useCancelBillSummary,
  usePostBillSummaryToSap,
} from '../../api';
import { BILL_SUMMARY_PRINT_STYLE, BillSummaryPrint } from './BillSummaryPrint';

function num(value: string | number, dp = 0): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })
    : '0';
}

export default function BillSummaryDetailPage() {
  const { summaryId } = useParams();
  const id = Number(summaryId);
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  const { data: summary, isLoading } = useBillSummary(Number.isFinite(id) ? id : null);
  const post = usePostBillSummaryToSap(id);
  const cancel = useCancelBillSummary(id);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: BILL_SUMMARY_PRINT_STYLE,
    documentTitle: summary?.entry_no ?? 'bill-summary',
  });

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!summary) return <p className="p-6 text-sm text-red-600">Bill summary not found.</p>;

  const canPost = hasPermission(DISPATCH_PERMISSIONS.CREATE_BILL_SUMMARY);
  const canCancel = hasPermission(DISPATCH_PERMISSIONS.CANCEL_BILL_SUMMARY);
  const isOpen = summary.status === 'GENERATED';

  async function run(action: () => Promise<unknown>, ok: string, fail: string) {
    try {
      await action();
      toast.success(ok);
    } catch (err) {
      toast.error(getErrorMessage(err, fail));
    }
  }

  /* A refused SAP posting comes back as a perfectly good HTTP 200: the server
     records the refusal on the sheet rather than raising, precisely so a sheet
     already in the operator's hands is never rolled back. So the reply has to be
     read, not merely awaited — `run` above would call a rejected posting a
     success and say "Posted to SAP" over the top of the failure it just left on
     screen. */
  async function retrySap() {
    const cancelled = summary!.status === 'CANCELLED';
    try {
      const updated = await post.mutateAsync();
      if (updated.sap_status === 'FAILED') {
        toast.error(updated.sap_error || 'SAP refused it again');
        return;
      }
      toast.success(cancelled ? 'Cleared from SAP' : 'Posted to SAP');
      if (updated.sap_note) toast.warning(updated.sap_note);
    } catch (err) {
      toast.error(getErrorMessage(err, 'SAP refused it again'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={summary.entry_no}
        description={`Bill ${summary.sap_invoice_doc_num} · ${
          summary.customer_name || summary.customer_code
        }`}
      >
        <Button variant="outline" onClick={() => navigate('/warehouse/bill-summaries')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => handlePrint()}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </DashboardHeader>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-4">
          <Field label="Status" value={summary.status} />
          <Field label="Dispatch date" value={summary.dispatch_date} />
          <Field label="Warehouse" value={summary.warehouse_codes || '—'} />
          <Field
            label="Totals"
            value={`${summary.totals.lines} line · ${num(summary.totals.boxes)} box · ${num(
              summary.totals.litres,
            )} L`}
          />
          <Field label="Bilty" value={summary.bilty_no || '—'} />
          <Field label="Transporter" value={summary.transporter_name || '—'} />
          <Field label="Vehicle" value={summary.vehicle_no || '—'} />
          <Field
            label="Driver"
            value={
              summary.driver_name
                ? `${summary.driver_name}${
                    summary.driver_mobile ? ` · ${summary.driver_mobile}` : ''
                  }`
                : '—'
            }
          />
          <Field label="Issued by" value={summary.issued_by_name || '—'} />
          {summary.remarks && (
            <div className="sm:col-span-2">
              <p className="text-xs uppercase text-muted-foreground">Remarks</p>
              <p className="text-sm">{summary.remarks}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* A sheet in the operator's hands whose posting failed is the state that
          needs chasing: the goods are moving and SAP does not know. */}
      {summary.sap_status === 'FAILED' && (
        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            {/* A cancelled sheet's SAP job is to REMOVE the stamp, so a failure
                there means the invoice still claims a dispatch nobody is making. */}
            {summary.status === 'CANCELLED'
              ? 'Cancelled here, but the dispatch is still on the SAP invoice'
              : 'Not posted to SAP'}
          </p>
          <pre className="whitespace-pre-wrap font-sans text-xs">{summary.sap_error}</pre>
          {canPost && (
            <Button
              size="sm"
              variant="outline"
              disabled={post.isPending}
              onClick={() => void retrySap()}
            >
              {post.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {summary.status === 'CANCELLED'
                ? 'Retry clearing it from SAP'
                : 'Retry the SAP posting'}
            </Button>
          )}
        </div>
      )}

      {summary.sap_status === 'POSTED' && (
        <div className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
          <p>
            Posted to SAP — the dispatch date and quantities are on invoice{' '}
            {summary.sap_invoice_doc_num}.
          </p>
          {/* Posted, but not identical: what the driver is carrying differs from
              the invoice, and nobody can change the invoice now. */}
          {summary.sap_note && <p className="text-xs font-medium">{summary.sap_note}</p>}
        </div>
      )}

      {summary.status === 'CANCELLED' && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200">
          <strong>Cancelled</strong>
          {summary.cancel_reason && <> — {summary.cancel_reason}</>}
          {summary.sap_status === 'NOT_POSTED' && (
            <div className="mt-1 text-xs">
              The dispatch date and quantities have been cleared from invoice{' '}
              {summary.sap_invoice_doc_num}. The bilty number is left as it was — it
              belongs to the transporter&apos;s consignment note, not to this sheet.
            </div>
          )}
        </div>
      )}

      <Card>
        <CardContent className="space-y-2 p-6">
          <div className="text-sm font-semibold">Lines to fetch ({summary.lines.length})</div>
          {summary.lines.map((line) => (
            <div
              key={line.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <span className="min-w-0">
                <strong>{line.item_code}</strong> {line.item_name}
                {line.is_short && (
                  <Badge variant="outline" className="ml-2 border-amber-400 text-amber-700">
                    short
                  </Badge>
                )}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {num(line.dispatch_qty, 2)} of {num(line.invoice_qty, 2)} {line.uom} ·{' '}
                {Number(line.pcs_per_box) > 0 ? `${num(line.boxes, 2)} box` : 'loose'} ·{' '}
                {num(line.litres, 2)} L · {line.warehouse_code}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {isOpen && (
        <div className="flex flex-wrap justify-end gap-2">
          {canCancel && (
            <Button variant="outline" onClick={() => setShowCancel((v) => !v)}>
              <XCircle className="mr-2 h-4 w-4" /> Cancel sheet
            </Button>
          )}
        </div>
      )}

      {showCancel && (
        <Card className="border-rose-300">
          <CardContent className="space-y-3 p-4">
            <Label htmlFor="bs-cancel">Why is this sheet being cancelled?</Label>
            {summary.sap_status === 'POSTED' && (
              <p className="text-xs text-muted-foreground">
                This will also clear the dispatch date and quantities from SAP invoice{' '}
                {summary.sap_invoice_doc_num}.
              </p>
            )}
            <Input
              id="bs-cancel"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Wrong vehicle, bill amended…"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCancel(false)}>
                Keep it
              </Button>
              <Button
                variant="destructive"
                disabled={cancel.isPending}
                onClick={() =>
                  run(
                    async () => {
                      await cancel.mutateAsync(cancelReason);
                      setShowCancel(false);
                    },
                    'Sheet cancelled',
                    'Could not cancel the sheet.',
                  )
                }
              >
                Cancel the sheet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Off-screen, rendered only so the print handler has something to take.
          Bounded and clipped: an unbounded host lets a wide child spill back
          into view, which is exactly what happened once. */}
      <div
        aria-hidden
        className="pointer-events-none"
        style={{
          position: 'fixed',
          left: '-10000px',
          top: 0,
          width: '595pt',
          height: 0,
          overflow: 'hidden',
        }}
      >
        <BillSummaryPrint ref={printRef} summary={summary} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
