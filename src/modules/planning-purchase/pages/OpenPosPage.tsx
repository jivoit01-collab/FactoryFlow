/**
 * Open POs: every purchase order line SAP still expects goods against, for the
 * selected company.
 *
 * EXIM's Open POs read Oil only, and only the POs one buyer (SAP user 15)
 * raised, with nothing on the page saying so. Here every open line is read,
 * and who raised it is a column and a filter instead of a hidden rule.
 *
 * Read live from SAP. The server keeps a read for two minutes; Refresh asks SAP
 * again. The filters live in the URL, so a buyer's own list is a link they can
 * keep, and the page opens on it next time.
 */
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CalendarClock,
  FileDown,
  FileText,
  IndianRupee,
  ListChecks,
  RefreshCw,
  Search,
  ShoppingCart,
} from 'lucide-react';
import { type ReactNode, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/core/auth';
import {
  FilterAction,
  FilterBar,
  FilterField,
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
import { Button, Input, NativeSelect, SelectOption, Switch } from '@/shared/components/ui';
import { cn, formatDateTimeShort, formatDay, getErrorMessage } from '@/shared/utils';

import { useOpenPos, useRefreshOpenPos } from '../api';
import { moneyShort, qtyPrecise } from '../components';
import { exportOpenPos } from '../components/openPosExcel';
import type { OpenPoLine } from '../types';

type SortKey =
  | 'po_date'
  | 'vendor_name'
  | 'item_name'
  | 'warehouse'
  | 'ordered'
  | 'received'
  | 'open_qty'
  | 'price'
  | 'open_value'
  | 'days_open'
  | 'overdue_days'
  | 'raised_by';

const TEXT: SortKey[] = ['vendor_name', 'item_name', 'warehouse', 'raised_by'];

const FILTER_KEYS = ['q', 'by', 'group', 'wh', 'vendor', 'overdue'] as const;

const COLUMNS = 12;

/** Past this many days late a line reads red rather than amber. */
const LONG_OVERDUE = 30;

function SortTh({
  column,
  children,
  align,
  sort,
  onSort,
}: {
  column: SortKey;
  children: ReactNode;
  align?: 'right';
  sort: { key: SortKey | null; dir: 'asc' | 'desc' };
  onSort: (column: SortKey) => void;
}) {
  const Icon = sort.key !== column ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <Th
      align={align}
      aria-sort={
        sort.key === column ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined
      }
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {children}
        <Icon className={cn('h-3 w-3', sort.key !== column && 'opacity-40')} />
      </button>
    </Th>
  );
}

function sortValue(line: OpenPoLine, key: SortKey): number | string {
  if (key === 'po_date') return `${line.po_date ?? ''} ${line.po_number.padStart(12, '0')}`;
  if (TEXT.includes(key)) return String(line[key as 'vendor_name'] ?? '');
  return Number(line[key as 'ordered'] ?? 0);
}

function searchText(line: OpenPoLine) {
  return [
    line.po_number,
    line.vendor_code,
    line.vendor_name,
    line.vendor_ref,
    line.item_code,
    line.item_name,
    line.item_group,
    line.warehouse,
    line.raised_by,
  ]
    .join(' ')
    .toLowerCase();
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
}

/** A price in its own currency: `₹ 125.50`, `USD 1,020.00`. */
function price(value: number, currency: string) {
  const figure = value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  return !currency || currency === 'INR' ? `₹ ${figure}` : `${currency} ${figure}`;
}

function rupees(value: number) {
  return `₹ ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function OverdueCell({ line }: { line: OpenPoLine }) {
  const due = line.ship_date ?? line.due_date;
  if (line.overdue_days > 0) {
    return (
      <>
        <StatusPill tone={line.overdue_days > LONG_OVERDUE ? 'blocked' : 'warn'}>
          {plural(line.overdue_days, 'day')} late
        </StatusPill>
        <span className="mt-0.5 block whitespace-nowrap text-xs text-muted-foreground">
          due {formatDay(due)}
        </span>
      </>
    );
  }
  return due ? (
    <span className="whitespace-nowrap text-xs text-muted-foreground">due {formatDay(due)}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

export default function OpenPosPage() {
  const { currentCompany } = useAuth();
  const baseId = useId();
  const ids = {
    search: `${baseId}-search`,
    by: `${baseId}-by`,
    group: `${baseId}-group`,
    wh: `${baseId}-wh`,
    vendor: `${baseId}-vendor`,
    overdue: `${baseId}-overdue`,
  };

  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const raisedBy = params.get('by') ?? '';
  const group = params.get('group') ?? '';
  const warehouse = params.get('wh') ?? '';
  const vendor = params.get('vendor') ?? '';
  const overdueOnly = params.get('overdue') === '1';

  const { data, isLoading, isFetching, isError, error } = useOpenPos();
  const refresh = useRefreshOpenPos();

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  function setParam(key: string, value: string) {
    setParams(
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

  function resetFilters() {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        FILTER_KEYS.forEach((key) => next.delete(key));
        return next;
      },
      { replace: true },
    );
    setPage(1);
  }

  const lines = useMemo(() => (isError ? [] : (data?.rows ?? [])), [data, isError]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const found = lines.filter(
      (line) =>
        (!raisedBy || line.raised_by === raisedBy) &&
        (!group || line.item_group === group) &&
        (!warehouse || line.warehouse === warehouse) &&
        (!vendor || line.vendor_code === vendor) &&
        (!overdueOnly || line.overdue_days > 0) &&
        (!term || searchText(line).includes(term)),
    );
    if (!sortKey) return found;
    return [...found].sort((a, b) => {
      const x = sortValue(a, sortKey);
      const y = sortValue(b, sortKey);
      const cmp =
        typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [lines, search, raisedBy, group, warehouse, vendor, overdueOnly, sortKey, sortDir]);

  const vendorChoices = useMemo(() => {
    const names = new Map<string, string>();
    for (const line of lines)
      if (!names.has(line.vendor_code)) names.set(line.vendor_code, line.vendor_name);
    if (vendor && !names.has(vendor)) names.set(vendor, '');
    return [...names]
      .map(([code, name]) => ({ code, label: name ? `${name} · ${code}` : code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [lines, vendor]);

  /** A choice in the URL that today's lines no longer carry still shows, so it can be undone. */
  function withChosen(list: string[] | undefined, chosen: string) {
    const all = list ?? [];
    return chosen && !all.includes(chosen) ? [chosen, ...all] : all;
  }

  const filtered = !!(search.trim() || raisedBy || group || warehouse || vendor || overdueOnly);
  const activeCount = [search.trim(), raisedBy, group, warehouse, vendor, overdueOnly].filter(
    Boolean,
  ).length;

  const totals = useMemo(
    () => ({
      lines: rows.length,
      orders: new Set(rows.map((line) => line.doc_entry)).size,
      vendors: new Set(rows.map((line) => line.vendor_code)).size,
      openValue: rows.reduce((sum, line) => sum + line.open_value, 0),
      overdue: rows.filter((line) => line.overdue_days > 0).length,
    }),
    [rows],
  );
  const ready = !!data && !isError;
  const dash = '—';

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);
  const sort = { key: sortKey, dir: sortDir };

  function sortBy(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      // Figures read biggest first; names and dates oldest first.
      setSortDir(TEXT.includes(key) || key === 'po_date' ? 'asc' : 'desc');
    }
    setPage(1);
  }

  function readAgain() {
    refresh.mutate(undefined, {
      onError: (err) => toast.error(getErrorMessage(err, 'SAP did not answer. Try again shortly.')),
    });
  }

  function download() {
    exportOpenPos(rows, currentCompany?.company_code);
    toast.success(`${plural(rows.length, 'line')} downloading`);
  }

  const busy = isFetching || refresh.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title="Open POs" icon={ShoppingCart} accent="indigo">
        <Button variant="outline" onClick={readAgain} disabled={busy}>
          <RefreshCw className={cn('mr-1.5 h-4 w-4', busy && 'animate-spin')} />
          Refresh
        </Button>
        <Button variant="outline" onClick={download} disabled={!ready || rows.length === 0}>
          <FileDown className="mr-1.5 h-4 w-4" />
          Download Excel
        </Button>
      </PageHeader>

      <StatTileRow>
        <StatTile
          label={filtered ? 'Matching lines' : 'Open lines'}
          value={ready ? totals.lines.toLocaleString('en-IN') : dash}
          sub={
            ready && filtered
              ? `of ${data.totals.lines.toLocaleString('en-IN')} open`
              : 'SAP still expects goods on'
          }
          icon={ListChecks}
          accent="indigo"
        />
        <StatTile
          label="POs"
          value={ready ? totals.orders.toLocaleString('en-IN') : dash}
          sub="purchase orders open"
          icon={FileText}
          accent="sky"
        />
        <StatTile
          label="Vendors"
          value={ready ? totals.vendors.toLocaleString('en-IN') : dash}
          sub="with goods still to send"
          icon={Building2}
          accent="teal"
        />
        <StatTile
          label="Open value"
          value={ready ? moneyShort(totals.openValue) : dash}
          sub="in rupees, at each line's rate"
          icon={IndianRupee}
          accent="emerald"
        />
        <StatTile
          label="Overdue lines"
          value={ready ? totals.overdue.toLocaleString('en-IN') : dash}
          sub={overdueOnly ? 'showing only these' : 'past their delivery date'}
          icon={CalendarClock}
          accent={ready && totals.overdue > 0 ? 'rose' : 'slate'}
          onClick={ready ? () => setParam('overdue', overdueOnly ? '' : '1') : undefined}
        />
      </StatTileRow>

      <FilterBar
        isFetching={busy && !isLoading}
        activeCount={activeCount}
        onReset={filtered ? resetFilters : undefined}
      >
        <FilterField label="Search" htmlFor={ids.search} className="sm:w-64">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={ids.search}
              value={search}
              onChange={(event) => setParam('q', event.target.value)}
              placeholder="PO number, vendor, item…"
              className="h-9 w-full pl-8"
            />
          </div>
        </FilterField>
        <FilterField label="Raised by" htmlFor={ids.by} className="sm:w-48">
          <NativeSelect
            id={ids.by}
            value={raisedBy}
            onChange={(event) => setParam('by', event.target.value)}
          >
            <SelectOption value="">Anyone</SelectOption>
            {withChosen(data?.raised_by, raisedBy).map((name) => (
              <SelectOption key={name} value={name}>
                {name}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Item group" htmlFor={ids.group} className="sm:w-52">
          <NativeSelect
            id={ids.group}
            value={group}
            onChange={(event) => setParam('group', event.target.value)}
          >
            <SelectOption value="">All groups</SelectOption>
            {withChosen(data?.item_groups, group).map((name) => (
              <SelectOption key={name} value={name}>
                {name}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Warehouse" htmlFor={ids.wh} className="sm:w-40">
          <NativeSelect
            id={ids.wh}
            value={warehouse}
            onChange={(event) => setParam('wh', event.target.value)}
          >
            <SelectOption value="">All warehouses</SelectOption>
            {withChosen(data?.warehouses, warehouse).map((code) => (
              <SelectOption key={code} value={code}>
                {code}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Vendor" htmlFor={ids.vendor} className="sm:w-64">
          <NativeSelect
            id={ids.vendor}
            value={vendor}
            onChange={(event) => setParam('vendor', event.target.value)}
          >
            <SelectOption value="">All vendors</SelectOption>
            {vendorChoices.map((choice) => (
              <SelectOption key={choice.code} value={choice.code}>
                {choice.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterAction className="sm:h-9">
          <label htmlFor={ids.overdue} className="flex items-center gap-2 text-sm">
            <Switch
              id={ids.overdue}
              checked={overdueOnly}
              onChange={(checked) => setParam('overdue', checked ? '1' : '')}
            />
            Overdue only
          </label>
        </FilterAction>
      </FilterBar>

      <TableCard
        summary={
          <span>
            {isLoading
              ? 'Reading SAP…'
              : ready
                ? `${plural(rows.length, 'line')}${
                    filtered ? ` of ${data.rows.length.toLocaleString('en-IN')}` : ''
                  } · ${rupees(totals.openValue)} open · read ${formatDateTimeShort(data.read_at)}`
                : 'SAP was not read'}
            {busy && !isLoading ? ' · refreshing…' : ''}
          </span>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <SortTh column="po_date" sort={sort} onSort={sortBy}>
                PO
              </SortTh>
              <SortTh column="vendor_name" sort={sort} onSort={sortBy}>
                Vendor
              </SortTh>
              <SortTh column="item_name" sort={sort} onSort={sortBy}>
                Item
              </SortTh>
              <SortTh column="warehouse" sort={sort} onSort={sortBy}>
                Warehouse
              </SortTh>
              <SortTh column="ordered" align="right" sort={sort} onSort={sortBy}>
                Ordered
              </SortTh>
              <SortTh column="received" align="right" sort={sort} onSort={sortBy}>
                Received
              </SortTh>
              <SortTh column="open_qty" align="right" sort={sort} onSort={sortBy}>
                Open
              </SortTh>
              <SortTh column="price" align="right" sort={sort} onSort={sortBy}>
                Price
              </SortTh>
              <SortTh column="open_value" align="right" sort={sort} onSort={sortBy}>
                Open value (₹)
              </SortTh>
              <SortTh column="days_open" align="right" sort={sort} onSort={sortBy}>
                Days open
              </SortTh>
              <SortTh column="overdue_days" sort={sort} onSort={sortBy}>
                Overdue
              </SortTh>
              <SortTh column="raised_by" sort={sort} onSort={sortBy}>
                Raised by
              </SortTh>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={COLUMNS} message="Reading the open POs from SAP…" />
            ) : isError ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={AlertTriangle}
                message="The open POs could not be read"
                hint={getErrorMessage(error, 'SAP did not answer. Try Refresh in a moment.')}
              />
            ) : shown.length === 0 ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={ShoppingCart}
                message={filtered ? 'No open PO line matches' : 'SAP has no open PO lines'}
                hint={
                  filtered
                    ? 'Try another buyer, group, warehouse or vendor, or Reset.'
                    : 'Every purchase order is closed or fully received.'
                }
              />
            ) : (
              shown.map((line) => (
                <tr key={`${line.doc_entry}-${line.line}`} className={cn(ROW_CLASSES, 'align-top')}>
                  <Td>
                    <span className="block whitespace-nowrap font-mono font-medium">
                      {line.po_number}
                    </span>
                    <span className="block whitespace-nowrap text-xs text-muted-foreground">
                      {formatDay(line.po_date)}
                    </span>
                  </Td>
                  <Td className="min-w-48">
                    <span className="block font-medium">{line.vendor_name || '—'}</span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {line.vendor_code}
                      {line.vendor_ref ? ` · ref ${line.vendor_ref}` : ''}
                    </span>
                  </Td>
                  <Td className="min-w-56">
                    <span className="block">{line.item_name || '—'}</span>
                    <span className="block text-xs text-muted-foreground">
                      <span className="font-mono">{line.item_code}</span>
                      {line.item_group ? ` · ${line.item_group}` : ''}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap font-mono">{line.warehouse || '—'}</Td>
                  <Td numeric className="whitespace-nowrap">
                    {qtyPrecise(line.ordered)}
                  </Td>
                  <Td numeric className="whitespace-nowrap text-muted-foreground">
                    {line.received ? qtyPrecise(line.received) : '—'}
                  </Td>
                  <Td numeric className="whitespace-nowrap font-medium">
                    {qtyPrecise(line.open_qty)}
                    {line.unit && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {line.unit}
                      </span>
                    )}
                  </Td>
                  <Td numeric className="whitespace-nowrap">
                    {price(line.price, line.currency)}
                  </Td>
                  <Td numeric className="whitespace-nowrap font-semibold">
                    {line.open_value.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Td>
                  <Td numeric>{line.days_open ?? '—'}</Td>
                  <Td>
                    <OverdueCell line={line} />
                  </Td>
                  <Td className="whitespace-nowrap">{line.raised_by || '—'}</Td>
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

      <p className="text-xs text-muted-foreground">
        An open line is one SAP still expects goods against: the PO and the line are open and the PO
        is not cancelled. Open value is what is still to come at the line&apos;s own rate in rupees,
        so a PO in dollars adds up with the rest. Overdue counts from the line&apos;s delivery date,
        or the PO&apos;s due date when the line has none.
      </p>
    </div>
  );
}
