import { ArrowRight } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useWMSWarehouses } from '@/modules/warehouse/api';
import type { WarehouseOption } from '@/modules/warehouse/types';
import { useWmsPalletMirror } from '@/modules/wms/store';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { useMovePallet, usePalletDetail, usePallets } from '../api';
import ScanSearchButton from '../components/ScanSearchButton';
import { type BinOption,useDestinationBins } from '../hooks/useDestinationBins';
import type { Pallet } from '../types';
import { toastBarcodeError } from '../utils/errors';

export default function PalletMovePage() {
  const navigate = useNavigate();
  const [palletSearch, setPalletSearch] = useState('');
  const [scannedPalletSearch, setScannedPalletSearch] = useState('');
  const [selectedPalletId, setSelectedPalletId] = useState<number | null>(null);
  const [toWarehouse, setToWarehouse] = useState('');
  const [toBin, setToBin] = useState('');
  const [notes, setNotes] = useState('');

  const { data: pallets = [], isLoading: loadingPallets } = usePallets(
    palletSearch.length >= 2 ? { search: palletSearch, status: 'ACTIVE,PARTIAL' } : undefined,
  );
  const { data: palletDetail } = usePalletDetail(selectedPalletId);
  const { data: whData } = useWMSWarehouses();
  const warehouses: WarehouseOption[] = whData?.warehouses ?? [];
  const { isOwnWarehouse, bins, warehouseName } = useDestinationBins(toWarehouse);
  const moveMutation = useMovePallet();
  const mirrorToWms = useWmsPalletMirror();

  const handleMove = async () => {
    if (!selectedPalletId || !toWarehouse) return;
    if (isOwnWarehouse && !toBin) {
      toast.error('Select a destination location inside the warehouse.');
      return;
    }
    try {
      await moveMutation.mutateAsync({
        palletId: selectedPalletId,
        data: { to_warehouse: toWarehouse, to_bin: toBin || undefined, notes },
      });
      toast.success(`Pallet moved to ${toWarehouse}${toBin ? ` / ${toBin}` : ''}`);

      // Mirror the move into Warehouse Ops so it shows up there too. This is a
      // best-effort sync — the barcode move has already committed, so a failure
      // here must not surface as a move failure.
      if (isOwnWarehouse && toBin && palletDetail) {
        try {
          const result = await mirrorToWms({
            licensePlate: palletDetail.pallet_id,
            warehouseCode: toWarehouse,
            binCode: toBin,
            itemCode: palletDetail.item_code,
            itemName: palletDetail.item_name,
            lotNumber: palletDetail.batch_number,
            boxCount: palletDetail.box_count,
            totalUnits: Number(palletDetail.total_qty) || null,
            uom: palletDetail.uom,
          });
          if (result.mirrored) toast.success(`Synced to Warehouse Ops (${result.locationCode}).`);
        } catch {
          toast.warning('Pallet moved, but syncing to Warehouse Ops failed.');
        }
      }

      navigate(`/barcode/pallets/${selectedPalletId}`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to move pallet. Please check the selected warehouse.');
    }
  };

  function selectWarehouse(code: string) {
    setToWarehouse(code);
    setToBin(''); // a fresh destination clears any previously chosen bin
  }

  return (
    <div className="space-y-6">
      <DashboardHeader title="Move Pallet" subtitle="Transfer a pallet to a different warehouse" />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="max-w-md">
            <SearchableSelect<Pallet>
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
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {p.box_count} boxes · {p.current_warehouse}
                  </span>
                </div>
              )}
              placeholder="Search pallet..."
              label="Select Pallet"
              labelAction={
                <ScanSearchButton onScan={setScannedPalletSearch} expectedType="PALLET" />
              }
              scannedSearchValue={scannedPalletSearch}
              required
              inputId="move-pallet"
              loadingText="Searching..."
              emptyText="Type at least 2 characters"
              notFoundText="No active pallets found"
              onSearchChange={useCallback((s: string) => setPalletSearch(s), [])}
              onItemSelect={(p) => setSelectedPalletId(p.id)}
              onClear={() => setSelectedPalletId(null)}
            />
          </div>

          {palletDetail && (
            <>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-mono font-medium">{palletDetail.pallet_id}</span>
                  <span>{palletDetail.item_name}</span>
                  <span className="text-muted-foreground">Batch: {palletDetail.batch_number}</span>
                  <span>
                    {palletDetail.box_count} boxes · {palletDetail.total_qty} {palletDetail.uom}
                  </span>
                  <Badge className="bg-blue-100 text-blue-800">
                    From: {palletDetail.current_warehouse}
                  </Badge>
                </div>
              </div>

              <div className="flex items-end gap-4">
                <div className="w-[300px]">
                  <SearchableSelect<WarehouseOption>
                    items={warehouses.filter((w) => w.code !== palletDetail.current_warehouse)}
                    isLoading={false}
                    getItemKey={(wh) => wh.code}
                    getItemLabel={(wh) => `${wh.code} — ${wh.name}`}
                    renderItem={(wh) => (
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-mono text-xs font-medium">{wh.code}</span>
                        <span className="text-sm truncate">{wh.name}</span>
                      </div>
                    )}
                    placeholder="Select destination..."
                    label="Destination Warehouse"
                    required
                    inputId="move-to-warehouse"
                    loadingText="Loading..."
                    emptyText="No warehouses"
                    notFoundText="No match"
                    onItemSelect={(wh) => selectWarehouse(wh.code)}
                    onClear={() => selectWarehouse('')}
                  />
                </div>
                {isOwnWarehouse && (
                  <div className="w-[300px]">
                    <SearchableSelect<BinOption>
                      items={bins}
                      isLoading={false}
                      getItemKey={(b) => b.code}
                      getItemLabel={(b) => b.code}
                      renderItem={(b) => <span className="font-mono text-xs">{b.code}</span>}
                      placeholder="Select location..."
                      label={`Location in ${warehouseName ?? 'warehouse'}`}
                      required
                      inputId="move-to-bin"
                      loadingText="Loading..."
                      emptyText="No locations"
                      notFoundText="No match"
                      onItemSelect={(b) => setToBin(b.code)}
                      onClear={() => setToBin('')}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Notes</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm mt-1"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional..."
                  />
                </div>
              </div>

              <Button
                onClick={handleMove}
                disabled={moveMutation.isPending || !toWarehouse || (isOwnWarehouse && !toBin)}
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                {moveMutation.isPending
                  ? 'Moving...'
                  : `Move to ${toWarehouse || '...'}${toBin ? ` / ${toBin}` : ''}`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
