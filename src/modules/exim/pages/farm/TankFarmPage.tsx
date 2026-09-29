/**
 * The tank farm, drawn: every tank filled to its last dip and painted the
 * colour of the oil in it, with each oil's litres and what they cost.
 *
 * EXIM's Tank Monitoring page. Tanks and totes are drawn apart: a tote is an
 * IBC container that holds the same oil but is not part of the farm, so the
 * figures at the top — how full the farm is — count the tanks alone.
 *
 * The wall view is for the screen in the store: it takes the whole width and
 * leaves out the tiles and the cost table, and the tanks and the per-oil
 * figures read themselves again every minute. The view, grouping and oil are
 * in the address, so a wall screen is a bookmark.
 */
import {
  AlertTriangle,
  ChevronDown,
  Container,
  Droplets,
  FileSpreadsheet,
  Gauge,
  PackagePlus,
  RefreshCw,
  Warehouse,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { useFullWidthPage } from '@/app/layouts/pageWidth';
import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  EmptyPanel,
  PageHeader,
  PageSection,
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
import { Button, Label, NativeSelect, SelectOption, Switch } from '@/shared/components/ui';
import { cn, formatDay, formatTime, getErrorMessage } from '@/shared/utils';

import { useAverageCosts, useTanks, useTankSummary } from '../../api';
import {
  byCode,
  fillPct,
  fmtVolume,
  isTote,
  LEVEL_BANDS,
  levelBand,
  litresToMt,
  readSavedUnit,
  resolveColor,
  saveUnit,
  volumeText,
  type VolumeUnit,
} from '../../components/farm/farm';
import { OilLabel, Segmented } from '../../components/farm/FarmBits';
import { OpeningStockDialog, type OpeningStockOil } from '../../components/farm/OpeningStockDialog';
import { TankDipDialog } from '../../components/farm/TankDialogs';
import { TankGlyph } from '../../components/farm/TankGlyph';
import { LotLink } from '../../components/lots/LotBits';
import type { AverageCost, Tank } from '../../types';
import { fmtMoney, fmtQty, todayISO } from '../../utils';

type Grouping = 'none' | 'oil' | 'level';

const GROUPINGS = [
  { value: 'none' as const, label: 'All together' },
  { value: 'oil' as const, label: 'By oil' },
  { value: 'level' as const, label: 'By level' },
];

const UNITS = [
  { value: 'L' as const, label: 'Litres' },
  { value: 'MT' as const, label: 'Tonnes' },
];

/** What a litre (or a tonne) of the oil cost, over the litres a lot accounts for. */
function costPer(cost: AverageCost | undefined, unit: VolumeUnit): number | null {
  if (!cost || !(cost.matched_l > 0)) return null;
  return unit === 'MT' ? cost.matched_average_per_kg * 1000 : cost.matched_average_per_litre;
}

function lotsValue(cost: AverageCost | undefined): number | null {
  if (!cost || cost.lots.length === 0) return null;
  return cost.lots.reduce((sum, lot) => sum + lot.value, 0);
}

function sumOf(tanks: Tank[], key: 'capacity_l' | 'level_l'): number {
  return tanks.reduce((total, tank) => total + Number(tank[key] || 0), 0);
}

/** A figure for the spreadsheet: litres to the centilitre, tonnes to the kilo. */
function sheetVolume(litres: number, unit: VolumeUnit): number {
  return unit === 'MT' ? Number(litresToMt(litres).toFixed(3)) : Number(litres.toFixed(2));
}

function GroupHeading({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <h4 className="text-sm font-semibold">{label}</h4>
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

export default function TankFarmPage() {
  const { hasPermission } = usePermission();
  const canCost = hasPermission(EXIM_PERMISSIONS.TANK_AVERAGE);
  const canOpening = hasPermission(EXIM_PERMISSIONS.OPENING_STOCK);
  const canDip = hasPermission(EXIM_PERMISSIONS.TANK_CHANGE);
  const canOpenLot = hasPermission(EXIM_PERMISSIONS.LOT_VIEW);

  const tanksQuery = useTanks();
  const summaryQuery = useTankSummary();
  const costsQuery = useAverageCosts(canCost);

  const [searchParams, setSearchParams] = useSearchParams();
  const wall = searchParams.get('view') === 'wall';
  const grouping = (GROUPINGS.find((g) => g.value === searchParams.get('group'))?.value ??
    'none') as Grouping;
  const oilFilter = searchParams.get('oil') ?? '';

  useFullWidthPage(wall);

  const [unit, setUnitState] = useState<VolumeUnit>(readSavedUnit);
  const per = unit === 'MT' ? 'MT' : 'L';
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [dipId, setDipId] = useState<number | null>(null);
  const [opening, setOpening] = useState<{ open: boolean; item: number | null }>({
    open: false,
    item: null,
  });

  // The summary reads itself every minute; the drawings keep pace with it.
  const { refetch: refetchTanks } = tanksQuery;
  useEffect(() => {
    const timer = window.setInterval(() => void refetchTanks(), 60_000);
    return () => window.clearInterval(timer);
  }, [refetchTanks]);

  function setParam(key: string, value: string | null) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  function setUnit(next: VolumeUnit) {
    setUnitState(next);
    saveUnit(next);
  }

  const tanks = useMemo(() => [...(tanksQuery.data ?? [])].sort(byCode), [tanksQuery.data]);
  const inUse = useMemo(() => tanks.filter((t) => t.is_active), [tanks]);
  const outOfUse = tanks.length - inUse.length;
  const farmTanks = inUse.filter((t) => !isTote(t));
  const totes = inUse.filter(isTote);

  const capacity = sumOf(farmTanks, 'capacity_l');
  const level = sumOf(farmTanks, 'level_l');
  const usedPct = capacity > 0 ? (level / capacity) * 100 : 0;
  const toteLevel = sumOf(totes, 'level_l');
  const toteCapacity = sumOf(totes, 'capacity_l');
  // Until the tanks are read, a tile says so rather than showing an empty farm.
  const ready = !!tanksQuery.data;
  const shownOr = (value: string | number) => (ready ? value : '…');

  const costs = useMemo(
    () => new Map((costsQuery.data ?? []).map((cost) => [cost.item, cost])),
    [costsQuery.data],
  );

  // The oils the farm holds, for the filter: from the tanks themselves.
  const farmOils = useMemo(() => {
    const seen = new Map<number, { item: number; code: string; name: string; color: string }>();
    for (const tank of inUse) {
      if (tank.item && !seen.has(tank.item)) {
        seen.set(tank.item, {
          item: tank.item,
          code: tank.item_code ?? '',
          name: tank.item_name ?? tank.item_code ?? '',
          color: tank.item_color ?? '',
        });
      }
    }
    return [...seen.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [inUse]);

  const shown = useMemo(
    () => (oilFilter ? inUse.filter((t) => String(t.item) === oilFilter) : inUse),
    [inUse, oilFilter],
  );

  const groups = useMemo(() => {
    if (grouping === 'oil') {
      const byOil = new Map<string, { key: string; label: string; tanks: Tank[] }>();
      for (const tank of shown) {
        const key = tank.item ? String(tank.item) : 'none';
        const label = tank.item ? `${tank.item_code} · ${tank.item_name}` : 'No oil';
        if (!byOil.has(key)) byOil.set(key, { key, label, tanks: [] });
        byOil.get(key)!.tanks.push(tank);
      }
      return [...byOil.values()].sort((a, b) => {
        if (a.key === 'none') return 1;
        if (b.key === 'none') return -1;
        return a.label.localeCompare(b.label);
      });
    }
    if (grouping === 'level') {
      return LEVEL_BANDS.map((band) => ({
        key: band.key,
        label: band.label,
        tanks: shown.filter((t) => levelBand(t) === band.key),
      })).filter((group) => group.tanks.length > 0);
    }
    return [{ key: 'all', label: '', tanks: shown }];
  }, [grouping, shown]);

  const oilRows = summaryQuery.data?.oils.items ?? [];
  const oilTotal = summaryQuery.data?.oils.total_l ?? 0;
  const maxOil = Math.max(0, ...oilRows.map((row) => row.level_l));

  // EXIM offered an opening stock only for an oil no lot costs yet.
  const openingOils: OpeningStockOil[] = oilRows
    .filter((row) => {
      const cost = costs.get(row.item);
      return canCost ? !!cost && !(cost.matched_l > 0) : true;
    })
    .map((row) => ({ item: row.item, code: row.code, name: row.name, litres: row.level_l }));

  const dipTank = dipId === null ? null : (tanks.find((t) => t.id === dipId) ?? null);
  const refreshing = tanksQuery.isFetching || summaryQuery.isFetching || costsQuery.isFetching;
  const updatedAt = Math.max(tanksQuery.dataUpdatedAt, summaryQuery.dataUpdatedAt);

  function refresh() {
    void tanksQuery.refetch();
    void summaryQuery.refetch();
    if (canCost) void costsQuery.refetch();
  }

  function toggle(item: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  /** EXIM's export: a row per tank an oil is in, the oil's figures repeated. */
  function exportExcel() {
    if (oilRows.length === 0) {
      toast.error('There is nothing in the farm to export.');
      return;
    }
    const byTankCode = new Map(tanks.map((t) => [t.code, t]));
    const rows = oilRows.flatMap((row) => {
      const rate = costPer(costs.get(row.item), unit);
      const codes: (string | null)[] = row.tanks.length ? row.tanks : [null];
      return codes.map((code) => {
        const tank = code ? byTankCode.get(code) : undefined;
        return {
          'Oil code': row.code,
          Oil: row.name,
          Tank: code ?? '—',
          [`In it (${unit})`]: sheetVolume(tank ? Number(tank.level_l) : row.level_l, unit),
          [`Capacity (${unit})`]: sheetVolume(
            tank ? Number(tank.capacity_l) : row.capacity_l,
            unit,
          ),
          ...(canCost
            ? { [`Cost per ${per} (₹)`]: rate === null ? '' : Number(rate.toFixed(2)) }
            : {}),
          'Tanks holding the oil': row.tank_count,
          Colour: row.color,
        };
      });
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Oils in the farm');
    XLSX.writeFile(book, `tank-farm-${todayISO()}.xlsx`);
  }

  const tankGrid = wall
    ? 'grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10'
    : 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6';
  const toteGrid = wall
    ? 'grid grid-cols-3 gap-3 md:grid-cols-6 xl:grid-cols-10'
    : 'grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-8';

  function glyph(tank: Tank) {
    return (
      <TankGlyph
        key={tank.id}
        code={tank.code}
        kind={tank.kind}
        pct={fillPct(tank)}
        color={tank.item_color}
        oilName={tank.item ? (tank.item_name ?? tank.item_code) : null}
        levelText={volumeText(tank.level_l, unit)}
        capacityText={volumeText(tank.capacity_l, unit)}
        onSelect={canDip ? () => setDipId(tank.id) : undefined}
        selectLabel={`Record a dip on ${tank.code}`}
      />
    );
  }

  const columns = 5 + (canCost ? 2 : 0) + (canOpening ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tank Farm"
        description={
          wall
            ? `${volumeText(level, unit)} of ${volumeText(capacity, unit)} in the tanks · ${usedPct.toFixed(1)}% full${
                updatedAt ? ` · read at ${formatTime(new Date(updatedAt))}` : ''
              }`
            : 'How full each tank is and which oil is in it, with what that oil cost. A level is the last dip entered on Tanks.'
        }
        icon={Droplets}
        accent="teal"
      >
        <Segmented label="Unit" value={unit} options={UNITS} onChange={setUnit} />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch
            id="farm-wall"
            checked={wall}
            onChange={(value) => setParam('view', value ? 'wall' : null)}
          />
          Wall view
        </label>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={cn('mr-1.5 h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </Button>
        {canOpening && !wall && (
          <Button onClick={() => setOpening({ open: true, item: null })}>
            <PackagePlus className="mr-1.5 h-4 w-4" />
            Opening stock
          </Button>
        )}
      </PageHeader>

      {!wall && (
        <StatTileRow>
          <StatTile
            label="In the tanks"
            value={shownOr(volumeText(level, unit))}
            sub={ready ? `of ${volumeText(capacity, unit)}` : undefined}
            icon={Gauge}
            accent="teal"
          />
          <StatTile
            label="Capacity"
            value={shownOr(volumeText(capacity, unit))}
            sub={ready ? `${volumeText(Math.max(capacity - level, 0), unit)} free` : undefined}
            icon={Warehouse}
          />
          <StatTile
            label="Full"
            value={shownOr(`${usedPct.toFixed(1)}%`)}
            sub="of the tanks' capacity"
            icon={Gauge}
            accent={usedPct >= 90 ? 'rose' : 'indigo'}
          />
          <StatTile
            label="Tanks"
            value={shownOr(farmTanks.length)}
            sub={outOfUse ? `${outOfUse} out of use, not counted` : 'in use'}
            icon={Container}
          />
          <StatTile
            label="Oils"
            value={summaryQuery.data?.farm.oil_count ?? farmOils.length}
            sub="in the tanks and totes"
            icon={Droplets}
          />
          {totes.length > 0 && (
            <StatTile
              label="Totes"
              value={volumeText(toteLevel, unit)}
              sub={`in ${totes.length} tote${totes.length === 1 ? '' : 's'}, of ${volumeText(toteCapacity, unit)}`}
              icon={Container}
              accent="slate"
            />
          )}
        </StatTileRow>
      )}

      <PageSection
        title={wall ? 'Tanks' : 'The farm'}
        description={
          wall
            ? undefined
            : 'Each tank is filled to its own capacity; the figures under it are the amount.'
        }
        actions={
          <>
            <div className="flex items-center gap-2">
              <Label htmlFor="farm-oil" className="text-sm text-muted-foreground">
                Oil
              </Label>
              <NativeSelect
                id="farm-oil"
                value={oilFilter}
                onChange={(event) => setParam('oil', event.target.value || null)}
                className="w-48"
              >
                <SelectOption value="">All oils</SelectOption>
                {farmOils.map((oil) => (
                  <SelectOption key={oil.item} value={String(oil.item)}>
                    {oil.code} · {oil.name}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <Segmented
              label="Group the tanks"
              value={grouping}
              options={GROUPINGS}
              onChange={(value) => setParam('group', value === 'none' ? null : value)}
            />
          </>
        }
      >
        {tanksQuery.isLoading ? (
          <EmptyPanel loading message="Reading the tanks…" />
        ) : tanksQuery.isError ? (
          <EmptyPanel
            icon={AlertTriangle}
            message="The tanks could not be read"
            hint={getErrorMessage(tanksQuery.error, 'Try Refresh in a moment.')}
          />
        ) : inUse.length === 0 ? (
          <EmptyPanel
            icon={Container}
            message="No tanks in use yet"
            hint="Add tanks on the Tanks page and they are drawn here."
          />
        ) : shown.length === 0 ? (
          <EmptyPanel icon={Container} message="No tank holds that oil now" />
        ) : (
          <div className="space-y-8">
            {groups.map((group) => {
              const groupTanks = group.tanks.filter((t) => !isTote(t));
              const groupTotes = group.tanks.filter(isTote);
              return (
                <div key={group.key} className="space-y-4">
                  {group.label && <GroupHeading label={group.label} count={group.tanks.length} />}
                  {groupTanks.length > 0 && <div className={tankGrid}>{groupTanks.map(glyph)}</div>}
                  {groupTotes.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Totes</span> · IBC containers,
                        not counted in how full the farm is · {groupTotes.length}
                      </p>
                      <div className={toteGrid}>{groupTotes.map(glyph)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PageSection>

      {!wall && (
        <PageSection
          title="Oils in the farm"
          description={
            canCost
              ? 'Each oil across its tanks and totes, and what its litres cost: its lots in the tanks, oldest first, until the litres are accounted for.'
              : 'Each oil across its tanks and totes.'
          }
        >
          <TableCard
            summary={
              <span>
                {oilRows.length} oil{oilRows.length === 1 ? '' : 's'} · {volumeText(oilTotal, unit)}
                {summaryQuery.isFetching && !summaryQuery.isLoading ? ' · refreshing…' : ''}
              </span>
            }
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={exportExcel}
                disabled={oilRows.length === 0}
              >
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                Export to Excel
              </Button>
            }
          >
            <table className={TABLE_CLASSES}>
              <thead className={THEAD_CLASSES}>
                <tr>
                  <Th className="w-10" aria-label="Lots" />
                  <Th>Oil</Th>
                  <Th align="right">In the farm ({unit})</Th>
                  <Th align="right">Capacity ({unit})</Th>
                  <Th>Held in</Th>
                  {canCost && <Th align="right">Cost per {per} (₹)</Th>}
                  {canCost && <Th align="right">Value (₹)</Th>}
                  {canOpening && <Th align="right" aria-label="Opening stock" />}
                </tr>
              </thead>
              <tbody>
                {summaryQuery.isLoading ? (
                  <TableLoading colSpan={columns} message="Adding up the oils…" />
                ) : summaryQuery.isError ? (
                  <TableEmpty
                    colSpan={columns}
                    icon={AlertTriangle}
                    message="The oils could not be added up"
                    hint={getErrorMessage(summaryQuery.error, 'Try Refresh in a moment.')}
                  />
                ) : oilRows.length === 0 ? (
                  <TableEmpty colSpan={columns} icon={Droplets} message="No oil in the farm" />
                ) : (
                  oilRows.map((row) => {
                    const cost = costs.get(row.item);
                    const rate = costPer(cost, unit);
                    const value = lotsValue(cost);
                    const canOpen = !!cost && (cost.lots.length > 0 || !!cost.warning);
                    const isOpen = expanded.has(row.item) && canOpen;
                    const needsOpening = canCost ? !!cost && !(cost.matched_l > 0) : true;
                    const share = maxOil > 0 ? (row.level_l / maxOil) * 100 : 0;
                    return (
                      <Fragment key={row.item}>
                        <tr className={ROW_CLASSES}>
                          <Td>
                            {canCost && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={!canOpen}
                                aria-expanded={isOpen}
                                aria-label={
                                  canOpen
                                    ? `${isOpen ? 'Hide' : 'Show'} the lots in ${row.name}`
                                    : `No lot is in the tanks for ${row.name}`
                                }
                                onClick={() => toggle(row.item)}
                              >
                                <ChevronDown
                                  className={cn(
                                    'h-4 w-4 transition-transform motion-reduce:transition-none',
                                    isOpen && 'rotate-180',
                                  )}
                                />
                              </Button>
                            )}
                          </Td>
                          <Td>
                            <OilLabel code={row.code} name={row.name} color={row.color} />
                          </Td>
                          <Td numeric>
                            <span className="block font-medium">
                              {fmtVolume(row.level_l, unit)}
                            </span>
                            <span className="ml-auto mt-1 block h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                              <span
                                className="block h-full rounded-full"
                                style={{
                                  width: `${share}%`,
                                  backgroundColor: resolveColor(row.color),
                                }}
                              />
                            </span>
                          </Td>
                          <Td numeric>{fmtVolume(row.capacity_l, unit)}</Td>
                          <Td>
                            <div className="flex max-w-xs flex-wrap gap-1">
                              {row.tanks.map((code) => (
                                <span
                                  key={code}
                                  className="rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                                >
                                  {code}
                                </span>
                              ))}
                            </div>
                          </Td>
                          {canCost && (
                            <Td numeric className="whitespace-nowrap">
                              {costsQuery.isLoading ? (
                                <span className="text-muted-foreground">…</span>
                              ) : rate === null ? (
                                <span className="text-muted-foreground">No lot</span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 font-semibold">
                                  {cost?.warning && (
                                    <span role="img" aria-label={cost.warning} title={cost.warning}>
                                      <AlertTriangle
                                        aria-hidden="true"
                                        className="h-3.5 w-3.5 text-amber-600"
                                      />
                                    </span>
                                  )}
                                  {fmtMoney(rate)}
                                </span>
                              )}
                            </Td>
                          )}
                          {canCost && <Td numeric>{value === null ? '—' : fmtMoney(value)}</Td>}
                          {canOpening && (
                            <Td align="right">
                              {needsOpening ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setOpening({ open: true, item: row.item })}
                                >
                                  Enter opening stock
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </Td>
                          )}
                        </tr>
                        {isOpen && cost && (
                          <tr className="border-b bg-muted/20">
                            <td colSpan={columns} className="px-4 py-3">
                              {cost.warning && (
                                <p className="mb-3 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                  {cost.warning}
                                </p>
                              )}
                              {cost.lots.length > 0 && (
                                <div className="overflow-x-auto rounded-lg border bg-card">
                                  <table className={TABLE_CLASSES}>
                                    <thead className={THEAD_CLASSES}>
                                      <tr>
                                        <Th className="w-10">#</Th>
                                        <Th>Lot</Th>
                                        <Th>Entered</Th>
                                        <Th>Party</Th>
                                        <Th>Vehicle</Th>
                                        <Th>Transporter</Th>
                                        <Th align="right">Rate per {per} (₹)</Th>
                                        <Th align="right">In the tanks ({unit})</Th>
                                        <Th align="right">Value (₹)</Th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {cost.lots.map((lot, index) => (
                                        <tr key={`${lot.lot}-${index}`} className={ROW_CLASSES}>
                                          <Td className="tabular-nums text-muted-foreground">
                                            {index + 1}
                                          </Td>
                                          <Td>
                                            <LotLink id={lot.lot} canOpen={canOpenLot} />
                                          </Td>
                                          <Td className="whitespace-nowrap">
                                            {formatDay(new Date(lot.created_at))}
                                          </Td>
                                          <Td className="min-w-44">{lot.party || '—'}</Td>
                                          <Td className="font-mono">{lot.vehicle || '—'}</Td>
                                          <Td>{lot.transporter || '—'}</Td>
                                          <Td numeric>
                                            {fmtMoney(
                                              unit === 'MT'
                                                ? lot.rate_per_kg * 1000
                                                : lot.rate_per_litre,
                                            )}
                                          </Td>
                                          <Td numeric>
                                            {unit === 'MT'
                                              ? fmtQty(lot.kg_in_tank / 1000)
                                              : fmtVolume(lot.litres_in_tank, 'L')}
                                          </Td>
                                          <Td numeric className="font-medium">
                                            {fmtMoney(lot.value)}
                                          </Td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </TableCard>
          {canCost && costsQuery.isError && (
            <p className="text-sm text-rose-600">
              {getErrorMessage(costsQuery.error, 'What the oils cost could not be read.')}
            </p>
          )}
        </PageSection>
      )}

      <TankDipDialog tank={dipTank} onOpenChange={(value) => !value && setDipId(null)} />
      {canOpening && (
        <OpeningStockDialog
          open={opening.open}
          onOpenChange={(value) => setOpening((current) => ({ ...current, open: value }))}
          oils={openingOils}
          initialItem={opening.item}
        />
      )}
    </div>
  );
}
