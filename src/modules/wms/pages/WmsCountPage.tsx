/**
 * Cycle count & audit (Step 9).
 *
 * The operator scans a location, enters the counted quantity (and box count) for
 * each recorded line, and can add items found that weren't on record. The system
 * flags discrepancies; posting the count updates inventory to the counted
 * figures and writes a CYCLE_COUNT movement for every change.
 */
import { useMemo, useState } from 'react';
import { ClipboardCheck, Plus, ScanLine } from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@/shared/components/ui';

import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import { useWmsCollection, useWmsEnabled, wmsStore } from '../store';
import { notifyFail, notifyOk } from '../utils';

interface CountState {
  quantity: number;
  boxCount: number | null;
}

interface Addition {
  itemCode: string;
  itemName: string;
  quantity: number;
}

export default function WmsCountPage() {
  const enabled = useWmsEnabled();
  const { data: locations } = useWmsCollection('locations');
  const { data: inventory } = useWmsCollection('inventory');

  const [scanQuery, setScanQuery] = useState('');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, CountState>>({});
  const [additions, setAdditions] = useState<Addition[]>([]);
  const [busy, setBusy] = useState(false);

  const location = locationId ? locations.find((l) => l.id === locationId) ?? null : null;
  const lines = useMemo(
    () => inventory.filter((record) => record.locationId === locationId),
    [inventory, locationId],
  );

  function resolve() {
    const found = locations.find((l) => l.code.toLowerCase() === scanQuery.trim().toLowerCase());
    if (!found) {
      toast.error('No location matched that code.');
      return;
    }
    setLocationId(found.id);
    const initial: Record<string, CountState> = {};
    for (const record of inventory.filter((r) => r.locationId === found.id)) {
      initial[record.id] = { quantity: record.quantity, boxCount: record.boxCount };
    }
    setCounts(initial);
    setAdditions([]);
  }

  function setCount(id: string, value: number) {
    setCounts((previous) => ({ ...previous, [id]: { ...previous[id]!, quantity: Math.max(0, value) } }));
  }

  const changedCount = lines.filter((record) => (counts[record.id]?.quantity ?? record.quantity) !== record.quantity).length
    + additions.filter((addition) => addition.itemCode.trim() && addition.quantity > 0).length;

  async function post() {
    if (!locationId) return;
    setBusy(true);
    try {
      const { adjustments } = await wmsStore.postCycleCount({
        locationId,
        counts: lines.map((record) => ({
          inventoryId: record.id,
          countedQuantity: counts[record.id]?.quantity ?? record.quantity,
          countedBoxCount: counts[record.id]?.boxCount ?? null,
        })),
        additions: additions
          .filter((addition) => addition.itemCode.trim() && addition.quantity > 0)
          .map((addition) => ({ itemCode: addition.itemCode.trim(), itemName: addition.itemName.trim(), quantity: addition.quantity })),
      });
      notifyOk(adjustments > 0 ? `Posted ${adjustments} adjustment(s).` : 'Count matched — no adjustments.');
      setLocationId(null);
      setScanQuery('');
      setCounts({});
      setAdditions([]);
    } catch (error) {
      notifyFail(error instanceof Error ? error.message : 'Count failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <WmsDisabledNotice />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cycle Count</h1>
        <p className="text-sm text-muted-foreground">Scan a location and count what’s there.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              autoFocus
              value={scanQuery}
              placeholder="Scan location code"
              onChange={(event) => setScanQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && resolve()}
            />
            <Button variant="outline" onClick={resolve}>
              <ScanLine className="mr-2 h-4 w-4" /> Find
            </Button>
          </div>
        </CardContent>
      </Card>

      {location ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Counting <span className="font-mono">{location.code}</span>
            </CardTitle>
            {changedCount > 0 ? <Badge variant="outline">{changedCount} discrepancy</Badge> : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock on record here.</p>
            ) : (
              lines.map((record) => {
                const counted = counts[record.id]?.quantity ?? record.quantity;
                const changed = counted !== record.quantity;
                return (
                  <div key={record.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{record.itemName || record.itemCode}</p>
                      <p className="text-xs text-muted-foreground">
                        Recorded {record.quantity} {record.uom}
                        {record.lotNumber ? ` · lot ${record.lotNumber}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        className="w-24"
                        value={counted}
                        onChange={(event) => setCount(record.id, Number(event.target.value) || 0)}
                      />
                      {changed ? <Badge variant="outline" className="text-amber-600">Δ {counted - record.quantity}</Badge> : null}
                    </div>
                  </div>
                );
              })
            )}

            {/* Found-but-not-recorded items */}
            {additions.map((addition, index) => (
              <div key={index} className="flex items-center gap-2 rounded-md border border-dashed p-3">
                <Input
                  placeholder="Item code"
                  value={addition.itemCode}
                  onChange={(event) =>
                    setAdditions((prev) => prev.map((a, i) => (i === index ? { ...a, itemCode: event.target.value } : a)))
                  }
                />
                <Input
                  type="number"
                  min={1}
                  className="w-24"
                  value={addition.quantity}
                  onChange={(event) =>
                    setAdditions((prev) => prev.map((a, i) => (i === index ? { ...a, quantity: Math.max(1, Number(event.target.value) || 1) } : a)))
                  }
                />
              </div>
            ))}

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAdditions((prev) => [...prev, { itemCode: '', itemName: '', quantity: 1 }])}
              >
                <Plus className="mr-2 h-4 w-4" /> Found item
              </Button>
              <Button disabled={busy} onClick={() => void post()}>
                <ClipboardCheck className="mr-2 h-4 w-4" /> Post count
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
