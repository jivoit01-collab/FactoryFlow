import {
  ArrowLeft,
  Boxes,
  ClipboardCheck,
  Clock,
  Printer,
  Scissors,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { useDeleteEmptyPallet, usePalletDetail, useVoidPallet } from '../api';
import type { BoxStatus, PalletMovementType, PalletStatus } from '../types';
import { toastBarcodeError } from '../utils/errors';

const STATUS_COLORS: Record<PalletStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  CLEARED: 'bg-gray-100 text-gray-800',
  SPLIT: 'bg-blue-100 text-blue-800',
  VOID: 'bg-red-100 text-red-800',
};

const BOX_STATUS_COLORS: Record<BoxStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-amber-100 text-amber-800',
  DISMANTLED: 'bg-orange-100 text-orange-800',
  VOID: 'bg-red-100 text-red-800',
};

const MOVEMENT_COLORS: Record<PalletMovementType, string> = {
  CREATE: 'text-green-600',
  MOVE: 'text-blue-600',
  TRANSFER: 'text-purple-600',
  DISMANTLE: 'text-orange-600',
  CLEAR: 'text-gray-600',
  SPLIT: 'text-amber-600',
  VOID: 'text-red-600',
};

const capacityText = (boxCount: number, maxBoxCount: number) => {
  if (!maxBoxCount) return boxCount === 0 ? 'Not set' : String(boxCount);
  return `${boxCount}/${maxBoxCount}`;
};

export default function PalletDetailPage() {
  const { palletId } = useParams();
  const navigate = useNavigate();
  const { data: pallet, isLoading } = usePalletDetail(palletId ? Number(palletId) : null);
  const voidMutation = useVoidPallet();
  const deleteEmptyPalletMutation = useDeleteEmptyPallet();

  const handleVoid = () => {
    if (
      !pallet ||
      !confirm('Are you sure you want to void this pallet? All boxes will be disassociated.')
    ) {
      return;
    }
    voidMutation.mutate({ palletId: pallet.id, data: { reason: 'Voided from detail page' } });
  };

  const handleDeleteEmptyPallet = async () => {
    if (!pallet) return;
    if (!confirm(`Delete empty pallet ${pallet.pallet_id}? This cannot be undone.`)) return;

    try {
      await deleteEmptyPalletMutation.mutateAsync(pallet.id);
      toast.success(`Deleted empty pallet ${pallet.pallet_id}`);
      navigate('/barcode/pallets');
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to delete pallet. Only empty pallets can be deleted.');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!pallet) return <div className="p-8 text-center text-muted-foreground">Pallet not found</div>;

  const isEmpty = pallet.box_count === 0;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={pallet.pallet_id}
        subtitle={`${pallet.current_warehouse || 'No warehouse'} - ${
          isEmpty ? 'Empty pallet' : `${pallet.box_count} linked boxes`
        }`}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/barcode/pallets')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to pallets
        </Button>
        {!isEmpty && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/barcode/verify/new?palletId=${pallet.id}`)}
          >
            <ClipboardCheck className="h-4 w-4 mr-1" /> Verify / Reconcile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge className={STATUS_COLORS[pallet.status]}>{pallet.status}</Badge>
              {isEmpty && <Badge className="bg-amber-100 text-amber-800">EMPTY</Badge>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Boxes</p>
            <p className="text-2xl font-bold">
              {capacityText(pallet.box_count, pallet.max_box_count)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Qty</p>
            <p className="text-2xl font-bold">
              {pallet.total_qty} <span className="text-sm font-normal">{pallet.uom}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Warehouse</p>
            <p className="text-lg font-bold">{pallet.current_warehouse || '-'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Pallet ID:</span>{' '}
            <span className="font-mono">{pallet.pallet_id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Line:</span> {pallet.production_line || '-'}
          </div>
          <div>
            <span className="text-muted-foreground">Created By:</span>{' '}
            {pallet.created_by_name || '-'}
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>{' '}
            {new Date(pallet.created_at).toLocaleString()}
          </div>
          <div>
            <span className="text-muted-foreground">Mfg Date:</span> {pallet.mfg_date}
          </div>
          <div>
            <span className="text-muted-foreground">Exp Date:</span> {pallet.exp_date}
          </div>
        </CardContent>
      </Card>

      {(pallet.status === 'ACTIVE' || pallet.status === 'CLEARED') && (
        <div className="flex flex-wrap gap-2">
          {isEmpty && (
            <Button size="sm" onClick={() => navigate('/barcode/generate')}>
              <Printer className="h-4 w-4 mr-1" /> Pallet QR Print
            </Button>
          )}
          {isEmpty && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleDeleteEmptyPallet()}
              disabled={deleteEmptyPalletMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {deleteEmptyPalletMutation.isPending ? 'Deleting...' : 'Delete Empty Pallet'}
            </Button>
          )}
          {pallet.status === 'ACTIVE' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleVoid}
              disabled={voidMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" /> Void Pallet
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Boxes className="h-4 w-4" /> Boxes ({pallet.boxes?.length || 0})
          </h3>
          {pallet.boxes && pallet.boxes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Barcode</th>
                    <th className="text-left p-2 font-medium">Item</th>
                    <th className="text-left p-2 font-medium">Batch</th>
                    <th className="text-right p-2 font-medium">Qty</th>
                    <th className="text-left p-2 font-medium">Warehouse</th>
                    <th className="text-left p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pallet.boxes.map((box) => (
                    <tr
                      key={box.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/barcode/boxes/${box.id}`)}
                    >
                      <td className="p-2 font-mono text-xs">{box.box_barcode}</td>
                      <td className="p-2">
                        <div className="font-medium">{box.item_code}</div>
                        <div className="text-xs text-muted-foreground">{box.item_name}</div>
                      </td>
                      <td className="p-2 text-xs">{box.batch_number}</td>
                      <td className="p-2 text-right">
                        {box.qty} {box.uom}
                      </td>
                      <td className="p-2">{box.current_warehouse}</td>
                      <td className="p-2">
                        <Badge className={BOX_STATUS_COLORS[box.status]}>{box.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No boxes currently on this pallet</p>
          )}
        </CardContent>
      </Card>

      {pallet.dismantled_boxes && pallet.dismantled_boxes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Scissors className="h-4 w-4 text-orange-600" />
              Dismantled / Removed Boxes ({pallet.dismantled_boxes.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Barcode</th>
                    <th className="text-right p-2 font-medium">Qty</th>
                    <th className="text-left p-2 font-medium">Warehouse</th>
                    <th className="text-left p-2 font-medium">Current Pallet</th>
                    <th className="text-left p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pallet.dismantled_boxes.map((box) => (
                    <tr
                      key={box.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/barcode/boxes/${box.id}`)}
                    >
                      <td className="p-2 font-mono text-xs">{box.box_barcode}</td>
                      <td className="p-2 text-right">
                        {box.qty} {box.uom}
                      </td>
                      <td className="p-2">{box.current_warehouse}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {box.pallet_code || 'None'}
                      </td>
                      <td className="p-2">
                        <Badge className={BOX_STATUS_COLORS[box.status]}>{box.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Movement History
          </h3>
          {pallet.movements && pallet.movements.length > 0 ? (
            <div className="space-y-3">
              {pallet.movements.map((movement) => (
                <div key={movement.id} className="flex items-start gap-3 p-2 bg-muted/30 rounded">
                  <div
                    className={`text-xs font-bold uppercase ${
                      MOVEMENT_COLORS[movement.movement_type]
                    }`}
                  >
                    {movement.movement_type}
                  </div>
                  <div className="flex-1 text-sm">
                    {movement.from_warehouse && movement.to_warehouse ? (
                      <span>
                        {movement.from_warehouse} - {movement.to_warehouse}
                      </span>
                    ) : movement.to_warehouse ? (
                      <span>To {movement.to_warehouse}</span>
                    ) : movement.from_warehouse ? (
                      <span>From {movement.from_warehouse}</span>
                    ) : null}
                    {movement.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{movement.notes}</p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>{movement.performed_by_name || '-'}</div>
                    <div>{new Date(movement.performed_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No movements recorded</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
