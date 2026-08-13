import { ArrowLeft, CheckCircle2, Loader2, LogOut } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useBSTTransfer, useMarkBSTGateOut } from '@/modules/warehouse/api';
import { BSTBillTable } from '@/modules/warehouse/pages/bst/BSTBillTable';
import { formatBstDateTime } from '@/modules/warehouse/pages/bst/bstFormat';
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
    ['Vehicle', t.vehicle_number || '—'],
    ['Driver', t.driver_name || '—'],
    ['Scanned boxes', String(t.box_scans.length)],
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
        />
      </div>

      {/* Warehouse approval banner */}
      <Card className={t.scan_approved_by_name ? 'border-green-200' : 'border-amber-300'}>
        <CardContent className="py-4 text-sm">
          {t.scan_approved_by_name ? (
            <span className="inline-flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              Scanning approved by <span className="font-medium">{t.scan_approved_by_name}</span> ·{' '}
              {formatBstDateTime(t.scan_approved_at)}
            </span>
          ) : (
            <span className="text-amber-800">Not yet approved by the warehouse.</span>
          )}
        </CardContent>
      </Card>

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
