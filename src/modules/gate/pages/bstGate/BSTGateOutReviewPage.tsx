import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Loader2, LogOut } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useBSTTransfer, useMarkBSTGateOut } from '@/modules/warehouse/api';
import { BSTBillTable } from '@/modules/warehouse/pages/bst/BSTBillTable';
import { formatBstDateTime } from '@/modules/warehouse/pages/bst/bstFormat';
import { BSTVehicleDriverCard } from '@/modules/warehouse/pages/bst/BSTVehicleDriverCard';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

export default function BSTGateOutReviewPage() {
  const { transferId: idParam } = useParams<{ transferId: string }>();
  const transferId = Number(idParam);
  const navigate = useNavigate();

  const { data: t, isLoading } = useBSTTransfer(transferId);
  const markOut = useMarkBSTGateOut();

  if (isLoading || !t) {
    return <p className="text-muted-foreground py-12 text-center">Loading…</p>;
  }

  const awaitingGateOut = t.status === 'AWAITING_GATE_OUT';

  // A short load can only be sealed on an admin-approved partial-transfer
  // request. The gate is the last chance to notice that the truck is leaving
  // with less than the bill, so say it here instead of leaving the approval
  // banner looking identical to a full load's.
  const scanStatus = t.scan_status;
  const partial = t.partial_transfer;
  const isShort = !!scanStatus?.is_partial;
  // The serializer only carries the LATEST request, so a re-requested/rejected
  // trail can hide the approval that actually released the seal. A sealed short
  // load can only exist because an approval was granted, so trust that too.
  const partialApproved = isShort && (!!partial?.is_approved || !!t.scan_approved_at);
  const shortfallQty = scanStatus
    ? Number(scanStatus.expected_qty) - Number(scanStatus.scanned_qty)
    : 0;

  const handleMarkOut = async () => {
    try {
      await markOut.mutateAsync(transferId);
      toast.success('Vehicle marked out — now in transit');
      navigate('/gate/bst-out');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not mark out'));
    }
  };

  const infoRows: Array<[string, string]> = [
    ['SAP Doc', t.sap_doc_num || '—'],
    ['Warehouses', `${t.sap_from_warehouse || '—'} → ${t.sap_to_warehouse || '—'}`],
    ['Invoice / Ref', t.invoice_no || '—'],
    // Where the warehouse's work ends and the gate's begins.
    ['Loaded at', formatBstDateTime(t.loaded_at)],
    // Vehicle + driver sit in their own card below: the gate is usually the one
    // that spots a swapped truck, and it can still be corrected until mark-out.
    ['Scanned boxes', String(t.box_scans.length)],
    // The box count alone hides a short load — the partial approval is granted
    // against the QUANTITY gate, so show that alongside it.
    ...(scanStatus?.uses_quantity
      ? ([
          ['Scanned quantity', `${scanStatus.scanned_qty} of ${scanStatus.expected_qty} PCS`],
        ] as Array<[string, string]>)
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/gate/bst-out')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <DashboardHeader
          title={`BST Out — ${t.entry_no}`}
          description="Verify the load and the warehouse approval, then mark the vehicle out"
        >
          {isShort && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
              Partial load
            </Badge>
          )}
        </DashboardHeader>
      </div>

      {/* Warehouse approval banner */}
      <Card className={t.scan_approved_by_name ? 'border-green-200' : 'border-amber-300'}>
        <CardContent className="py-4 text-sm">
          {t.scan_approved_by_name ? (
            <span className="inline-flex flex-wrap items-center gap-2 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              Scanning approved by <span className="font-medium">
                {t.scan_approved_by_name}
              </span> · {formatBstDateTime(t.scan_approved_at)}
              {partialApproved && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  on a partial approval
                </Badge>
              )}
            </span>
          ) : (
            <span className="text-amber-800">Not yet approved by the warehouse.</span>
          )}
          {t.loaded_at && (
            <p className="mt-2 text-muted-foreground">
              Loading finished {formatBstDateTime(t.loaded_at)} — the vehicle has been the
              gate&rsquo;s from then on.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Short-load banner — why this truck is allowed to leave incomplete */}
      {isShort && (
        <Card className={partialApproved ? 'border-amber-300' : 'border-red-300'}>
          <CardContent
            className={`space-y-2 py-4 text-sm ${
              partialApproved ? 'text-amber-800' : 'text-red-800'
            }`}
          >
            <div className="flex items-start gap-2">
              {partialApproved ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : partial?.is_pending ? (
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>
                {partialApproved ? (
                  <>
                    <span className="font-medium">
                      Partial load — sealed on an approved short scan.
                    </span>{' '}
                    Leaving with {scanStatus?.scanned_qty} of {scanStatus?.expected_qty} PCS
                    {shortfallQty > 0 ? ` (${shortfallQty} PCS short)` : ''}.
                  </>
                ) : partial?.is_pending ? (
                  <>
                    <span className="font-medium">
                      Short load — partial approval still pending.
                    </span>{' '}
                    Scanned {scanStatus?.scanned_qty} of {scanStatus?.expected_qty} PCS. Check with
                    the warehouse before marking the vehicle out.
                  </>
                ) : (
                  <>
                    <span className="font-medium">Short load — no partial approval on record.</span>{' '}
                    Scanned {scanStatus?.scanned_qty} of {scanStatus?.expected_qty} PCS. Check with
                    the warehouse before marking the vehicle out.
                  </>
                )}
              </span>
            </div>

            {(scanStatus?.short_items.length ?? 0) > 0 && (
              <p className="pl-6">
                Short:{' '}
                {scanStatus?.short_items
                  .map(
                    (i) =>
                      `${i.item_code} (${Number(i.expected_qty) - Number(i.scanned_qty)} ${i.uom})`,
                  )
                  .join(', ')}
                .
              </p>
            )}

            {partial && (
              <div className="space-y-1 pl-6">
                {partial.reason && (
                  <p>
                    <span className="text-muted-foreground">Reason:</span> {partial.reason}
                  </p>
                )}
                {partial.is_approved && (
                  <p>
                    <span className="text-muted-foreground">Partial approved by:</span>{' '}
                    {partial.reviewed_by_name || '—'} · {formatBstDateTime(partial.reviewed_at)}
                    {partial.review_notes ? ` · ${partial.review_notes}` : ''}
                  </p>
                )}
                {partial.is_pending && (
                  <p>
                    <span className="text-muted-foreground">Requested by:</span>{' '}
                    {partial.requested_by_name || '—'} · {formatBstDateTime(partial.requested_at)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2 text-sm">
          {infoRows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b py-1.5">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-right">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <BSTVehicleDriverCard transfer={t} />

      {/* Bill vs scanned */}
      <Card>
        <CardContent className="pt-6">
          <p className="font-medium mb-3">Bill vs scanned ({t.items.length} items)</p>
          <BSTBillTable items={t.items} scans={t.box_scans} manualEntries={t.manual_entries} />
        </CardContent>
      </Card>

      {awaitingGateOut ? (
        <div className="flex justify-end">
          <Button onClick={handleMarkOut} disabled={markOut.isPending}>
            {markOut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <LogOut className="h-4 w-4 mr-1" />
            )}
            Mark vehicle out
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            This transfer is not awaiting gate-out.
            <Badge variant="outline" className="ml-2">
              {t.status}
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
