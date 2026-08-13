import { Loader2, ScanLine, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, Input, Label } from '@/shared/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { getErrorMessage } from '@/shared/utils';

import { BST_LIVE_POLL_MS, useBSTTransfer, useCancelBST } from '../../api';
import type { BSTReceiveStatus } from '../../types';
import { BSTBillTable } from './BSTBillTable';
import { BSTDocList } from './BSTDocList';
import { formatBstDateTime, isLiveBst } from './bstFormat';
import { BSTStatusBadge } from './bstStatus';

function ReceiveBadge({ status }: { status: BSTReceiveStatus }) {
  const cfg: Record<BSTReceiveStatus, string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${cfg[status]}`}>
      {status}
    </span>
  );
}

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

  if (isLoading || !t) {
    return <p className="text-muted-foreground py-12 text-center">Loading…</p>;
  }

  // A live internal transfer stays sender-scannable through IN_TRANSIT / RECEIVING
  // until it's sealed via approve (scan_approved_at), so keep "Resume scanning".
  const liveActive =
    isLiveBst(t) &&
    !t.scan_approved_at &&
    (t.status === 'IN_TRANSIT' || t.status === 'RECEIVING');
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
    ['Vehicle', t.vehicle_number || '—'],
    ['Driver', t.driver_name || '—'],
    ['Requires gate', t.requires_gate ? 'Yes' : 'No'],
    ['Created by', `${t.created_by_name} · ${formatBstDateTime(t.created_at)}`],
    ['Dispatched', t.dispatched_at ? `${t.dispatched_by_name} · ${formatBstDateTime(t.dispatched_at)}` : '—'],
    ['Gated out', formatBstDateTime(t.gated_out_at)],
    ['Gated in', formatBstDateTime(t.gated_in_at)],
    ['Received', t.received_at ? `${t.received_by_name} · ${formatBstDateTime(t.received_at)}` : '—'],
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

      {/* SAP documents (only when the entry combines more than one) */}
      {t.docs.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <p className="font-medium mb-3">SAP documents ({t.docs.length})</p>
            <BSTDocList docs={t.docs} />
          </CardContent>
        </Card>
      )}

      {/* Items + scan progress */}
      <Card>
        <CardContent className="pt-6">
          <p className="font-medium mb-3">Stock to transfer ({t.items.length} items)</p>
          <BSTBillTable items={t.items} scans={t.box_scans} manualEntries={t.manual_entries} />
        </CardContent>
      </Card>

      {/* Box scans */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium">Boxes ({t.box_scans.length})</p>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-green-700">
                {t.accepted_count} accepted
              </Badge>
              <Badge variant="outline" className="text-red-700">
                {t.rejected_count} rejected
              </Badge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-3">Box</th>
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3">Pallet</th>
                  <th className="py-2 px-3">Receive</th>
                </tr>
              </thead>
              <tbody>
                {t.box_scans.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-2 px-3 font-medium">
                      {s.box_barcode}
                      {s.is_unexpected && (
                        <Badge variant="outline" className="ml-1 text-amber-700">
                          unexpected
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-3">{s.item_code}</td>
                    <td className="py-2 px-3">{s.pallet_code || '—'}</td>
                    <td className="py-2 px-3">
                      <ReceiveBadge status={s.receive_status} />
                      {s.reject_reason && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({s.reject_reason})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
