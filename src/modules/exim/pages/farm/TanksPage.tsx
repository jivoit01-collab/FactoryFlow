/**
 * The register of tanks and totes: what each holds, how full it is, and when
 * it was last dipped. EXIM's Tank Data page.
 *
 * A dip is recorded here — the level the store read and the oil it is — and
 * the Tank Farm draws from it. Numbers are given by the server when a tank is
 * added (TNK0001, TOT001), the lowest free one, as EXIM did. The kind and the
 * view are in the address, and `?dip=TNK0001` opens that tank's dip, so a
 * link can take somebody straight to the tank to dip.
 */
import {
  AlertTriangle,
  Container,
  FileSpreadsheet,
  Gauge,
  LayoutGrid,
  List,
  PackageOpen,
  Plus,
  Search,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  confirmDialog,
  EmptyPanel,
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
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Button, Input } from '@/shared/components/ui';
import { cn, formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useDeleteTank, useEmptyTank, useTanks } from '../../api';
import { byCode, fillPct, isEmptyTank, isTote } from '../../components/farm/farm';
import { FillBar, OilLabel, Segmented } from '../../components/farm/FarmBits';
import { TankCreateDialog, TankDipDialog } from '../../components/farm/TankDialogs';
import { TankGlyph } from '../../components/farm/TankGlyph';
import type { Tank, TankKind } from '../../types';
import { fmtLitres, todayISO } from '../../utils';

const KIND_TABS = [
  { value: 'all', label: 'All' },
  { value: 'tanks', label: 'Tanks' },
  { value: 'totes', label: 'Totes' },
] as const;

type KindTab = (typeof KIND_TABS)[number]['value'];

const VIEWS = [
  { value: 'table' as const, label: 'Table', icon: List },
  { value: 'grid' as const, label: 'Drawings', icon: LayoutGrid },
];

const COLUMNS = 8;

function sumOf(tanks: Tank[], key: 'capacity_l' | 'level_l'): number {
  return tanks.reduce((total, tank) => total + Number(tank[key] || 0), 0);
}

export default function TanksPage() {
  const { hasPermission } = usePermission();
  const canAdd = hasPermission(EXIM_PERMISSIONS.TANK_ADD);
  const canChange = hasPermission(EXIM_PERMISSIONS.TANK_CHANGE);
  const canDelete = hasPermission(EXIM_PERMISSIONS.TANK_DELETE);

  const { data, isLoading, isFetching, isError, error } = useTanks();
  const empty = useEmptyTank();
  const remove = useDeleteTank();

  const [searchParams, setSearchParams] = useSearchParams();
  const kindTab: KindTab =
    KIND_TABS.find((t) => t.value === searchParams.get('kind'))?.value ?? 'all';
  const view = searchParams.get('view') === 'grid' ? 'grid' : 'table';
  const linkedDip = searchParams.get('dip');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [createKind, setCreateKind] = useState<TankKind | null>(null);
  const [dipId, setDipId] = useState<number | null>(null);

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
    setPage(1);
  }

  const tanks = useMemo(() => [...(data ?? [])].sort(byCode), [data]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tanks.filter((tank) => {
      if (kindTab === 'tanks' && isTote(tank)) return false;
      if (kindTab === 'totes' && !isTote(tank)) return false;
      if (!term) return true;
      return [tank.code, tank.item_code, tank.item_name].some((value) =>
        value?.toLowerCase().includes(term),
      );
    });
  }, [tanks, kindTab, search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);

  const inUse = tanks.filter((t) => t.is_active);
  const capacity = sumOf(inUse, 'capacity_l');
  const level = sumOf(inUse, 'level_l');
  const holding = inUse.filter((t) => !isEmptyTank(t)).length;
  const toteCount = inUse.filter(isTote).length;

  // The tank whose dip is open: the one picked here, or the one a link named.
  const dipTank = canChange
    ? (tanks.find((t) => (dipId !== null ? t.id === dipId : t.code === linkedDip)) ?? null)
    : null;

  function closeDip() {
    setDipId(null);
    if (linkedDip) setParam('dip', null);
  }

  async function onEmpty(tank: Tank) {
    const confirmed = await confirmDialog({
      title: `Empty ${tank.code}?`,
      description: `${fmtLitres(tank.level_l)} L of ${tank.item_name ?? 'oil'} comes off it. It reads as empty, with no oil, until the next dip.`,
      confirmLabel: 'Empty it',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await empty.mutateAsync(tank.id);
      toast.success(`${tank.code} is empty`);
    } catch {
      // The API client has already shown why.
    }
  }

  async function onDelete(tank: Tank) {
    const confirmed = await confirmDialog({
      title: `Delete ${tank.code}?`,
      description: isEmptyTank(tank)
        ? 'It is taken off the register and out of the farm.'
        : `It still holds ${fmtLitres(tank.level_l)} L of ${tank.item_name ?? 'oil'}, which leaves the farm with it.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(tank.id);
      toast.success(`${tank.code} deleted`);
    } catch {
      // The API client has already shown why.
    }
  }

  /** EXIM's export: the rows shown, largest tank first, with a total. */
  function exportExcel() {
    if (rows.length === 0) {
      toast.error('No tank to export.');
      return;
    }
    const pct = (part: number, whole: number) =>
      whole > 0 ? Math.round((part / whole) * 10000) / 100 : 0;
    const sorted = [...rows].sort((a, b) => Number(b.capacity_l) - Number(a.capacity_l));
    const lines: Record<string, string | number>[] = sorted.map((tank) => {
      const cap = Number(tank.capacity_l);
      const lvl = Number(tank.level_l);
      return {
        Tank: tank.code,
        Kind: isTote(tank) ? 'Tote' : 'Tank',
        'Oil code': tank.item_code ?? '',
        Oil: tank.item_name ?? '',
        'Level (L)': lvl,
        'Capacity (L)': cap,
        'Room left (L)': Number((cap - lvl).toFixed(2)),
        'Full (%)': pct(lvl, cap),
        'In use': tank.is_active ? 'Yes' : 'No',
      };
    });
    const totalCap = sorted.reduce((s, t) => s + Number(t.capacity_l), 0);
    const totalLvl = sorted.reduce((s, t) => s + Number(t.level_l), 0);
    lines.push({
      Tank: 'TOTAL',
      Kind: '',
      'Oil code': '',
      Oil: '',
      'Level (L)': Number(totalLvl.toFixed(2)),
      'Capacity (L)': Number(totalCap.toFixed(2)),
      'Room left (L)': Number((totalCap - totalLvl).toFixed(2)),
      'Full (%)': pct(totalLvl, totalCap),
      'In use': '',
    });
    const sheet = XLSX.utils.json_to_sheet(lines);
    sheet['!cols'] = [
      { wch: 12 },
      { wch: 8 },
      { wch: 14 },
      { wch: 26 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 8 },
    ];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Tanks');
    XLSX.writeFile(book, `tanks-${todayISO()}.xlsx`);
    toast.success(`${sorted.length} tank${sorted.length === 1 ? '' : 's'} exported`);
  }

  function actions(tank: Tank, compact = false) {
    const size = compact ? 'h-8 w-8' : undefined;
    return (
      <div className={cn('flex gap-1', compact ? 'justify-center' : 'justify-end')}>
        {canChange && (
          <Button
            variant="ghost"
            size="icon"
            className={size}
            aria-label={`Record a dip on ${tank.code}`}
            title="Record a dip"
            onClick={() => setDipId(tank.id)}
          >
            <Gauge className="h-4 w-4" />
          </Button>
        )}
        {canChange && (
          <Button
            variant="ghost"
            size="icon"
            className={size}
            aria-label={`Empty ${tank.code}`}
            title="Empty it"
            disabled={isEmptyTank(tank)}
            onClick={() => onEmpty(tank)}
          >
            <PackageOpen className="h-4 w-4" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${tank.code}`}
            title="Delete"
            className={cn(
              size,
              'text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10',
            )}
            onClick={() => onDelete(tank)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  const emptyMessage = search ? 'No tank matches that' : 'No tanks yet';
  const emptyHint = canAdd && !search ? 'Add the first with Add tank.' : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tanks"
        icon={Container}
        accent="teal"
      >
        {canAdd && (
          <>
            <Button variant="outline" onClick={() => setCreateKind('TOTES')}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add tote
            </Button>
            <Button onClick={() => setCreateKind('TANK')}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add tank
            </Button>
          </>
        )}
      </PageHeader>

      <StatTileRow>
        <StatTile
          label="Capacity"
          value={`${fmtLitres(capacity)} L`}
          sub="tanks and totes in use"
          icon={Warehouse}
          accent="teal"
        />
        <StatTile
          label="In them"
          value={`${fmtLitres(level)} L`}
          sub={`${capacity > 0 ? ((level / capacity) * 100).toFixed(1) : '0.0'}% full`}
          icon={Gauge}
          accent="indigo"
        />
        <StatTile
          label="Holding oil"
          value={holding}
          sub={`${inUse.length - holding} empty`}
          icon={Container}
        />
        <StatTile
          label="Tanks"
          value={inUse.length - toteCount}
          sub={`${toteCount} tote${toteCount === 1 ? '' : 's'} besides`}
          icon={Container}
        />
      </StatTileRow>

      <TableCard
        summary={
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Kind"
              value={kindTab}
              options={KIND_TABS.map((t) => ({ value: t.value, label: t.label }))}
              onChange={(value) => setParam('kind', value === 'all' ? null : value)}
            />
            <span>
              {rows.length} of {tanks.length}
              {isFetching && !isLoading ? ' · refreshing…' : ''}
            </span>
          </div>
        }
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search tank or oil"
                className="h-9 w-52 pl-8"
              />
            </div>
            <Segmented
              label="View"
              value={view}
              options={VIEWS}
              onChange={(value) => setParam('view', value === 'table' ? null : value)}
              iconOnly
            />
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={rows.length === 0}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Export
            </Button>
          </>
        }
      >
        {view === 'table' ? (
          <table className={TABLE_CLASSES}>
            <thead className={THEAD_CLASSES}>
              <tr>
                <Th className="w-10">#</Th>
                <Th>Tank</Th>
                <Th>Oil</Th>
                <Th align="right">Capacity (L)</Th>
                <Th align="right">Level (L)</Th>
                <Th>Full</Th>
                <Th>Last dip</Th>
                <Th align="right" className="w-32" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoading colSpan={COLUMNS} message="Reading the tanks…" />
              ) : isError ? (
                <TableEmpty
                  colSpan={COLUMNS}
                  icon={AlertTriangle}
                  message="The tanks could not be read"
                  hint={getErrorMessage(error, 'Try again in a moment.')}
                />
              ) : shown.length === 0 ? (
                <TableEmpty
                  colSpan={COLUMNS}
                  icon={Container}
                  message={emptyMessage}
                  hint={emptyHint}
                />
              ) : (
                shown.map((tank, index) => (
                  <tr key={tank.id} className={cn(ROW_CLASSES, !tank.is_active && 'opacity-60')}>
                    <Td className="tabular-nums text-muted-foreground">
                      {(page - 1) * pageSize + index + 1}
                    </Td>
                    <Td>
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-medium">{tank.code}</span>
                        {isTote(tank) && <StatusPill tone="info">Tote</StatusPill>}
                        {!tank.is_active && <StatusPill tone="neutral">Out of use</StatusPill>}
                      </span>
                    </Td>
                    <Td>
                      <OilLabel
                        code={tank.item_code}
                        name={tank.item_name}
                        color={tank.item_color}
                      />
                    </Td>
                    <Td numeric>{fmtLitres(tank.capacity_l)}</Td>
                    <Td numeric className="font-medium">
                      {Number(tank.level_l) > 0 ? fmtLitres(tank.level_l) : '—'}
                    </Td>
                    <Td>
                      <FillBar pct={fillPct(tank)} color={tank.item_color} />
                    </Td>
                    <Td className="whitespace-nowrap">
                      <span className="block">{formatDateTimeShort(tank.updated_at)}</span>
                      {tank.updated_by_name && (
                        <span className="block text-xs text-muted-foreground">
                          {tank.updated_by_name}
                        </span>
                      )}
                    </Td>
                    <Td align="right">{actions(tank)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <div className="p-4">
            {isLoading ? (
              <EmptyPanel loading message="Reading the tanks…" className="border-0 shadow-none" />
            ) : isError ? (
              <EmptyPanel
                icon={AlertTriangle}
                message="The tanks could not be read"
                hint={getErrorMessage(error, 'Try again in a moment.')}
                className="border-0 shadow-none"
              />
            ) : shown.length === 0 ? (
              <EmptyPanel
                icon={Container}
                message={emptyMessage}
                hint={emptyHint}
                className="border-0 shadow-none"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {shown.map((tank) => (
                  <TankGlyph
                    key={tank.id}
                    code={tank.code}
                    kind={tank.kind}
                    pct={fillPct(tank)}
                    color={tank.item_color}
                    oilName={tank.item ? (tank.item_name ?? tank.item_code) : null}
                    levelText={`${fmtLitres(tank.level_l)} L`}
                    capacityText={`${fmtLitres(tank.capacity_l)} L`}
                    inactive={!tank.is_active}
                  >
                    {(canChange || canDelete) && actions(tank, true)}
                  </TankGlyph>
                ))}
              </div>
            )}
          </div>
        )}
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

      <TankCreateDialog
        open={createKind !== null}
        onOpenChange={(value) => !value && setCreateKind(null)}
        kind={createKind ?? 'TANK'}
      />
      <TankDipDialog tank={dipTank} onOpenChange={(value) => !value && closeDip()} />
    </div>
  );
}
