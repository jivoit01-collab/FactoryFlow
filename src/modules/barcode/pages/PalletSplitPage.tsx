import { Split } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { usePalletDetail, usePallets, useSplitPallet } from '../api';
import ScanSearchButton from '../components/ScanSearchButton';
import type { Pallet } from '../types';
import { toastBarcodeError } from '../utils/errors';

export default function PalletSplitPage() {
  const navigate = useNavigate();
  const [palletSearch, setPalletSearch] = useState('');
  const [targetPalletSearch, setTargetPalletSearch] = useState('');
  const [scannedSourcePalletSearch, setScannedSourcePalletSearch] = useState('');
  const [scannedTargetPalletSearch, setScannedTargetPalletSearch] = useState('');
  const [selectedPalletId, setSelectedPalletId] = useState<number | null>(null);
  const [targetPalletId, setTargetPalletId] = useState<number | null>(null);
  const [selectedBoxIds, setSelectedBoxIds] = useState<number[]>([]);

  const { data: pallets = [], isLoading } = usePallets(
    palletSearch.length >= 2 ? { search: palletSearch, status: 'ACTIVE,PARTIAL' } : undefined,
  );
  const { data: targetPallets = [], isLoading: loadingTargetPallets } = usePallets(
    targetPalletSearch.length >= 2 ? { search: targetPalletSearch } : undefined,
  );
  const { data: palletDetail } = usePalletDetail(selectedPalletId);
  const splitMutation = useSplitPallet();

  const activeBoxes =
    palletDetail?.boxes?.filter((b) => b.status === 'ACTIVE' || b.status === 'PARTIAL') || [];
  const emptyTargetPallets = targetPallets.filter((pallet) => {
    const hasNoContext = !pallet.item_code && !pallet.batch_number && !pallet.uom;
    const matchesSourceContext =
      palletDetail &&
      pallet.item_code === palletDetail.item_code &&
      pallet.batch_number === palletDetail.batch_number &&
      pallet.uom === palletDetail.uom;
    const hasCapacity = !pallet.max_box_count || selectedBoxIds.length <= pallet.max_box_count;

    return (
      (pallet.status === 'CLEARED' ||
        (pallet.status === 'ACTIVE' && (hasNoContext || matchesSourceContext))) &&
      hasCapacity &&
      pallet.box_count === 0 &&
      pallet.id !== selectedPalletId
    );
  });
  const targetPallet = targetPallets.find((pallet) => pallet.id === targetPalletId);

  const toggleBox = (id: number) => {
    setSelectedBoxIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSplit = async () => {
    if (!selectedPalletId || !targetPalletId || selectedBoxIds.length === 0) return;
    try {
      const updatedTargetPallet = await splitMutation.mutateAsync({
        palletId: selectedPalletId,
        data: { box_ids: selectedBoxIds, target_pallet_id: targetPalletId },
      });
      toast.success(`Split into pallet: ${updatedTargetPallet.pallet_id}`);
      navigate(`/barcode/pallets/${updatedTargetPallet.id}`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to split pallet. Check the source, target, and boxes.');
    }
  };

  const selectedQty = activeBoxes
    .filter((box) => selectedBoxIds.includes(box.id))
    .reduce((sum, box) => sum + Number(box.qty), 0);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Split Pallet"
        description="Move selected boxes from one pallet into an existing empty pallet"
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect<Pallet>
              items={pallets}
              isLoading={isLoading && palletSearch.length >= 2}
              getItemKey={(pallet) => pallet.id}
              getItemLabel={(pallet) => pallet.pallet_id}
              filterFn={() => true}
              renderItem={(pallet) => (
                <div className="flex items-center justify-between w-full">
                  <div>
                    <span className="font-mono text-xs font-medium">{pallet.pallet_id}</span>
                    <span className="ml-2 text-sm">{pallet.item_name || pallet.item_code}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {pallet.box_count} boxes | {pallet.current_warehouse}
                  </span>
                </div>
              )}
              placeholder="Search pallet to split..."
              label="Source Pallet"
              labelAction={
                <ScanSearchButton onScan={setScannedSourcePalletSearch} expectedType="PALLET" />
              }
              scannedSearchValue={scannedSourcePalletSearch}
              required
              inputId="split-pallet"
              loadingText="Searching..."
              emptyText="Type at least 2 characters"
              notFoundText="No active pallets found"
              onSearchChange={useCallback((search: string) => setPalletSearch(search), [])}
              onItemSelect={(pallet) => {
                setSelectedPalletId(pallet.id);
                setTargetPalletId(null);
                setSelectedBoxIds([]);
              }}
              onClear={() => {
                setSelectedPalletId(null);
                setTargetPalletId(null);
                setSelectedBoxIds([]);
              }}
            />

            <SearchableSelect<Pallet>
              items={emptyTargetPallets}
              isLoading={loadingTargetPallets}
              getItemKey={(pallet) => pallet.id}
              getItemLabel={(pallet) => pallet.pallet_id}
              filterFn={() => true}
              renderItem={(pallet) => (
                <div className="flex items-center justify-between w-full">
                  <div>
                    <span className="font-mono text-xs font-medium">{pallet.pallet_id}</span>
                    <Badge className="ml-2 bg-amber-100 text-amber-800">EMPTY</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {pallet.current_warehouse || 'No warehouse'}
                  </span>
                </div>
              )}
              placeholder="Search empty target pallet..."
              label="Target Empty Pallet"
              labelAction={
                <ScanSearchButton onScan={setScannedTargetPalletSearch} expectedType="PALLET" />
              }
              scannedSearchValue={scannedTargetPalletSearch}
              required
              inputId="split-target-pallet"
              loadingText="Loading empty pallets..."
              emptyText="No empty pallets available"
              notFoundText="No matching empty pallet"
              onSearchChange={useCallback((search: string) => setTargetPalletSearch(search), [])}
              onItemSelect={(pallet) => setTargetPalletId(pallet.id)}
              onClear={() => setTargetPalletId(null)}
            />
          </div>
        </CardContent>
      </Card>

      {palletDetail && activeBoxes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                Select boxes to split off ({selectedBoxIds.length} of {activeBoxes.length})
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setSelectedBoxIds(
                    selectedBoxIds.length === activeBoxes.length
                      ? []
                      : activeBoxes.map((box) => box.id),
                  )
                }
              >
                {selectedBoxIds.length === activeBoxes.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 mb-4">
              {activeBoxes.map((box) => (
                <label
                  key={box.id}
                  className="flex items-center gap-3 p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedBoxIds.includes(box.id)}
                    onChange={() => toggleBox(box.id)}
                  />
                  <span className="font-mono text-xs">{box.box_barcode}</span>
                  <span className="text-sm">
                    {box.qty} {box.uom}
                  </span>
                  <Badge
                    className={
                      box.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }
                  >
                    {box.status}
                  </Badge>
                </label>
              ))}
            </div>

            {selectedBoxIds.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg mb-4 text-sm">
                <strong>Target pallet will have:</strong> {selectedBoxIds.length} boxes,{' '}
                {selectedQty} qty to {targetPallet?.pallet_id || '...'}
                <br />
                <strong>Original pallet keeps:</strong> {activeBoxes.length - selectedBoxIds.length}{' '}
                boxes
              </div>
            )}

            {selectedBoxIds.length > 0 && selectedBoxIds.length < activeBoxes.length && (
              <Button onClick={handleSplit} disabled={splitMutation.isPending || !targetPalletId}>
                <Split className="h-4 w-4 mr-1" />
                {splitMutation.isPending
                  ? 'Splitting...'
                  : `Split ${selectedBoxIds.length} boxes to selected pallet`}
              </Button>
            )}

            {selectedBoxIds.length === activeBoxes.length && (
              <p className="text-sm text-amber-600">
                Cannot split all boxes. Use Move Pallet instead to move the entire pallet.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {palletDetail && activeBoxes.length === 0 && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No transferable boxes on this pallet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
