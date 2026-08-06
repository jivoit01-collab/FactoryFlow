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
import ScanSearchButton from '../components/ScanSearchButton';
import type { LooseStockSummary } from '../types';
import { toastBarcodeError } from '../utils/errors';

export default function RepackPage() {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<LooseStockSummary | null>(null);
  const [qty, setQty] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [sourceIds, setSourceIds] = useState<number[]>([]);
  const [sourceSearch, setSourceSearch] = useState('');

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

  // Source rows shown in the table — filtered by the search box (barcode/batch).
  // Filtering is display-only; ticked selection (sourceIds) and FIFO consumption
  // are unaffected, so a ticked box stays selected even when filtered out of view.
  const displayedRecords = useMemo(() => {
    const query = sourceSearch.trim().toLowerCase();
    if (!query) return fifoRecords;
    return fifoRecords.filter(
      (ls) =>
        (ls.source_box_barcode || '').toLowerCase().includes(query) ||
        (ls.batch_number || '').toLowerCase().includes(query),
    );
  }, [fifoRecords, sourceSearch]);

  // Suggest the batch when the pool has exactly one; operator can override
  const selectItem = (pool: LooseStockSummary | null) => {
    setSelectedItem(pool);
    setSourceIds([]);
    setSourceSearch('');
    setBatchNumber(pool && pool.batches.length === 1 ? pool.batches[0] : '');
  };

  const toggleSource = (id: number) => {
    setSourceIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Scan/type a dismantled-box barcode to tick that exact source record.
  const handleScanSource = (barcode: string) => {
    const needle = barcode.trim().toLowerCase();
    if (!needle) return;
    const match = fifoRecords.find(
      (ls) => (ls.source_box_barcode || '').toLowerCase() === needle,
    );
    if (!match) {
      setSourceSearch(barcode.trim());
      toast.error(`No source box "${barcode.trim()}" in this pool.`);
      return;
    }
    setSourceIds((prev) => (prev.includes(match.id) ? prev : [...prev, match.id]));
    setSourceSearch(barcode.trim());
    toast.success(`Selected ${match.source_box_barcode}`);
  };

  // With boxes ticked, only those records are drawn from (still oldest first)
  const useSelection = sourceIds.length > 0;
  const eligibleRecords = useMemo(
    () => (useSelection ? fifoRecords.filter((ls) => sourceIds.includes(ls.id)) : fifoRecords),
    [useSelection, fifoRecords, sourceIds],
  );
  const available = useSelection
    ? eligibleRecords.reduce((sum, ls) => sum + Number(ls.qty), 0)
    : selectedItem
      ? Number(selectedItem.total_qty)
      : 0;

  const qtyNum = Number(qty);
  const qtyValid = qty !== '' && Number.isFinite(qtyNum) && qtyNum > 0 && qtyNum <= available;
  const isValid = !!selectedItem && qtyValid && !!warehouse;

  // FIFO walk over the eligible records: which record contributes how much
  const useById = useMemo(() => {
    const map = new Map<number, number>();
    if (!qtyValid) return map;
    let remaining = qtyNum;
    for (const ls of eligibleRecords) {
      if (remaining <= 0) break;
      const use = Math.min(Number(ls.qty), remaining);
      map.set(ls.id, use);
      remaining -= use;
    }
    return map;
  }, [qtyValid, qtyNum, eligibleRecords]);

  const handleRepack = async () => {
    if (!isValid || !selectedItem) return;
    try {
      const newBox = await repackMutation.mutateAsync({
        item_code: selectedItem.item_code,
        qty: qtyNum,
        warehouse,
        batch_number: batchNumber.trim(),
        ...(useSelection ? { loose_ids: sourceIds } : {}),
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
                  Qty to Repack * ({useSelection ? 'selected boxes' : 'available'}: {available}{' '}
                  {selectedItem.uom})
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
                    Enter a quantity between 0 and {available}
                    {useSelection ? ' (from the selected boxes)' : ''}
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

      {/* Source records — tick boxes to draw from specific dismantles */}
      {selectedItem && fifoRecords.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold">
                Source records (oldest first)
                {qtyValid && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    consuming {useById.size} of {useSelection ? eligibleRecords.length : fifoRecords.length}
                  </span>
                )}
              </h3>
              {useSelection && (
                <Button size="sm" variant="ghost" onClick={() => setSourceIds([])}>
                  Clear selection ({sourceIds.length})
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Tick boxes to repack from specific dismantled boxes only — leave all unticked for
              automatic oldest-first consumption.
            </p>
            <div className="flex items-center gap-2 mb-3">
              <input
                className="flex-1 border rounded px-3 py-2 text-sm font-mono"
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                placeholder="Search source box or batch..."
              />
              <ScanSearchButton onScan={handleScanSource} expectedType="BOX" />
              {sourceSearch && (
                <Button size="sm" variant="ghost" onClick={() => setSourceSearch('')}>
                  Clear
                </Button>
              )}
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 w-8"></th>
                    <th className="text-left p-2 font-medium">Dismantled From</th>
                    <th className="text-left p-2 font-medium">Batch</th>
                    <th className="text-right p-2 font-medium">Available</th>
                    <th className="text-right p-2 font-medium">Will Use</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-xs text-muted-foreground">
                        No source box matches “{sourceSearch}”.
                      </td>
                    </tr>
                  )}
                  {displayedRecords.map((ls) => {
                    const ticked = sourceIds.includes(ls.id);
                    const excluded = useSelection && !ticked;
                    const use = useById.get(ls.id) ?? 0;
                    return (
                      <tr
                        key={ls.id}
                        className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 ${
                          excluded ? 'opacity-40' : ''
                        } ${ticked ? 'bg-blue-50' : ''}`}
                        onClick={() => toggleSource(ls.id)}
                      >
                        <td className="p-2">
                          <input type="checkbox" checked={ticked} readOnly />
                        </td>
                        <td className="p-2 font-mono text-xs">{ls.source_box_barcode || '—'}</td>
                        <td className="p-2 font-mono text-xs">{ls.batch_number}</td>
                        <td className="p-2 text-right">{Number(ls.qty)}</td>
                        <td className="p-2 text-right font-bold">
                          {use > 0 ? use : '—'}
                          {use > 0 && use < Number(ls.qty) && (
                            <Badge className="ml-2 bg-amber-100 text-amber-800">partial</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
