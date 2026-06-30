import { Truck } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { useWMSWarehouses } from '@/modules/warehouse/api';
import type { WarehouseOption } from '@/modules/warehouse/types';
import { useWmsPalletMirror } from '@/modules/wms/store';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { useMovePallet, usePallets } from '../api';
import ScanSearchButton from '../components/ScanSearchButton';
import { type BinOption,useDestinationBins } from '../hooks/useDestinationBins';
import type { Pallet } from '../types';
import { getBarcodeErrorMessage } from '../utils/errors';

export default function PalletTransferPage() {
  const [palletSearch, setPalletSearch] = useState('');
  const [scannedPalletSearch, setScannedPalletSearch] = useState('');
  const [selectedPallets, setSelectedPallets] = useState<Pallet[]>([]);
  const [toWarehouse, setToWarehouse] = useState('');
  const [toBin, setToBin] = useState('');

  const { data: pallets = [], isLoading } = usePallets(
    palletSearch.length >= 2 ? { search: palletSearch, status: 'ACTIVE' } : undefined,
  );
  const { data: whData } = useWMSWarehouses();
  const warehouses: WarehouseOption[] = whData?.warehouses ?? [];
  const { isOwnWarehouse, bins, warehouseName } = useDestinationBins(toWarehouse);
  const moveMutation = useMovePallet();
  const mirrorToWms = useWmsPalletMirror();

  function selectWarehouse(code: string) {
    setToWarehouse(code);
    setToBin('');
  }

  const addPallet = (p: Pallet) => {
    if (!selectedPallets.find((sp) => sp.id === p.id)) {
      setSelectedPallets((prev) => [...prev, p]);
    }
  };

  const removePallet = (id: number) => {
    setSelectedPallets((prev) => prev.filter((p) => p.id !== id));
  };

  const handleTransferAll = async () => {
    if (!toWarehouse || selectedPallets.length === 0) return;
    if (isOwnWarehouse && !toBin) {
      toast.error('Select a destination location inside the warehouse.');
      return;
    }
    let successCount = 0;
    for (const pallet of selectedPallets) {
      try {
        await moveMutation.mutateAsync({
          palletId: pallet.id,
          data: {
            to_warehouse: toWarehouse,
            to_bin: toBin || undefined,
            notes: `Bulk godown transfer (${selectedPallets.length} pallets)`,
          },
        });
        successCount++;
        // Mirror into Warehouse Ops for own-warehouse destinations (best effort).
        if (isOwnWarehouse && toBin) {
          try {
            await mirrorToWms({
              licensePlate: pallet.pallet_id,
              warehouseCode: toWarehouse,
              binCode: toBin,
              itemCode: pallet.item_code,
              itemName: pallet.item_name,
              lotNumber: pallet.batch_number,
              boxCount: pallet.box_count,
              totalUnits: Number(pallet.total_qty) || null,
              uom: pallet.uom,
            });
          } catch {
            // Non-fatal: the barcode transfer already succeeded.
          }
        }
      } catch (err: unknown) {
        const status = (err as { status?: number; response?: { status?: number } })?.status;
        const responseStatus = (err as { response?: { status?: number } })?.response?.status;
        if (!status && !responseStatus) {
          toast.error(
            `${pallet.pallet_id}: ${getBarcodeErrorMessage(err, 'Unable to transfer pallet')}`,
          );
        }
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} pallets transferred to ${toWarehouse}`);
      setSelectedPallets([]);
    }
  };

  const totalBoxes = selectedPallets.reduce((sum, p) => sum + p.box_count, 0);
  const totalQty = selectedPallets.reduce((sum, p) => sum + Number(p.total_qty), 0);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Godown Transfer"
        subtitle="Bulk transfer pallets between warehouses (e.g., BH-PF → GP-FG)"
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect<Pallet>
              items={pallets.filter((p) => !selectedPallets.find((sp) => sp.id === p.id))}
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
                  <span className="text-xs text-muted-foreground">
                    {p.box_count} boxes · {p.current_warehouse}
                  </span>
                </div>
              )}
              placeholder="Search and add pallets..."
              label="Add Pallets"
              labelAction={
                <ScanSearchButton onScan={setScannedPalletSearch} expectedType="PALLET" />
              }
              scannedSearchValue={scannedPalletSearch}
              inputId="transfer-add-pallet"
              loadingText="Searching..."
              emptyText="Type at least 2 characters"
              notFoundText="No pallets found"
              onSearchChange={useCallback((s: string) => setPalletSearch(s), [])}
              onItemSelect={addPallet}
              onClear={() => {}}
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
              placeholder="Select destination warehouse..."
              label="Destination Warehouse"
              required
              inputId="transfer-warehouse"
              loadingText="Loading..."
              emptyText="No warehouses"
              notFoundText="No match"
              onItemSelect={(wh) => selectWarehouse(wh.code)}
              onClear={() => selectWarehouse('')}
            />

            {isOwnWarehouse && (
              <SearchableSelect<BinOption>
                items={bins}
                isLoading={false}
                getItemKey={(b) => b.code}
                getItemLabel={(b) => b.code}
                renderItem={(b) => <span className="font-mono text-xs">{b.code}</span>}
                placeholder="Select location..."
                label={`Location in ${warehouseName ?? 'warehouse'}`}
                required
                inputId="transfer-bin"
                loadingText="Loading..."
                emptyText="No locations"
                notFoundText="No match"
                onItemSelect={(b) => setToBin(b.code)}
                onClear={() => setToBin('')}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected pallets */}
      {selectedPallets.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Selected Pallets ({selectedPallets.length})</h3>
              <div className="text-sm text-muted-foreground">
                {totalBoxes} boxes · {totalQty.toFixed(0)} total qty
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {selectedPallets.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium">{p.pallet_id}</span>
                    <span className="text-sm">{p.item_name || p.item_code}</span>
                    <span className="text-xs text-muted-foreground">{p.batch_number}</span>
                    <span className="text-xs">{p.box_count} boxes</span>
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      {p.current_warehouse}
                    </Badge>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removePallet(p.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <Button
              onClick={handleTransferAll}
              disabled={moveMutation.isPending || !toWarehouse || (isOwnWarehouse && !toBin)}
              className="w-full"
            >
              <Truck className="h-4 w-4 mr-2" />
              {moveMutation.isPending
                ? 'Transferring...'
                : `Transfer ${selectedPallets.length} Pallets → ${toWarehouse || '...'}${toBin ? ` / ${toBin}` : ''}`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
