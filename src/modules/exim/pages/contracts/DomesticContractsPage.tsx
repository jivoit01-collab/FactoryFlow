/**
 * Domestic Contracts: every oil bought in rupees on an SAP purchase order, with
 * what has come in against it and what each tonne cost to bring in.
 *
 * Read live: the contract is SAP's PO, a truck received is its GRPO, a truck
 * not received yet is the factory gate's entry. Only the delivery terms,
 * freight and brokerage are kept here, one set per PO, on the PO's own page.
 *
 * A financial year (April to March, by PO date) or every contract still open,
 * whatever its year. The scope and the filters live in the URL, so a narrowed
 * register is a link somebody can send, and Back from a PO returns to it.
 */
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarRange,
  FileDown,
  FileText,
  Hourglass,
  IndianRupee,
  PackageCheck,
  RefreshCw,
  Scale,
  Search,
  Truck,
} from 'lucide-react';
import { type ReactNode, useId, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
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
import { Button, Input, NativeSelect, SelectOption } from '@/shared/components/ui';
import { cn, formatDay, getErrorMessage } from '@/shared/utils';

import { type ContractScope, useContracts } from '../../api';
import {
  ContractStagePill,
  PoLink,
  ReceivedProgress,
  TermsCell,
} from '../../components/contracts/ContractBits';
import { exportContracts } from '../../components/contracts/contractExcel';
import {
  contractPath,
  currentFinancialYear,
  financialYears,
  fyLabel,
  landedOf,
  leavesOutFreight,
  STAGE_LABEL,
  STAGE_ORDER,
  STAGES,
  sumContracts,
  unitLabel,
} from '../../components/contracts/contractFormat';
import { fmtRupeesShort } from '../../components/lots/lotFormat';
import type { ContractStage, OilContract } from '../../types';
import { fmtMoney, fmtQty } from '../../utils';

type SortKey =
  | 'po_number'
  | 'vendor_name'
  | 'item_name'
  | 'quantity'
  | 'value'
  | 'received'
  | 'at_gate'
  | 'to_come'
  | 'landed_per_mt'
  | 'stage';

const TEXT: SortKey[] = ['vendor_name', 'item_name'];

/** The terms filter in the URL: `none` stands for a PO nobody has set terms on. */
type TermsFilter = 'FOR' | 'EXW' | 'none';

const TERMS_FILTERS: { value: TermsFilter; label: string }[] = [
  { value: 'FOR', label: 'FOR: supplier delivers' },
  { value: 'EXW', label: 'EXW: we collect' },
  { value: 'none', label: 'Terms not set' },
];

const FILTER_KEYS = ['vendor', 'oil', 'stage', 'terms', 'q'] as const;

const COLUMNS = 11;

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

function sortValue(c: OilContract, key: SortKey): number | string {
  if (key === 'po_number') return Number(c.po_number) || 0;
  if (key === 'stage') return STAGE_ORDER[c.stage];
  if (key === 'landed_per_mt') return landedOf(c).value ?? 0;
  if (TEXT.includes(key)) return String(c[key as 'vendor_name' | 'item_name'] ?? '');
  return Number(c[key as 'quantity' | 'value' | 'received' | 'at_gate' | 'to_come'] ?? 0);
}

function searchText(c: OilContract) {
  return [c.po_number, c.vendor_name, c.vendor_code, c.item_name, c.item_code]
    .join(' ')
    .toLowerCase();
}

function termsKey(c: OilContract): TermsFilter {
  return c.terms.delivery_terms || 'none';
}

function isStage(value: string | null): value is ContractStage {
  return !!value && value in STAGE_LABEL;
}

function isTermsFilter(value: string | null): value is TermsFilter {
  return value === 'FOR' || value === 'EXW' || value === 'none';
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
}

/** `2026-04-01` reads `1 April 2026`. */
function longDay(iso: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DomesticContractsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const canSetTerms = usePermission().hasPermission(EXIM_PERMISSIONS.CONTRACT_CHANGE);
  const baseId = useId();
  const ids = {
    year: `${baseId}-year`,
    search: `${baseId}-search`,
    vendor: `${baseId}-vendor`,
    oil: `${baseId}-oil`,
    stage: `${baseId}-stage`,
    terms: `${baseId}-terms`,
  };

  const [params, setParams] = useSearchParams();
  const years = financialYears();
  const thisYear = currentFinancialYear();
  const openView = params.get('open') === '1';
  const askedYear = Number(params.get('year'));
  const year = years.includes(askedYear) ? askedYear : thisYear;
  const scope: ContractScope = openView ? { open: true } : { year };

  const vendor = params.get('vendor') ?? '';
  const oil = params.get('oil') ?? '';
  const stageParam = params.get('stage');
  const stage = isStage(stageParam) ? stageParam : '';
  const termsParam = params.get('terms');
  const terms = isTermsFilter(termsParam) ? termsParam : '';
  const search = params.get('q') ?? '';

  const { data, isLoading, isFetching, isError, error, isPlaceholderData, refetch } =
    useContracts(scope);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  function writeParams(update: (next: URLSearchParams) => void) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        update(next);
        return next;
      },
      { replace: true },
    );
    setPage(1);
  }

  function setParam(key: string, value: string) {
    writeParams((next) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
  }

  function pickYear(value: number) {
    writeParams((next) => {
      next.delete('open');
      if (value === thisYear) next.delete('year');
      else next.set('year', String(value));
    });
  }

  function pickOpen() {
    writeParams((next) => {
      next.delete('year');
      next.set('open', '1');
    });
  }

  function resetFilters() {
    writeParams((next) => FILTER_KEYS.forEach((key) => next.delete(key)));
  }

  // The hook keeps the last scope's contracts while another loads; they are
  // not shown under the new scope's name.
  const loadingScope = isLoading || isPlaceholderData;
  const contracts = useMemo(
    () => (isError || isPlaceholderData ? [] : (data?.contracts ?? [])),
    [data, isError, isPlaceholderData],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const found = contracts.filter(
      (c) =>
        (!vendor || c.vendor_code === vendor) &&
        (!oil || c.item_code === oil) &&
        (!stage || c.stage === stage) &&
        (!terms || termsKey(c) === terms) &&
        (!term || searchText(c).includes(term)),
    );
    if (!sortKey) return found;
    return [...found].sort((a, b) => {
      const x = sortValue(a, sortKey);
      const y = sortValue(b, sortKey);
      const cmp =
        typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [contracts, vendor, oil, stage, terms, search, sortKey, sortDir]);

  const filtered = !!(vendor || oil || stage || terms || search.trim());
  const allTotals = data && !isError && !isPlaceholderData ? data.totals : undefined;
  const totals = allTotals && filtered ? sumContracts(rows) : allTotals;

  const vendorChoices = useMemo(() => {
    const names = new Map<string, string>();
    for (const c of contracts)
      if (!names.has(c.vendor_code)) names.set(c.vendor_code, c.vendor_name);
    if (vendor && !names.has(vendor)) names.set(vendor, '');
    return [...names]
      .map(([code, name]) => ({ code, label: name ? `${name} · ${code}` : code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [contracts, vendor]);

  const oilChoices = useMemo(() => {
    const names = new Map<string, string>();
    for (const c of contracts) if (!names.has(c.item_code)) names.set(c.item_code, c.item_name);
    if (oil && !names.has(oil)) names.set(oil, '');
    return [...names]
      .map(([code, name]) => ({ code, label: name ? `${name} · ${code}` : code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [contracts, oil]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);
  const sort = { key: sortKey, dir: sortDir };
  const noTerms = rows.filter(leavesOutFreight).length;
  const scopeLabel = openView ? 'Still open' : fyLabel(year);

  function sortBy(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  function download() {
    exportContracts(rows, openView ? 'open' : fyLabel(year).replace('–', '-'));
    toast.success(`${plural(rows.length, 'contract')} downloading`);
  }

  function openPo(c: OilContract) {
    navigate(contractPath(c.po_number), { state: { back: location.search } });
  }

  const scopeNote = openView
    ? 'Every PO SAP still has open, whatever year it was raised in.'
    : data?.from && data?.to && data.year === year
      ? `POs dated ${longDay(data.from)} to ${longDay(data.to)}.`
      : `POs dated 1 April ${year} to 31 March ${year + 1}.`;

  const dash = '—';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Domestic Contracts"
        icon={FileText}
        accent="teal"
      >
        <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={cn('mr-1.5 h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
        <Button
          variant="outline"
          onClick={download}
          disabled={loadingScope || isError || rows.length === 0}
        >
          <FileDown className="mr-1.5 h-4 w-4" />
          Download Excel
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border bg-card p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => pickYear(year)}
            aria-pressed={!openView}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              !openView
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            Financial year
          </button>
          <button
            type="button"
            onClick={pickOpen}
            aria-pressed={openView}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              openView
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Hourglass className="h-3.5 w-3.5" />
            Still open
          </button>
        </div>
        {!openView && (
          <NativeSelect
            id={ids.year}
            aria-label="Financial year"
            value={year}
            onChange={(event) => pickYear(Number(event.target.value))}
            className="w-full sm:w-44"
          >
            {years.map((y) => (
              <SelectOption key={y} value={y}>
                {`${fyLabel(y)}${y === thisYear ? ' (this year)' : ''}`}
              </SelectOption>
            ))}
          </NativeSelect>
        )}
        <p className="text-sm text-muted-foreground">{scopeNote}</p>
      </div>

      <StatTileRow>
        <StatTile
          label={filtered ? 'Matching contracts' : 'Contracts'}
          value={totals ? totals.contracts.toLocaleString('en-IN') : dash}
          sub={
            totals
              ? `${totals.open.toLocaleString('en-IN')} still open${
                  filtered && allTotals
                    ? ` · of ${allTotals.contracts.toLocaleString('en-IN')}`
                    : ''
                }`
              : undefined
          }
          icon={FileText}
          accent="teal"
        />
        <StatTile
          label="Contracted"
          value={totals ? fmtQty(totals.contracted_mt) : dash}
          sub={totals ? `MT · ${fmtRupeesShort(totals.value)}` : 'MT'}
          icon={Scale}
          accent="indigo"
        />
        <StatTile
          label="Received"
          value={totals ? fmtQty(totals.received_mt) : dash}
          sub="MT weighed in, on SAP GRPOs"
          icon={PackageCheck}
          accent="emerald"
        />
        <StatTile
          label="At the gate"
          value={totals ? fmtQty(totals.at_gate_mt) : dash}
          sub={
            totals
              ? `MT · ${plural(totals.trucks_at_gate, 'truck')} not in SAP yet`
              : 'MT not in SAP yet'
          }
          icon={Truck}
          accent="amber"
        />
        <StatTile
          label="Still to come"
          value={totals ? fmtQty(totals.to_come_mt) : dash}
          sub="MT open, not at the gate"
          icon={Hourglass}
          accent="sky"
        />
        <StatTile
          label="Landed cost"
          value={totals?.landed_per_mt != null ? `₹ ${fmtMoney(totals.landed_per_mt)}` : dash}
          sub={
            totals?.landed_per_litre != null
              ? `per MT · ₹ ${fmtMoney(totals.landed_per_litre)} per litre`
              : 'per MT, over what has come in'
          }
          icon={IndianRupee}
          accent="violet"
        />
        <StatTile
          label="Shortage deductions"
          value={totals ? `₹ ${fmtMoney(totals.deduction_amount)}` : dash}
          sub="to recover from suppliers"
          icon={AlertTriangle}
          accent={totals && totals.deduction_amount > 0 ? 'rose' : 'slate'}
        />
      </StatTileRow>

      {noTerms > 0 && !loadingScope && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {noTerms === 1
              ? '1 contract with trucks in has no delivery terms set, so its landed cost'
              : `${noTerms} contracts with trucks in have no delivery terms set, so their landed cost`}{' '}
            — and the average above — leaves out freight.
            {canSetTerms ? ' Set them on the PO’s page.' : ''}
          </span>
        </p>
      )}

      <FilterBar
        isFetching={isFetching && !isLoading}
        activeCount={[vendor, oil, stage, terms, search.trim()].filter(Boolean).length}
        onReset={filtered ? resetFilters : undefined}
      >
        <FilterField label="Search" htmlFor={ids.search} className="sm:w-64">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={ids.search}
              value={search}
              onChange={(event) => setParam('q', event.target.value)}
              placeholder="PO number, vendor, oil…"
              className="h-9 w-full pl-8"
            />
          </div>
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
        <FilterField label="Oil" htmlFor={ids.oil} className="sm:w-56">
          <NativeSelect
            id={ids.oil}
            value={oil}
            onChange={(event) => setParam('oil', event.target.value)}
          >
            <SelectOption value="">All oils</SelectOption>
            {oilChoices.map((choice) => (
              <SelectOption key={choice.code} value={choice.code}>
                {choice.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Stage" htmlFor={ids.stage} className="sm:w-44">
          <NativeSelect
            id={ids.stage}
            value={stage}
            onChange={(event) => setParam('stage', event.target.value)}
          >
            <SelectOption value="">All stages</SelectOption>
            {STAGES.map((s) => (
              <SelectOption key={s} value={s}>
                {STAGE_LABEL[s]}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Delivery terms" htmlFor={ids.terms} className="sm:w-48">
          <NativeSelect
            id={ids.terms}
            value={terms}
            onChange={(event) => setParam('terms', event.target.value)}
          >
            <SelectOption value="">Any terms</SelectOption>
            {TERMS_FILTERS.map((t) => (
              <SelectOption key={t.value} value={t.value}>
                {t.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </FilterField>
      </FilterBar>

      <TableCard
        summary={
          <span>
            <span className="font-semibold text-foreground">{scopeLabel}</span>
            {loadingScope
              ? ' · reading SAP…'
              : ` · ${plural(rows.length, 'contract')}${
                  filtered ? ` of ${contracts.length.toLocaleString('en-IN')}` : ''
                }`}
            {isFetching && !loadingScope ? ' · refreshing…' : ''}
          </span>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <SortTh column="po_number" sort={sort} onSort={sortBy}>
                PO
              </SortTh>
              <SortTh column="vendor_name" sort={sort} onSort={sortBy}>
                Vendor
              </SortTh>
              <SortTh column="item_name" sort={sort} onSort={sortBy}>
                Oil
              </SortTh>
              <SortTh column="quantity" align="right" sort={sort} onSort={sortBy}>
                Quantity @ rate
              </SortTh>
              <SortTh column="value" align="right" sort={sort} onSort={sortBy}>
                Value (₹)
              </SortTh>
              <SortTh column="received" align="right" sort={sort} onSort={sortBy}>
                Received
              </SortTh>
              <SortTh column="at_gate" align="right" sort={sort} onSort={sortBy}>
                At the gate
              </SortTh>
              <SortTh column="to_come" align="right" sort={sort} onSort={sortBy}>
                To come
              </SortTh>
              <Th>Terms</Th>
              <SortTh column="landed_per_mt" align="right" sort={sort} onSort={sortBy}>
                Landed
              </SortTh>
              <SortTh column="stage" sort={sort} onSort={sortBy}>
                Stage
              </SortTh>
            </tr>
          </thead>
          <tbody>
            {loadingScope ? (
              <TableLoading colSpan={COLUMNS} message="Reading the contracts from SAP…" />
            ) : isError ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={AlertTriangle}
                message="The contracts could not be read"
                hint={getErrorMessage(error, 'Try Refresh in a moment.')}
              />
            ) : shown.length === 0 ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={FileText}
                message={
                  filtered
                    ? 'No contract matches'
                    : openView
                      ? 'No contract is open'
                      : `No oil was bought on a domestic PO in ${fyLabel(year)}`
                }
                hint={filtered ? 'Try another vendor, oil, stage or terms, or Reset.' : undefined}
              />
            ) : (
              shown.map((c) => {
                const unit = unitLabel(c.unit);
                const landed = landedOf(c);
                return (
                  <tr
                    key={`${c.po_number}-${c.item_code}`}
                    className={cn(ROW_CLASSES, 'cursor-pointer align-top')}
                    onClick={() => openPo(c)}
                  >
                    <Td>
                      <PoLink poNumber={c.po_number} />
                      <span className="block whitespace-nowrap text-xs text-muted-foreground">
                        {formatDay(c.po_date)}
                      </span>
                    </Td>
                    <Td className="min-w-48">
                      <span className="block font-medium">{c.vendor_name || '—'}</span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {c.vendor_code}
                      </span>
                    </Td>
                    <Td className="min-w-40">
                      <span className="block">{c.item_name || '—'}</span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {c.item_code}
                      </span>
                    </Td>
                    <Td numeric>
                      <span className="block whitespace-nowrap font-medium">
                        {fmtQty(c.quantity)} {unit}
                      </span>
                      <span className="block whitespace-nowrap text-xs text-muted-foreground">
                        @ ₹ {fmtMoney(c.rate)}/{unit}
                      </span>
                    </Td>
                    <Td numeric className="whitespace-nowrap">
                      {fmtMoney(c.value)}
                    </Td>
                    <Td numeric>
                      <ReceivedProgress
                        received={c.received}
                        atGate={c.at_gate}
                        quantity={c.quantity}
                        trucks={c.trucks_received}
                      />
                    </Td>
                    <Td numeric>
                      {c.trucks_at_gate > 0 ? (
                        <>
                          <span className="block whitespace-nowrap font-medium text-amber-700 dark:text-amber-400">
                            {fmtQty(c.at_gate)}
                          </span>
                          <span className="block whitespace-nowrap text-xs text-muted-foreground">
                            {plural(c.trucks_at_gate, 'truck')}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td numeric className="whitespace-nowrap">
                      {c.stage === 'COMPLETE' || !(c.to_come > 0) ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        fmtQty(c.to_come)
                      )}
                    </Td>
                    <Td>
                      <TermsCell terms={c.terms} />
                    </Td>
                    <Td numeric>
                      {landed.value !== null ? (
                        <>
                          <span className="block whitespace-nowrap font-medium">
                            ₹ {fmtMoney(landed.value)}/{landed.per}
                          </span>
                          <span className="block whitespace-nowrap text-xs text-muted-foreground">
                            {c.landed_per_litre !== null
                              ? `₹ ${fmtMoney(c.landed_per_litre)}/L`
                              : ''}
                          </span>
                          {leavesOutFreight(c) && (
                            <span className="block whitespace-nowrap text-xs text-amber-700 dark:text-amber-400">
                              excludes freight
                            </span>
                          )}
                        </>
                      ) : (
                        <span
                          className="whitespace-nowrap text-muted-foreground"
                          title="Nothing received yet"
                        >
                          —
                        </span>
                      )}
                    </Td>
                    <Td>
                      <ContractStagePill stage={c.stage} />
                    </Td>
                  </tr>
                );
              })
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
        Received is what was weighed in, on SAP&apos;s GRPOs; at the gate, what the gate has booked
        that SAP has not received yet, at the quantity billed. The landed cost is the
        supplier&apos;s bill plus freight and brokerage, over the tonnes weighed in. The supplier
        bears any transit shortage past 0.25% of what was loaded.
      </p>
    </div>
  );
}
