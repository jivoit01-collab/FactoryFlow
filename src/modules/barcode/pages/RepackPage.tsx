import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackagePlus } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent, Button, Badge } from '@/shared/components/ui';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { useWMSWarehouses } from '@/modules/warehouse/api';
import type { WarehouseOption } from '@/modules/warehouse/types';

import { useLooseStock, useRepack } from '../api';

export default function RepackPage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [warehouse, setWarehouse] = useState('');
  const { data: looseItems = [], isLoading } = useLooseStock({ status: 'ACTIVE' });
  const { data: whData } = useWMSWarehouses();
  const warehouses: WarehouseOption[] = whData?.warehouses ?? [];
  const repackMutation = useRepack();

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedItems = looseItems.filter((i) => selectedIds.includes(i.id));
  const totalQty = selectedItems.reduce((sum, i) => sum + Number(i.qty), 0);

  // Validate: all selected must be same item + batch
  const combos = new Set(selectedItems.map((i) => `${i.item_code}|${i.batch_number}`));
  const isValid = combos.size <= 1 && selectedIds.length > 0 && warehouse;

  const handleRepack = async () => {
    if (!isValid) return;
    try {
      const newBox = await repackMutation.mutateAsync({
        loose_ids: selectedIds,
        warehouse,
      });
      toast.success(`Repacked into ${newBox.box_barcode}`);
      navigate(`/barcode/boxes/${newBox.id}`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to repack');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader title="Repack" subtitle="Combine loose stock into a new box" />

      {/* Warehouse selection */}
      <Card>
        <CardContent className="p-4">
          <div className="w-[300px]">
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
              inputId="repack-warehouse"
              loadingText="Loading..."
              emptyText="No warehouses"
              notFoundText="No match"
              onItemSelect={(wh) => setWarehouse(wh.code)}
              onClear={() => setWarehouse('')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loose stock selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Active Loose Stock</h3>
            {selectedIds.length > 0 && (
              <div className="text-sm">
                Selected: <span className="font-bold">{selectedIds.length}</span> records,
                Total qty: <span className="font-bold">{totalQty}</span>
                {combos.size > 1 && (
                  <span className="text-red-600 ml-2">Mixed items/batches — must be same</span>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : looseItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No active loose stock to repack</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 w-8"></th>
                    <th className="text-left p-3 font-medium">Item</th>
                    <th className="text-left p-3 font-medium">Batch</th>
                    <th className="text-right p-3 font-medium">Qty</th>
                    <th className="text-left p-3 font-medium">Source Box</th>
                    <th className="text-left p-3 font-medium">Reason</th>
                    <th className="text-left p-3 font-medium">Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  {looseItems.map((ls) => (
                    <tr
                      key={ls.id}
                      className={`border-b cursor-pointer hover:bg-muted/30 ${selectedIds.includes(ls.id) ? 'bg-blue-50' : ''}`}
                      onClick={() => toggleSelect(ls.id)}
                    >
                      <td className="p-3">
                        <input type="checkbox" checked={selectedIds.includes(ls.id)} readOnly />
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{ls.item_code}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{ls.item_name}</div>
                      </td>
                      <td className="p-3 text-xs font-mono">{ls.batch_number}</td>
                      <td className="p-3 text-right font-bold">{ls.qty} {ls.uom}</td>
                      <td className="p-3 font-mono text-xs">{ls.source_box_barcode || '—'}</td>
                      <td className="p-3">
                        <Badge className="bg-gray-100 text-gray-800">{ls.reason}</Badge>
                      </td>
                      <td className="p-3">{ls.current_warehouse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Repack button */}
          <div className="mt-4">
            <Button
              onClick={handleRepack}
              disabled={!isValid || repackMutation.isPending}
            >
              <PackagePlus className="h-4 w-4 mr-1" />
              {repackMutation.isPending
                ? 'Repacking...'
                : `Repack ${selectedIds.length} Records (${totalQty} units) → New Box`}
            </Button>
            {combos.size > 1 && selectedIds.length > 0 && (
              <p className="text-sm text-red-600 mt-2">Cannot repack different items or batches together</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
