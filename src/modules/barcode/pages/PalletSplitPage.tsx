import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Split } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Card, CardContent, Button, Badge } from '@/shared/components/ui';
import { useWMSWarehouses } from '@/modules/warehouse/api';
import type { WarehouseOption } from '@/modules/warehouse/types';

import { usePallets, usePalletDetail, useSplitPallet } from '../api';
import type { Pallet } from '../types';

export default function PalletSplitPage() {
  const navigate = useNavigate();
  const [palletSearch, setPalletSearch] = useState('');
  const [selectedPalletId, setSelectedPalletId] = useState<number | null>(null);
  const [selectedBoxIds, setSelectedBoxIds] = useState<number[]>([]);
  const [warehouse, setWarehouse] = useState('');

  const { data: pallets = [], isLoading } = usePallets(
    palletSearch.length >= 2 ? { search: palletSearch, status: 'ACTIVE' } : undefined
  );
  const { data: palletDetail } = usePalletDetail(selectedPalletId);
  const { data: whData } = useWMSWarehouses();
  const warehouses: WarehouseOption[] = whData?.warehouses ?? [];
  const splitMutation = useSplitPallet();

  const activeBoxes = palletDetail?.boxes?.filter((b) => b.status === 'ACTIVE' || b.status === 'PARTIAL') || [];

  const toggleBox = (id: number) => {
    setSelectedBoxIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleSplit = async () => {
    if (!selectedPalletId || selectedBoxIds.length === 0 || !warehouse) return;
    try {
      const newPallet = await splitMutation.mutateAsync({
        palletId: selectedPalletId,
        data: { box_ids: selectedBoxIds, warehouse },
      });
      toast.success(`Split into new pallet: ${newPallet.pallet_id}`);
      navigate(`/barcode/pallets/${newPallet.id}`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to split');
    }
  };

  const selectedQty = activeBoxes
    .filter((b) => selectedBoxIds.includes(b.id))
    .reduce((sum, b) => sum + Number(b.qty), 0);

  return (
    <div className="space-y-6">
      <DashboardHeader title="Split Pallet" subtitle="Move selected boxes from a pallet into a new pallet" />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect<Pallet>
              items={pallets}
              isLoading={isLoading && palletSearch.length >= 2}
              getItemKey={(p) => p.id}
              getItemLabel={(p) => `${p.pallet_id} — ${p.item_name || p.item_code}`}
              filterFn={() => true}
              renderItem={(p) => (
                <div className="flex items-center justify-between w-full">
                  <div>
                    <span className="font-mono text-xs font-medium">{p.pallet_id}</span>
                    <span className="ml-2 text-sm">{p.item_name || p.item_code}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{p.box_count} boxes · {p.current_warehouse}</span>
                </div>
              )}
              placeholder="Search pallet to split..."
              label="Source Pallet"
              required
              inputId="split-pallet"
              loadingText="Searching..."
              emptyText="Type at least 2 characters"
              notFoundText="No active pallets found"
              onSearchChange={useCallback((s: string) => setPalletSearch(s), [])}
              onItemSelect={(p) => { setSelectedPalletId(p.id); setSelectedBoxIds([]); }}
              onClear={() => { setSelectedPalletId(null); setSelectedBoxIds([]); }}
            />

            <SearchableSelect<WarehouseOption>
              items={warehouses}
              isLoading={false}
              getItemKey={(wh) => wh.code}
              getItemLabel={(wh) => `${wh.code} — ${wh.name}`}
              renderItem={(wh) => (
                <div className="flex items-center gap-2 w-full">
                  <span className="font-mono text-xs font-medium">{wh.code}</span>
                  <span className="text-sm truncate">{wh.name}</span>
                </div>
              )}
              placeholder="Warehouse for new pallet..."
              label="New Pallet Warehouse"
              required
              inputId="split-warehouse"
              loadingText="Loading..."
              emptyText="No warehouses"
              notFoundText="No match"
              onItemSelect={(wh) => setWarehouse(wh.code)}
              onClear={() => setWarehouse('')}
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
              <Button size="sm" variant="ghost" onClick={() =>
                setSelectedBoxIds(selectedBoxIds.length === activeBoxes.length ? [] : activeBoxes.map((b) => b.id))
              }>
                {selectedBoxIds.length === activeBoxes.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 mb-4">
              {activeBoxes.map((box) => (
                <label key={box.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={selectedBoxIds.includes(box.id)} onChange={() => toggleBox(box.id)} />
                  <span className="font-mono text-xs">{box.box_barcode}</span>
                  <span className="text-sm">{box.qty} {box.uom}</span>
                  <Badge className={box.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>{box.status}</Badge>
                </label>
              ))}
            </div>

            {selectedBoxIds.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg mb-4 text-sm">
                <strong>New pallet will have:</strong> {selectedBoxIds.length} boxes, {selectedQty} qty → {warehouse || '...'}
                <br />
                <strong>Original pallet keeps:</strong> {activeBoxes.length - selectedBoxIds.length} boxes
              </div>
            )}

            {selectedBoxIds.length > 0 && selectedBoxIds.length < activeBoxes.length && (
              <Button onClick={handleSplit} disabled={splitMutation.isPending || !warehouse}>
                <Split className="h-4 w-4 mr-1" />
                {splitMutation.isPending ? 'Splitting...' : `Split ${selectedBoxIds.length} boxes → New Pallet`}
              </Button>
            )}

            {selectedBoxIds.length === activeBoxes.length && (
              <p className="text-sm text-amber-600">Cannot split all boxes — use Move Pallet instead to move the entire pallet.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
