import { CheckCircle2, Loader2, ScanLine } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { BST_LIVE_POLL_MS, useApproveBST, useBSTTransfer } from '../../api';
import { BSTBillTable } from './BSTBillTable';
import { BSTDocList } from './BSTDocList';
import { isLiveBst } from './bstFormat';
import { BSTStatusBadge } from './bstStatus';

export default function BSTReviewPage() {
  const { transferId: idParam } = useParams<{ transferId: string }>();
  const transferId = Number(idParam);
  const navigate = useNavigate();

  // Keep counts fresh while the receiver may be accepting concurrently.
  const { data: t, isLoading } = useBSTTransfer(transferId, {
    refetchInterval: BST_LIVE_POLL_MS,
  });
  const approveMut = useApproveBST();

  if (isLoading || !t) {
    return <p className="text-muted-foreground py-12 text-center">Loading…</p>;
  }

  // A live internal transfer is already in transit from its first scan; approving
  // it just *seals* the send. Allow it through IN_TRANSIT / RECEIVING until sealed.
  const live = isLiveBst(t);
  const liveActive =
    live &&
    !t.scan_approved_at &&
    (t.status === 'SCANNING' || t.status === 'IN_TRANSIT' || t.status === 'RECEIVING');
  const canApprove = t.status === 'SCANNING' || t.status === 'DRAFT' || liveActive;
  const totalBoxes = t.box_scans.length;

  const handleApprove = async () => {
    try {
      const updated = await approveMut.mutateAsync(transferId);
      toast.success(
        live
          ? 'Sending sealed — the destination can finalize when everything has landed'
          : updated.requires_gate
            ? 'Approved — sent to the gate for vehicle out'
            : 'Approved — now in transit',
      );
      navigate(`/warehouse/bst/${transferId}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not approve'));
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={`Review — ${t.entry_no}`}
        description={`${t.sap_from_warehouse || '—'} → ${t.sap_to_warehouse || '—'} · ${
          t.doc_count > 1 ? `${t.doc_count} SAP documents` : `SAP #${t.sap_doc_num}`
        }`}
      >
        <BSTStatusBadge status={t.status} />
      </DashboardHeader>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2 text-sm">
          {(
            [
              ['SAP Documents', t.doc_count > 1 ? `${t.doc_count} documents` : t.sap_doc_num || '—'],
              ['Invoice / Ref', t.invoice_no || '—'],
              ['Scanned boxes', String(totalBoxes)],
              ['Leaves on a vehicle', t.requires_gate ? 'Yes' : 'No'],
              ['Vehicle', t.vehicle_number || '—'],
              ['Driver', t.driver_name || '—'],
            ] as Array<[string, string]>
          ).map(([label, value]) => (
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

      {/* Bill vs scanned */}
      <Card>
        <CardContent className="pt-6">
          <p className="font-medium mb-3">Bill vs scanned ({t.items.length} items)</p>
          <BSTBillTable items={t.items} scans={t.box_scans} />
        </CardContent>
      </Card>

      {!canApprove ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            {t.scan_approved_by_name ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Approved by {t.scan_approved_by_name}
              </span>
            ) : (
              'This transfer can no longer be approved.'
            )}
            {t.requires_gate && (
              <Badge variant="outline" className="ml-2 text-amber-700">
                awaiting gate-out
              </Badge>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/warehouse/bst/${transferId}/scan`)}
          >
            <ScanLine className="h-4 w-4 mr-1" /> Back to scanning
          </Button>
          <Button onClick={handleApprove} disabled={totalBoxes === 0 || approveMut.isPending}>
            {approveMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-1" />
            )}
            {live ? 'Finish sending' : 'Approve scanning'}
          </Button>
        </div>
      )}
    </div>
  );
}
