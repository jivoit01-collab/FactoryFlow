import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Card, CardContent, Button, Badge } from '@/shared/components/ui';
import { useWMSWarehouses } from '@/modules/warehouse/api';
import type { WarehouseOption } from '@/modules/warehouse/types';

import { usePallets, usePalletDetail, useMovePallet } from '../api';
import type { Pallet } from '../types';

export default function PalletMovePage() {
  const navigate = useNavigate();
  const [palletSearch, setPalletSearch] = useState('');
  const [selectedPalletId, setSelectedPalletId] = useState<number | null>(null);
  const [toWarehouse, setToWarehouse] = useState('');
  const [notes, setNotes] = useState('');

  const { data: pallets = [], isLoading: loadingPallets } = usePallets(
    palletSearch.length >= 2 ? { search: palletSearch, status: 'ACTIVE' } : undefined
  );
  const { data: palletDetail } = usePalletDetail(selectedPalletId);
  const { data: whData } = useWMSWarehouses();
  const warehouses: WarehouseOption[] = whData?.warehouses ?? [];
  const moveMutation = useMovePallet();

  const handleMove = async () => {
    if (!selectedPalletId || !toWarehouse) return;
    try {
      await moveMutation.mutateAsync({
        palletId: selectedPalletId,
        data: { to_warehouse: toWarehouse, notes },
      });
      toast.success(`Pallet moved to ${toWarehouse}`);
      navigate(`/barcode/pallets/${selectedPalletId}`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to move');
    }
  };

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
                  <span className="text-xs text-muted-foreground">{p.box_count} boxes · {p.current_warehouse}</span>
                </div>
              )}
              placeholder="Search pallet..."
              label="Select Pallet"
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
                  <span>{palletDetail.box_count} boxes · {palletDetail.total_qty} {palletDetail.uom}</span>
                  <Badge className="bg-blue-100 text-blue-800">From: {palletDetail.current_warehouse}</Badge>
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
                    onItemSelect={(wh) => setToWarehouse(wh.code)}
                    onClear={() => setToWarehouse('')}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Notes</label>
                  <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional..." />
                </div>
              </div>

              <Button onClick={handleMove} disabled={moveMutation.isPending || !toWarehouse}>
                <ArrowRight className="h-4 w-4 mr-1" />
                {moveMutation.isPending ? 'Moving...' : `Move to ${toWarehouse || '...'}`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
