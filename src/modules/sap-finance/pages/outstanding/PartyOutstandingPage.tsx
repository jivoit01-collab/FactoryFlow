/**
 * Party Outstanding — every vendor or customer SAP holds a balance against,
 * with the last bill and the last payment on each account.
 *
 * EXIM's Vendor Outstanding, Dr/Cr Outstanding and Customer Outstanding, as
 * one page with a Vendors | Customers switch. EXIM read Oil for every vendor
 * sheet and Beverages for every customer one; this reads the company chosen in
 * the app. The balance is SAP's own (OCRD): Dr is owed to us, Cr owed by us.
 * A party opens its ledger — a vendor's in the General Ledger, a customer's
 * on the A/R invoices' Ledger tab — for whoever may see it.
 *
 * Side and filters live in the address, so a narrowed list is a link.
 */
import {
  ArrowDownLeft,
  ArrowUpRight,
  Droplets,
  Scale,
  Search,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  SAP_FINANCE_CUSTOMER_OUTSTANDING_ACCESS,
  SAP_FINANCE_VENDOR_OUTSTANDING_ACCESS,
} from '@/config/permissions/sap-finance.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  FilterAction,
  FilterBar,
  FilterField,
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  StatusPill,
  type StatusTone,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Input, NativeSelect, SelectOption, Switch } from '@/shared/components/ui';
import { cn, formatDay, formatNumber } from '@/shared/utils';

import {
  type PartyBalance,
  type PartyDocument,
  type PartySide,
  usePartyOutstanding,
  useRefreshPartyOutstanding,
} from '../../api';
import {
  CompanyPill,
  ExcelButton,
  PartyCell,
  RefreshButton,
  SapReadError,
  Segmented,
  SortTh,
  StaleNotice,
} from '../../components/outstanding/OutstandingBits';
import {
  compareValues,
  type SortState,
  useCompanyName,
  useLedgerPath,
  useUrlFilters,
} from '../../components/outstanding/outstandingSupport';
import {
  count,
  daysAgo,
  downloadSheet,
  drCrSide,
  paymentDaysTone,
  plural,
  readAtLabel,
  rupees,
  rupeesShort,
  sheetDay,
  slug,
} from '../../utils/outstanding';

type SortKey =
  | 'card_name'
  | 'group'
  | 'sales_employee'
  | 'balance'
  | 'days_since_bill'
  | 'days_since_payment';

type BalanceFilter = 'dr' | 'cr';

const FILTER_KEYS = ['q', 'group', 'drcr', 'oil'] as const;

function summarise(rows: PartyBalance[]) {
  let debit = 0;
  let credit = 0;
  let inDebit = 0;
  let inCredit = 0;
  for (const row of rows) {
    if (row.balance > 0) {
      debit += row.balance;
      inDebit += 1;
    } else if (row.balance < 0) {
      credit += row.balance;
      inCredit += 1;
    }
  }
  return { parties: rows.length, debit, credit, net: debit + credit, inDebit, inCredit };
}

function sortValue(row: PartyBalance, key: SortKey): string | number | null {
  if (key === 'balance') return row.balance;
  if (key === 'days_since_bill') return row.days_since_bill;
  if (key === 'days_since_payment') return row.days_since_payment;
  return row[key] || null;
}

/** Last bill or last payment: amount, number and date, and the days since. */
function LastDocument({
  doc,
  days,
  tone,
}: {
  doc: PartyDocument | null;
  days: number | null;
  tone: StatusTone;
}) {
  if (!doc) return <span className="text-muted-foreground">None</span>;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <span className="block whitespace-nowrap font-medium tabular-nums">
          {rupees(doc.total)}
        </span>
        <span className="block whitespace-nowrap text-xs text-muted-foreground">
          No. {doc.number} · {formatDay(doc.date)}
        </span>
      </div>
      {days !== null && (
        <span title={daysAgo(days)} className="mt-0.5 shrink-0">
          <StatusPill tone={tone}>{count(days)} d</StatusPill>
        </span>
      )}
    </div>
  );
}

export default function PartyOutstandingPage() {
  const navigate = useNavigate();
  const ids = useId();
  const { hasAnyPermission } = usePermission();
  const canVendors = hasAnyPermission(SAP_FINANCE_VENDOR_OUTSTANDING_ACCESS);
  const canCustomers = hasAnyPermission(SAP_FINANCE_CUSTOMER_OUTSTANDING_ACCESS);
  const ledgerPath = useLedgerPath();
  const companyName = useCompanyName();

  const [params, setParams] = useUrlFilters();
  const side: PartySide =
    params.get('side') === 'customer' && canCustomers
      ? 'customer'
      : canVendors
        ? 'vendor'
        : 'customer';
  const vendors = side === 'vendor';
  const oilOnly = vendors && params.get('oil') === '1';
  const search = params.get('q') ?? '';
  const group = params.get('group') ?? '';
  const balanceParam = params.get('drcr');
  const balanceFilter: BalanceFilter | '' =
    balanceParam === 'dr' || balanceParam === 'cr' ? balanceParam : '';

  const query = usePartyOutstanding(side, oilOnly);
  const refresh = useRefreshPartyOutstanding();
  const data = query.data;

  const [sort, setSort] = useState<SortState<SortKey>>({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const all = useMemo(() => data?.rows ?? [], [data]);
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const found = all.filter(
      (row) =>
        (!group || row.group === group) &&
        (!balanceFilter || (balanceFilter === 'dr' ? row.balance > 0 : row.balance < 0)) &&
        (!term ||
          `${row.card_code} ${row.card_name} ${row.sales_employee}`.toLowerCase().includes(term)),
    );
    const { key, dir } = sort;
    if (!key) return found; // SAP's order: largest balance either way first
    return [...found].sort((a, b) => compareValues(sortValue(a, key), sortValue(b, key), dir));
  }, [all, search, group, balanceFilter, sort]);

  const filtered = !!(search.trim() || group || balanceFilter);
  const totals = useMemo(() => summarise(rows), [rows]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const shown = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const partyWord = vendors ? 'vendor' : 'customer';
  const columns = vendors ? 5 : 6;

  function setFilter(changes: Record<string, string | null>) {
    setParams(changes);
    setPage(1);
  }

  function pickSide(next: PartySide) {
    if (next === side) return;
    // Groups differ between vendors and customers; start the other side clean.
    setParams({
      side: next === 'vendor' ? null : next,
      q: null,
      group: null,
      drcr: null,
      oil: null,
    });
    setSort({ key: null, dir: 'asc' });
    setPage(1);
    refresh.reset();
  }

  function sortBy(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'balance' ? 'desc' : 'asc' },
    );
    setPage(1);
  }

  function doRefresh() {
    refresh.mutate(
      { side, oilSuppliers: oilOnly },
      {
        onSuccess: () => toast.success(`${vendors ? 'Vendor' : 'Customer'} balances read from SAP`),
      },
    );
  }

  function download() {
    downloadSheet(
      rows.map((row) => ({
        Code: row.card_code,
        Name: row.card_name,
        Group: row.group,
        ...(vendors ? {} : { 'Sales employee': row.sales_employee }),
        'Balance (₹)': Math.abs(row.balance),
        'Dr/Cr': drCrSide(row.balance),
        'Last bill no.': row.last_bill?.number ?? '',
        'Last bill date': sheetDay(row.last_bill?.date),
        'Last bill (₹)': row.last_bill?.total ?? null,
        'Days since bill': row.days_since_bill,
        'Last payment no.': row.last_payment?.number ?? '',
        'Last payment date': sheetDay(row.last_payment?.date),
        'Last payment (₹)': row.last_payment?.total ?? null,
        'Days since payment': row.days_since_payment,
      })),
      vendors ? 'Vendor outstanding' : 'Customer outstanding',
      [slug(companyName), `${partyWord}-outstanding`].filter(Boolean).join('-'),
    );
    toast.success(`${plural(rows.length, partyWord)} downloading`);
  }

  const dash = '—';
  const ready = !!data && !query.isLoading;
  const net = totals.net;

  return (
    <div className="space-y-6">
      <PageHeader title="Party Outstanding" icon={Scale} accent="indigo" meta={<CompanyPill />}>
        <RefreshButton onClick={doRefresh} pending={refresh.isPending} />
        <ExcelButton onClick={download} disabled={!ready || rows.length === 0} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        {canVendors && canCustomers && (
          <Segmented<PartySide>
            label="Whose balances"
            value={side}
            onChange={pickSide}
            options={[
              { value: 'vendor', label: 'Vendors', icon: Truck },
              { value: 'customer', label: 'Customers', icon: ShoppingCart },
            ]}
          />
        )}
        <p className="text-sm text-muted-foreground">
          {data ? readAtLabel(data.read_at) : query.isLoading ? 'Reading SAP…' : ''}
          {query.isFetching && !query.isLoading ? ' · refreshing…' : ''}
        </p>
      </div>

      {(refresh.isError || (query.isError && data)) && (
        <StaleNotice error={refresh.error ?? query.error} />
      )}

      {query.isError && !data ? (
        <SapReadError
          what={vendors ? 'Vendor balances' : 'Customer balances'}
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <>
          <StatTileRow>
            <StatTile
              label={filtered ? `Matching ${partyWord}s` : `${vendors ? 'Vendors' : 'Customers'}`}
              value={ready ? count(totals.parties) : dash}
              sub={
                ready
                  ? filtered
                    ? `of ${count(all.length)} with a balance`
                    : 'with a balance in SAP'
                  : undefined
              }
              icon={Users}
              accent="indigo"
            />
            <StatTile
              label="Owed to us (Dr)"
              value={ready ? rupeesShort(totals.debit) : dash}
              sub={
                ready ? `${rupees(totals.debit)} · ${plural(totals.inDebit, partyWord)}` : undefined
              }
              icon={ArrowDownLeft}
              accent="emerald"
            />
            <StatTile
              label="Owed by us (Cr)"
              value={ready ? rupeesShort(-totals.credit) : dash}
              sub={
                ready
                  ? `${rupees(-totals.credit)} · ${plural(totals.inCredit, partyWord)}`
                  : undefined
              }
              icon={ArrowUpRight}
              accent="amber"
            />
            <StatTile
              label="Net"
              value={ready ? `${rupeesShort(Math.abs(net))} ${drCrSide(net)}`.trim() : dash}
              sub={
                ready
                  ? net > 0
                    ? 'owed to us, on balance'
                    : net < 0
                      ? 'owed by us, on balance'
                      : 'square'
                  : undefined
              }
              icon={Scale}
              accent="slate"
            />
          </StatTileRow>

          <FilterBar
            isFetching={query.isFetching && !query.isLoading}
            activeCount={[search.trim(), group, balanceFilter, oilOnly].filter(Boolean).length}
            onReset={
              filtered || oilOnly
                ? () => setFilter(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])))
                : undefined
            }
          >
            <FilterField label="Search" htmlFor={`${ids}-q`} className="sm:w-64">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={`${ids}-q`}
                  value={search}
                  onChange={(event) => setFilter({ q: event.target.value })}
                  placeholder={vendors ? 'Vendor name or code…' : 'Customer, code or salesperson…'}
                  className="h-9 w-full pl-8"
                />
              </div>
            </FilterField>
            <FilterField label="Group" htmlFor={`${ids}-group`} className="sm:w-56">
              <NativeSelect
                id={`${ids}-group`}
                value={group}
                onChange={(event) => setFilter({ group: event.target.value })}
              >
                <SelectOption value="">All groups</SelectOption>
                {(data?.groups ?? []).map((name) => (
                  <SelectOption key={name} value={name}>
                    {name}
                  </SelectOption>
                ))}
                {group && data && !data.groups.includes(group) && (
                  <SelectOption value={group}>{group}</SelectOption>
                )}
              </NativeSelect>
            </FilterField>
            <FilterField label="Balance" htmlFor={`${ids}-drcr`} className="sm:w-52">
              <NativeSelect
                id={`${ids}-drcr`}
                value={balanceFilter}
                onChange={(event) => setFilter({ drcr: event.target.value })}
              >
                <SelectOption value="">Dr and Cr</SelectOption>
                <SelectOption value="dr">Dr: owed to us</SelectOption>
                <SelectOption value="cr">Cr: owed by us</SelectOption>
              </NativeSelect>
            </FilterField>
            {vendors && (
              <FilterAction className="sm:h-9">
                <label
                  htmlFor={`${ids}-oil`}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                  title="Vendors with a purchase order for a raw-material oil"
                >
                  <Switch
                    id={`${ids}-oil`}
                    checked={oilOnly}
                    onChange={(on) => setFilter({ oil: on ? '1' : null })}
                  />
                  <Droplets className="h-4 w-4 text-muted-foreground" />
                  Oil suppliers only
                </label>
              </FilterAction>
            )}
          </FilterBar>

          <TableCard
            summary={
              ready ? (
                <span>
                  {plural(rows.length, partyWord)}
                  {filtered ? ` of ${count(all.length)}` : ''}
                  {oilOnly ? ' · oil suppliers' : ''}
                </span>
              ) : (
                'Reading SAP…'
              )
            }
          >
            <table className={TABLE_CLASSES}>
              <thead className={THEAD_CLASSES}>
                <tr>
                  <SortTh column="card_name" sort={sort} onSort={sortBy}>
                    {vendors ? 'Vendor' : 'Customer'}
                  </SortTh>
                  <SortTh column="group" sort={sort} onSort={sortBy}>
                    Group
                  </SortTh>
                  {!vendors && (
                    <SortTh column="sales_employee" sort={sort} onSort={sortBy}>
                      Sales employee
                    </SortTh>
                  )}
                  <SortTh
                    column="balance"
                    align="right"
                    sort={sort}
                    onSort={sortBy}
                    title="SAP's balance: Dr is owed to us, Cr owed by us"
                  >
                    Balance
                  </SortTh>
                  <SortTh
                    column="days_since_bill"
                    sort={sort}
                    onSort={sortBy}
                    title="Sorted by days since the bill"
                  >
                    Last bill
                  </SortTh>
                  <SortTh
                    column="days_since_payment"
                    sort={sort}
                    onSort={sortBy}
                    title="Sorted by days since the payment"
                  >
                    Last payment
                  </SortTh>
                </tr>
              </thead>
              <tbody>
                {!ready ? (
                  <TableLoading
                    colSpan={columns}
                    message={`Reading ${partyWord} balances from SAP…`}
                  />
                ) : shown.length === 0 ? (
                  <TableEmpty
                    colSpan={columns}
                    icon={Users}
                    message={
                      filtered ? `No ${partyWord} matches` : `No ${partyWord} has a balance in SAP`
                    }
                    hint={filtered ? 'Try another search, group or balance, or Reset.' : undefined}
                  />
                ) : (
                  shown.map((row) => {
                    const to = ledgerPath(side, row.card_code);
                    const balanceSide = drCrSide(row.balance);
                    return (
                      <tr
                        key={row.card_code}
                        className={cn(ROW_CLASSES, 'align-top', to && 'cursor-pointer')}
                        onClick={to ? () => navigate(to) : undefined}
                      >
                        <Td className="min-w-56">
                          <PartyCell name={row.card_name} code={row.card_code} to={to} />
                        </Td>
                        <Td className="whitespace-nowrap">{row.group || '—'}</Td>
                        {!vendors && (
                          <Td className="whitespace-nowrap">{row.sales_employee || '—'}</Td>
                        )}
                        <Td numeric className="whitespace-nowrap">
                          <span className="font-semibold">
                            {formatNumber(Math.abs(row.balance), 2)}
                          </span>
                          {balanceSide && (
                            <span
                              className={cn(
                                'ml-1.5 text-xs font-semibold',
                                balanceSide === 'Dr'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-amber-700 dark:text-amber-400',
                              )}
                            >
                              {balanceSide}
                            </span>
                          )}
                        </Td>
                        <Td className="min-w-52">
                          <LastDocument
                            doc={row.last_bill}
                            days={row.days_since_bill}
                            tone="neutral"
                          />
                        </Td>
                        <Td className="min-w-52">
                          <LastDocument
                            doc={row.last_payment}
                            days={row.days_since_payment}
                            tone={paymentDaysTone(row.days_since_payment)}
                          />
                        </Td>
                      </tr>
                    );
                  })
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
            The balance is SAP&apos;s own for the account. The days since a payment turn amber past
            a week and red past 25 days.
            {vendors &&
              ' Oil suppliers are the vendors with a purchase order for a raw-material oil.'}
          </p>
        </>
      )}
    </div>
  );
}
