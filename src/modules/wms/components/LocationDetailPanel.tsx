/**
 * Location detail side panel for the map (Step 5).
 *
 * Opens when a cell is clicked. Shows the block's identity, capacity vs usage,
 * occupancy, and the pallets / inventory currently inside. Scan-driven move
 * actions (wired through the barcode scanner) let the operator pick a pallet
 * here up for relocation, or scan a pallet to place into this location.
 */
import { MoveRight, PackagePlus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

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
import type {
  CellPurpose,
  InventoryRecord,
  MovementLogEntry,
  Pallet,
  WarehouseLocation,
} from '../types';
import { MovementItem } from './MovementItem';
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
  /** Remove a phantom pallet from this location (bin is actually empty). */
  onRemovePallet?: (pallet: Pallet) => void;
  /** The most recent movements for this location (the audit-trail preview). */
  recentMovements?: MovementLogEntry[];
  movementsLoading?: boolean;
  /** Location id → code, to name the counterpart location in a movement. */
  locationCodeById?: Map<string, string>;
  /** Pallet id → license plate, to show which pallet each movement moved. */
  plateById?: Map<string, string>;
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

/** One label/value row in the location Details section. */
function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/** ISO datetime → plain date (drop the time part). */
function asDate(value: string | null | undefined): string {
  return value && value.length >= 10 ? value.slice(0, 10) : value ?? '';
}

/** A human item label that never falls back to the pallet plate. */
function itemLabel(itemName: string, itemCode: string, plate?: string): string {
  if (itemName.trim()) return itemName;
  if (itemCode.trim() && itemCode !== plate) return itemCode;
  return 'Unknown item';
}

/** The location's configured constraints, as {label, value} rows (empty when none). */
function locationDetails(location: WarehouseLocation): { label: string; value: React.ReactNode }[] {
  const rows: { label: string; value: React.ReactNode }[] = [];
  if (location.status && location.status !== 'ACTIVE') rows.push({ label: 'Status', value: location.status });
  if (location.barcode && location.barcode !== location.code) rows.push({ label: 'Barcode', value: location.barcode });
  const rules = location.materialRules;
  if (rules?.temperatureClass) rows.push({ label: 'Temperature', value: rules.temperatureClass });
  if (rules?.singleLotOnly) rows.push({ label: 'Single lot only', value: 'Yes' });
  if (rules && rules.allowMixedItems === false) rows.push({ label: 'Mixed items', value: 'Not allowed' });
  if (rules?.allowedMaterialTypes?.length) rows.push({ label: 'Allowed types', value: rules.allowedMaterialTypes.join(', ') });
  if (rules?.restrictedMaterialTypes?.length) rows.push({ label: 'Restricted types', value: rules.restrictedMaterialTypes.join(', ') });
  if (rules?.hazmatAllowed) rows.push({ label: 'Hazmat', value: rules.hazmatClasses?.length ? rules.hazmatClasses.join(', ') : 'Allowed' });
  if (location.reservation?.isReserved) rows.push({ label: 'Reserved for', value: location.reservation.reference || 'Yes' });
  const rep = location.replenishment;
  if (rep && (rep.minStock != null || rep.maxStock != null)) {
    rows.push({ label: 'Min / max stock', value: `${rep.minStock ?? '—'} / ${rep.maxStock ?? '—'}` });
  }
  if (location.notes?.trim()) rows.push({ label: 'Notes', value: location.notes });
  return rows;
}

export function LocationDetailPanel({
  open,
  onOpenChange,
  location,
  purpose,
  occupancy,
  palletsHere,
  plateById,
  inventoryHere,
  onMovePallet,
  onPlacePalletHere,
  onRemovePallet,
  recentMovements,
  movementsLoading,
  locationCodeById,
}: LocationDetailPanelProps) {
  if (!location) return null;
  const meta = occupancy ? DISPLAY_STATUS_META[occupancy.status] : null;
  const isStorage = purpose ? purpose.holdsStock : true;
  const details = locationDetails(location);

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

          {/* Location configuration & constraints */}
          {details.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Details</h3>
              <div className="space-y-1.5">
                {details.map((row) => (
                  <Detail key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {itemLabel(pallet.itemName, pallet.itemCode, pallet.licensePlate)}
                      </p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {pallet.licensePlate}
                        {pallet.itemCode && pallet.itemCode !== pallet.licensePlate
                          ? ` · ${pallet.itemCode}`
                          : ''}
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
                            subtitle: itemLabel(pallet.itemName, pallet.itemCode, pallet.licensePlate),
                          },
                        ]}
                      />
                      {onMovePallet ? (
                        <Button variant="outline" size="sm" onClick={() => onMovePallet(pallet)}>
                          <MoveRight className="mr-1 h-3.5 w-3.5" /> Move
                        </Button>
                      ) : null}
                      {onRemovePallet ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          title="Remove from this location (bin is empty)"
                          onClick={() => onRemovePallet(pallet)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{pallet.boxCount} box{pallet.boxCount === 1 ? '' : 'es'}</span>
                    {pallet.totalUnits ? <span>{pallet.totalUnits} units</span> : null}
                    {pallet.lotNumber ? <span>lot {pallet.lotNumber}</span> : null}
                    {pallet.expiryDate ? <span>exp {asDate(pallet.expiryDate)}</span> : null}
                    {pallet.status && pallet.status !== 'ACTIVE' ? (
                      <span className="font-medium text-amber-600">{pallet.status}</span>
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
                <div key={record.id} className="rounded-md border p-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{itemLabel(record.itemName, record.itemCode)}</span>
                    <span className="shrink-0 font-medium">
                      {record.quantity} {record.uom}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {record.itemCode ? <span className="font-mono">{record.itemCode}</span> : null}
                    {record.boxCount ? <span>{record.boxCount} box{record.boxCount === 1 ? '' : 'es'}</span> : null}
                    {record.lotNumber ? <span>lot {record.lotNumber}</span> : null}
                    {record.expiryDate ? <span>exp {asDate(record.expiryDate)}</span> : null}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Audit trail — the most recent movements, with a link to the full,
              paginated history for this cell. */}
          {isStorage ? (
            <>
              <Separator />
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Recent movements</h3>
                  <Link
                    to={`/warehouse-ops/locations/${location.id}/history`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View full history →
                  </Link>
                </div>
                {movementsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : !recentMovements || recentMovements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No movements recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {recentMovements.slice(0, 3).map((entry) => (
                      <MovementItem
                        key={entry.id}
                        entry={entry}
                        thisLocationId={location.id}
                        codeById={locationCodeById}
                        plateById={plateById}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
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
