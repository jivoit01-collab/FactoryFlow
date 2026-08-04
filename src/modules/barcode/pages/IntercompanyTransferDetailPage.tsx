import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { useIntercompanyTransfer, useReverseIntercompanyTransfer } from '../api';
import { toastBarcodeError } from '../utils/errors';

export default function IntercompanyTransferDetailPage() {
  const navigate = useNavigate();
  const { transferId } = useParams();
  const id = transferId ? Number(transferId) : null;
  const transferQuery = useIntercompanyTransfer(id);
  const reverseMutation = useReverseIntercompanyTransfer();
  const transfer = transferQuery.data;

  const handleReverse = async () => {
    if (!transfer) return;
    const reason = window.prompt('Reverse reason');
    if (reason === null) return;
    try {
      await reverseMutation.mutateAsync({
        transferId: transfer.id,
        data: { reason, device_id: 'web' },
      });
      toast.success('Transfer reversed');
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to reverse this transfer.');
    }
  };

  if (transferQuery.isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }
  if (!transfer) {
    return <div className="p-8 text-center text-muted-foreground">Transfer not found</div>;
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={transfer.transfer_number}
        description={`${transfer.source_company_code} -> ${transfer.destination_company_code}`}
      >
        <Button variant="outline" onClick={() => navigate('/barcode/intercompany')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        {transfer.status !== 'REVERSED' && (
          <Button variant="outline" onClick={handleReverse} disabled={reverseMutation.isPending}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reverse
          </Button>
        )}
      </DashboardHeader>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge
              className={
                transfer.status === 'REVERSED'
                  ? 'mt-1 bg-red-100 text-red-800'
                  : 'mt-1 bg-green-100 text-green-800'
              }
            >
              {transfer.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Barcodes</p>
            <p className="mt-1 text-2xl font-semibold">{transfer.total_barcodes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Quantity</p>
            <p className="mt-1 text-2xl font-semibold">
              {transfer.total_qty} {transfer.uom}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Received Into</p>
            <p className="mt-1 font-semibold">{transfer.destination_warehouse || 'Kept source WH'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">SAP</p>
            <p className="mt-1 font-semibold">{transfer.sap_status || 'Not enabled'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Created By</p>
            <p className="mt-1 font-semibold">{transfer.created_by_name || '-'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Transferred Barcodes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left">Barcode</th>
                  <th className="p-2 text-left">Item</th>
                  <th className="p-2 text-left">Batch</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-left">From</th>
                  <th className="p-2 text-left">To</th>
                </tr>
              </thead>
              <tbody>
                {transfer.lines.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{line.barcode}</td>
                    <td className="p-2">
                      <div className="font-medium">{line.item_code}</div>
                      <div className="text-xs text-muted-foreground">{line.item_name}</div>
                    </td>
                    <td className="p-2">{line.batch_number}</td>
                    <td className="p-2 text-right">
                      {line.qty} {line.uom}
                    </td>
                    <td className="p-2">{line.from_company_code}</td>
                    <td className="p-2">{line.to_company_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
