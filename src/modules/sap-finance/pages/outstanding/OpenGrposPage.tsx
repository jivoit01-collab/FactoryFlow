/**
 * Open GRPOs — goods received against a purchase order and not billed yet,
 * oldest first: the vendor's bill is owed to accounts, or it has not come.
 *
 * EXIM's Open GRPOs, with each GRPO once (EXIM listed a GRPO once per line,
 * so a ten-line receipt counted ten times) and the warehouses it went into
 * beside it. Days open count from the day the goods were received; past six
 * the receipt is late, as EXIM had it.
 *
 * Filters live in the address.
 */
import {
  Boxes,
  CalendarClock,
  Hash,
  Hourglass,
  IndianRupee,
  PackageOpen,
  Search,
  Users,
} from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
} from '@/shared/components/page';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Input, NativeSelect, SelectOption, Switch } from '@/shared/components/ui';
import { cn, formatDay, formatNumber } from '@/shared/utils';

import { type OpenGrpo, useOpenGrpos, useRefreshOpenGrpos } from '../../api';
import {
  CompanyPill,
  ExcelButton,
  PartyCell,
  RefreshButton,
  SapReadError,
  SortTh,
  StaleNotice,
  TransportCell,
} from '../../components/outstanding/OutstandingBits';
import {
  compareValues,
  hasTransport,
  type SortState,
  transportColumns,
  useCompanyName,
  useLedgerPath,
  useUrlFilters,
} from '../../components/outstanding/outstandingSupport';
import {
  count,
  downloadSheet,
  grpoDaysTone,
  plural,
  readAtLabel,
  rupees,
  rupeesShort,
  sheetDay,
  slug,
} from '../../utils/outstanding';

type SortKey = 'doc_num' | 'days_open' | 'card_name' | 'lines' | 'user' | 'total';

const FILTER_KEYS = ['q', 'warehouse', 'rm'] as const;

/** Past this many days a receipt still unbilled is late (EXIM's line). */
const LATE_DAYS = 6;

function sortValue(row: OpenGrpo, key: SortKey): string | number | null {
  if (key === 'doc_num') return Number(row.doc_num) || row.doc_num;
  if (key === 'days_open') return row.days_open;
  if (key === 'lines') return row.lines;
  if (key === 'total') return row.total;
  return row[key] || null;
}

function searchText(row: OpenGrpo): string {
  return [
    row.doc_num,
    row.party_ref,
    row.card_code,
    row.card_name,
    row.user,
    row.vehicle_number,
    row.transporter,
    row.bilty_number,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function summarise(rows: OpenGrpo[]) {
  const days = rows.map((r) => r.days_open).filter((d): d is number => d !== null);
  return {
    count: rows.length,
    value: rows.reduce((sum, r) => sum + r.total, 0),
    vendors: new Set(rows.map((r) => r.card_code)).size,
    average: days.length ? days.reduce((a, b) => a + b, 0) / days.length : null,
    oldest: days.length ? Math.max(...days) : null,
    late: days.filter((d) => d > LATE_DAYS).length,
  };
}

export default function OpenGrposPage() {
  const ids = useId();
  const ledgerPath = useLedgerPath();
  const companyName = useCompanyName();

  const [params, setParams] = useUrlFilters();
  const search = params.get('q') ?? '';
  const warehouse = params.get('warehouse') ?? '';
  const rawMaterial = params.get('rm') === '1';

  const query = useOpenGrpos(rawMaterial);
  const refresh = useRefreshOpenGrpos();
  // A switch of the raw-material filter shows the last list until the new one
  // is read; it is not counted under the new filter's name.
  const data = query.isPlaceholderData ? undefined : query.data;

  const [sort, setSort] = useState<SortState<SortKey>>({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const all = useMemo(() => data?.rows ?? [], [data]);
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const found = all.filter(
      (row) =>
        (!warehouse || row.warehouses.includes(warehouse)) &&
        (!term || searchText(row).includes(term)),
    );
    const { key, dir } = sort;
    if (!key) return found; // oldest first, as SAP sent them
    return [...found].sort((a, b) => compareValues(sortValue(a, key), sortValue(b, key), dir));
  }, [all, search, warehouse, sort]);

  const filtered = !!(search.trim() || warehouse);
  const totals = useMemo(() => summarise(rows), [rows]);
  const transport = hasTransport(all);
  const columns = transport ? 9 : 8;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const shown = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const ready = !!data;

  function setFilter(changes: Record<string, string | null>) {
    setParams(changes);
    setPage(1);
  }

  function sortBy(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'days_open' || key === 'total' ? 'desc' : 'asc' },
    );
    setPage(1);
  }

  function doRefresh() {
    refresh.mutate(rawMaterial, {
      onSuccess: () => toast.success('Open GRPOs read from SAP'),
    });
  }

  function download() {
    downloadSheet(
      rows.map((row) => ({
        GRPO: row.doc_num,
        Date: sheetDay(row.doc_date),
        'Days open': row.days_open,
        'Vendor code': row.card_code,
        Vendor: row.card_name,
        "Vendor's ref": row.party_ref,
        Warehouses: row.warehouses.join(', '),
        Lines: row.lines,
        'Raw material': row.raw_material ? 'Yes' : '',
        'Entered by': row.user,
        'Total (₹)': row.total,
        'Document currency': row.currency,
        ...transportColumns(row, transport),
      })),
      'Open GRPOs',
      [slug(companyName), 'open-grpos'].filter(Boolean).join('-'),
    );
    toast.success(`${plural(rows.length, 'GRPO')} downloading`);
  }

  const dash = '—';

  return (
    <div className="space-y-6">
      <PageHeader title="Open GRPOs" icon={PackageOpen} accent="indigo" meta={<CompanyPill />}>
        <RefreshButton onClick={doRefresh} pending={refresh.isPending} />
        <ExcelButton onClick={download} disabled={!ready || rows.length === 0} />
      </PageHeader>

      {(refresh.isError || (query.isError && data)) && (
        <StaleNotice error={refresh.error ?? query.error} />
      )}

      {query.isError && !data ? (
        <SapReadError
          what="The open GRPOs"
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <>
          <StatTileRow>
            <StatTile
              label={filtered ? 'Matching GRPOs' : 'Open GRPOs'}
              value={ready ? count(totals.count) : dash}
              sub={
                ready
                  ? filtered
                    ? `of ${count(all.length)} not billed yet`
                    : 'received, not billed yet'
                  : undefined
              }
              icon={Hash}
              accent="indigo"
            />
            <StatTile
              label="Value"
              value={ready ? rupeesShort(totals.value) : dash}
              sub={ready ? rupees(totals.value) : undefined}
              icon={IndianRupee}
              accent="amber"
            />
            <StatTile
              label="Vendors"
              value={ready ? count(totals.vendors) : dash}
              sub="waiting on a bill"
              icon={Users}
              accent="slate"
            />
            <StatTile
              label="Average wait"
              value={
                ready && totals.average !== null ? `${formatNumber(totals.average, 1)} d` : dash
              }
              sub="days since received"
              icon={Hourglass}
              accent="sky"
            />
            <StatTile
              label="Oldest"
              value={ready && totals.oldest !== null ? `${count(totals.oldest)} d` : dash}
              sub={ready ? `${plural(totals.late, 'GRPO')} over ${LATE_DAYS} days` : undefined}
              icon={CalendarClock}
              accent={ready && totals.late > 0 ? 'rose' : 'slate'}
            />
          </StatTileRow>

          <FilterBar
            isFetching={query.isFetching && ready}
            activeCount={[search.trim(), warehouse, rawMaterial].filter(Boolean).length}
            onReset={
              filtered || rawMaterial
                ? () => setFilter(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])))
                : undefined
            }
          >
            <FilterField label="Search" htmlFor={`${ids}-q`} className="sm:w-72">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={`${ids}-q`}
                  value={search}
                  onChange={(event) => setFilter({ q: event.target.value })}
                  placeholder="GRPO, vendor, their ref, user, vehicle…"
                  className="h-9 w-full pl-8"
                />
              </div>
            </FilterField>
            <FilterField label="Warehouse" htmlFor={`${ids}-whs`} className="sm:w-48">
              <NativeSelect
                id={`${ids}-whs`}
                value={warehouse}
                onChange={(event) => setFilter({ warehouse: event.target.value })}
              >
                <SelectOption value="">All warehouses</SelectOption>
                {(data?.warehouses ?? []).map((code) => (
                  <SelectOption key={code} value={code}>
                    {code}
                  </SelectOption>
                ))}
                {warehouse && data && !data.warehouses.includes(warehouse) && (
                  <SelectOption value={warehouse}>{warehouse}</SelectOption>
                )}
              </NativeSelect>
            </FilterField>
            <FilterAction className="sm:h-9">
              <label
                htmlFor={`${ids}-rm`}
                className="flex cursor-pointer items-center gap-2 text-sm"
                title="GRPOs with at least one raw-material (RM) line"
              >
                <Switch
                  id={`${ids}-rm`}
                  checked={rawMaterial}
                  onChange={(on) => setFilter({ rm: on ? '1' : null })}
                />
                <Boxes className="h-4 w-4 text-muted-foreground" />
                Raw material only
              </label>
            </FilterAction>
          </FilterBar>

          <TableCard
            summary={
              ready ? (
                <span>
                  {plural(rows.length, 'GRPO')}
                  {filtered ? ` of ${count(all.length)}` : ''}
                  {rawMaterial ? ' with raw material' : ''}
                  {` · ${readAtLabel(data.read_at)}`}
                  {query.isFetching ? ' · loading…' : ''}
                </span>
              ) : (
                'Reading SAP…'
              )
            }
          >
            <table className={TABLE_CLASSES}>
              <thead className={THEAD_CLASSES}>
                <tr>
                  <SortTh column="doc_num" sort={sort} onSort={sortBy}>
                    GRPO
                  </SortTh>
                  <Th>Date</Th>
                  <SortTh column="days_open" sort={sort} onSort={sortBy}>
                    Days open
                  </SortTh>
                  <SortTh column="card_name" sort={sort} onSort={sortBy}>
                    Vendor
                  </SortTh>
                  <Th>Warehouses</Th>
                  <SortTh column="lines" align="right" sort={sort} onSort={sortBy}>
                    Lines
                  </SortTh>
                  <SortTh column="user" sort={sort} onSort={sortBy}>
                    Entered by
                  </SortTh>
                  <SortTh column="total" align="right" sort={sort} onSort={sortBy}>
                    Total
                  </SortTh>
                  {transport && <Th>Transport</Th>}
                </tr>
              </thead>
              <tbody>
                {!ready ? (
                  <TableLoading colSpan={columns} message="Reading the open GRPOs from SAP…" />
                ) : shown.length === 0 ? (
                  <TableEmpty
                    colSpan={columns}
                    icon={PackageOpen}
                    message={filtered ? 'No open GRPO matches' : 'Every GRPO has been billed'}
                    hint={filtered ? 'Try another search or warehouse, or Reset.' : undefined}
                  />
                ) : (
                  shown.map((row) => (
                    <tr key={row.doc_entry} className={cn(ROW_CLASSES, 'align-top')}>
                      <Td className="whitespace-nowrap">
                        <span className="block font-medium tabular-nums">{row.doc_num}</span>
                        {row.raw_material && (
                          <span className="mt-1 block">
                            <StatusPill tone="info">Raw material</StatusPill>
                          </span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap">{formatDay(row.doc_date)}</Td>
                      <Td>
                        {row.days_open === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <StatusPill tone={grpoDaysTone(row.days_open)}>
                            {plural(row.days_open, 'day')}
                          </StatusPill>
                        )}
                      </Td>
                      <Td className="min-w-56">
                        <PartyCell
                          name={row.card_name}
                          code={row.card_code}
                          to={ledgerPath('vendor', row.card_code)}
                          extra={row.party_ref ? ` · their ref ${row.party_ref}` : undefined}
                        />
                      </Td>
                      <Td className="whitespace-nowrap font-mono text-xs">
                        {row.warehouses.length ? row.warehouses.join(', ') : '—'}
                      </Td>
                      <Td numeric>{row.lines}</Td>
                      <Td className="whitespace-nowrap">{row.user || '—'}</Td>
                      <Td numeric className="whitespace-nowrap font-semibold">
                        {formatNumber(row.total, 2)}
                      </Td>
                      {transport && (
                        <Td>
                          <TransportCell row={row} />
                        </Td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {rows.length > pageSize && (
              <PaginationControls
                page={currentPage}
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
            Days open count from the day the goods were received: amber after three days, red after{' '}
            {LATE_DAYS}. Raw material is a GRPO with at least one RM line.
          </p>
        </>
      )}
    </div>
  );
}
