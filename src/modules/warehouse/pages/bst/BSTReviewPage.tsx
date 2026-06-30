import { CheckCircle2, Loader2, ScanLine } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useApproveBST, useBSTTransfer } from '../../api';
import { BSTStatusBadge } from './bstStatus';

export default function BSTReviewPage() {
  const { transferId: idParam } = useParams<{ transferId: string }>();
  const transferId = Number(idParam);
  const navigate = useNavigate();

  const { data: t, isLoading } = useBSTTransfer(transferId);
  const approveMut = useApproveBST();

  const scannedByItem = useMemo(() => {
    const map = new Map<string, { qty: number; boxes: number }>();
    for (const s of t?.box_scans ?? []) {
      const cur = map.get(s.item_code) ?? { qty: 0, boxes: 0 };
      cur.qty += Number(s.quantity) || 0;
      cur.boxes += 1;
      map.set(s.item_code, cur);
    }
    return map;
  }, [t]);

  if (isLoading || !t) {
    return <p className="text-muted-foreground py-12 text-center">Loading…</p>;
  }

  const canApprove = t.status === 'SCANNING' || t.status === 'DRAFT';
  const totalBoxes = t.box_scans.length;

  const handleApprove = async () => {
    try {
      const updated = await approveMut.mutateAsync(transferId);
      toast.success(
        updated.requires_gate
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
        description={`${t.sap_from_warehouse || '—'} → ${t.sap_to_warehouse || '—'} · SAP #${t.sap_doc_num}`}
      >
        <BSTStatusBadge status={t.status} />
      </DashboardHeader>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2 text-sm">
          {(
            [
              ['SAP Doc', t.sap_doc_num || '—'],
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

      {/* Bill vs scanned */}
      <Card>
        <CardContent className="pt-6">
          <p className="font-medium mb-3">Bill vs scanned ({t.items.length} items)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3 text-right">Bill Qty</th>
                  <th className="py-2 px-3 text-right">Scanned Qty</th>
                  <th className="py-2 px-3 text-right">Boxes</th>
                </tr>
              </thead>
              <tbody>
                {t.items.map((it) => {
                  const scanned = scannedByItem.get(it.item_code);
                  return (
                    <tr key={it.id} className="border-b">
                      <td className="py-2 px-3">
                        <p className="font-medium">{it.item_code}</p>
                        <p className="text-xs text-muted-foreground">{it.item_name}</p>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {it.quantity} {it.uom}
                      </td>
                      <td className="py-2 px-3 text-right">{scanned?.qty ?? 0}</td>
                      <td className="py-2 px-3 text-right">{scanned?.boxes ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
            Approve scanning
          </Button>
        </div>
      )}
    </div>
  );
}
