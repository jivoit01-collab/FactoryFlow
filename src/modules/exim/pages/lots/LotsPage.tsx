/**
 * The oil lot register: EXIM's Stock Status page.
 *
 * Every lot of oil bought, wherever it is on its way — contract, loading, sea,
 * port, refinery, trucks, the factory gate — until it is in the tanks. The
 * filters live in the URL, so a filtered register is a link somebody can send,
 * and they apply as they are picked (EXIM waited for an Apply button). The
 * tiles count the lots the filters leave, beside the figure for every open lot.
 *
 * Completed lots are left out, as EXIM left them out, unless Completed is
 * picked under Status — which is also how a completed lot is put back into the
 * tanks from the selection bar, a button EXIM had and could never show.
 */
import {
  AlertTriangle,
  Anchor,
  ArrowRightLeft,
  Container,
  Droplets,
  Factory,
  Hash,
  IndianRupee,
  Layers,
  type LucideIcon,
  Pencil,
  Plus,
  Scale,
  Search,
  Ship,
  Trash2,
  Truck,
  Weight,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  confirmDialog,
  FilterBar,
  FilterField,
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Button, Checkbox, Input, MultiSelect } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useBulkLots, useLotInsights, useLots, useOils } from '../../api';
import {
  LOT_STATUS_CHOICES,
  LOT_STATUS_LABEL,
  LOT_STATUS_ORDER,
  LotStatusPill,
  PaymentMark,
} from '../../components';
import { ArrivalCell, LotLink, MapLink, OilName, QuantityBar } from '../../components/lots/LotBits';
import { fmtRate, fmtRupeesShort, lotSearchText } from '../../components/lots/lotFormat';
import { LotFormDialog } from '../../components/lots/LotFormDialog';
import { LotStatusDialog } from '../../components/lots/LotStatusDialog';
import type { BulkAction, Lot, LotFilters, LotInsights, LotStatus } from '../../types';
import { fmtKg, fmtLitres, fmtMoney } from '../../utils';

const PRESETS: { key: string; label: string; icon: LucideIcon; status?: LotStatus }[] = [
  { key: 'all', label: 'All', icon: Layers },
  { key: 'port', label: 'At port', icon: Anchor, status: 'MUNDRA_PORT' },
  { key: 'sea', label: 'On sea', icon: Ship, status: 'ON_THE_SEA' },
  { key: 'transit', label: 'In transit', icon: Truck, status: 'ON_THE_WAY' },
];

type FilterKey = 'status' | 'vendor' | 'item';

function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
}

/** The five figures EXIM showed over the register, for the lots in view against all open ones. */
function InsightTiles({
  shown,
  overall,
  filtered,
}: {
  shown?: LotInsights;
  overall?: LotInsights;
  filtered: boolean;
}) {
  const of = (text: string) => (filtered && overall ? text : undefined);
  return (
    <StatTileRow>
      <StatTile
        label={filtered ? 'Matching lots' : 'Open lots'}
        value={shown ? shown.count.toLocaleString('en-IN') : '—'}
        sub={of(`of ${overall?.count.toLocaleString('en-IN')} open`) ?? 'not completed'}
        icon={Hash}
        accent="teal"
      />
      <StatTile
        label="Value"
        value={shown ? fmtRupeesShort(shown.total_value) : '—'}
        sub={
          of(`of ${fmtRupeesShort(overall?.total_value)}`) ??
          (shown ? `₹ ${fmtMoney(shown.total_value)}` : undefined)
        }
        icon={IndianRupee}
        accent="emerald"
      />
      <StatTile
        label="Quantity"
        value={shown ? `${fmtKg(shown.total_qty)} kg` : '—'}
        sub={
          shown
            ? `${fmtLitres(shown.total_qty_litres)} L${filtered && overall ? ` · of ${fmtKg(overall.total_qty)} kg` : ''}`
            : undefined
        }
        icon={Scale}
        accent="indigo"
      />
      <StatTile
        label="Average per kg"
        value={shown ? `₹ ${fmtMoney(shown.avg_price_per_kg)}` : '—'}
        sub={of(`₹ ${fmtMoney(overall?.avg_price_per_kg)} over all open`) ?? 'weighted by quantity'}
        icon={Weight}
        accent="sky"
      />
      <StatTile
        label="Average per litre"
        value={shown ? `₹ ${fmtMoney(shown.avg_price_per_litre)}` : '—'}
        sub={
          of(`₹ ${fmtMoney(overall?.avg_price_per_litre)} over all open`) ?? 'weighted by litres'
        }
        icon={Droplets}
        accent="sky"
      />
    </StatTileRow>
  );
}

export default function LotsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canAdd = hasPermission(EXIM_PERMISSIONS.LOT_ADD);
  const canChange = hasPermission(EXIM_PERMISSIONS.LOT_CHANGE);
  const canDelete = hasPermission(EXIM_PERMISSIONS.LOT_DELETE);
  const canBulk = canChange || canDelete;

  const [searchParams, setSearchParams] = useSearchParams();
  // A status the server does not know would fail the whole list: drop it.
  const statuses = searchParams
    .getAll('status')
    .filter((s): s is LotStatus => s in LOT_STATUS_LABEL);
  const vendors = searchParams.getAll('vendor');
  const items = searchParams
    .getAll('item')
    .map(Number)
    .filter((n) => n > 0);
  const filtered = statuses.length + vendors.length + items.length > 0;
  const filters: LotFilters | undefined = filtered
    ? {
        ...(statuses.length ? { status: statuses } : {}),
        ...(vendors.length ? { vendor: vendors } : {}),
        ...(items.length ? { item: items } : {}),
      }
    : undefined;

  const { data: lots, isLoading, isFetching, isError, error } = useLots(filters);
  // Unfiltered, for the vendor list and the figures over every open lot. With
  // no filter set these are the very same queries as the ones above.
  const { data: allLots } = useLots();
  const { data: overall } = useLotInsights();
  const { data: insights } = useLotInsights(filters);
  const { data: oils } = useOils();
  const bulk = useBulkLots();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lot | null>(null);
  const [moving, setMoving] = useState<Lot | null>(null);

  function writeParams(update: (next: URLSearchParams) => void) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        update(next);
        return next;
      },
      { replace: true },
    );
    setPage(1);
    setSelected(new Set());
  }

  function setFilter(key: FilterKey, values: string[]) {
    writeParams((next) => {
      next.delete(key);
      values.forEach((value) => next.append(key, value));
    });
  }

  function applyPreset(status?: LotStatus) {
    writeParams((next) => {
      (['status', 'vendor', 'item'] as const).forEach((key) => next.delete(key));
      if (status) next.append('status', status);
    });
  }

  const presetKey = !filtered
    ? 'all'
    : vendors.length === 0 && items.length === 0 && statuses.length === 1
      ? PRESETS.find((p) => p.status === statuses[0])?.key
      : undefined;

  // EXIM's order: what needs the gate's attention first, completed last; the
  // newest first within a status.
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (lots ?? [])
      .filter((lot) => !lot.deleted && (!term || lotSearchText(lot).includes(term)))
      .sort((a, b) => LOT_STATUS_ORDER[a.status] - LOT_STATUS_ORDER[b.status] || b.id - a.id);
  }, [lots, search]);

  const maxKg = rows.reduce((max, lot) => Math.max(max, Number(lot.quantity)), 0);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);

  const selectedRows = rows.filter((lot) => selected.has(lot.id));
  const pageSelected = shown.length > 0 && shown.every((lot) => selected.has(lot.id));
  const allCompleted =
    selectedRows.length > 0 && selectedRows.every((l) => l.status === 'COMPLETED');

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((current) => {
      const next = new Set(current);
      shown.forEach((lot) => (pageSelected ? next.delete(lot.id) : next.add(lot.id)));
      return next;
    });
  }

  async function runBulk(action: BulkAction) {
    const ids = selectedRows.map((lot) => lot.id);
    const noun = plural(ids.length, 'lot');
    const copy = {
      arrive_refinery: {
        title: `Arrive ${noun} at the refinery?`,
        description:
          'Each is taken as weighed at its own quantity and joins the lot at the refinery that collects its arrivals. All of them move, or none do.',
        confirmLabel: 'Arrive',
        done: `${noun} arrived at the refinery`,
      },
      mark_in_tank: {
        title: `Put ${noun} back into the tanks?`,
        description: 'Each goes back in at its own quantity. All of them move, or none do.',
        confirmLabel: 'Put back',
        done: `${noun} back in the tanks`,
      },
      delete: {
        title: `Remove ${noun}?`,
        description: 'They leave every list; their history stays. All of them go, or none do.',
        confirmLabel: 'Remove',
        done: `${noun} removed`,
      },
    }[action];
    const confirmed = await confirmDialog({
      title: copy.title,
      description: copy.description,
      confirmLabel: copy.confirmLabel,
      destructive: action === 'delete',
    });
    if (!confirmed) return;
    try {
      await bulk.mutateAsync({ action, lots: ids });
      toast.success(copy.done);
      setSelected(new Set());
    } catch {
      // The API client has already shown why.
    }
  }

  const statusOptions = [
    ...new Set<LotStatus>([
      ...LOT_STATUS_CHOICES,
      ...(allLots ?? []).map((lot) => lot.status),
      ...statuses,
    ]),
  ].map((s) => ({ value: s, label: LOT_STATUS_LABEL[s] ?? s }));

  const vendorNames = new Map<string, string>();
  for (const lot of allLots ?? []) {
    if (!vendorNames.has(lot.vendor_code)) vendorNames.set(lot.vendor_code, lot.vendor_name);
  }
  for (const code of vendors) {
    if (!vendorNames.has(code)) vendorNames.set(code, '');
  }
  const vendorOptions = [...vendorNames]
    .map(([code, name]) => ({ value: code, label: name ? `${name} · ${code}` : code }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const oilOptions = (oils ?? [])
    .filter((oil) => oil.lot_count > 0 || items.includes(oil.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((oil) => ({ value: String(oil.id), label: `${oil.name} · ${oil.code}` }));

  const columns = canBulk ? 10 : 9;
  const selectedKg = selectedRows.reduce((sum, lot) => sum + Number(lot.quantity), 0);
  const selectedValue = selectedRows.reduce((sum, lot) => sum + Number(lot.total), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oil Lots"
        description="Every lot of oil bought, from contract through loading, the sea, the port, the refinery and the trucks, to the factory gate and the tanks."
        icon={Droplets}
        accent="teal"
      >
        {canAdd && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add lot
          </Button>
        )}
      </PageHeader>

      <InsightTiles shown={insights} overall={overall} filtered={filtered} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-lg border bg-card p-0.5 shadow-sm">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyPreset(preset.status)}
                aria-pressed={presetKey === preset.key}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  presetKey === preset.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {preset.label}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          Completed lots show only when Completed is picked under Status.
        </p>
      </div>

      <FilterBar
        isFetching={isFetching && !isLoading}
        activeCount={[statuses, vendors, items].filter((f) => f.length).length}
        onReset={filtered ? () => applyPreset() : undefined}
      >
        <FilterField label="Status" htmlFor="lots-status">
          <MultiSelect
            id="lots-status"
            options={statusOptions}
            selected={statuses}
            onChange={(values) => setFilter('status', values)}
            placeholder="Every open status"
            className="w-full sm:w-56"
          />
        </FilterField>
        <FilterField label="Vendor" htmlFor="lots-vendor">
          <MultiSelect
            id="lots-vendor"
            options={vendorOptions}
            selected={vendors}
            onChange={(values) => setFilter('vendor', values)}
            placeholder="All vendors"
            searchable
            searchPlaceholder="Search vendors…"
            className="w-full sm:w-64"
          />
        </FilterField>
        <FilterField label="Oil" htmlFor="lots-oil">
          <MultiSelect
            id="lots-oil"
            options={oilOptions}
            selected={items.map(String)}
            onChange={(values) => setFilter('item', values)}
            placeholder="All oils"
            searchable
            searchPlaceholder="Search oils…"
            className="w-full sm:w-56"
          />
        </FilterField>
      </FilterBar>

      <TableCard
        summary={
          <span>
            {plural(rows.length, 'lot')}
            {search && lots ? ` of ${lots.length}` : ''}
            {selectedRows.length ? ` · ${selectedRows.length} selected` : ''}
            {isFetching && !isLoading ? ' · refreshing…' : ''}
          </span>
        }
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search oil, vendor, vehicle…"
              aria-label="Search the lots"
              className="h-9 w-60 pl-8"
            />
          </div>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              {canBulk && (
                <Th className="w-10">
                  <Checkbox
                    checked={pageSelected}
                    onCheckedChange={togglePage}
                    aria-label="Select every lot on this page"
                  />
                </Th>
              )}
              <Th>Lot</Th>
              <Th>Oil</Th>
              <Th>Status</Th>
              <Th>Vendor</Th>
              <Th>Vehicle</Th>
              <Th align="right">Rate (₹/kg)</Th>
              <Th align="right">Quantity (kg)</Th>
              <Th>ETA / arrival</Th>
              {/* Labelled rather than holding an sr-only span: that span is absolutely
                  positioned, escapes the scrolling table, and widens the whole page. */}
              <Th align="right" className="w-32" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={columns} message="Loading the lots…" />
            ) : isError ? (
              <TableEmpty
                colSpan={columns}
                icon={AlertTriangle}
                message="The lots could not be loaded"
                hint={getErrorMessage(error, 'Try again in a moment.')}
              />
            ) : shown.length === 0 ? (
              <TableEmpty
                colSpan={columns}
                icon={Droplets}
                message={
                  search
                    ? 'No lot matches that search'
                    : filtered
                      ? 'No lot matches these filters'
                      : 'No open lots'
                }
                hint={canAdd && !search && !filtered ? 'Add one with Add lot.' : undefined}
              />
            ) : (
              shown.map((lot) => (
                <tr
                  key={lot.id}
                  className={cn(
                    ROW_CLASSES,
                    'cursor-pointer',
                    selected.has(lot.id) && 'bg-primary/5',
                  )}
                  onClick={() => navigate(`/exim/lots/${lot.id}`)}
                >
                  {canBulk && (
                    <Td onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(lot.id)}
                        onCheckedChange={() => toggle(lot.id)}
                        aria-label={`Select lot #${lot.id}`}
                      />
                    </Td>
                  )}
                  <Td>
                    <LotLink id={lot.id} />
                  </Td>
                  <Td>
                    <OilName name={lot.item_name} code={lot.item_code} color={lot.item_color} />
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5">
                      <LotStatusPill status={lot.status} />
                      <PaymentMark status={lot.status} payment={lot.payment_status} />
                    </span>
                  </Td>
                  <Td>
                    <span className="block whitespace-nowrap font-medium">
                      {lot.vendor_name || '—'}
                    </span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {lot.vendor_code}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap font-mono">{lot.vehicle_number || '—'}</Td>
                  <Td numeric className="whitespace-nowrap">
                    {fmtRate(lot.rate)}
                  </Td>
                  <Td numeric>
                    <QuantityBar kg={lot.quantity} max={maxKg} />
                  </Td>
                  <Td>
                    <ArrivalCell lot={lot} />
                  </Td>
                  <Td align="right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <MapLink location={lot.location} />
                      {canChange && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Change the status of lot #${lot.id}`}
                          title="Change status"
                          onClick={() => setMoving(lot)}
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      )}
                      {canChange && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit lot #${lot.id}`}
                          title="Edit"
                          onClick={() => {
                            setEditing(lot);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {rows.length > pageSize && (
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={rows.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </TableCard>

      {/* The selection bar. Sticky, because the lots are picked while scrolling. */}
      {canBulk && selectedRows.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-primary/40 bg-card p-3 shadow-lg">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{plural(selectedRows.length, 'lot')} selected</p>
            <p className="text-xs text-muted-foreground">
              {fmtKg(selectedKg)} kg · {fmtRupeesShort(selectedValue)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {canChange && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => runBulk('arrive_refinery')}
                disabled={bulk.isPending}
              >
                <Factory className="mr-1.5 h-3.5 w-3.5" />
                Arrived at refinery
              </Button>
            )}
            {canChange && allCompleted && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => runBulk('mark_in_tank')}
                disabled={bulk.isPending}
              >
                <Container className="mr-1.5 h-3.5 w-3.5" />
                Back into the tanks
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="outline"
                className="text-rose-600 hover:text-rose-700"
                onClick={() => runBulk('delete')}
                disabled={bulk.isPending}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <LotFormDialog
        open={formOpen}
        onOpenChange={(value) => {
          setFormOpen(value);
          if (!value) setEditing(null);
        }}
        lot={editing}
        onCreated={(created) => navigate(`/exim/lots/${created.id}`)}
      />
      {moving && (
        <LotStatusDialog open onOpenChange={(value) => !value && setMoving(null)} lot={moving} />
      )}
    </div>
  );
}
