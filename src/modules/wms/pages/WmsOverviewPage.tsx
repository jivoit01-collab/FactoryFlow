/**
 * Warehouse Ops overview — live operations dashboard.
 *
 * When the module is on, this is the operator's home base: at-a-glance KPIs
 * (warehouses, locations, active pallets, occupancy, expiring/replenishment
 * alerts), a global "scan anything" locator that resolves a scanned pallet,
 * location, or item and links straight to the relevant screen, and quick links
 * into every workflow. When the module is off, it mirrors the host app's
 * untouched behaviour and points to settings. The role switcher gates the
 * designer, settings, and approvals.
 */
import {
  ArrowRight,
  ClipboardList,
  MapPin,
  Package,
  PackageCheck,
  PackageSearch,
  PowerOff,
  Settings2,
  Truck,
  Warehouse,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/shared/components/ui';

import { WmsScanButton } from '../components/WmsScanButton';
import {
  buildOccupancyIndex,
  expiryReport,
  findItemLocations,
  replenishmentList,
} from '../services';
import { useWmsCollection, useWmsEnabled, useWmsRole, useWmsSettings } from '../store';
import type { Pallet, WarehouseLocation } from '../types';

type ScanResult =
  | { kind: 'pallet'; pallet: Pallet; location: WarehouseLocation | null }
  | { kind: 'location'; location: WarehouseLocation; palletCount: number; occupancyPct: number }
  | { kind: 'item'; query: string; hits: number; totalQty: number; firstWarehouseId: string | null }
  | { kind: 'none'; query: string };

export default function WmsOverviewPage() {
  const { loading } = useWmsSettings();
  const enabled = useWmsEnabled();
  const { role, setRole } = useWmsRole();

  const { data: warehouses } = useWmsCollection('warehouses');
  const { data: locations } = useWmsCollection('locations');
  const { data: purposes } = useWmsCollection('cellPurposes');
  const { data: pallets } = useWmsCollection('pallets');
  const { data: inventory } = useWmsCollection('inventory');

  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const purposeById = useMemo(
    () => new Map(purposes.map((purpose) => [purpose.id, purpose])),
    [purposes],
  );
  const occupancy = useMemo(
    () => buildOccupancyIndex(locations, inventory, pallets, purposeById),
    [locations, inventory, pallets, purposeById],
  );

  const kpis = useMemo(() => {
    const activePallets = pallets.filter((p) => p.status !== 'SHIPPED');
    const occValues = locations.map((l) => occupancy.get(l.id)?.occupancyPct ?? 0);
    const avgOccupancy = occValues.length
      ? Math.round(occValues.reduce((sum, v) => sum + v, 0) / occValues.length)
      : 0;
    const fullCount = locations.filter((l) => (occupancy.get(l.id)?.occupancyPct ?? 0) >= 100).length;
    const expiring = expiryReport({ inventory, locations, withinDays: 30, today: new Date().toISOString() }).length;
    const replenish = replenishmentList(locations, inventory).length;
    return {
      warehouses: warehouses.length,
      locations: locations.length,
      activePallets: activePallets.length,
      avgOccupancy,
      fullCount,
      expiring,
      replenish,
    };
  }, [warehouses, locations, pallets, inventory, occupancy]);

  function resolveScan(raw?: string) {
    const value = (raw ?? scanInput).trim();
    if (!value) return;
    const key = value.toLowerCase();

    const pallet = pallets.find((p) => p.licensePlate.toLowerCase() === key);
    if (pallet) {
      const location = locations.find((l) => l.id === pallet.currentLocationId) ?? null;
      setScanResult({ kind: 'pallet', pallet, location });
      return;
    }
    const location = locations.find((l) => l.code.toLowerCase() === key || l.barcode.toLowerCase() === key);
    if (location) {
      const palletCount = pallets.filter((p) => p.currentLocationId === location.id).length;
      setScanResult({
        kind: 'location',
        location,
        palletCount,
        occupancyPct: Math.round(occupancy.get(location.id)?.occupancyPct ?? 0),
      });
      return;
    }
    const hits = findItemLocations({ query: value, inventory, locations });
    if (hits.length) {
      const totalQty = hits.reduce((sum, hit) => sum + hit.quantity, 0);
      setScanResult({
        kind: 'item',
        query: value,
        hits: hits.length,
        totalQty,
        firstWarehouseId: hits[0]?.location.warehouseId ?? null,
      });
      return;
    }
    setScanResult({ kind: 'none', query: value });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Warehouse className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Warehouse Ops</h1>
            <p className="text-sm text-muted-foreground">
              Dynamic warehouse management — design, track, and scan.
            </p>
          </div>
        </div>
        {!loading ? (
          <Badge variant={enabled ? 'default' : 'secondary'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        ) : null}
      </div>

      {/* Role switcher — gates the designer, settings, and approvals */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Role: {role === 'ADMIN' ? 'Administrator' : 'Operator'}</p>
          <p className="text-xs text-muted-foreground">
            {role === 'ADMIN'
              ? 'Full access — design, settings, and approvals.'
              : 'Scan workflows only — designer and settings are hidden.'}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant={role === 'ADMIN' ? 'default' : 'outline'} onClick={() => void setRole('ADMIN')}>
            Admin
          </Button>
          <Button size="sm" variant={role === 'OPERATOR' ? 'default' : 'outline'} onClick={() => void setRole('OPERATOR')}>
            Operator
          </Button>
        </div>
      </div>

      {!enabled ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PowerOff className="h-5 w-5 text-muted-foreground" />
              Module turned off
            </CardTitle>
            <CardDescription>
              The app behaves exactly as it does today — no warehouse steps appear
              anywhere. Enable the module in settings to start designing your warehouse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/warehouse-ops/settings">
                <Settings2 className="mr-2 h-4 w-4" />
                Open settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : warehouses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">No warehouses yet — design one to begin.</p>
            <Button asChild>
              <Link to="/warehouse-ops/designer">Design a warehouse</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Global scan locator */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scan anything</CardTitle>
              <CardDescription>Find a pallet, location, or item and jump straight to it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={scanInput}
                  placeholder="Scan or type a pallet, location, or item code"
                  onChange={(event) => setScanInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && resolveScan()}
                />
                <WmsScanButton
                  label="Scan"
                  onScan={(code) => {
                    setScanInput(code);
                    resolveScan(code);
                  }}
                />
                <Button variant="outline" onClick={() => resolveScan()}>
                  <PackageSearch className="mr-2 h-4 w-4" /> Find
                </Button>
              </div>
              {scanResult ? <ScanResultCard result={scanResult} /> : null}
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Kpi label="Warehouses" value={kpis.warehouses} icon={<Warehouse className="h-4 w-4" />} />
            <Kpi label="Locations" value={kpis.locations} icon={<MapPin className="h-4 w-4" />} />
            <Kpi label="Active pallets" value={kpis.activePallets} icon={<Package className="h-4 w-4" />} />
            <Kpi label="Avg occupancy" value={`${kpis.avgOccupancy}%`} icon={<PackageCheck className="h-4 w-4" />} />
            <Kpi label="Full locations" value={kpis.fullCount} icon={<MapPin className="h-4 w-4" />} />
            <Kpi
              label="Expiring ≤30d"
              value={kpis.expiring}
              icon={<ClipboardList className="h-4 w-4" />}
              tone={kpis.expiring > 0 ? 'warn' : undefined}
              to="/warehouse-ops/reports"
            />
            <Kpi
              label="Replenish"
              value={kpis.replenish}
              icon={<PackageSearch className="h-4 w-4" />}
              tone={kpis.replenish > 0 ? 'warn' : undefined}
              to="/warehouse-ops/reports"
            />
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Quick actions</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <ActionTile to="/warehouse-ops/receive" icon={<PackageCheck className="h-5 w-5" />} title="Receive" subtitle="Scan & put away" />
              <ActionTile to="/warehouse-ops/pick" icon={<ClipboardList className="h-5 w-5" />} title="Pick" subtitle="Directed picking" />
              <ActionTile to="/warehouse-ops/transfer" icon={<ArrowRight className="h-5 w-5" />} title="Transfer" subtitle="Move stock" />
              <ActionTile to="/warehouse-ops/outbound" icon={<Truck className="h-5 w-5" />} title="Outbound" subtitle="Ship pallets" />
              <ActionTile to="/warehouse-ops/map" icon={<MapPin className="h-5 w-5" />} title="Map" subtitle="Live & moves" />
              <ActionTile to="/warehouse-ops/labels" icon={<Package className="h-5 w-5" />} title="Labels" subtitle="Print QR labels" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone,
  to,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: 'warn';
  to?: string;
}) {
  const body = (
    <Card className={tone === 'warn' && value !== 0 ? 'border-amber-400' : undefined}>
      <CardContent className="space-y-1 py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className={`text-2xl font-semibold ${tone === 'warn' && value !== 0 ? 'text-amber-600' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
  return to ? (
    <Link to={to} className="transition hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}

function ActionTile({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/50"
    >
      <span className="text-primary">{icon}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}

function ScanResultCard({ result }: { result: ScanResult }) {
  if (result.kind === 'none') {
    return (
      <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        Nothing matched <span className="font-mono">{result.query}</span>.
      </p>
    );
  }

  if (result.kind === 'pallet') {
    const { pallet, location } = result;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
        <div className="min-w-0 text-sm">
          <p className="font-medium">
            <Package className="mr-1 inline h-4 w-4" />
            Pallet <span className="font-mono">{pallet.licensePlate}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {pallet.itemName || pallet.itemCode} · {pallet.boxCount} boxes ·{' '}
            {location ? `at ${location.code}` : 'unplaced'} · {pallet.status}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {location ? (
            <Button asChild size="sm" variant="outline">
              <Link to={`/warehouse-ops/map?warehouse=${location.warehouseId}`}>
                <MapPin className="mr-1 h-4 w-4" /> Map
              </Link>
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link to="/warehouse-ops/outbound">
              <Truck className="mr-1 h-4 w-4" /> Ship
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (result.kind === 'location') {
    const { location, palletCount, occupancyPct } = result;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
        <div className="min-w-0 text-sm">
          <p className="font-medium">
            <MapPin className="mr-1 inline h-4 w-4" />
            Location <span className="font-mono">{location.code}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {location.type} · {palletCount} pallet{palletCount === 1 ? '' : 's'} · {occupancyPct}% full
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to={`/warehouse-ops/map?warehouse=${location.warehouseId}`}>
            <MapPin className="mr-1 h-4 w-4" /> Open on map
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0 text-sm">
        <p className="font-medium">
          <PackageSearch className="mr-1 inline h-4 w-4" />
          Item <span className="font-mono">{result.query}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {result.totalQty} units across {result.hits} location{result.hits === 1 ? '' : 's'}
        </p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to="/warehouse-ops/reports">
          <ClipboardList className="mr-1 h-4 w-4" /> Reports
        </Link>
      </Button>
    </div>
  );
}
