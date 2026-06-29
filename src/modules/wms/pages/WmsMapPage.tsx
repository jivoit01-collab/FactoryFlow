/**
 * Visual warehouse map (Step 5).
 *
 * Renders a chosen warehouse as a live, colour-coded grid: pick a warehouse and
 * level, switch how cells are coloured (status / zone / occupancy), filter by
 * zone or status, and search to highlight locations holding an item/lot or jump
 * to a code. Clicking a cell opens the detail panel. A card list replaces the
 * grid on narrow screens.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  Button,
  Card,
  CardContent,
  Input,
  NativeSelect,
} from '@/shared/components/ui';

import { WarehouseMapGrid, type MapCell } from '../components/WarehouseMapGrid';
import { MapLegend } from '../components/MapLegend';
import { LocationDetailPanel } from '../components/LocationDetailPanel';
import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import { WmsScanButton } from '../components/WmsScanButton';
import { useWarehouseLayout, useWarehouses, useWmsCollection, useWmsEnabled } from '../store';
import { DISPLAY_STATUS_META, buildOccupancyIndex } from '../services';
import type { DisplayStatus } from '../services';
import type { InventoryRecord, WarehouseLocation, Zone } from '../types';

type ViewMode = 'status' | 'zone' | 'occupancy';

function occupancyBucket(pct: number): DisplayStatus {
  if (pct <= 0) return 'EMPTY';
  if (pct < 70) return 'PARTIAL';
  if (pct < 100) return 'NEARLY_FULL';
  return 'FULL';
}

export default function WmsMapPage() {
  const enabled = useWmsEnabled();
  const { warehouses } = useWarehouses();
  const [searchParams, setSearchParams] = useSearchParams();

  const requested = searchParams.get('warehouse');
  const selectedId = requested && warehouses.some((w) => w.id === requested)
    ? requested
    : warehouses[0]?.id ?? null;

  const { warehouse, zones, locations } = useWarehouseLayout(selectedId);
  const { data: inventory } = useWmsCollection('inventory');
  const { data: pallets } = useWmsCollection('pallets');

  const [level, setLevel] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('status');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const occupancy = useMemo(
    () => buildOccupancyIndex(locations, inventory, pallets),
    [locations, inventory, pallets],
  );
  const zoneById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);

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
    [levelLocations, occupancy, zoneById, viewMode, zoneFilter, statusFilter, matchedIds, searchText],
  );

  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  // Enter in the search box jumps to an exact code match.
  function handleSearchEnter() {
    const exact = levelLocations.find((location) => location.code.toLowerCase() === searchText);
    if (exact) openDetail(exact.id);
  }

  useEffect(() => {
    setLevel(0);
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
          <p className="text-sm text-muted-foreground">Live occupancy and status across the layout.</p>
        </div>
        <NativeSelect
          className="w-56"
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
                placeholder="e.g. SKU123 or A-01"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearchEnter();
                }}
              />
              <WmsScanButton label="Scan" onScan={setSearch} />
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
              onCellClick={openDetail}
            />
          </div>

          {/* Card/list fallback (mobile) */}
          <div className="space-y-2 md:hidden">
            {cells.map((cell) => (
              <button
                key={cell.id}
                type="button"
                onClick={() => openDetail(cell.id)}
                className="flex w-full items-center justify-between rounded-md border p-3 text-left text-sm"
                style={{ opacity: cell.dimmed ? 0.4 : 1 }}
              >
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: cell.color }} />
                  {cell.code}
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
        palletsHere={detailLocation ? pallets.filter((p) => p.currentLocationId === detailLocation.id) : []}
        inventoryHere={detailLocation ? inventoryByLocation.get(detailLocation.id) ?? [] : []}
      />
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
