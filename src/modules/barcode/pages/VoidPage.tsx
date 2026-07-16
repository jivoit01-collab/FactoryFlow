import { Boxes, Package, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import {
  useBoxDetail,
  useBoxes,
  usePalletDetail,
  usePallets,
  useVoidBox,
  useVoidPallet,
} from '../api';
import ScanSearchButton from '../components/ScanSearchButton';
import type { Box, Pallet } from '../types';
import { toastBarcodeError } from '../utils/errors';

export default function VoidPage() {
  const [mode, setMode] = useState<'pallet' | 'box'>('pallet');
  const [palletSearch, setPalletSearch] = useState('');
  const [boxSearch, setBoxSearch] = useState('');
  const [scannedPalletSearch, setScannedPalletSearch] = useState('');
  const [scannedBoxSearch, setScannedBoxSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [voidBoxes, setVoidBoxes] = useState(false);
  const [selectedBoxIds, setSelectedBoxIds] = useState<number[]>([]);
  const [reason, setReason] = useState('');

  const { data: pallets = [], isLoading: loadingPallets } = usePallets(
    mode === 'pallet' && palletSearch.length >= 2
      ? { search: palletSearch, status: 'ACTIVE' }
      : undefined,
  );
  const { data: boxes = [], isLoading: loadingBoxes } = useBoxes(
    mode === 'box' && boxSearch.length >= 2
      ? { search: boxSearch, status: 'ACTIVE,PARTIAL' }
      : undefined,
  );

  const handlePalletSearch = useCallback((s: string) => setPalletSearch(s), []);
  const handleBoxSearch = useCallback((s: string) => setBoxSearch(s), []);
  const { data: palletDetail } = usePalletDetail(mode === 'pallet' ? selectedId : null);
  const { data: boxDetail } = useBoxDetail(mode === 'box' ? selectedId : null);

  const voidPalletMutation = useVoidPallet();
  const voidBoxMutation = useVoidBox();

  const resetSelection = () => {
    setSelectedId(null);
    setVoidBoxes(false);
    setSelectedBoxIds([]);
    setReason('');
  };

  const toggleBoxSelect = (boxId: number) => {
    setSelectedBoxIds((prev) =>
      prev.includes(boxId) ? prev.filter((id) => id !== boxId) : [...prev, boxId],
    );
  };

  const activeBoxes = (palletDetail?.boxes || []).filter((b) => b.status === 'ACTIVE');

  const handleVoidPallet = async () => {
    if (!selectedId) return;
    try {
      await voidPalletMutation.mutateAsync({
        palletId: selectedId,
        data: {
          reason,
          box_ids: voidBoxes && selectedBoxIds.length > 0 ? selectedBoxIds : null,
        },
      });
      const voided = voidBoxes ? selectedBoxIds.length : 0;
      toast.success(
        voided > 0
          ? `Pallet voided — ${voided} box${voided === 1 ? '' : 'es'} voided`
          : 'Pallet voided — boxes disassociated',
      );
      resetSelection();
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to void pallet.');
    }
  };

  const handleVoidBox = async () => {
    if (!selectedId) return;
    try {
      await voidBoxMutation.mutateAsync({ boxId: selectedId, data: { reason } });
      toast.success('Box voided');
      resetSelection();
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to void box.');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Void"
        subtitle="Void pallets (and optionally their boxes) or void an individual box"
      />

      {/* Mode + Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Void Type</label>
              <div className="flex gap-2 mt-1">
                <Button
                  size="sm"
                  variant={mode === 'pallet' ? 'default' : 'outline'}
                  onClick={() => {
                    setMode('pallet');
                    resetSelection();
                  }}
                >
                  <Package className="h-4 w-4 mr-1" /> Pallet
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'box' ? 'default' : 'outline'}
                  onClick={() => {
                    setMode('box');
                    resetSelection();
                  }}
                >
                  <Boxes className="h-4 w-4 mr-1" /> Box
                </Button>
              </div>
            </div>
            <div className="flex-1 min-w-[300px]">
              {mode === 'pallet' ? (
                <SearchableSelect<Pallet>
                  key="pallet-search"
                  items={pallets}
                  isLoading={loadingPallets && palletSearch.length >= 2}
                  getItemKey={(p) => p.id}
                  getItemLabel={(p) => `${p.pallet_id} — ${p.item_name || p.item_code}`}
                  filterFn={() => true}
                  renderItem={(p) => (
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <span className="font-mono text-xs font-medium">{p.pallet_id}</span>
                        <span className="ml-2 text-sm">{p.item_name || p.item_code}</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          Batch: {p.batch_number}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {p.box_count} boxes · {p.current_warehouse}
                      </span>
                    </div>
                  )}
                  placeholder="Search pallet by ID, item, or batch..."
                  label="Select Pallet"
                  labelAction={
                    <ScanSearchButton onScan={setScannedPalletSearch} expectedType="PALLET" />
                  }
                  scannedSearchValue={scannedPalletSearch}
                  required
                  inputId="void-pallet"
                  loadingText="Searching..."
                  emptyText="Type at least 2 characters to search"
                  notFoundText="No active pallets found"
                  onSearchChange={handlePalletSearch}
                  onItemSelect={(p) => {
                    setSelectedId(p.id);
                    setVoidBoxes(false);
                    setSelectedBoxIds([]);
                  }}
                  onClear={resetSelection}
                />
              ) : (
                <SearchableSelect<Box>
                  key="box-search"
                  items={boxes}
                  isLoading={loadingBoxes && boxSearch.length >= 2}
                  getItemKey={(b) => b.id}
                  getItemLabel={(b) => `${b.box_barcode} — ${b.item_name || b.item_code}`}
                  filterFn={() => true}
                  renderItem={(b) => (
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <span className="font-mono text-xs font-medium">{b.box_barcode}</span>
                        <span className="ml-2 text-sm">{b.item_name || b.item_code}</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          Batch: {b.batch_number}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {b.qty} {b.uom} · {b.current_warehouse}
                      </span>
                    </div>
                  )}
                  placeholder="Search box by barcode, item, or batch..."
                  label="Select Box"
                  labelAction={<ScanSearchButton onScan={setScannedBoxSearch} expectedType="BOX" />}
                  scannedSearchValue={scannedBoxSearch}
                  required
                  inputId="void-box"
                  loadingText="Searching..."
                  emptyText="Type at least 2 characters to search"
                  notFoundText="No active or partial boxes found"
                  onSearchChange={handleBoxSearch}
                  onItemSelect={(b) => setSelectedId(b.id)}
                  onClear={resetSelection}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pallet Detail — void pallet + optionally its boxes */}
      {mode === 'pallet' && palletDetail && selectedId && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{palletDetail.pallet_id}</h3>
                <p className="text-sm text-muted-foreground">
                  {palletDetail.item_name} — Batch: {palletDetail.batch_number} —{' '}
                  {palletDetail.box_count} boxes
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">{palletDetail.status}</Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Voiding this pallet disassociates its boxes. Boxes you leave unselected stay ACTIVE
              as loose boxes.
            </p>

            {/* Void boxes toggle */}
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={voidBoxes}
                onChange={(e) => {
                  setVoidBoxes(e.target.checked);
                  setSelectedBoxIds(e.target.checked ? activeBoxes.map((b) => b.id) : []);
                }}
              />
              <span className="text-sm font-medium">Also void its boxes</span>
            </label>

            {voidBoxes && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Select boxes to void ({selectedBoxIds.length}/{activeBoxes.length})
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setSelectedBoxIds(
                        selectedBoxIds.length === activeBoxes.length
                          ? []
                          : activeBoxes.map((b) => b.id),
                      )
                    }
                  >
                    {selectedBoxIds.length === activeBoxes.length ? 'Deselect all' : 'Select all'}
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {activeBoxes.map((box) => (
                    <label
                      key={box.id}
                      className="flex items-center gap-2 p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBoxIds.includes(box.id)}
                        onChange={() => toggleBoxSelect(box.id)}
                      />
                      <span className="font-mono text-xs">{box.box_barcode}</span>
                      <span className="text-xs text-muted-foreground">
                        {box.qty} {box.uom}
                      </span>
                    </label>
                  ))}
                  {activeBoxes.length === 0 && (
                    <p className="text-xs text-muted-foreground">No active boxes on this pallet.</p>
                  )}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground">Reason</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm mt-1"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional reason..."
              />
            </div>

            <Button
              variant="destructive"
              onClick={handleVoidPallet}
              disabled={voidPalletMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" />
              {voidPalletMutation.isPending
                ? 'Voiding...'
                : voidBoxes && selectedBoxIds.length > 0
                  ? `Void Pallet + ${selectedBoxIds.length} Box${selectedBoxIds.length === 1 ? '' : 'es'}`
                  : 'Void Pallet'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Box Detail — void a single box */}
      {mode === 'box' && boxDetail && selectedId && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{boxDetail.box_barcode}</h3>
                <p className="text-sm text-muted-foreground">
                  {boxDetail.item_name} — Batch: {boxDetail.batch_number} — {boxDetail.qty}{' '}
                  {boxDetail.uom}
                </p>
              </div>
              <Badge
                className={
                  boxDetail.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }
              >
                {boxDetail.status}
              </Badge>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground">Reason</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm mt-1"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional reason..."
              />
            </div>

            <Button
              variant="destructive"
              onClick={handleVoidBox}
              disabled={voidBoxMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" />
              {voidBoxMutation.isPending ? 'Voiding...' : 'Void Box'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
