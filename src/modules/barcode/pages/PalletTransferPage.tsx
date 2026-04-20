import { useState, useCallback } from 'react';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Card, CardContent, Button, Badge } from '@/shared/components/ui';
import { useWMSWarehouses } from '@/modules/warehouse/api';
import type { WarehouseOption } from '@/modules/warehouse/types';

import { usePallets, useMovePallet } from '../api';
import type { Pallet } from '../types';

export default function PalletTransferPage() {
  const [palletSearch, setPalletSearch] = useState('');
  const [selectedPallets, setSelectedPallets] = useState<Pallet[]>([]);
  const [toWarehouse, setToWarehouse] = useState('');

  const { data: pallets = [], isLoading } = usePallets(
    palletSearch.length >= 2 ? { search: palletSearch, status: 'ACTIVE' } : undefined
  );
  const { data: whData } = useWMSWarehouses();
  const warehouses: WarehouseOption[] = whData?.warehouses ?? [];
  const moveMutation = useMovePallet();

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
    let successCount = 0;
    for (const pallet of selectedPallets) {
      try {
        await moveMutation.mutateAsync({
          palletId: pallet.id,
          data: { to_warehouse: toWarehouse, notes: `Bulk godown transfer (${selectedPallets.length} pallets)` },
        });
        successCount++;
      } catch {
        toast.error(`Failed to move ${pallet.pallet_id}`);
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
      <DashboardHeader title="Godown Transfer" subtitle="Bulk transfer pallets between warehouses (e.g., BH-PF → GP-FG)" />

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
                  <span className="text-xs text-muted-foreground">{p.box_count} boxes · {p.current_warehouse}</span>
                </div>
              )}
              placeholder="Search and add pallets..."
              label="Add Pallets"
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
              onItemSelect={(wh) => setToWarehouse(wh.code)}
              onClear={() => setToWarehouse('')}
            />
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
                <div key={p.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium">{p.pallet_id}</span>
                    <span className="text-sm">{p.item_name || p.item_code}</span>
                    <span className="text-xs text-muted-foreground">{p.batch_number}</span>
                    <span className="text-xs">{p.box_count} boxes</span>
                    <Badge className="bg-blue-100 text-blue-800 text-xs">{p.current_warehouse}</Badge>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removePallet(p.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <Button
              onClick={handleTransferAll}
              disabled={moveMutation.isPending || !toWarehouse}
              className="w-full"
            >
              <Truck className="h-4 w-4 mr-2" />
              {moveMutation.isPending
                ? 'Transferring...'
                : `Transfer ${selectedPallets.length} Pallets → ${toWarehouse || '...'}`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
