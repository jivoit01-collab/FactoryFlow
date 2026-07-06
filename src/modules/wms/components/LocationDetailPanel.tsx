/**
 * Location detail side panel for the map (Step 5).
 *
 * Opens when a cell is clicked. Shows the block's identity, capacity vs usage,
 * occupancy, and the pallets / inventory currently inside. Scan-driven move
 * actions (wired through the barcode scanner) let the operator pick a pallet
 * here up for relocation, or scan a pallet to place into this location.
 */
import { MoveRight, PackagePlus } from 'lucide-react';

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

import type { LocationOccupancy } from '../services';
import { DISPLAY_STATUS_META } from '../services';
import type { CellPurpose, InventoryRecord, Pallet, WarehouseLocation } from '../types';
import { WmsPrintLabelButton } from './WmsPrintLabelButton';
import { WmsScanButton } from './WmsScanButton';

interface LocationDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: WarehouseLocation | null;
  purpose: CellPurpose | null;
  occupancy: LocationOccupancy | null;
  palletsHere: Pallet[];
  inventoryHere: InventoryRecord[];
  /** Begin relocating a pallet that currently sits in this location. */
  onMovePallet?: (pallet: Pallet) => void;
  /** Scan a pallet elsewhere to move it into this location. */
  onPlacePalletHere?: (scannedCode: string) => void;
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
  purpose,
  occupancy,
  palletsHere,
  inventoryHere,
  onMovePallet,
  onPlacePalletHere,
}: LocationDetailPanelProps) {
  if (!location) return null;
  const meta = occupancy ? DISPLAY_STATUS_META[occupancy.status] : null;
  const isStorage = purpose ? purpose.holdsStock : true;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {location.code}
            {purpose ? (
              <Badge variant="outline" className="gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: purpose.color }} />
                {purpose.name}
              </Badge>
            ) : meta ? (
              <Badge variant="outline" className="gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                {meta.label}
              </Badge>
            ) : null}
          </SheetTitle>
          <SheetDescription>
            {location.type}
            {isStorage && occupancy ? ` · ${Math.round(occupancy.occupancyPct)}% full` : ''}
            {!isStorage ? ' · non-storage cell' : ''}
          </SheetDescription>
          <div className="pt-1">
            <WmsPrintLabelButton
              label="Print location label"
              documentTitle={`Location ${location.code}`}
              labels={[
                {
                  code: location.barcode || location.code,
                  title: location.code,
                  heading: 'LOCATION',
                  subtitle: location.type,
                },
              ]}
            />
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-5 py-4">
          {/* Capacity vs usage */}
          {occupancy && isStorage ? (
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
                <div key={pallet.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{pallet.licensePlate}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {pallet.itemName || pallet.itemCode} · {pallet.boxCount} boxes
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <WmsPrintLabelButton
                      label="Print"
                      documentTitle={`Pallet ${pallet.licensePlate}`}
                      labels={[
                        {
                          code: pallet.licensePlate,
                          title: pallet.licensePlate,
                          heading: 'PALLET',
                          subtitle: pallet.itemName || pallet.itemCode,
                        },
                      ]}
                    />
                    {onMovePallet ? (
                      <Button variant="outline" size="sm" onClick={() => onMovePallet(pallet)}>
                        <MoveRight className="mr-1 h-3.5 w-3.5" /> Move
                      </Button>
                    ) : null}
                  </div>
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

        {/* Scan-driven actions */}
        {onPlacePalletHere && isStorage ? (
          <div className="flex flex-col gap-2 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <PackagePlus className="h-4 w-4" /> Place a pallet here
            </div>
            <p className="text-xs text-muted-foreground">
              Scan a pallet anywhere in the warehouse to move it into {location.code}.
            </p>
            <WmsScanButton label="Scan pallet to place" onScan={onPlacePalletHere} />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
