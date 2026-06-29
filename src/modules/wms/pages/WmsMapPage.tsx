/**
 * Visual warehouse map (Step 5) + scan-driven moves.
 *
 * Renders a chosen warehouse as a live, colour-coded grid: pick a warehouse and
 * level, switch how cells are coloured (status / zone / occupancy), filter by
 * zone or status, and search to highlight locations holding an item/lot or jump
 * to a code. Clicking a cell opens the detail panel.
 *
 * Barcode integration: scanning resolves a location (jump + open) or a pallet
 * (jump to where it sits + open). A scan-driven "Move pallet" mode highlights
 * every valid destination on the grid — stars the engine's top putaway picks —
 * then lets the operator tap or scan the destination; the shared validation
 * engine vets the move before it is committed to the store.
 */
import { MoveRight, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useSyncPalletToBarcode } from '@/modules/barcode/hooks/useSyncPalletToBarcode';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  NativeSelect,
} from '@/shared/components/ui';

import { LocationDetailPanel } from '../components/LocationDetailPanel';
import { MapLegend } from '../components/MapLegend';
import { type MapCell,WarehouseMapGrid } from '../components/WarehouseMapGrid';
import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import { WmsScanButton } from '../components/WmsScanButton';
import type { DisplayStatus } from '../services';
import {
  buildOccupancyIndex,
  DISPLAY_STATUS_META,
  palletMoveItem,
  palletsLocatedAt,
  suggestPutaway,
  validatePalletMove,
} from '../services';
import {
  useWarehouseLayout,
  useWarehouses,
  useWmsCollection,
  useWmsEnabled,
  useWmsSettings,
  wmsStore,
} from '../store';
import type {
  InventoryRecord,
  MaterialWarehouseProfile,
  Pallet,
  WarehouseLocation,
  Zone,
} from '../types';
import { notifyFail, notifyOk } from '../utils';

type ViewMode = 'status' | 'zone' | 'occupancy';

interface PendingMove {
  pallet: Pallet;
  destination: WarehouseLocation;
}

function occupancyBucket(pct: number): DisplayStatus {
  if (pct <= 0) return 'EMPTY';
  if (pct < 70) return 'PARTIAL';
  if (pct < 100) return 'NEARLY_FULL';
  return 'FULL';
}

export default function WmsMapPage() {
  const enabled = useWmsEnabled();
  const { warehouses } = useWarehouses();
  const { settings } = useWmsSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  const requested = searchParams.get('warehouse');
  const selectedId = requested && warehouses.some((w) => w.id === requested)
    ? requested
    : warehouses[0]?.id ?? null;

  const { warehouse, zones, locations } = useWarehouseLayout(selectedId);
  const { data: inventory } = useWmsCollection('inventory');
  const { data: pallets } = useWmsCollection('pallets');
  const { data: materials } = useWmsCollection('materials');
  const syncToBarcode = useSyncPalletToBarcode();

  const [level, setLevel] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('status');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Scan-driven move state.
  const [moveSession, setMoveSession] = useState<Pallet | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [busy, setBusy] = useState(false);

  const occupancy = useMemo(
    () => buildOccupancyIndex(locations, inventory, pallets),
    [locations, inventory, pallets],
  );
  const zoneById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);
  const locationByCode = useMemo(() => {
    const map = new Map<string, WarehouseLocation>();
    for (const location of locations) map.set(location.code.toLowerCase(), location);
    return map;
  }, [locations]);
  const materialByItem = useMemo(() => {
    const map = new Map<string, MaterialWarehouseProfile>();
    for (const material of materials) map.set(material.itemCode, material);
    return map;
  }, [materials]);

  const inventoryByLocation = useMemo(() => {
    const map = new Map<string, InventoryRecord[]>();
    for (const record of inventory) {
      const list = map.get(record.locationId);
      if (list) list.push(record);
      else map.set(record.locationId, [record]);
    }
    return map;
  }, [inventory]);

  const safeLevel = warehouse ? Math.min(level, Math.max(0, warehouse.levels - 1)) : 0;
  const levelLocations = useMemo(
    () => locations.filter((location) => location.level === safeLevel),
    [locations, safeLevel],
  );

  // Search matches (by code, or by item/lot in the location's inventory).
  const searchText = search.trim().toLowerCase();
  const matchedIds = useMemo(() => {
    if (!searchText) return new Set<string>();
    const matches = new Set<string>();
    for (const location of levelLocations) {
      if (location.code.toLowerCase().includes(searchText)) {
        matches.add(location.id);
        continue;
      }
      const records = inventoryByLocation.get(location.id) ?? [];
      if (
        records.some((record) =>
          [record.itemCode, record.itemName, record.lotNumber].some((value) =>
            value?.toLowerCase().includes(searchText),
          ),
        )
      ) {
        matches.add(location.id);
      }
    }
    return matches;
  }, [searchText, levelLocations, inventoryByLocation]);

  // ── Move mode: valid destinations + engine-suggested picks on this level ──
  const moveProfile = moveSession ? materialByItem.get(moveSession.itemCode) : undefined;
  const validDestinationIds = useMemo(() => {
    if (!moveSession || !settings) return new Set<string>();
    const valid = new Set<string>();
    for (const location of levelLocations) {
      if (location.id === moveSession.currentLocationId) continue;
      const result = validatePalletMove({
        settings,
        pallet: moveSession,
        profile: moveProfile,
        destination: location,
        inventory,
        pallets,
      });
      if (result.ok) valid.add(location.id);
    }
    return valid;
  }, [moveSession, settings, levelLocations, moveProfile, inventory, pallets]);

  const suggestedIds = useMemo(() => {
    if (!moveSession || !settings) return new Set<string>();
    const suggestions = suggestPutaway({
      settings,
      item: palletMoveItem(moveSession, moveProfile),
      quantity: moveSession.totalUnits ?? 1,
      added: { pallets: 1, units: moveSession.totalUnits ?? 0, weight: 0, volume: 0 },
      locations: levelLocations.filter((l) => l.id !== moveSession.currentLocationId),
      inventory,
      pallets,
      limit: 5,
    });
    return new Set(suggestions.map((s) => s.location.id));
  }, [moveSession, settings, moveProfile, levelLocations, inventory, pallets]);

  function colorFor(location: WarehouseLocation, zone: Zone | undefined): { color: string; hatch: boolean } {
    const occ = occupancy.get(location.id);
    if (viewMode === 'zone') return { color: zone?.color ?? '#cbd5e1', hatch: !location.enabled };
    if (viewMode === 'occupancy') {
      return { color: DISPLAY_STATUS_META[occupancyBucket(occ?.occupancyPct ?? 0)].color, hatch: false };
    }
    const meta = DISPLAY_STATUS_META[occ?.status ?? 'EMPTY'];
    return { color: meta.color, hatch: Boolean(meta.hatch) };
  }

  function matchesFilters(location: WarehouseLocation): boolean {
    const occ = occupancy.get(location.id);
    const zoneOk =
      zoneFilter === 'all' ||
      (zoneFilter === 'none' ? location.zoneId == null : location.zoneId === zoneFilter);
    const statusOk = statusFilter === 'all' || occ?.status === statusFilter;
    return zoneOk && statusOk;
  }

  const cells: MapCell[] = useMemo(
    () =>
      levelLocations.map((location) => {
        const occ = occupancy.get(location.id);
        const zone = location.zoneId ? zoneById.get(location.zoneId) : undefined;
        const { color, hatch } = colorFor(location, zone);

        if (moveSession) {
          // In move mode the highlight channels show destination validity.
          const isCurrent = location.id === moveSession.currentLocationId;
          const isValid = validDestinationIds.has(location.id);
          return {
            id: location.id,
            column: location.column,
            row: location.row,
            code: location.code,
            color,
            hatch,
            occupancyPct: occ?.occupancyPct ?? 0,
            suggested: suggestedIds.has(location.id),
            current: isCurrent,
            dimmed: !isValid && !isCurrent,
            tooltip: isCurrent
              ? `${location.code} · current location`
              : isValid
                ? `${location.code} · tap to move here`
                : `${location.code} · not a valid destination`,
          };
        }

        const passesFilter = matchesFilters(location);
        const isMatch = matchedIds.has(location.id);
        return {
          id: location.id,
          column: location.column,
          row: location.row,
          code: location.code,
          color,
          hatch,
          occupancyPct: occ?.occupancyPct ?? 0,
          highlighted: searchText.length > 0 && isMatch,
          dimmed: !passesFilter || (searchText.length > 0 && !isMatch),
          tooltip: `${location.code} · ${DISPLAY_STATUS_META[occ?.status ?? 'EMPTY'].label} · ${Math.round(occ?.occupancyPct ?? 0)}%${zone ? ` · ${zone.name}` : ''}`,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [levelLocations, occupancy, zoneById, viewMode, zoneFilter, statusFilter, matchedIds, searchText, moveSession, validDestinationIds, suggestedIds],
  );

  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  /** Jump to a location's level and open its detail panel. */
  function focusLocation(locationId: string) {
    const location = locations.find((l) => l.id === locationId);
    if (location && warehouse) {
      setLevel(Math.min(location.level, Math.max(0, warehouse.levels - 1)));
    }
    openDetail(locationId);
  }

  // ── Scan / search resolution ─────────────────────────────────────────────
  function handleScan(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();

    // In move mode a scan picks the destination location.
    if (moveSession) {
      const location = locationByCode.get(key);
      if (location) requestMove(moveSession, location);
      else notifyFail('No location matched that code.');
      return;
    }

    setSearch(trimmed);
    // A pallet license plate jumps to wherever it currently sits.
    const pallet = pallets.find((p) => p.licensePlate.toLowerCase() === key);
    if (pallet?.currentLocationId) {
      focusLocation(pallet.currentLocationId);
      return;
    }
    // An exact location code opens that location.
    const location = locationByCode.get(key);
    if (location) focusLocation(location.id);
  }

  // Enter in the search box jumps to an exact code match.
  function handleSearchEnter() {
    const exact = levelLocations.find((location) => location.code.toLowerCase() === searchText);
    if (exact) openDetail(exact.id);
  }

  // ── Move workflow ────────────────────────────────────────────────────────
  function startMoveForPallet(pallet: Pallet) {
    setMoveSession(pallet);
    setDetailOpen(false);
    setSearch('');
    if (pallet.currentLocationId) {
      const location = locations.find((l) => l.id === pallet.currentLocationId);
      if (location && warehouse) {
        setLevel(Math.min(location.level, Math.max(0, warehouse.levels - 1)));
      }
    }
    notifyOk(`Moving pallet ${pallet.licensePlate} — pick a destination.`);
  }

  function resolveAndStartMove(code: string) {
    const key = code.trim().toLowerCase();
    if (!key) return;
    const pallet = pallets.find((p) => p.licensePlate.toLowerCase() === key);
    if (!pallet) {
      notifyFail('No pallet matched that code.');
      return;
    }
    if (pallet.status === 'SHIPPED') {
      notifyFail(`Pallet ${pallet.licensePlate} has already shipped.`);
      return;
    }
    startMoveForPallet(pallet);
  }

  function cancelMove() {
    setMoveSession(null);
    setPendingMove(null);
  }

  function requestMove(pallet: Pallet, destination: WarehouseLocation) {
    if (destination.id === pallet.currentLocationId) {
      notifyFail(`Pallet is already in ${destination.code}.`);
      return;
    }
    setPendingMove({ pallet, destination });
  }

  /** Scan a pallet from the detail panel to move it into the open location. */
  function placePalletHere(code: string) {
    const location = detailLocation;
    if (!location) return;
    const key = code.trim().toLowerCase();
    const pallet = pallets.find((p) => p.licensePlate.toLowerCase() === key);
    if (!pallet) {
      notifyFail('No pallet matched that code.');
      return;
    }
    setDetailOpen(false);
    requestMove(pallet, location);
  }

  const pendingValidation = useMemo(() => {
    if (!pendingMove || !settings) return null;
    return validatePalletMove({
      settings,
      pallet: pendingMove.pallet,
      profile: materialByItem.get(pendingMove.pallet.itemCode),
      destination: pendingMove.destination,
      inventory,
      pallets,
    });
  }, [pendingMove, settings, materialByItem, inventory, pallets]);

  async function confirmMove() {
    if (!pendingMove || !pendingValidation?.ok) return;
    setBusy(true);
    try {
      await wmsStore.movePallet({
        palletId: pendingMove.pallet.id,
        toLocationId: pendingMove.destination.id,
        note: 'Map move',
      });
      // Mirror the move back to the barcode backend (best effort).
      try {
        await syncToBarcode({
          licensePlate: pendingMove.pallet.licensePlate,
          warehouseId: pendingMove.destination.warehouseId,
          binCode: pendingMove.destination.code,
        });
      } catch {
        // Non-fatal: the WMS move already succeeded.
      }
      notifyOk(`Pallet ${pendingMove.pallet.licensePlate} moved to ${pendingMove.destination.code}.`);
      setPendingMove(null);
      setMoveSession(null);
    } catch (error) {
      notifyFail(error instanceof Error ? error.message : 'Move failed.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setLevel(0);
    cancelMove();
  }, [selectedId]);

  const detailLocation = detailId ? locations.find((location) => location.id === detailId) ?? null : null;

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <WmsDisabledNotice />
      </div>
    );
  }

  if (warehouses.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">No warehouses to map yet.</p>
            <Button asChild>
              <Link to="/warehouse-ops/designer">Design a warehouse</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Warehouse Map</h1>
          <p className="text-sm text-muted-foreground">Live occupancy, status, and scan-driven moves.</p>
        </div>
        <div className="flex items-center gap-2">
          {!moveSession ? (
            <WmsScanButton label="Move pallet" onScan={resolveAndStartMove} />
          ) : null}
          <NativeSelect
            className="w-48"
            value={selectedId ?? ''}
            onChange={(event) => setSearchParams({ warehouse: event.target.value })}
          >
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* Move-mode banner */}
      {moveSession ? (
        <Card className="border-sky-400 bg-sky-50 dark:bg-sky-950/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2 text-sm">
              <MoveRight className="h-4 w-4 text-sky-600" />
              <span>
                Placing pallet <span className="font-mono font-semibold">{moveSession.licensePlate}</span>
                {' '}({moveSession.itemName || moveSession.itemCode}). Tap a highlighted location or scan it.
                {' '}<span className="text-emerald-600">★ = recommended</span>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <WmsScanButton label="Scan destination" onScan={handleScan} />
              <Button variant="ghost" size="sm" onClick={cancelMove}>
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Controls */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-3">
          <Control label="Colour by">
            <NativeSelect value={viewMode} onChange={(event) => setViewMode(event.target.value as ViewMode)}>
              <option value="status">Status</option>
              <option value="zone">Zone</option>
              <option value="occupancy">Occupancy</option>
            </NativeSelect>
          </Control>
          <Control label="Zone">
            <NativeSelect value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
              <option value="all">All zones</option>
              <option value="none">No zone</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </NativeSelect>
          </Control>
          <Control label="Status">
            <NativeSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as DisplayStatus | 'all')}
            >
              <option value="all">All statuses</option>
              {(Object.keys(DISPLAY_STATUS_META) as DisplayStatus[]).map((status) => (
                <option key={status} value={status}>
                  {DISPLAY_STATUS_META[status].label}
                </option>
              ))}
            </NativeSelect>
          </Control>
          {warehouse && warehouse.levels > 1 ? (
            <Control label="Level">
              <NativeSelect className="w-20" value={safeLevel} onChange={(event) => setLevel(Number(event.target.value))}>
                {Array.from({ length: warehouse.levels }, (_, index) => (
                  <option key={index} value={index}>
                    {index + 1}
                  </option>
                ))}
              </NativeSelect>
            </Control>
          ) : null}
          <Control label="Search item, lot or code" className="min-w-48 flex-1">
            <div className="flex gap-2">
              <Input
                value={search}
                placeholder="e.g. SKU123, A-01 or a pallet"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearchEnter();
                }}
              />
              <WmsScanButton label="Scan" onScan={handleScan} />
            </div>
          </Control>
        </CardContent>
      </Card>

      <MapLegend />

      {/* Map (desktop) */}
      {warehouse ? (
        <>
          <div className="hidden md:block">
            <WarehouseMapGrid
              columns={warehouse.columns}
              rows={warehouse.rows}
              naming={warehouse.namingScheme}
              cells={cells}
              onCellClick={(id) => {
                if (moveSession) requestMove(moveSession, locations.find((l) => l.id === id)!);
                else openDetail(id);
              }}
            />
          </div>

          {/* Card/list fallback (mobile) */}
          <div className="space-y-2 md:hidden">
            {cells.map((cell) => (
              <button
                key={cell.id}
                type="button"
                onClick={() => {
                  if (moveSession) requestMove(moveSession, locations.find((l) => l.id === cell.id)!);
                  else openDetail(cell.id);
                }}
                className="flex w-full items-center justify-between rounded-md border p-3 text-left text-sm"
                style={{ opacity: cell.dimmed ? 0.4 : 1 }}
              >
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: cell.color }} />
                  {cell.code}
                  {cell.suggested ? <span className="text-emerald-600">★</span> : null}
                  {cell.current ? <Badge variant="outline">Here</Badge> : null}
                </span>
                <span className="text-xs text-muted-foreground">{Math.round(cell.occupancyPct)}%</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <LocationDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        location={detailLocation}
        zone={detailLocation?.zoneId ? zoneById.get(detailLocation.zoneId) ?? null : null}
        occupancy={detailLocation ? occupancy.get(detailLocation.id) ?? null : null}
        palletsHere={detailLocation ? palletsLocatedAt(detailLocation.id, pallets, inventory) : []}
        inventoryHere={detailLocation ? inventoryByLocation.get(detailLocation.id) ?? [] : []}
        onMovePallet={startMoveForPallet}
        onPlacePalletHere={placePalletHere}
      />

      {/* Move confirmation */}
      <Dialog open={pendingMove != null} onOpenChange={(open) => !open && setPendingMove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm move</DialogTitle>
            <DialogDescription>
              {pendingMove ? (
                <>
                  Move pallet <span className="font-mono font-medium">{pendingMove.pallet.licensePlate}</span>
                  {' '}into <span className="font-mono font-medium">{pendingMove.destination.code}</span>.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {pendingValidation ? (
            <div className="space-y-2">
              {pendingValidation.errors.map((issue) => (
                <p key={issue.code} className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {issue.message}
                </p>
              ))}
              {pendingValidation.warnings.map((issue) => (
                <p key={issue.code} className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  {issue.message}
                </p>
              ))}
              {pendingValidation.ok && pendingValidation.warnings.length === 0 ? (
                <p className="text-sm text-emerald-600">Move is valid.</p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingMove(null)}>
              Cancel
            </Button>
            <Button disabled={busy || !pendingValidation?.ok} onClick={() => void confirmMove()}>
              {pendingValidation && !pendingValidation.ok ? 'Cannot move' : 'Confirm move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Control({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
