/**
 * Oil Stock: every oil in every stage, from contract to tank, in one matrix.
 * EXIM's Stock Dashboard.
 *
 * Rows are oils in the shared order; columns are what is in the tanks, what
 * waits outside the factory, then each stage split by the vendor the oil was
 * bought from. The in-tank figure is the tank dip (litres), the rest are the
 * lots (kilograms); both are shown in the reader's unit and add up together.
 *
 * Filters live in the URL, so a narrowed matrix is a link somebody can send,
 * and so is the wall view (`?wall=1`), which takes the full width of the
 * screen and reads the stock again every minute.
 */
import { useQueryClient } from '@tanstack/react-query';
import {
  Cylinder,
  Download,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  RefreshCw,
  Rows3,
  Save,
  Scale,
  Ship,
  Trophy,
  Undo2,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useFullWidthPage } from '@/app/layouts/pageWidth';
import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  FilterAction,
  FilterBar,
  FilterField,
  PageHeader,
  StatTile,
  StatTileRow,
  TableCard,
} from '@/shared/components';
import { Button, NativeSelect, SelectOption, Switch } from '@/shared/components/ui';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { FARM_KEYS, useReorderStockDashboard, useStockDashboard, useTankSummary } from '../../api';
import { LOT_STATUS_LABEL } from '../../components';
import { exportOilStock } from '../../components/reports/oilStockExcel';
import {
  fmtAmount,
  fromKg,
  fromLitres,
  num,
  stagePath,
  UNIT_WORD,
} from '../../components/reports/oilUnits';
import {
  buildGroups,
  buildLines,
  CLOSED_STATUSES,
  hasStock,
  type MatrixOil,
  orderOils,
  pipelineIn,
  type Placement,
  placeOil,
  stepPlacement,
  sumOils,
  totalIn,
} from '../../components/reports/stockMatrix';
import { StockMatrixTable } from '../../components/reports/StockMatrixTable';
import { UnitControls } from '../../components/reports/UnitControls';
import { useOilStockPrefs } from '../../components/reports/useOilStockPrefs';
import type { LotStatus } from '../../types';

function isStatus(value: string | null): value is LotStatus {
  return !!value && value in LOT_STATUS_LABEL;
}

export default function StockDashboardPage() {
  const { hasPermission } = usePermission();
  const canReorder = hasPermission(EXIM_PERMISSIONS.DASHBOARD_ORDER_CHANGE);
  const canSeeTanks = hasPermission(EXIM_PERMISSIONS.TANK_VIEW);
  const prefs = useOilStockPrefs();
  const { unit, rounded, byVendor } = prefs;
  const queryClient = useQueryClient();
  const baseId = useId();
  const ids = {
    oil: `${baseId}-oil`,
    vendor: `${baseId}-vendor`,
    status: `${baseId}-status`,
    empty: `${baseId}-empty`,
    split: `${baseId}-split`,
  };

  const [params, setParams] = useSearchParams();
  const oilParam = Number(params.get('oil')) || undefined;
  const vendorParam = params.get('vendor') || undefined;
  const statusParam = params.get('status');
  const status = isStatus(statusParam) ? statusParam : undefined;
  const wall = params.get('wall') === '1';
  useFullWidthPage(wall);

  function setParam(key: string, value: string | null) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }

  const filters = { item: oilParam, vendor: vendorParam, status };
  const filtered = useStockDashboard(filters);
  // The whole matrix, for the filters' choices and the full shared order. With
  // no filter set it is the same query as the one above.
  const all = useStockDashboard();
  // Off without the tank right: the request would fail and toast.
  const tanks = useTankSummary(canSeeTanks);
  const reorder = useReorderStockDashboard();

  const [hideEmpty, setHideEmpty] = useState(false);
  const [arrange, setArrange] = useState(false);
  /** An order being arranged and not saved yet, with the breaks that move with it. */
  const [draft, setDraft] = useState<{ order: string[]; breaks: string[] } | null>(null);

  // On a wall nobody presses Refresh.
  useEffect(() => {
    if (!wall) return;
    const timer = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: FARM_KEYS.stockDashboard().slice(0, 3) });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [wall, queryClient]);

  // Tanks know no vendor and no stage, so the in-tank column stands only for
  // the unnarrowed matrix or one oil.
  const showTank = canSeeTanks && !status && !vendorParam && !tanks.isError;
  const showOutside = !status;

  const tankOils = useMemo(() => tanks.data?.oils.items ?? [], [tanks.data]);
  const tankByItem = useMemo(
    () => new Map(tankOils.map((oil) => [oil.item, num(oil.level_l)])),
    [tankOils],
  );

  const groups = useMemo(
    () => buildGroups(filtered.data?.columns ?? [], { showClosed: !!status, byVendor }),
    [filtered.data, status, byVendor],
  );
  const keys = useMemo(() => groups.flatMap((group) => group.sourceKeys), [groups]);
  const closedHidden =
    !status && (filtered.data?.columns ?? []).some((c) => CLOSED_STATUSES.includes(c.status));

  const oils = useMemo<MatrixOil[]>(() => {
    const rows = filtered.data?.rows ?? [];
    const list: MatrixOil[] = rows.map((row) => ({
      item: row.item,
      code: row.code,
      name: row.name,
      tankL: showTank ? (tankByItem.get(row.item) ?? 0) : 0,
      outsideKg: showOutside ? num(row.outside_factory) : 0,
      values: row.values,
    }));
    if (showTank) {
      // An oil with litres in the tanks and no lot in play is still stock.
      const listed = new Set(rows.map((row) => row.item));
      for (const oil of tankOils) {
        if (listed.has(oil.item) || (oilParam && oil.item !== oilParam)) continue;
        list.push({
          item: oil.item,
          code: oil.code,
          name: oil.name,
          tankL: num(oil.level_l),
          outsideKg: 0,
          values: {},
        });
      }
    }
    return list;
  }, [filtered.data, showTank, showOutside, tankByItem, tankOils, oilParam]);

  /** Every oil the matrix knows, in the shared order: hidden ones included. */
  const serverOrder = useMemo(() => {
    const codes = (all.data?.rows ?? []).map((row) => row.code);
    const known = new Set(codes);
    const extra = tankOils
      .filter((oil) => !known.has(oil.code))
      .map((oil) => oil.code)
      .sort((a, b) => a.localeCompare(b));
    return [...codes, ...extra];
  }, [all.data, tankOils]);

  const idByCode = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of all.data?.rows ?? []) map.set(row.code, row.item);
    for (const oil of tankOils) map.set(oil.code, oil.item);
    for (const oil of oils) map.set(oil.code, oil.item);
    return map;
  }, [all.data, tankOils, oils]);

  const order = draft?.order ?? serverOrder;
  const breaks = draft?.breaks ?? prefs.breaks;

  const shown = useMemo(
    () => orderOils(hideEmpty ? oils.filter((oil) => hasStock(oil, keys)) : oils, order),
    [oils, hideEmpty, keys, order],
  );
  const lines = useMemo(() => buildLines(shown, order, breaks, keys), [shown, order, breaks, keys]);
  const totals = useMemo(() => sumOils(shown, keys), [shown, keys]);

  const top = useMemo(() => {
    let best: MatrixOil | null = null;
    let bestValue = 0;
    for (const oil of shown) {
      const value = totalIn('KG', oil, keys);
      if (value > bestValue) {
        best = oil;
        bestValue = value;
      }
    }
    return best ? { oil: best, value: fromKg(bestValue, unit) } : null;
  }, [shown, keys, unit]);

  // --- the filters' choices, from the whole matrix --------------------------

  const oilChoices = useMemo(() => {
    const seen = new Map<number, { id: number; label: string }>();
    for (const row of all.data?.rows ?? [])
      seen.set(row.item, { id: row.item, label: row.name || row.code });
    for (const oil of tankOils) {
      if (!seen.has(oil.item)) seen.set(oil.item, { id: oil.item, label: oil.name || oil.code });
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [all.data, tankOils]);

  const statusChoices = useMemo(() => {
    const list = (all.data?.columns ?? []).map((c) => c.status);
    if (status && !list.includes(status)) list.push(status);
    return list;
  }, [all.data, status]);

  // The matrix names vendors; the filter takes a code. The board sends each
  // vendor as its lots carry it, so the two never need matching.
  const vendorChoices = all.data?.vendors ?? [];
  const vendorName = vendorParam
    ? (vendorChoices.find((v) => v.code === vendorParam)?.name ?? vendorParam)
    : null;

  const activeFilters = [oilParam, vendorParam, status].filter(Boolean).length;
  const narrowedTo = [
    oilParam ? oilChoices.find((o) => o.id === oilParam)?.label : null,
    vendorName,
    status ? LOT_STATUS_LABEL[status] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // --- arranging -------------------------------------------------------------

  const fullOrder = useMemo(() => {
    const known = new Set(order);
    return [...order, ...shown.filter((oil) => !known.has(oil.code)).map((oil) => oil.code)];
  }, [order, shown]);

  function place(code: string, target: string, where: Placement) {
    setDraft(placeOil(fullOrder, breaks, code, target, where));
  }

  function step(code: string, direction: 'up' | 'down') {
    const move = stepPlacement(lines, code, direction);
    if (move) place(code, move.target, move.where);
  }

  function setBreaks(next: string[]) {
    if (draft) setDraft({ ...draft, breaks: next });
    else prefs.setBreaks(next);
  }

  function toggleBreak(code: string) {
    setBreaks(breaks.includes(code) ? breaks.filter((c) => c !== code) : [...breaks, code]);
  }

  async function saveOrder() {
    if (!draft) return;
    const items = draft.order
      .map((code) => idByCode.get(code))
      .filter((id): id is number => typeof id === 'number');
    try {
      await reorder.mutateAsync(items);
      prefs.setBreaks(draft.breaks);
      setDraft(null);
      toast.success('Row order saved: everybody sees the oils in this order now');
    } catch {
      // The API client has already shown why.
    }
  }

  // --- actions ----------------------------------------------------------------

  const fetching = filtered.isFetching || all.isFetching || tanks.isFetching;

  function refresh() {
    void filtered.refetch();
    if (activeFilters) void all.refetch();
    if (canSeeTanks) void tanks.refetch();
  }

  function download() {
    exportOilStock({
      lines,
      groups,
      totals,
      showTank,
      showOutside,
      byVendor,
      unit,
      rounded,
      narrowedTo: narrowedTo || undefined,
    });
    toast.success('Oil stock downloaded');
  }

  const loadingTanks = showTank && tanks.isLoading;
  const isLoading = filtered.isLoading || loadingTanks;
  const error = filtered.isError ? getErrorMessage(filtered.error, 'Try again in a moment.') : null;
  const oilCount = lines.filter((line) => line.kind === 'oil').length;
  const updatedAt = filtered.dataUpdatedAt
    ? formatDateTimeShort(new Date(filtered.dataUpdatedAt))
    : null;

  const notes: string[] = [];
  if (closedHidden)
    notes.push('Completed and delivered lots are left off: pick one under Stage to see it.');
  if (canSeeTanks && vendorParam && !status)
    notes.push('Tanks do not record a vendor, so In tank is left out while a vendor is picked.');
  if (canSeeTanks && tanks.isError)
    notes.push('The tank levels could not be read, so In tank is left out.');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oil Stock"
        description="Every oil in every stage, from contract to tank: what is in the tanks, what waits outside the factory, and what is still on its way, by vendor."
        icon={Layers}
        accent="teal"
      >
        <Button variant="outline" onClick={refresh} disabled={fetching}>
          <RefreshCw className={fetching ? 'mr-1.5 h-4 w-4 animate-spin' : 'mr-1.5 h-4 w-4'} />
          Refresh
        </Button>
        <Button variant="outline" onClick={download} disabled={isLoading || !!error || !oilCount}>
          <Download className="mr-1.5 h-4 w-4" />
          Excel
        </Button>
        <Button
          variant={wall ? 'default' : 'outline'}
          onClick={() => {
            setParam('wall', wall ? null : '1');
            setArrange(false);
          }}
        >
          {wall ? (
            <Minimize2 className="mr-1.5 h-4 w-4" />
          ) : (
            <Maximize2 className="mr-1.5 h-4 w-4" />
          )}
          {wall ? 'Leave wall view' : 'Wall view'}
        </Button>
      </PageHeader>

      <StatTileRow>
        {showTank && (
          <StatTile
            label="In tank"
            value={fmtAmount(fromLitres(totals.tankL, unit), rounded)}
            sub={`${UNIT_WORD[unit]} · dipped in the tanks`}
            icon={Cylinder}
            accent="teal"
            to={stagePath('IN_TANK')}
          />
        )}
        {showOutside && (
          <StatTile
            label="Outside factory"
            value={fmtAmount(fromKg(totals.outsideKg, unit), rounded)}
            sub={`${UNIT_WORD[unit]} · waiting to be emptied`}
            icon={MapPin}
            accent="amber"
            to={stagePath('OUT_SIDE_FACTORY')}
          />
        )}
        <StatTile
          label={status ? LOT_STATUS_LABEL[status] : 'On its way'}
          value={fmtAmount(pipelineIn(unit, totals, keys), rounded)}
          sub={`${UNIT_WORD[unit]} · ${status ? 'in this stage' : 'contract to factory gate'}`}
          icon={Ship}
          accent="indigo"
        />
        <StatTile
          label="Total"
          value={fmtAmount(totalIn(unit, totals, keys), rounded)}
          sub={`${UNIT_WORD[unit]} · every column`}
          icon={Scale}
        />
        <StatTile
          label="Most stock"
          value={top ? top.oil.name || top.oil.code : '—'}
          sub={top ? `${fmtAmount(top.value, rounded)} ${UNIT_WORD[unit]}` : 'no stock'}
          icon={Trophy}
          accent="violet"
        />
      </StatTileRow>

      {!wall && (
        <FilterBar
          isFetching={fetching && !isLoading}
          activeCount={activeFilters}
          onReset={
            activeFilters
              ? () =>
                  setParams((current) => {
                    const next = new URLSearchParams(current);
                    ['oil', 'vendor', 'status'].forEach((key) => next.delete(key));
                    return next;
                  })
              : undefined
          }
        >
          <FilterField label="Oil" htmlFor={ids.oil} className="sm:w-56">
            <NativeSelect
              id={ids.oil}
              value={oilParam ?? ''}
              onChange={(event) => setParam('oil', event.target.value || null)}
            >
              <SelectOption value="">All oils</SelectOption>
              {oilChoices.map((oil) => (
                <SelectOption key={oil.id} value={oil.id}>
                  {oil.label}
                </SelectOption>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField label="Vendor" htmlFor={ids.vendor} className="sm:w-64">
            <NativeSelect
              id={ids.vendor}
              value={vendorParam ?? ''}
              onChange={(event) => setParam('vendor', event.target.value || null)}
            >
              <SelectOption value="">All vendors</SelectOption>
              {vendorParam && !vendorChoices.some((c) => c.code === vendorParam) && (
                <SelectOption value={vendorParam}>{vendorName}</SelectOption>
              )}
              {vendorChoices.map((choice) => (
                <SelectOption key={choice.code} value={choice.code}>
                  {choice.name}
                </SelectOption>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField label="Stage" htmlFor={ids.status} className="sm:w-56">
            <NativeSelect
              id={ids.status}
              value={status ?? ''}
              onChange={(event) => setParam('status', event.target.value || null)}
            >
              <SelectOption value="">All stages</SelectOption>
              {statusChoices.map((s) => (
                <SelectOption key={s} value={s}>
                  {LOT_STATUS_LABEL[s]}
                </SelectOption>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterAction>
            <label
              htmlFor={ids.empty}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Switch id={ids.empty} checked={hideEmpty} onChange={setHideEmpty} />
              Hide empty oils
            </label>
          </FilterAction>
          <FilterAction>
            <label
              htmlFor={ids.split}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Switch id={ids.split} checked={byVendor} onChange={prefs.setByVendor} />
              Split stages by vendor
            </label>
          </FilterAction>
        </FilterBar>
      )}

      {arrange && !wall && (
        <p className="text-sm text-muted-foreground">
          {canReorder
            ? 'Drag an oil, or use its arrows, to move it. The order is shared: Save order puts it in front of everybody. '
            : 'The order of the oils is set for everybody by those allowed to change it. '}
          A break (the line button) subtotals the oils above it, and is yours alone.
        </p>
      )}

      <TableCard
        summary={
          <span>
            {oilCount} oil{oilCount === 1 ? '' : 's'} · in {UNIT_WORD[unit]}
            {rounded ? ', rounded' : ''}
            {wall && narrowedTo ? ` · ${narrowedTo}` : ''}
            {updatedAt ? ` · read ${updatedAt}` : ''}
            {fetching && !isLoading ? ' · refreshing…' : ''}
          </span>
        }
        actions={
          <>
            {!wall && draft && canReorder && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraft(null)}
                  disabled={reorder.isPending}
                >
                  <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                  Undo
                </Button>
                <Button size="sm" onClick={saveOrder} disabled={reorder.isPending}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {reorder.isPending ? 'Saving…' : 'Save order'}
                </Button>
              </>
            )}
            {!wall && (
              <Button
                size="sm"
                variant={arrange ? 'secondary' : 'outline'}
                aria-pressed={arrange}
                onClick={() => setArrange((value) => !value)}
                disabled={isLoading || !!error}
              >
                <Rows3 className="mr-1.5 h-3.5 w-3.5" />
                {arrange ? 'Done arranging' : 'Arrange'}
              </Button>
            )}
            <UnitControls
              unit={unit}
              onUnitChange={prefs.setUnit}
              rounded={rounded}
              onRoundedChange={prefs.setRounded}
            />
          </>
        }
      >
        <StockMatrixTable
          lines={lines}
          groups={groups}
          showTank={showTank}
          showOutside={showOutside}
          byVendor={byVendor}
          unit={unit}
          rounded={rounded}
          totals={totals}
          isLoading={isLoading}
          error={error}
          emptyMessage={activeFilters || hideEmpty ? 'No oil matches' : 'No oil in any stage'}
          emptyHint={
            activeFilters ? 'Try another oil, vendor or stage, or Reset the filters.' : undefined
          }
          arrange={arrange && !wall}
          canReorder={canReorder}
          wall={wall}
          onPlace={place}
          onStep={step}
          onToggleBreak={toggleBreak}
          onRemoveBreaks={(codes) => setBreaks(breaks.filter((c) => !codes.includes(c)))}
        />
      </TableCard>

      {notes.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
