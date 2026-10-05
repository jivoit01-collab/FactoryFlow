/**
 * Freight Benchmarks: what a truckload should cost from the plant to each
 * destination, by vehicle size.
 *
 * These are the company's own benchmarks, from the dispatch desk's transport
 * fare sheet — the transporters' own rates beside them in that sheet are not
 * kept here. Vehicle linking holds a truck's actual freight against the
 * benchmark for its destination and slab, which is why changing one is a right
 * of its own.
 *
 * The slab columns shown are the ones the rows on screen use, so Delhi NCR
 * reads in its kg bands and everywhere else in tonnes, without a wall of empty
 * columns either way.
 */
import {
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Scale,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { DISPATCH_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { useFreightBenchmarks } from '../api/freightBenchmark.api';
import { DestinationDialog } from '../components/freight-benchmarks/DestinationDialog';
import {
  formatRate,
  slabBand,
  slabBandHint,
} from '../components/freight-benchmarks/freightBenchmark';
import { SlabsDialog } from '../components/freight-benchmarks/SlabsDialog';
import type { FreightDestination, FreightSlab } from '../types/freightBenchmark.types';

const SHOW_OPTIONS = [
  { value: 'active', label: 'In use' },
  { value: 'unrated', label: 'No benchmark yet' },
  { value: 'inactive', label: 'Out of use' },
  { value: 'all', label: 'All' },
] as const;

type Show = (typeof SHOW_OPTIONS)[number]['value'];

/** Destination, state, PIN, km and the actions, besides the slab columns. */
const FIXED_COLUMNS = 5;

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA');
}

export default function FreightBenchmarksPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(DISPATCH_PERMISSIONS.MANAGE_FREIGHT_BENCHMARKS);

  const { data, isLoading, isFetching, isError, error } = useFreightBenchmarks();

  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [show, setShow] = useState<Show>('active');
  // `null` is closed; `'new'` is the add form.
  const [editing, setEditing] = useState<FreightDestination | 'new' | null>(null);
  const [slabsOpen, setSlabsOpen] = useState(false);

  const slabs = useMemo(() => data?.slabs ?? [], [data]);
  const destinations = useMemo(() => data?.destinations ?? [], [data]);

  const states = useMemo(
    () => [...new Set(destinations.map((d) => d.state))].sort(),
    [destinations],
  );

  const stateSlabs = useMemo(() => {
    const byState: Record<string, number[]> = {};
    for (const d of destinations) {
      const ids = new Set([...(byState[d.state] ?? []), ...d.rates.map((r) => r.slab)]);
      byState[d.state] = [...ids];
    }
    return byState;
  }, [destinations]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return destinations.filter((d) => {
      if (show === 'active' && !d.is_active) return false;
      if (show === 'inactive' && d.is_active) return false;
      if (show === 'unrated' && (!d.is_active || d.rates.length > 0)) return false;
      if (state && d.state !== state) return false;
      if (!term) return true;
      return [d.name, d.district, d.state, d.pin_code].some((value) =>
        value.toLowerCase().includes(term),
      );
    });
  }, [destinations, search, state, show]);

  // The slabs the rows on screen carry a rate on — every one of them, active or
  // not, so no rate is ever hidden. Nothing rated at all: the active slabs, so
  // the table still says what it would hold.
  const columns: FreightSlab[] = useMemo(() => {
    const used = new Set(rows.flatMap((d) => d.rates.map((r) => r.slab)));
    const shown = slabs.filter((s) => used.has(s.id));
    return shown.length > 0 ? shown : slabs.filter((s) => s.is_active);
  }, [rows, slabs]);

  const active = destinations.filter((d) => d.is_active);
  const unrated = active.filter((d) => d.rates.length === 0).length;
  const activeSlabs = slabs.filter((s) => s.is_active).length;
  const colSpan = FIXED_COLUMNS + columns.length;

  function exportExcel() {
    if (rows.length === 0) {
      toast.error('No destination to export.');
      return;
    }
    const lines = rows.map((d) => {
      const line: Record<string, string | number> = {
        State: d.state,
        District: d.district,
        Destination: d.name,
        'PIN code': d.pin_code,
        KM: d.distance_km ?? '',
      };
      for (const slab of columns) {
        const rate = d.rates.find((r) => r.slab === slab.id);
        line[slab.label] = rate
          ? rate.basis === 'PER_KG'
            ? `${rate.amount}/kg`
            : rate.amount
          : '';
      }
      return line;
    });
    const sheet = XLSX.utils.json_to_sheet(lines);
    sheet['!cols'] = [
      { wch: 16 },
      { wch: 18 },
      { wch: 36 },
      { wch: 9 },
      { wch: 6 },
      ...columns.map(() => ({ wch: 13 })),
    ];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Freight benchmarks');
    XLSX.writeFile(book, `freight-benchmarks-${todayISO()}.xlsx`);
    toast.success(`${rows.length} destination${rows.length === 1 ? '' : 's'} exported`);
  }

  const filtered = Boolean(search || state || show !== 'active');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Freight Benchmarks"
        description="What a truckload should cost from the plant to each destination, by vehicle size. These are the company's benchmarks — transporters' own rates are not kept here."
        icon={Scale}
        accent="amber"
      >
        <Button variant="outline" onClick={() => setSlabsOpen(true)}>
          <Layers className="mr-1.5 h-4 w-4" />
          Slabs
        </Button>
        {canManage && (
          <Button onClick={() => setEditing('new')}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add destination
          </Button>
        )}
      </PageHeader>

      <StatTileRow>
        <StatTile
          label="Destinations"
          value={active.length}
          sub={`across ${new Set(active.map((d) => d.state)).size} states`}
          icon={MapPin}
          accent="amber"
          onClick={() => {
            setShow('active');
            setState('');
          }}
        />
        <StatTile
          label="No benchmark yet"
          value={unrated}
          sub={unrated > 0 ? 'listed, with no rate on any slab' : 'every destination has a rate'}
          icon={AlertTriangle}
          accent={unrated > 0 ? 'rose' : undefined}
          onClick={() => setShow('unrated')}
        />
        <StatTile
          label="Slabs"
          value={activeSlabs}
          sub="vehicle-size bands a rate is quoted for"
          icon={Layers}
          onClick={() => setSlabsOpen(true)}
        />
      </StatTileRow>

      <TableCard
        summary={
          <span>
            {rows.length} of {destinations.length} destinations
            {isFetching && !isLoading ? ' · refreshing…' : ''}
          </span>
        }
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Place, district or PIN"
                aria-label="Search destinations"
                className="h-9 w-52 pl-8"
              />
            </div>
            <NativeSelect
              value={state}
              onChange={(event) => setState(event.target.value)}
              aria-label="State"
              className="h-9 w-44"
            >
              <SelectOption value="">All states</SelectOption>
              {states.map((s) => (
                <SelectOption key={s} value={s}>
                  {s}
                </SelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              value={show}
              onChange={(event) => setShow(event.target.value as Show)}
              aria-label="Show"
              className="h-9 w-44"
            >
              {SHOW_OPTIONS.map((option) => (
                <SelectOption key={option.value} value={option.value}>
                  {option.label}
                </SelectOption>
              ))}
            </NativeSelect>
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={rows.length === 0}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Export
            </Button>
          </>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Destination</Th>
              <Th>State</Th>
              <Th>PIN</Th>
              <Th align="right">KM</Th>
              {columns.map((slab) => (
                <Th key={slab.id} align="right" title={slabBand(slab)}>
                  <span className="block">{slab.label}</span>
                  {slabBandHint(slab) && (
                    <span className="block font-normal normal-case tracking-normal">
                      {slabBandHint(slab)}
                    </span>
                  )}
                </Th>
              ))}
              <Th className="w-12" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={colSpan} message="Reading the benchmarks…" />
            ) : isError ? (
              <TableEmpty
                colSpan={colSpan}
                icon={AlertTriangle}
                message="The benchmarks could not be read"
                hint={getErrorMessage(error, 'Try again in a moment.')}
              />
            ) : rows.length === 0 ? (
              <TableEmpty
                colSpan={colSpan}
                icon={MapPin}
                message={filtered ? 'No destination matches that' : 'No destinations yet'}
                hint={canManage && !filtered ? 'Add the first with Add destination.' : undefined}
              />
            ) : (
              rows.map((destination) => {
                const rates = new Map(destination.rates.map((r) => [r.slab, r]));
                return (
                  <tr
                    key={destination.id}
                    className={cn(ROW_CLASSES, !destination.is_active && 'opacity-60')}
                  >
                    <Td>
                      <span className="inline-flex flex-wrap items-center gap-1.5 font-medium">
                        {destination.name}
                        {!destination.is_active && (
                          <StatusPill tone="neutral">Out of use</StatusPill>
                        )}
                        {destination.is_active && destination.rates.length === 0 && (
                          <StatusPill tone="warn">No benchmark</StatusPill>
                        )}
                      </span>
                      {destination.district && (
                        <span className="block text-xs text-muted-foreground">
                          {destination.district}
                        </span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">{destination.state}</Td>
                    <Td className="tabular-nums">{destination.pin_code || '—'}</Td>
                    <Td numeric>{destination.distance_km ?? '—'}</Td>
                    {columns.map((slab) => {
                      const rate = rates.get(slab.id);
                      return (
                        <Td key={slab.id} numeric className="whitespace-nowrap">
                          {rate ? (
                            formatRate(rate)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Td>
                      );
                    })}
                    <Td align="right">
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Edit ${destination.name}`}
                          title="Edit"
                          onClick={() => setEditing(destination)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>

      <DestinationDialog
        open={editing !== null}
        onOpenChange={(value) => !value && setEditing(null)}
        destination={editing === 'new' ? null : editing}
        slabs={slabs}
        states={states}
        stateSlabs={stateSlabs}
      />
      <SlabsDialog
        open={slabsOpen}
        onOpenChange={setSlabsOpen}
        slabs={slabs}
        canManage={canManage}
      />
    </div>
  );
}
