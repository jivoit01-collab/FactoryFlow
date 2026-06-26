/**
 * Location detail side panel for the map (Step 5).
 *
 * Opens when a cell is clicked. Shows the block's identity, capacity vs usage,
 * occupancy, and the pallets / inventory currently inside, with action buttons.
 * The stock lists are empty until receiving/putaway (Steps 6–7) add records;
 * the actions are placeholders that those steps will wire up.
 */
import { ArrowLeftRight, PackagePlus } from 'lucide-react';

import {
  Badge,
  Button,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui';

import { DISPLAY_STATUS_META } from '../services';
import type { LocationOccupancy } from '../services';
import type { InventoryRecord, Pallet, WarehouseLocation, Zone } from '../types';

interface LocationDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: WarehouseLocation | null;
  zone: Zone | null;
  occupancy: LocationOccupancy | null;
  palletsHere: Pallet[];
  inventoryHere: InventoryRecord[];
}

function Usage({ label, used, max, unit }: { label: string; used: number; max: number | null; unit?: string }) {
  const pct = max && max > 0 ? Math.min(100, (used / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used}
          {max != null ? ` / ${max}` : ''}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LocationDetailPanel({
  open,
  onOpenChange,
  location,
  zone,
  occupancy,
  palletsHere,
  inventoryHere,
}: LocationDetailPanelProps) {
  if (!location) return null;
  const meta = occupancy ? DISPLAY_STATUS_META[occupancy.status] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {location.code}
            {meta ? (
              <Badge variant="outline" className="gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                {meta.label}
              </Badge>
            ) : null}
          </SheetTitle>
          <SheetDescription>
            {location.type}
            {zone ? ` · ${zone.name}` : ''}
            {occupancy ? ` · ${Math.round(occupancy.occupancyPct)}% full` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 py-4">
          {/* Capacity vs usage */}
          {occupancy ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Capacity</h3>
              <Usage label="Pallets" used={occupancy.pallets} max={location.capacity.maxPallets} />
              <Usage label="Units" used={occupancy.units} max={location.capacity.maxUnits} />
              <Usage label="Weight" used={occupancy.weight} max={location.capacity.maxWeight} unit="kg" />
              <Usage label="Volume" used={occupancy.volume} max={location.capacity.maxVolume} unit="m³" />
            </section>
          ) : null}

          <Separator />

          {/* Pallets inside */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Pallets ({palletsHere.length})</h3>
            {palletsHere.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pallets here yet.</p>
            ) : (
              palletsHere.map((pallet) => (
                <div key={pallet.id} className="rounded-md border p-2 text-sm">
                  <p className="font-medium">{pallet.licensePlate}</p>
                  <p className="text-xs text-muted-foreground">
                    {pallet.itemName || pallet.itemCode} · {pallet.boxCount} boxes
                  </p>
                </div>
              ))
            )}
          </section>

          {/* Inventory inside */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Inventory ({inventoryHere.length})</h3>
            {inventoryHere.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock here yet.</p>
            ) : (
              inventoryHere.map((record) => (
                <div key={record.id} className="flex justify-between rounded-md border p-2 text-sm">
                  <span>{record.itemName || record.itemCode}</span>
                  <span className="font-medium">
                    {record.quantity} {record.uom}
                  </span>
                </div>
              ))
            )}
          </section>
        </div>

        {/* Actions (wired up in Steps 6–7) */}
        <div className="flex gap-2 border-t pt-4">
          <Button variant="outline" className="flex-1" disabled title="Available in Step 6">
            <ArrowLeftRight className="mr-2 h-4 w-4" /> Transfer
          </Button>
          <Button variant="outline" className="flex-1" disabled title="Available in Step 7">
            <PackagePlus className="mr-2 h-4 w-4" /> Put away
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
