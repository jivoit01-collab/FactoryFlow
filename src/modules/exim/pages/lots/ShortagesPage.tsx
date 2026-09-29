/**
 * Shortages: EXIM's Shortage Report.
 *
 * A line is written each time a lot is weighed into the tanks at less than it
 * was loaded. The first 0.25% of the loaded quantity is allowed; the rest is
 * deducted from the supplier at the lot's rate. Tonnes throughout, and the
 * deduction in rupees.
 */
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Hash,
  IndianRupee,
  Scale,
  Search,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
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
import { Input } from '@/shared/components/ui';
import { cn, formatDay, getErrorMessage } from '@/shared/utils';

import { useShortages } from '../../api';
import { LotLink } from '../../components/lots/LotBits';
import type { Shortage } from '../../types';
import { fmtMoney, fmtQty } from '../../utils';

type SortKey =
  | 'created_at'
  | 'supplier'
  | 'item_name'
  | 'load_qty_mt'
  | 'unload_qty_mt'
  | 'shortage_mt'
  | 'allowed_mt'
  | 'deducted_mt'
  | 'deduction_amount'
  | 'transporter'
  | 'vehicle_number'
  | 'bilty_number'
  | 'grpo_number';

const NUMERIC: SortKey[] = [
  'load_qty_mt',
  'unload_qty_mt',
  'shortage_mt',
  'allowed_mt',
  'deducted_mt',
  'deduction_amount',
];

const COLUMNS = 14;

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
    <Th align={align}>
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

function searchText(s: Shortage) {
  return [
    s.supplier,
    s.supplier_code,
    s.item_name,
    s.item_code,
    s.transporter,
    s.vehicle_number,
    s.bilty_number,
    s.grpo_number,
    s.lot ? `#${s.lot}` : '',
  ]
    .join(' ')
    .toLowerCase();
}

export default function ShortagesPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canOpenLot = hasPermission(EXIM_PERMISSIONS.LOT_VIEW);
  const { data, isLoading, isFetching, isError, error } = useShortages();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const found = (data?.results ?? []).filter((s) => !term || searchText(s).includes(term));
    if (!sortKey) return found;
    return [...found].sort((a, b) => {
      const cmp = NUMERIC.includes(sortKey)
        ? Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0)
        : String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);
  const sort = { key: sortKey, dir: sortDir };
  const totals = data?.totals;

  function sortBy(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shortages"
        description="Oil weighed into the tanks at less than it was loaded. The first 0.25% is allowed; the rest is deducted from the supplier."
        icon={Scale}
        accent="teal"
      />

      <StatTileRow>
        <StatTile
          label="Shortages"
          value={totals ? totals.count.toLocaleString('en-IN') : '—'}
          sub="lots weighed in short"
          icon={Hash}
          accent="teal"
        />
        <StatTile
          label="Deducted"
          value={totals ? fmtQty(totals.deducted_mt) : '—'}
          sub="MT past the allowance"
          icon={Scale}
          accent="rose"
        />
        <StatTile
          label="Deduction"
          value={totals ? `₹ ${fmtMoney(totals.deduction_amount)}` : '—'}
          sub="to recover from suppliers"
          icon={IndianRupee}
          accent="amber"
        />
      </StatTileRow>

      <TableCard
        summary={
          <span>
            {rows.length} shortage{rows.length === 1 ? '' : 's'}
            {search && data ? ` of ${data.results.length}` : ''}
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
              placeholder="Search supplier, oil, vehicle…"
              aria-label="Search the shortages"
              className="h-9 w-60 pl-8"
            />
          </div>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <SortTh column="created_at" sort={sort} onSort={sortBy}>
                Date
              </SortTh>
              <Th>Lot</Th>
              <SortTh column="supplier" sort={sort} onSort={sortBy}>
                Supplier
              </SortTh>
              <SortTh column="item_name" sort={sort} onSort={sortBy}>
                Oil
              </SortTh>
              <SortTh column="load_qty_mt" align="right" sort={sort} onSort={sortBy}>
                Loaded (MT)
              </SortTh>
              <SortTh column="unload_qty_mt" align="right" sort={sort} onSort={sortBy}>
                Unloaded (MT)
              </SortTh>
              <SortTh column="shortage_mt" align="right" sort={sort} onSort={sortBy}>
                Short (MT)
              </SortTh>
              <SortTh column="allowed_mt" align="right" sort={sort} onSort={sortBy}>
                Allowed (MT)
              </SortTh>
              <SortTh column="deducted_mt" align="right" sort={sort} onSort={sortBy}>
                Deducted (MT)
              </SortTh>
              <SortTh column="deduction_amount" align="right" sort={sort} onSort={sortBy}>
                Deduction (₹)
              </SortTh>
              <SortTh column="transporter" sort={sort} onSort={sortBy}>
                Transporter
              </SortTh>
              <SortTh column="vehicle_number" sort={sort} onSort={sortBy}>
                Vehicle
              </SortTh>
              <SortTh column="bilty_number" sort={sort} onSort={sortBy}>
                Bilty
              </SortTh>
              <SortTh column="grpo_number" sort={sort} onSort={sortBy}>
                GRPO
              </SortTh>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={COLUMNS} message="Loading the shortages…" />
            ) : isError ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={AlertTriangle}
                message="The shortages could not be loaded"
                hint={getErrorMessage(error, 'Try again in a moment.')}
              />
            ) : shown.length === 0 ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={Scale}
                message={search ? 'No shortage matches that search' : 'No shortages recorded'}
                hint={search ? undefined : 'Every lot so far weighed in at what it was loaded at.'}
              />
            ) : (
              shown.map((s) => (
                <tr
                  key={s.id}
                  className={cn(ROW_CLASSES, s.lot && canOpenLot && 'cursor-pointer')}
                  onClick={() => s.lot && canOpenLot && navigate(`/exim/lots/${s.lot}`)}
                >
                  <Td className="whitespace-nowrap">{formatDay(new Date(s.created_at))}</Td>
                  <Td>{s.lot ? <LotLink id={s.lot} canOpen={canOpenLot} /> : '—'}</Td>
                  <Td>
                    <span className="block whitespace-nowrap font-medium">{s.supplier || '—'}</span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {s.supplier_code}
                    </span>
                  </Td>
                  <Td>
                    <span className="block whitespace-nowrap">{s.item_name || '—'}</span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {s.item_code}
                    </span>
                  </Td>
                  <Td numeric>{fmtQty(s.load_qty_mt)}</Td>
                  <Td numeric>{fmtQty(s.unload_qty_mt)}</Td>
                  {/* EXIM wrote a line for any change in weight: one that came in
                      heavier than it left is a gain, and nothing is deducted. */}
                  {Number(s.shortage_mt) < 0 ? (
                    <Td
                      numeric
                      className="whitespace-nowrap font-medium text-emerald-700 dark:text-emerald-400"
                      title="Came in heavier than it was loaded"
                    >
                      +{fmtQty(-Number(s.shortage_mt))} gained
                    </Td>
                  ) : (
                    <Td numeric className="font-medium text-rose-600 dark:text-rose-400">
                      {fmtQty(s.shortage_mt)}
                    </Td>
                  )}
                  <Td numeric>{fmtQty(s.allowed_mt)}</Td>
                  <Td numeric className="font-medium text-amber-700 dark:text-amber-400">
                    {fmtQty(s.deducted_mt)}
                  </Td>
                  <Td numeric className="whitespace-nowrap font-semibold">
                    {fmtMoney(s.deduction_amount)}
                  </Td>
                  <Td className="whitespace-nowrap">{s.transporter || '—'}</Td>
                  <Td className="whitespace-nowrap font-mono">{s.vehicle_number || '—'}</Td>
                  <Td className="whitespace-nowrap">{s.bilty_number || '—'}</Td>
                  <Td className="whitespace-nowrap">{s.grpo_number || '—'}</Td>
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
    </div>
  );
}
