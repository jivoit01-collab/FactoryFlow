import { Loader2, PackageCheck, Printer, ScanLine, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { ScanGroupCard, ScanMetricTile, ScanStatusBadge } from '@/shared/components/scanReview';
import { Badge, Button, Card, CardContent, Input, Label } from '@/shared/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { getErrorMessage } from '@/shared/utils';

import { BST_LIVE_POLL_MS, useBSTTransfer, useCancelBST, useWarehousePrintInfo } from '../../api';
import {
  BranchStockTransferPrint,
  BST_DOC_PRINT_PAGE_STYLE,
} from '../../components/BranchStockTransferPrint';
import { BSTBillTable } from './BSTBillTable';
import { BSTDocList } from './BSTDocList';
import { formatBstDateTime, isLiveBst } from './bstFormat';
import {
  BSTScannedBoxesSheet,
  BSTScanProgressPill,
  type BstScanSheetFilter,
} from './BSTScannedBoxesSheet';
import { formatBstNumber, summarizeBstBill } from './bstScanSummary';
import { BSTStatusBadge } from './bstStatus';
import { BSTVehicleDriverCard } from './BSTVehicleDriverCard';

export default function BSTDetailPage() {
  const { transferId: idParam } = useParams<{ transferId: string }>();
  const transferId = Number(idParam);
  const navigate = useNavigate();

  const { data: t, isLoading } = useBSTTransfer(transferId, {
    refetchInterval: BST_LIVE_POLL_MS,
  });
  const cancelMut = useCancelBST();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [billOpen, setBillOpen] = useState(true);
  const [boxesOpen, setBoxesOpen] = useState(false);
  const [scanFilter, setScanFilter] = useState<BstScanSheetFilter>({
    document: 'ALL',
    item: 'ALL',
    query: '',
  });

  // Opened from the header button (unfiltered) or an item row (pre-filtered to it).
  const openScanSheet = (filter: BstScanSheetFilter) => {
    setScanFilter(filter);
    setBoxesOpen(true);
  };

  // SAP-style Branch Stock Transfer print. Letterhead data (addresses, GST)
  // loads in the background; the print works with blanks if SAP is down.
  const printRef = useRef<HTMLDivElement>(null);
  const printInfo = useWarehousePrintInfo([t?.sap_from_warehouse, t?.sap_to_warehouse]);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: t?.entry_no || 'branch-stock-transfer',
    pageStyle: BST_DOC_PRINT_PAGE_STYLE,
  });

  if (isLoading || !t) {
    return <p className="text-muted-foreground py-12 text-center">Loading…</p>;
  }

  // A live internal transfer stays sender-scannable through IN_TRANSIT / RECEIVING
  // until it's sealed via approve (scan_approved_at), so keep "Resume scanning".
  const liveActive =
    isLiveBst(t) && !t.scan_approved_at && (t.status === 'IN_TRANSIT' || t.status === 'RECEIVING');
  const canResume = t.status === 'SCANNING' || t.status === 'DRAFT' || liveActive;
  const canCancel = !['RECEIVED', 'PARTIALLY_RECEIVED', 'CLOSED', 'CANCELLED'].includes(t.status);

  const handleCancel = async () => {
    try {
      await cancelMut.mutateAsync({
        transferId,
        cancelReason: cancelReason.trim() || 'Cancelled from detail page',
      });
      toast.success('BST cancelled');
      setCancelOpen(false);
      setCancelReason('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not cancel'));
    }
  };

  const isInvoice = t.source_type === 'INVOICE';
  // Same tallies the bill table renders — reused for the header tiles and badges.
  const bill = summarizeBstBill(t.items, t.box_scans);
  const infoRows: Array<[string, string]> = [
    ['Type', isInvoice ? 'Invoice — cross-company sale' : 'Stock transfer'],
    ['Company', `${t.company_name} (${t.company_code})`],
    ...(isInvoice
      ? ([
          [
            'Destination company',
            t.destination_company_name
              ? `${t.destination_company_name} (${t.destination_company_code})`
              : '—',
          ],
          ['Customer', t.customer_name || t.customer_code || '—'],
          ['Source warehouse', t.sap_from_warehouse || '—'],
        ] as Array<[string, string]>)
      : ([['Warehouses', `${t.sap_from_warehouse || '—'} → ${t.sap_to_warehouse || '—'}`]] as Array<
          [string, string]
        >)),
    ['SAP Documents', t.doc_count > 1 ? `${t.doc_count} documents` : t.sap_doc_num || '—'],
    ['Invoice / Ref', t.invoice_no || '—'],
    // Vehicle + driver live in their own card below — they stay editable until
    // the gate marks the transfer out.
    ['Requires gate', t.requires_gate ? 'Yes' : 'No'],
    ['Created by', `${t.created_by_name} · ${formatBstDateTime(t.created_at)}`],
    [
      'Dispatched',
      t.dispatched_at ? `${t.dispatched_by_name} · ${formatBstDateTime(t.dispatched_at)}` : '—',
    ],
    ['Gated out', formatBstDateTime(t.gated_out_at)],
    ['Gated in', formatBstDateTime(t.gated_in_at)],
    [
      'Received',
      t.received_at ? `${t.received_by_name} · ${formatBstDateTime(t.received_at)}` : '—',
    ],
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader title={t.entry_no} description="Branch stock transfer detail">
        <div className="flex items-center gap-2">
          {isInvoice && (
            <Badge variant="outline" className="text-blue-700">
              Invoice · cross-company
            </Badge>
          )}
          <BSTStatusBadge status={t.status} />
          <Button variant="outline" onClick={() => handlePrint()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          {canResume && (
            <Button onClick={() => navigate(`/warehouse/bst/${transferId}/scan`)}>
              <ScanLine className="h-4 w-4 mr-1" /> Resume scanning
            </Button>
          )}
          {canCancel && (
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
              <XCircle className="h-4 w-4 mr-1" /> Cancel transfer
            </Button>
          )}
        </div>
      </DashboardHeader>

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

      {/* SAP documents (only when the entry combines more than one) */}
      {t.docs.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <p className="font-medium mb-3">SAP documents ({t.docs.length})</p>
            <BSTDocList docs={t.docs} />
          </CardContent>
        </Card>
      )}

      {/* Items + scan progress — the same review layout as the dispatch scan page */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Stock to transfer</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openScanSheet({ document: 'ALL', item: 'ALL', query: '' })}
            >
              <PackageCheck className="mr-2 h-4 w-4" />
              Scanned Boxes
              <BSTScanProgressPill
                scanned={bill.scannedBoxes}
                expected={bill.expectedBoxes}
                className="ml-2"
              />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ScanMetricTile
              label="Expected Boxes"
              value={bill.expectedBoxes > 0 ? formatBstNumber(bill.expectedBoxes) : '-'}
            />
            <ScanMetricTile
              label="Scanned Boxes"
              value={formatBstNumber(bill.scannedBoxes)}
              hint={bill.offBillBoxes > 0 ? `${formatBstNumber(bill.offBillBoxes)} off-bill` : ''}
            />
            <ScanMetricTile
              label="Scanned Qty"
              value={bill.scannedQty > 0 ? formatBstNumber(bill.scannedQty) : '-'}
              hint={bill.expectedQty > 0 ? `of ${formatBstNumber(bill.expectedQty)}` : ''}
            />
            {/* The destination's side of the ledger: boxes we sent vs boxes they have
                accepted so far — the figure the old Boxes card carried. */}
            <ScanMetricTile
              label="Received by destination"
              value={`${formatBstNumber(t.accepted_count)} of ${formatBstNumber(t.box_scans.length)}`}
              hint={t.rejected_count > 0 ? `${formatBstNumber(t.rejected_count)} rejected` : ''}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Scan progress</span>
              <span>
                {bill.expectedQty > 0 || bill.expectedBoxes > 0
                  ? `${bill.progressPercent}%`
                  : 'Open count'}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${bill.progressPercent}%` }}
              />
            </div>
          </div>
          <ScanGroupCard
            isOpen={billOpen}
            onToggle={() => setBillOpen((open) => !open)}
            title={
              <>
                {t.doc_count > 1
                  ? `${t.doc_count} SAP documents`
                  : `Bill ${t.sap_doc_num || t.entry_no}`}
                {t.customer_name ? (
                  <span className="font-normal text-muted-foreground"> · {t.customer_name}</span>
                ) : null}
              </>
            }
            subtitle={`${t.items.length} item${t.items.length === 1 ? '' : 's'}`}
            badges={
              <>
                <Badge variant="outline">
                  {bill.scannedBoxes}
                  {bill.expectedBoxes > 0 ? `/${bill.expectedBoxes}` : ''} box
                  {bill.scannedBoxes === 1 && bill.expectedBoxes <= 1 ? '' : 'es'}
                </Badge>
                <ScanStatusBadge
                  status={
                    bill.status === 'Complete'
                      ? 'complete'
                      : bill.status === 'Partial'
                        ? 'partial'
                        : 'open'
                  }
                  label={bill.status}
                />
              </>
            }
          >
            <BSTBillTable
              items={t.items}
              scans={t.box_scans}
              manualEntries={t.manual_entries}
              onOpenItem={(itemCode) =>
                openScanSheet({ document: 'ALL', item: itemCode, query: '' })
              }
            />
          </ScanGroupCard>
        </CardContent>
      </Card>

      {/* All scanned boxes live in a side panel, same as the docking detail page. */}
      <BSTScannedBoxesSheet
        items={t.items}
        scans={t.box_scans}
        docs={t.docs}
        open={boxesOpen}
        onOpenChange={setBoxesOpen}
        filter={scanFilter}
        onFilterChange={setScanFilter}
      />

      <div className="bst-doc-print-host" aria-hidden>
        <BranchStockTransferPrint
          ref={printRef}
          printInfo={printInfo.data ?? null}
          companyName={t.company_name}
          data={{
            docNum:
              t.docs.length > 1
                ? t.docs
                    .map((d) => d.sap_doc_num)
                    .filter(Boolean)
                    .join(', ')
                : t.sap_doc_num || t.entry_no,
            docEntry: t.sap_doc_entry,
            docDate: t.sap_doc_date,
            reference: t.entry_no,
            fromWarehouse: t.sap_from_warehouse,
            toWarehouse: t.sap_to_warehouse,
            vehicleNo: t.vehicle_number,
            dispatchDate: t.dispatched_at,
            destination: isInvoice
              ? t.destination_company_name || t.customer_name
              : t.sap_to_warehouse,
            lines: t.items.map((item) => ({
              description: item.item_name || item.item_code,
              quantity: Number(item.quantity) || 0,
              uom: item.uom,
              boxes: item.expected_boxes,
            })),
          }}
        />
      </div>

      {/* Cancel confirmation */}
      <Dialog open={cancelOpen} onOpenChange={(open) => !open && setCancelOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {t.entry_no}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This cancels the branch stock transfer. Scanned boxes are released and it can no
              longer be dispatched or received. This can't be undone.
            </p>
            <div className="space-y-1">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Input
                id="cancel-reason"
                autoFocus
                placeholder="Why is this being cancelled?"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCancel()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelOpen(false)}>
                Keep transfer
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={cancelMut.isPending}>
                {cancelMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Cancel transfer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
