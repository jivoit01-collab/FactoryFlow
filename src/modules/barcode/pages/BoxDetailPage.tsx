import { ArrowLeft, Clock, Link2, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import { useAddBoxesToPallet, useBoxDetail, usePallets, useVoidBox } from '../api';
import ScanSearchButton from '../components/ScanSearchButton';
import type { BoxMovementType, Pallet } from '../types';
import { toastBarcodeError } from '../utils/errors';

const MOVEMENT_COLORS: Partial<Record<BoxMovementType, string>> = {
  CREATE: 'text-green-600',
  MOVE: 'text-blue-600',
  TRANSFER: 'text-purple-600',
  OWNERSHIP_TRANSFER: 'text-purple-600',
  LOAD_VEHICLE: 'text-indigo-600',
  UNLOAD_VEHICLE: 'text-cyan-600',
  PALLETIZE: 'text-indigo-600',
  DEPALLETIZE: 'text-orange-600',
  DISPATCH: 'text-blue-600',
  REMOVE_FOR_DISPATCH: 'text-orange-600',
  DISMANTLE: 'text-orange-600',
  VOID: 'text-red-600',
};

export default function BoxDetailPage() {
  const { boxId } = useParams();
  const navigate = useNavigate();
  const { data: box, isLoading } = useBoxDetail(boxId ? Number(boxId) : null);
  const voidMutation = useVoidBox();
  const addBoxesMutation = useAddBoxesToPallet();
  // Link to pallet dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [palletSearch, setPalletSearch] = useState('');
  const [scannedPalletSearch, setScannedPalletSearch] = useState('');
  const [selectedPalletId, setSelectedPalletId] = useState<number | null>(null);
  const handlePalletSearch = useCallback((s: string) => setPalletSearch(s), []);

  const palletSearchTerm = palletSearch.trim();
  const { data: activeSearchPallets = [], isLoading: loadingActivePallets } = usePallets(
    { status: 'ACTIVE', ...(palletSearchTerm ? { search: palletSearchTerm } : {}) },
    { enabled: linkDialogOpen },
  );
  const { data: clearedSearchPallets = [], isLoading: loadingClearedPallets } = usePallets(
    { status: 'CLEARED', ...(palletSearchTerm ? { search: palletSearchTerm } : {}) },
    { enabled: linkDialogOpen },
  );
  const searchPallets = [...activeSearchPallets, ...clearedSearchPallets];
  const loadingPallets = loadingActivePallets || loadingClearedPallets;
  const linkablePallets = searchPallets.filter((p) => {
    const isEmptyPallet = p.box_count === 0 && !p.item_code && !p.batch_number;
    const isCompatiblePallet =
      p.item_code === box?.item_code && p.batch_number === box?.batch_number && p.uom === box?.uom;
    const isReusableStatus = p.status === 'ACTIVE' || p.status === 'CLEARED';
    const hasCapacity = !p.max_box_count || p.box_count < p.max_box_count;
    return isReusableStatus && hasCapacity && (isEmptyPallet || isCompatiblePallet);
  });

  const handleVoid = () => {
    if (!box) return;
    const reason = prompt('Void this box? Enter a reason (required):')?.trim();
    if (!reason) return;
    voidMutation.mutate({ boxId: box.id, data: { reason } });
  };

  const handleLinkToPallet = async () => {
    if (!box || !selectedPalletId) return;
    try {
      await addBoxesMutation.mutateAsync({
        palletId: selectedPalletId,
        data: { box_ids: [box.id] },
      });
      toast.success('Box added to pallet');
      setLinkDialogOpen(false);
      setSelectedPalletId(null);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to add this box to the selected pallet.');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!box) return <div className="p-8 text-center text-muted-foreground">Box not found</div>;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={box.box_barcode}
        subtitle={`${box.item_name || box.item_code} — Batch: ${box.batch_number}`}
      />

      <Button variant="ghost" size="sm" onClick={() => navigate('/barcode/boxes')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to boxes
      </Button>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge
              className={`mt-1 ${
                {
                  ACTIVE: 'bg-green-100 text-green-800',
                  PARTIAL: 'bg-amber-100 text-amber-800',
                  INSIDE_VEHICLE: 'bg-indigo-100 text-indigo-800',
                  DISPATCHED: 'bg-blue-100 text-blue-800',
                  DISMANTLED: 'bg-orange-100 text-orange-800',
                  VOID: 'bg-red-100 text-red-800',
                }[box.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {box.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Quantity</p>
            <p className="text-2xl font-bold">
              {box.qty} <span className="text-sm font-normal">{box.uom}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Warehouse</p>
            <p className="text-lg font-bold">{box.current_warehouse}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pallet</p>
            {box.pallet_code ? (
              <p
                className="text-lg font-bold text-blue-600 cursor-pointer hover:underline"
                onClick={() => navigate(`/barcode/pallets/${box.pallet}`)}
              >
                {box.pallet_code}
              </p>
            ) : (
              <p className="text-lg text-muted-foreground">Not palletized</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Item Code:</span>{' '}
            <span className="font-medium">{box.item_code}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Item Name:</span>{' '}
            <span className="font-medium">{box.item_name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Batch:</span>{' '}
            <span className="font-mono">{box.batch_number}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Mfg Date:</span> {box.mfg_date}
          </div>
          <div>
            <span className="text-muted-foreground">Exp Date:</span> {box.exp_date}
          </div>
          <div>
            <span className="text-muted-foreground">Line:</span> {box.production_line || '—'}
          </div>
          <div>
            <span className="text-muted-foreground">Created By:</span> {box.created_by_name || '—'}
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>{' '}
            {new Date(box.created_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {(box.status === 'ACTIVE' || box.status === 'PARTIAL') && (
        <div className="flex gap-2">
          {!box.pallet && (
            <Button
              size="sm"
              onClick={() => {
                setLinkDialogOpen(true);
                setSelectedPalletId(null);
              }}
            >
              <Link2 className="h-4 w-4 mr-1" /> Link to Pallet
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleVoid}
            disabled={voidMutation.isPending}
          >
            <XCircle className="h-4 w-4 mr-1" /> Void Box
          </Button>
        </div>
      )}

      {/* Traceability: Dismantled Into */}
      {box.dismantled_into && box.dismantled_into.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-orange-700">Dismantled Into (Loose Stock)</h3>
            <div className="space-y-2">
              {box.dismantled_into.map((ls) => (
                <div
                  key={ls.id}
                  className="flex items-center justify-between p-2 bg-orange-50 rounded text-sm"
                >
                  <div>
                    <span className="font-medium">{ls.qty} units</span>
                    <span className="ml-2 text-muted-foreground">Reason: {ls.reason}</span>
                    <Badge
                      className={`ml-2 ${ls.status === 'REPACKED' ? 'bg-blue-100 text-blue-800' : ls.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      {ls.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    {ls.repacked_into_barcode ? (
                      <span
                        className="font-mono text-xs text-blue-600 cursor-pointer hover:underline"
                        onClick={() => navigate(`/barcode/boxes/${ls.repacked_into_box_id}`)}
                      >
                        → {ls.repacked_into_barcode}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not yet repacked</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Traceability: Repacked From */}
      {box.repacked_from && box.repacked_from.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-blue-700">Repacked From (Source Boxes)</h3>
            <div className="space-y-2">
              {box.repacked_from.map((ls) => (
                <div
                  key={ls.id}
                  className="flex items-center justify-between p-2 bg-blue-50 rounded text-sm"
                >
                  <div>
                    <span className="font-medium">{ls.qty} units</span>
                    <span className="ml-2 text-muted-foreground">Reason: {ls.reason}</span>
                  </div>
                  {ls.source_box_barcode && (
                    <span
                      className="font-mono text-xs text-blue-600 cursor-pointer hover:underline"
                      onClick={() => navigate(`/barcode/boxes/${ls.source_box_id}`)}
                    >
                      ← {ls.source_box_barcode}
                    </span>
                  )}
                </div>
              ))}
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
          {box.movements && box.movements.length > 0 ? (
            <div className="space-y-3">
              {box.movements.map((m) => (
                <div key={m.id} className="flex items-start gap-3 p-2 bg-muted/30 rounded">
                  <div
                    className={`text-xs font-bold uppercase ${MOVEMENT_COLORS[m.movement_type] ?? 'text-gray-600'}`}
                  >
                    {m.movement_type}
                  </div>
                  <div className="flex-1 text-sm">
                    {m.from_warehouse && m.to_warehouse ? (
                      <span>
                        {m.from_warehouse} → {m.to_warehouse}
                      </span>
                    ) : m.to_warehouse ? (
                      <span>→ {m.to_warehouse}</span>
                    ) : m.from_warehouse ? (
                      <span>{m.from_warehouse} →</span>
                    ) : null}
                    {m.to_pallet_id && (
                      <span className="ml-2 text-xs">→ Pallet {m.to_pallet_id}</span>
                    )}
                    {m.from_pallet_id && (
                      <span className="ml-2 text-xs">← Pallet {m.from_pallet_id}</span>
                    )}
                    {m.notes && (
                      <div className="text-xs text-muted-foreground mt-0.5">{m.notes}</div>
                    )}
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

      {/* Link to Pallet Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Box to Pallet</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            {box.box_barcode} — {box.item_code} — Batch: {box.batch_number}
          </p>

          <div className="space-y-4">
            <SearchableSelect<Pallet>
              items={linkablePallets}
              isLoading={loadingPallets}
              getItemKey={(p) => p.id}
              getItemLabel={(p) => `${p.pallet_id} — ${p.item_name || p.item_code}`}
              filterFn={() => true}
              renderItem={(p) => {
                const batchMatch = p.batch_number === box.batch_number;
                return (
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <span className="font-mono text-xs font-medium">{p.pallet_id}</span>
                      <span className="ml-2 text-sm">{p.item_name || p.item_code}</span>
                      <span
                        className={`ml-1 text-xs ${batchMatch ? 'text-muted-foreground' : 'text-amber-700'}`}
                      >
                        Batch: {p.batch_number}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {p.box_count} boxes · {p.current_warehouse}
                    </span>
                  </div>
                );
              }}
              placeholder="Search existing pallet..."
              label="Add to Existing Pallet"
              labelAction={
                <ScanSearchButton onScan={setScannedPalletSearch} expectedType="PALLET" />
              }
              scannedSearchValue={scannedPalletSearch}
              inputId="link-pallet-search"
              loadingText="Searching..."
              emptyText="No reusable empty or compatible pallets found"
              notFoundText="No compatible reusable pallets found"
              onSearchChange={handlePalletSearch}
              onItemSelect={(p) => setSelectedPalletId(p.id)}
              onClear={() => setSelectedPalletId(null)}
            />

            <div className="text-center text-xs text-muted-foreground">— or —</div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/barcode/pallets')}
            >
              Open Pallets Page
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLinkToPallet}
              disabled={addBoxesMutation.isPending || !selectedPalletId}
            >
              {addBoxesMutation.isPending ? 'Adding...' : 'Add to Pallet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
