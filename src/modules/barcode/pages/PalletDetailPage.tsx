import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Boxes, Clock, XCircle, Scissors, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent, Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui';

import { usePalletDetail, useVoidPallet, useBoxes, useAddBoxesToPallet } from '../api';
import type { PalletStatus, PalletMovementType, BoxStatus } from '../types';

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

export default function PalletDetailPage() {
  const { palletId } = useParams();
  const navigate = useNavigate();
  const { data: pallet, isLoading } = usePalletDetail(palletId ? Number(palletId) : null);
  const voidMutation = useVoidPallet();
  const addBoxesMutation = useAddBoxesToPallet();
  // Add boxes dialog
  const [addBoxesOpen, setAddBoxesOpen] = useState(false);
  const [selectedAddBoxIds, setSelectedAddBoxIds] = useState<number[]>([]);

  // Fetch unpalletized boxes matching this pallet's item+batch
  // Show all unpalletized boxes for this item (backend enforces same-batch on save)
  const { data: availableBoxes = [] } = useBoxes(
    addBoxesOpen && pallet
      ? { item_code: pallet.item_code, unpalletized: 'true', status: 'ACTIVE' }
      : undefined
  );

  const handleVoid = () => {
    if (!pallet || !confirm('Are you sure you want to void this pallet? All boxes will be disassociated.')) return;
    voidMutation.mutate({ palletId: pallet.id, data: { reason: 'Voided from detail page' } });
  };

  const handleAddBoxes = async () => {
    if (!pallet || selectedAddBoxIds.length === 0) return;
    try {
      await addBoxesMutation.mutateAsync({
        palletId: pallet.id,
        data: { box_ids: selectedAddBoxIds },
      });
      toast.success(`Added ${selectedAddBoxIds.length} boxes to pallet`);
      setAddBoxesOpen(false);
      setSelectedAddBoxIds([]);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to add boxes');
    }
  };

  const toggleAddBox = (id: number) => {
    setSelectedAddBoxIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!pallet) return <div className="p-8 text-center text-muted-foreground">Pallet not found</div>;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={pallet.pallet_id}
        subtitle={`${pallet.item_name || pallet.item_code} — Batch: ${pallet.batch_number}`}
      />

      <Button variant="ghost" size="sm" onClick={() => navigate('/barcode/pallets')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to pallets
      </Button>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge className={`mt-1 ${STATUS_COLORS[pallet.status]}`}>{pallet.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Boxes</p>
            <p className="text-2xl font-bold">{pallet.box_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Qty</p>
            <p className="text-2xl font-bold">{pallet.total_qty} <span className="text-sm font-normal">{pallet.uom}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Warehouse</p>
            <p className="text-lg font-bold">{pallet.current_warehouse}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Info */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-muted-foreground">Item Code:</span> <span className="font-medium">{pallet.item_code}</span></div>
          <div><span className="text-muted-foreground">Item Name:</span> <span className="font-medium">{pallet.item_name}</span></div>
          <div><span className="text-muted-foreground">Batch:</span> <span className="font-mono">{pallet.batch_number}</span></div>
          <div><span className="text-muted-foreground">Mfg Date:</span> {pallet.mfg_date}</div>
          <div><span className="text-muted-foreground">Exp Date:</span> {pallet.exp_date}</div>
          <div><span className="text-muted-foreground">Line:</span> {pallet.production_line || '—'}</div>
          <div><span className="text-muted-foreground">Created By:</span> {pallet.created_by_name || '—'}</div>
          <div><span className="text-muted-foreground">Created:</span> {new Date(pallet.created_at).toLocaleString()}</div>
        </CardContent>
      </Card>

      {/* Actions */}
      {pallet.status === 'ACTIVE' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setAddBoxesOpen(true); setSelectedAddBoxIds([]); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Boxes
          </Button>
          <Button variant="destructive" size="sm" onClick={handleVoid} disabled={voidMutation.isPending}>
            <XCircle className="h-4 w-4 mr-1" /> Void Pallet
          </Button>
        </div>
      )}

      {/* Boxes Table */}
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
                      <td className="p-2 text-right">{box.qty} {box.uom}</td>
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

      {/* Dismantled Boxes */}
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
                      <td className="p-2 text-right">{box.qty} {box.uom}</td>
                      <td className="p-2">{box.current_warehouse}</td>
                      <td className="p-2 text-xs text-muted-foreground">{box.pallet_code || 'None'}</td>
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

      {/* Movement History */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Movement History
          </h3>
          {pallet.movements && pallet.movements.length > 0 ? (
            <div className="space-y-3">
              {pallet.movements.map((m) => (
                <div key={m.id} className="flex items-start gap-3 p-2 bg-muted/30 rounded">
                  <div className={`text-xs font-bold uppercase ${MOVEMENT_COLORS[m.movement_type]}`}>
                    {m.movement_type}
                  </div>
                  <div className="flex-1 text-sm">
                    {m.from_warehouse && m.to_warehouse ? (
                      <span>{m.from_warehouse} → {m.to_warehouse}</span>
                    ) : m.to_warehouse ? (
                      <span>→ {m.to_warehouse}</span>
                    ) : m.from_warehouse ? (
                      <span>{m.from_warehouse} →</span>
                    ) : null}
                    {m.notes && <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>}
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>{m.performed_by_name || '—'}</div>
                    <div>{new Date(m.performed_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No movements recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Add Boxes Dialog */}
      <Dialog open={addBoxesOpen} onOpenChange={setAddBoxesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Boxes to {pallet.pallet_id}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Showing unpalletized active boxes for {pallet.item_code} — {pallet.batch_number}
          </p>
          {availableBoxes.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground text-sm">
              No unpalletized boxes available for this item and batch
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {availableBoxes.map((box) => {
                const batchMatch = box.batch_number === pallet.batch_number;
                return (
                  <label key={box.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/50 ${batchMatch ? 'bg-muted/30' : 'bg-amber-50 border border-amber-200'}`}>
                    <input
                      type="checkbox"
                      checked={selectedAddBoxIds.includes(box.id)}
                      onChange={() => toggleAddBox(box.id)}
                    />
                    <span className="font-mono text-xs">{box.box_barcode}</span>
                    <span className="text-sm">{box.qty} {box.uom}</span>
                    <span className={`text-xs ${batchMatch ? 'text-muted-foreground' : 'text-amber-700 font-medium'}`}>
                      Batch: {box.batch_number}
                    </span>
                    <span className="text-xs text-muted-foreground">{box.current_warehouse}</span>
                    {!batchMatch && <Badge className="bg-amber-100 text-amber-800 text-[10px]">Different batch</Badge>}
                  </label>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBoxesOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddBoxes}
              disabled={addBoxesMutation.isPending || selectedAddBoxIds.length === 0}
            >
              {addBoxesMutation.isPending ? 'Adding...' : `Add ${selectedAddBoxIds.length} Boxes`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
