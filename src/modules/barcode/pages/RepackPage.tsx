import { PackagePlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useWMSWarehouses } from '@/modules/warehouse/api';
import type { WarehouseOption } from '@/modules/warehouse/types';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { useLooseStock, useLooseStockSummary, useRepack } from '../api';
import type { LooseStockSummary } from '../types';
import { toastBarcodeError } from '../utils/errors';

export default function RepackPage() {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<LooseStockSummary | null>(null);
  const [qty, setQty] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [batchNumber, setBatchNumber] = useState('');

  const { data: pools = [], isLoading: loadingPools } = useLooseStockSummary();
  const { data: whData } = useWMSWarehouses();
  const warehouses: WarehouseOption[] = whData?.warehouses ?? [];
  const repackMutation = useRepack();

  // Records behind the selected item, oldest first — the order repack consumes them
  const { data: itemRecords = [] } = useLooseStock(
    selectedItem ? { status: 'ACTIVE', item_code: selectedItem.item_code } : undefined,
    { enabled: !!selectedItem },
  );
  const fifoRecords = useMemo(
    () =>
      [...itemRecords].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    [itemRecords],
  );

  // Suggest the batch when the pool has exactly one; operator can override
  const selectItem = (pool: LooseStockSummary | null) => {
    setSelectedItem(pool);
    setBatchNumber(pool && pool.batches.length === 1 ? pool.batches[0] : '');
  };

  const available = selectedItem ? Number(selectedItem.total_qty) : 0;
  const qtyNum = Number(qty);
  const qtyValid = qty !== '' && Number.isFinite(qtyNum) && qtyNum > 0 && qtyNum <= available;
  const isValid = !!selectedItem && qtyValid && !!warehouse;

  // FIFO preview: how the entered qty will be drawn from the records
  const preview = useMemo(() => {
    if (!qtyValid) return [];
    let remaining = qtyNum;
    const rows: { id: number; barcode: string; batch: string; qty: number; use: number }[] = [];
    for (const ls of fifoRecords) {
      if (remaining <= 0) break;
      const use = Math.min(Number(ls.qty), remaining);
      rows.push({
        id: ls.id,
        barcode: ls.source_box_barcode || '—',
        batch: ls.batch_number,
        qty: Number(ls.qty),
        use,
      });
      remaining -= use;
    }
    return rows;
  }, [qtyValid, qtyNum, fifoRecords]);

  const handleRepack = async () => {
    if (!isValid || !selectedItem) return;
    try {
      const newBox = await repackMutation.mutateAsync({
        item_code: selectedItem.item_code,
        qty: qtyNum,
        warehouse,
        batch_number: batchNumber.trim(),
      });
      toast.success(`Repacked into ${newBox.box_barcode}`);
      navigate(`/barcode/boxes/${newBox.id}`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to repack the selected loose stock.');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader title="Repack" subtitle="Pack any quantity of loose stock into a new box" />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect<LooseStockSummary>
              items={pools}
              isLoading={loadingPools}
              getItemKey={(p) => p.item_code}
              getItemLabel={(p) => `${p.item_code} — ${p.item_name || ''}`}
              renderItem={(p) => (
                <div className="flex items-center justify-between w-full">
                  <div>
                    <span className="font-mono text-xs font-medium">{p.item_code}</span>
                    <span className="ml-2 text-sm truncate">{p.item_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {p.total_qty} {p.uom} loose
                  </span>
                </div>
              )}
              placeholder="Select item with loose stock..."
              label="Item"
              required
              inputId="repack-item"
              loadingText="Loading..."
              emptyText="No active loose stock"
              notFoundText="No match"
              onItemSelect={(p) => selectItem(p)}
              onClear={() => selectItem(null)}
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
              inputId="repack-warehouse"
              loadingText="Loading..."
              emptyText="No warehouses"
              notFoundText="No match"
              onItemSelect={(wh) => setWarehouse(wh.code)}
              onClear={() => setWarehouse('')}
            />
          </div>

          {selectedItem && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Qty to Repack * (available: {selectedItem.total_qty} {selectedItem.uom})
                </label>
                <input
                  type="number"
                  min={0}
                  max={available}
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="Any quantity up to the loose total"
                />
                {qty !== '' && !qtyValid && (
                  <p className="text-xs text-red-600 mt-1">
                    Enter a quantity between 0 and {selectedItem.total_qty}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Batch for New Box
                </label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm mt-1 font-mono"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="Blank → source batch, or MIXED"
                />
                {selectedItem.batches.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Pool spans batches: {selectedItem.batches.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FIFO consumption preview */}
      {selectedItem && preview.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">
              Will consume (oldest first)
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {preview.length} of {selectedItem.record_count} records
              </span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Dismantled From</th>
                    <th className="text-left p-2 font-medium">Batch</th>
                    <th className="text-right p-2 font-medium">Available</th>
                    <th className="text-right p-2 font-medium">Will Use</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="p-2 font-mono text-xs">{row.barcode}</td>
                      <td className="p-2 font-mono text-xs">{row.batch}</td>
                      <td className="p-2 text-right">{row.qty}</td>
                      <td className="p-2 text-right font-bold">
                        {row.use}
                        {row.use < row.qty && (
                          <Badge className="ml-2 bg-amber-100 text-amber-800">partial</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleRepack} disabled={!isValid || repackMutation.isPending}>
        <PackagePlus className="h-4 w-4 mr-1" />
        {repackMutation.isPending
          ? 'Repacking...'
          : isValid
            ? `Repack ${qty} ${selectedItem?.uom ?? ''} → New Box`
            : 'Repack → New Box'}
      </Button>
    </div>
  );
}
