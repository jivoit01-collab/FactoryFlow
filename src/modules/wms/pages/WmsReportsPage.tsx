/**
 * Reports & search hub (Step 9).
 *
 * One screen with the full report set: where-is-item search, find available
 * space (via the putaway engine), utilization by zone, stock-by-location and the
 * inverse, filterable movement/audit history, replenishment, and expiry. Pure
 * report functions live in services/reports; this page just wires inputs to them.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  NativeSelect,
} from '@/shared/components/ui';

import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import { WmsScanButton } from '../components/WmsScanButton';
import type { MoveItem, MovementFilter } from '../services';
import {
  buildOccupancyIndex,
  expiryReport,
  filterMovements,
  findItemLocations,
  locationByStock,
  replenishmentList,
  stockByLocation,
  suggestPutaway,
  utilizationByZone,
  utilizationTotal,
} from '../services';
import { useWarehouses, useWmsCollection, useWmsEnabled, useWmsSettings } from '../store';
import type { MovementType } from '../types';

type Report =
  | 'find'
  | 'space'
  | 'utilization'
  | 'stock'
  | 'history'
  | 'replenishment'
  | 'expiry';

const REPORTS: { key: Report; label: string }[] = [
  { key: 'find', label: 'Find item' },
  { key: 'space', label: 'Find space' },
  { key: 'utilization', label: 'Utilization' },
  { key: 'stock', label: 'Stock' },
  { key: 'history', label: 'History' },
  { key: 'replenishment', label: 'Replenishment' },
  { key: 'expiry', label: 'Expiry' },
];

const MOVEMENT_TYPES: (MovementType | 'ALL')[] = [
  'ALL',
  'RECEIVE',
  'PUTAWAY',
  'TRANSFER',
  'PICK',
  'OUTBOUND',
  'ADJUSTMENT',
  'AUDIT',
  'CYCLE_COUNT',
];

export default function WmsReportsPage() {
  const enabled = useWmsEnabled();
  const { settings } = useWmsSettings();
  const { warehouses } = useWarehouses();
  const { data: allLocations } = useWmsCollection('locations');
  const { data: zonesAll } = useWmsCollection('zones');
  const { data: purposesAll } = useWmsCollection('cellPurposes');
  const { data: inventoryAll } = useWmsCollection('inventory');
  const { data: pallets } = useWmsCollection('pallets');
  const { data: movements } = useWmsCollection('movements');

  const [report, setReport] = useState<Report>('find');
  const [warehouseId, setWarehouseId] = useState('');

  const activeWarehouseId = warehouseId || warehouses[0]?.id || '';
  const locations = useMemo(
    () => allLocations.filter((l) => l.warehouseId === activeWarehouseId),
    [allLocations, activeWarehouseId],
  );
  const locationIds = useMemo(() => new Set(locations.map((l) => l.id)), [locations]);
  const zones = useMemo(() => zonesAll.filter((z) => z.warehouseId === activeWarehouseId), [zonesAll, activeWarehouseId]);
  const inventory = useMemo(() => inventoryAll.filter((r) => locationIds.has(r.locationId)), [inventoryAll, locationIds]);
  const purposeById = useMemo(
    () => new Map(purposesAll.filter((p) => p.warehouseId === activeWarehouseId).map((p) => [p.id, p])),
    [purposesAll, activeWarehouseId],
  );
  const occupancy = useMemo(
    () => buildOccupancyIndex(locations, inventory, pallets, purposeById),
    [locations, inventory, pallets, purposeById],
  );

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <WmsDisabledNotice />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Search, utilization, history, replenishment and expiry.</p>
        </div>
        {warehouses.length > 1 ? (
          <NativeSelect className="w-full sm:w-52" value={activeWarehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </NativeSelect>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {REPORTS.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant={report === item.key ? 'default' : 'outline'}
            onClick={() => setReport(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {warehouses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <p>No warehouses yet.</p>
            <Button asChild className="mt-3">
              <Link to="/warehouse-ops/designer">Design a warehouse</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4">
            {report === 'find' ? <FindItem inventory={inventory} locations={locations} /> : null}
            {report === 'space' ? <FindSpace settings={settings} locations={locations} inventory={inventory} pallets={pallets} /> : null}
            {report === 'utilization' ? <Utilization locations={locations} zones={zones} occupancy={occupancy} /> : null}
            {report === 'stock' ? <Stock locations={locations} inventory={inventory} /> : null}
            {report === 'history' ? <History movements={movements} /> : null}
            {report === 'replenishment' ? <Replenishment locations={locations} inventory={inventory} /> : null}
            {report === 'expiry' ? <Expiry locations={locations} inventory={inventory} /> : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between border-b py-2 text-sm last:border-0">{children}</div>;
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

function FindItem({ inventory, locations }: { inventory: Parameters<typeof findItemLocations>[0]['inventory']; locations: Parameters<typeof findItemLocations>[0]['locations'] }) {
  const [query, setQuery] = useState('');
  const hits = useMemo(() => findItemLocations({ query, inventory, locations }), [query, inventory, locations]);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={query} placeholder="Item code, name, or lot" onChange={(event) => setQuery(event.target.value)} />
        <WmsScanButton label="Scan" onScan={setQuery} />
      </div>
      {!query ? <Empty text="Scan or type to find where an item or lot is." /> : hits.length === 0 ? <Empty text="No stock matches." /> : (
        <div>
          {hits.map((hit) => (
            <Row key={hit.location.id}>
              <span className="font-mono">{hit.location.code}</span>
              <span className="flex items-center gap-2">
                {hit.lots.length ? <span className="text-xs text-muted-foreground">lots {hit.lots.join(', ')}</span> : null}
                <Badge variant="outline">{hit.quantity}</Badge>
              </span>
            </Row>
          ))}
        </div>
      )}
    </div>
  );
}

function FindSpace({ settings, locations, inventory, pallets }: { settings: ReturnType<typeof useWmsSettings>['settings']; locations: Parameters<typeof suggestPutaway>[0]['locations']; inventory: Parameters<typeof suggestPutaway>[0]['inventory']; pallets: Parameters<typeof suggestPutaway>[0]['pallets'] }) {
  const [materialType, setMaterialType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const results = useMemo(() => {
    if (!settings || quantity <= 0) return [];
    const item: MoveItem = { itemCode: '', materialType, temperatureClass: null, hazmatClass: '', lotNumber: '', serialNumber: '', expiryDate: null };
    return suggestPutaway({ settings, item, quantity, added: { pallets: 0, units: quantity, weight: 0, volume: 0 }, locations, inventory, pallets, limit: 25 });
  }, [settings, materialType, quantity, locations, inventory, pallets]);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={materialType} placeholder="Material type (optional)" onChange={(event) => setMaterialType(event.target.value.toUpperCase())} />
        <Input type="number" min={1} className="w-28" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} />
      </div>
      {results.length === 0 ? <Empty text="No location can accept that." /> : (
        <div>
          {results.map((suggestion) => (
            <Row key={suggestion.location.id}>
              <span className="font-mono">{suggestion.location.code}</span>
              <Badge variant="outline">{Math.round(suggestion.occupancyPct)}% full</Badge>
            </Row>
          ))}
        </div>
      )}
    </div>
  );
}

function Utilization({ locations, zones, occupancy }: { locations: Parameters<typeof utilizationByZone>[0]; zones: Parameters<typeof utilizationByZone>[1]; occupancy: Parameters<typeof utilizationByZone>[2] }) {
  const total = utilizationTotal(locations, occupancy);
  const rows = utilizationByZone(locations, zones, occupancy);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
        <Stat label="Locations" value={total.total} />
        <Stat label="Empty" value={total.empty} />
        <Stat label="Full" value={total.full} />
        <Stat label="Avg" value={`${Math.round(total.avgOccupancy)}%`} />
      </div>
      <div>
        {rows.map((row) => (
          <Row key={row.key}>
            <span>{row.label}</span>
            <span className="text-xs text-muted-foreground">
              {row.occupied}/{row.total} used · {row.full} full · {Math.round(row.avgOccupancy)}% avg
            </span>
          </Row>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Stock({ locations, inventory }: { locations: Parameters<typeof stockByLocation>[0]; inventory: Parameters<typeof stockByLocation>[1] }) {
  const [mode, setMode] = useState<'location' | 'item'>('location');
  const byLocation = useMemo(() => stockByLocation(locations, inventory), [locations, inventory]);
  const byItem = useMemo(() => locationByStock(inventory, locations), [inventory, locations]);
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <Button size="sm" variant={mode === 'location' ? 'default' : 'outline'} onClick={() => setMode('location')}>By location</Button>
        <Button size="sm" variant={mode === 'item' ? 'default' : 'outline'} onClick={() => setMode('item')}>By item</Button>
      </div>
      {mode === 'location' ? (
        byLocation.length === 0 ? <Empty text="No stock." /> : byLocation.map((row) => (
          <Row key={row.location.id}>
            <span className="font-mono">{row.location.code}</span>
            <span className="text-xs text-muted-foreground">{row.lines.length} items · {row.totalUnits} units</span>
          </Row>
        ))
      ) : byItem.length === 0 ? <Empty text="No stock." /> : byItem.map((row) => (
        <Row key={row.itemCode}>
          <span>{row.itemName || row.itemCode}</span>
          <span className="text-xs text-muted-foreground">{row.totalQuantity} in {row.locations.length} loc</span>
        </Row>
      ))}
    </div>
  );
}

function History({ movements }: { movements: Parameters<typeof filterMovements>[0] }) {
  const [type, setType] = useState<MovementType | 'ALL'>('ALL');
  const [item, setItem] = useState('');
  const [from, setFrom] = useState('');
  const [onlyDiscrepancies, setOnlyDiscrepancies] = useState(false);
  const filter: MovementFilter = { type, itemCode: item, from: from ? new Date(from).toISOString() : undefined, onlyDiscrepancies };
  const rows = useMemo(() => filterMovements(movements, filter), [movements, type, item, from, onlyDiscrepancies]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <NativeSelect className="w-28 sm:w-36" value={type} onChange={(event) => setType(event.target.value as MovementType | 'ALL')}>
          {MOVEMENT_TYPES.map((value) => <option key={value} value={value}>{value === 'ALL' ? 'All types' : value}</option>)}
        </NativeSelect>
        <Input className="w-28 sm:w-40" value={item} placeholder="Item" onChange={(event) => setItem(event.target.value)} />
        <Input type="date" className="w-36 sm:w-40" value={from} onChange={(event) => setFrom(event.target.value)} />
        <Button size="sm" variant={onlyDiscrepancies ? 'default' : 'outline'} onClick={() => setOnlyDiscrepancies((v) => !v)}>
          Discrepancies
        </Button>
      </div>
      {rows.length === 0 ? <Empty text="No movements match." /> : (
        <div className="max-h-96 overflow-auto">
          {rows.slice(0, 200).map((entry) => (
            <Row key={entry.id}>
              <span className="flex items-center gap-2">
                <Badge variant="outline">{entry.type}</Badge>
                {entry.itemName || entry.itemCode || (entry.palletId ? 'Pallet' : '—')}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {entry.quantity ? `${entry.quantity}` : ''}
                {entry.discrepancy ? <span className="text-amber-600">Δ</span> : null}
                {entry.createdAt.slice(0, 10)}
              </span>
            </Row>
          ))}
        </div>
      )}
    </div>
  );
}

function Replenishment({ locations, inventory }: { locations: Parameters<typeof replenishmentList>[0]; inventory: Parameters<typeof replenishmentList>[1] }) {
  const rows = useMemo(() => replenishmentList(locations, inventory), [locations, inventory]);
  return rows.length === 0 ? <Empty text="No locations below their minimum stock." /> : (
    <div>
      {rows.map((row) => (
        <Row key={row.location.id}>
          <span className="font-mono">{row.location.code}</span>
          <span className="text-xs text-muted-foreground">{row.currentUnits} / min {row.minStock}</span>
        </Row>
      ))}
    </div>
  );
}

function Expiry({ locations, inventory }: { locations: Parameters<typeof expiryReport>[0]['locations']; inventory: Parameters<typeof expiryReport>[0]['inventory'] }) {
  const [withinDays, setWithinDays] = useState(30);
  const rows = useMemo(
    () => expiryReport({ inventory, locations, withinDays, today: new Date().toISOString() }),
    [inventory, locations, withinDays],
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Within</span>
        <Input type="number" min={0} className="w-24" value={withinDays} onChange={(event) => setWithinDays(Math.max(0, Number(event.target.value) || 0))} />
        <span className="text-muted-foreground">days</span>
      </div>
      {rows.length === 0 ? <Empty text="Nothing expiring in that window." /> : (
        <div>
          {rows.map((row) => (
            <Row key={row.record.id}>
              <span>{row.record.itemName || row.record.itemCode}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{row.location?.code ?? '—'}</span>
                <Badge variant="outline" className={row.daysToExpiry < 0 ? 'text-destructive' : row.daysToExpiry < 7 ? 'text-amber-600' : ''}>
                  {row.daysToExpiry < 0 ? `${-row.daysToExpiry}d ago` : `${row.daysToExpiry}d`}
                </Badge>
              </span>
            </Row>
          ))}
        </div>
      )}
    </div>
  );
}
