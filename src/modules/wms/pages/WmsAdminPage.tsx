/**
 * Warehouse Ops — Admin Console.
 *
 * A single admin-only hub for inspecting and cleaning up the module's data. It
 * complements the purpose-built screens (Designer/Editor manage warehouse
 * structure; Settings holds config + global maintenance) by giving an admin a
 * direct, searchable way to browse and delete the *records* that otherwise have
 * no management UI: pallets, inventory lines, movements, materials, and saved
 * templates — one at a time, in bulk, or by clearing a whole collection.
 *
 * Deletes here are raw record removals (admin override). For structural data
 * (warehouses / zones / locations) use the Warehouses + Editor pages so the
 * cascade stays correct; for fixing pallet/stock drift use Settings → Maintenance.
 */
import { Boxes, Database, Layers, Package, ScrollText, Search, Settings2, Trash2, Warehouse } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

import { AdminOnlyNotice } from '../components/AdminOnlyNotice';
import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import type { WmsCollection } from '../storage';
import { useWmsCollection, useWmsEnabled, useWmsRole, wmsStore } from '../store';
import { notifyFail, notifyOk } from '../utils';

type ManagedCollection = 'pallets' | 'inventory' | 'movements' | 'materials' | 'templates';

interface ManagedRow {
  id: string;
  primary: string;
  secondary: string;
  search: string;
}

const MAX_ROWS = 300;

export default function WmsAdminPage() {
  const enabled = useWmsEnabled();
  const { isAdmin } = useWmsRole();

  const { data: warehouses } = useWmsCollection('warehouses');
  const { data: zones } = useWmsCollection('zones');
  const { data: locations } = useWmsCollection('locations');
  const { data: materials } = useWmsCollection('materials');
  const { data: pallets } = useWmsCollection('pallets');
  const { data: inventory } = useWmsCollection('inventory');
  const { data: movements } = useWmsCollection('movements');
  const { data: templates } = useWmsCollection('templates');

  const [tab, setTab] = useState<ManagedCollection>('pallets');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; body: string; ids: string[] } | null>(null);

  const locationCode = useMemo(() => new Map(locations.map((l) => [l.id, l.code])), [locations]);
  const palletPlate = useMemo(() => new Map(pallets.map((p) => [p.id, p.licensePlate])), [pallets]);

  // Build the display rows for the active tab.
  const rows: ManagedRow[] = useMemo(() => {
    switch (tab) {
      case 'pallets':
        return pallets.map((p) => ({
          id: p.id,
          primary: p.licensePlate,
          secondary: `${p.itemName || p.itemCode} · ${p.boxCount} boxes · ${p.status}${p.currentLocationId ? ` · ${locationCode.get(p.currentLocationId) ?? '—'}` : ' · unplaced'}`,
          search: `${p.licensePlate} ${p.itemCode} ${p.itemName} ${p.status}`.toLowerCase(),
        }));
      case 'inventory':
        return inventory.map((r) => ({
          id: r.id,
          primary: r.itemName || r.itemCode,
          secondary: `${r.quantity} ${r.uom} · ${locationCode.get(r.locationId) ?? '—'}${r.lotNumber ? ` · lot ${r.lotNumber}` : ''}${r.palletId ? ` · ${palletPlate.get(r.palletId) ?? 'pallet'}` : ''}`,
          search: `${r.itemCode} ${r.itemName} ${r.lotNumber}`.toLowerCase(),
        }));
      case 'movements':
        return [...movements]
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .map((m) => ({
            id: m.id,
            primary: `${m.type} · ${m.itemName || m.itemCode || (m.palletId ? 'Pallet' : 'Move')}`,
            secondary: `${locationCode.get(m.fromLocationId ?? '') ?? '—'} → ${locationCode.get(m.toLocationId ?? '') ?? '—'} · qty ${m.quantity ?? '—'} · ${m.createdAt.slice(0, 16).replace('T', ' ')}`,
            search: `${m.type} ${m.itemCode} ${m.itemName}`.toLowerCase(),
          }));
      case 'materials':
        return materials.map((m) => ({
          id: m.id,
          primary: `${m.itemName || m.itemCode}`,
          secondary: `${m.itemCode} · ${m.materialType || 'no type'} · ${m.defaultUom}${m.temperatureClass ? ` · ${m.temperatureClass}` : ''}`,
          search: `${m.itemCode} ${m.itemName} ${m.materialType}`.toLowerCase(),
        }));
      case 'templates':
        return templates.map((t) => ({
          id: t.id,
          primary: t.name,
          secondary: `${t.columns}×${t.rows}×${t.levels} · ${t.zones.length} zone(s)`,
          search: t.name.toLowerCase(),
        }));
      default:
        return [];
    }
  }, [tab, pallets, inventory, movements, materials, templates, locationCode, palletPlate]);

  const query = search.trim().toLowerCase();
  const filtered = useMemo(
    () => (query ? rows.filter((row) => row.search.includes(query)) : rows),
    [rows, query],
  );
  const visible = filtered.slice(0, MAX_ROWS);
  const allVisibleSelected = visible.length > 0 && visible.every((row) => selected.has(row.id));

  function switchTab(next: ManagedCollection) {
    setTab(next);
    setSelected(new Set());
    setSearch('');
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((row) => next.delete(row.id));
      else visible.forEach((row) => next.add(row.id));
      return next;
    });
  }

  async function runDelete(ids: string[]) {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      await wmsStore.removeMany(tab as WmsCollection, ids);
      notifyOk(`Deleted ${ids.length} ${tab} record(s).`);
      setSelected(new Set());
      setConfirm(null);
    } catch (error) {
      notifyFail(error instanceof Error ? error.message : 'Delete failed.');
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
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <AdminOnlyNotice />
      </div>
    );
  }

  const counts: Array<{ label: string; value: number; icon: typeof Boxes; to?: string }> = [
    { label: 'Warehouses', value: warehouses.length, icon: Warehouse, to: '/warehouse-ops/warehouses' },
    { label: 'Zones', value: zones.length, icon: Layers },
    { label: 'Locations', value: locations.length, icon: Database, to: '/warehouse-ops/map' },
    { label: 'Materials', value: materials.length, icon: Package },
    { label: 'Pallets', value: pallets.length, icon: Boxes },
    { label: 'Inventory', value: inventory.length, icon: Package },
    { label: 'Movements', value: movements.length, icon: ScrollText, to: '/warehouse-ops/reports' },
    { label: 'Templates', value: templates.length, icon: Layers },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Console</h1>
          <p className="text-sm text-muted-foreground">Inspect, manage and delete Warehouse Ops data.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/warehouse-ops/settings">
            <Settings2 className="mr-2 h-4 w-4" /> Settings &amp; maintenance
          </Link>
        </Button>
      </div>

      {/* Data overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map(({ label, value, icon: Icon, to }) => {
          const body = (
            <Card className={to ? 'transition hover:border-foreground/30' : undefined}>
              <CardContent className="flex items-center gap-3 py-4">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xl font-semibold tabular-nums leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          );
          return to ? (
            <Link key={label} to={to}>
              {body}
            </Link>
          ) : (
            <div key={label}>{body}</div>
          );
        })}
      </div>

      {/* Records manager */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={tab} onValueChange={(value) => switchTab(value as ManagedCollection)}>
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="pallets">Pallets</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="movements">Movements</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                value={search}
                placeholder={`Search ${tab}…`}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || selected.size === 0}
              onClick={() =>
                setConfirm({
                  title: `Delete ${selected.size} selected?`,
                  body: `This permanently deletes ${selected.size} ${tab} record(s). This cannot be undone.`,
                  ids: [...selected],
                })
              }
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete selected ({selected.size})
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy || filtered.length === 0}
              onClick={() =>
                setConfirm({
                  title: query ? `Delete ${filtered.length} matching?` : `Clear all ${tab}?`,
                  body: query
                    ? `This permanently deletes the ${filtered.length} ${tab} record(s) matching “${search}”. This cannot be undone.`
                    : `This permanently deletes ALL ${filtered.length} ${tab} record(s). This cannot be undone.`,
                  ids: filtered.map((row) => row.id),
                })
              }
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> {query ? 'Delete matching' : 'Clear all'}
            </Button>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              {rows.length === 0 ? `No ${tab} records.` : 'No records match your search.'}
            </p>
          ) : (
            <>
              <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} />
                Select all shown
              </label>
              <div className="divide-y rounded-md border">
                {visible.map((row) => (
                  <div key={row.id} className="flex items-center gap-3 p-2.5">
                    <Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggle(row.id)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.primary}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.secondary}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${row.primary}`}
                      className="shrink-0 text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() =>
                        setConfirm({
                          title: 'Delete this record?',
                          body: `Permanently delete “${row.primary}”? This cannot be undone.`,
                          ids: [row.id],
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {filtered.length > visible.length ? (
                <p className="text-center text-xs text-muted-foreground">
                  Showing {visible.length} of {filtered.length}. Refine your search to see the rest.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Badge variant="outline">Tip</Badge>
        Warehouses, zones and locations are managed in the{' '}
        <Link className="underline underline-offset-2" to="/warehouse-ops/warehouses">
          Warehouses
        </Link>{' '}
        and Editor pages so their layout stays consistent.
      </p>

      {/* Shared destructive confirmation */}
      <Dialog open={confirm != null} onOpenChange={(open) => !open && !busy && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void runDelete(confirm?.ids ?? [])}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
