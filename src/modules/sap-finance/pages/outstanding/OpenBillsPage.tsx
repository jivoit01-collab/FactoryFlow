/**
 * Open A/P and Open A/R — every vendor or customer invoice SAP still has open,
 * with what is left to pay on it and how late it is. One page, two routes.
 *
 * EXIM's Open APs and Open ARs, read for the company chosen in the app (EXIM
 * read Oil for one and Beverages for the other) and without its hidden date:
 * EXIM's Open APs dropped every bill before 1 April unless the box was cleared
 * by hand. The server filters, sorts and pages, so a list of thousands stays
 * quick; the tiles, the overdue buckets and the largest dues cover everything
 * the filters leave, not only the page.
 *
 * Filters live in the address; a bucket or a party picked here is a link.
 */
import {
  AlertTriangle,
  Droplets,
  HandCoins,
  Hash,
  IndianRupee,
  ReceiptText,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { useId, useState } from 'react';
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
import { Button, Input, NativeSelect, SelectOption, Switch } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn, formatDay, formatNumber, getErrorMessage } from '@/shared/utils';

import {
  type BillBucket,
  type BillSort,
  type BucketKey,
  fetchAllOpenBills,
  type OpenBill,
  type OpenBillFilters,
  type PartySide,
  type TopParty,
  useOpenBills,
  useRefreshOpenBills,
} from '../../api';
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
  hasTransport,
  type SortState,
  transportColumns,
  useCompanyName,
  useLedgerPath,
  useUrlFilters,
} from '../../components/outstanding/outstandingSupport';
import {
  BUCKET_LABEL,
  count,
  downloadSheet,
  isBucket,
  overdueLabel,
  overdueTone,
  percent,
  plural,
  readAtLabel,
  rupees,
  rupeesShort,
  sheetDay,
  slug,
} from '../../utils/outstanding';

/** Bills in one spreadsheet, at most: past this, narrow the filter. */
const EXCEL_LIMIT = 10_000;

const FILTER_KEYS = ['q', 'party', 'group', 'bucket', 'oil'] as const;

/** The dot on a bucket's chip: grey before the due date, warmer the later. */
const BUCKET_DOT: Record<BucketKey, string> = {
  not_due: 'bg-slate-400',
  d0_30: 'bg-amber-400',
  d31_60: 'bg-orange-500',
  d61_90: 'bg-rose-400',
  d91_180: 'bg-rose-600',
  d180: 'bg-rose-800',
};

function BucketChip({
  label,
  bills,
  due,
  dot,
  active,
  onClick,
}: {
  label: string;
  bills: number;
  due: number;
  dot?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm shadow-sm transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-card hover:border-primary/40 hover:bg-muted/40',
      )}
    >
      {dot && <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} />}
      <span className="font-medium">{label}</span>
      <span
        className={cn(
          'tabular-nums',
          active ? 'text-primary-foreground/80' : 'text-muted-foreground',
        )}
      >
        {count(bills)} · {rupeesShort(due)}
      </span>
    </button>
  );
}

function TopParties({
  parties,
  vendors,
  onPick,
}: {
  parties: TopParty[];
  vendors: boolean;
  onPick: (party: TopParty) => void;
}) {
  if (parties.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <h3 className="border-b px-4 py-3 text-sm font-semibold">
        Largest dues
        <span className="ml-2 font-normal text-muted-foreground">
          {vendors ? 'the vendors we owe most' : 'the customers who owe most'}; pick one to see only
          theirs
        </span>
      </h3>
      {/* Pulled down a pixel so the last row's rule hides under the card's edge. */}
      <ol className="-mb-px grid sm:grid-cols-2">
        {parties.map((party, index) => (
          <li key={party.card_code} className="min-w-0 border-b sm:odd:border-r">
            <button
              type="button"
              onClick={() => onPick(party)}
              className="flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
            >
              <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {party.card_name || party.card_code}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {plural(party.count, 'bill')}
                  {party.oldest_due_date ? ` · oldest due ${formatDay(party.oldest_due_date)}` : ''}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {rupeesShort(party.due)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function OpenBillsPage({ side }: { side: PartySide }) {
  const vendors = side === 'vendor';
  const partyWord = vendors ? 'vendor' : 'customer';
  const title = vendors ? 'Open A/P' : 'Open A/R';
  const refLabel = vendors ? "Vendor's bill no." : 'Customer ref';
  const ids = useId();
  const ledgerPath = useLedgerPath();
  const companyName = useCompanyName();

  const [params, setParams] = useUrlFilters();
  const search = params.get('q') ?? '';
  const debouncedSearch = useDebounce(search.trim(), 400);
  const cardCode = params.get('party') ?? '';
  const group = params.get('group') ?? '';
  const bucketParam = params.get('bucket');
  const bucket: BucketKey | '' = isBucket(bucketParam) ? bucketParam : '';
  const oilOnly = vendors && params.get('oil') === '1';

  const [sort, setSort] = useState<SortState<BillSort>>({ key: 'due_date', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [exporting, setExporting] = useState(false);

  const scope: OpenBillFilters = {
    side,
    q: debouncedSearch,
    card_code: cardCode,
    group,
    bucket,
    oil_suppliers: oilOnly,
    sort: sort.key ?? 'due_date',
    desc: sort.dir === 'desc',
  };
  const filters: OpenBillFilters = { ...scope, page, page_size: pageSize };
  const query = useOpenBills(filters);
  const refresh = useRefreshOpenBills();

  const data = query.data;
  const ready = !!data;
  const bills = data?.results ?? [];
  const totals = data?.totals;
  // The server counts the buckets before the bucket filter, so picking one
  // still shows what the others hold.
  const buckets: BillBucket[] = data?.buckets ?? [];
  const bucketsTotal = buckets.reduce(
    (sum, b) => ({ count: sum.count + b.count, due: sum.due + b.due }),
    { count: 0, due: 0 },
  );
  const transport = hasTransport(bills);
  const columns = transport ? 9 : 8;
  const partyName =
    (cardCode && bills.find((bill) => bill.card_code === cardCode)?.card_name) || '';
  const filtered = !!(debouncedSearch || cardCode || group || bucket || oilOnly);
  const bucketLabel = (key: BucketKey) =>
    buckets.find((b) => b.key === key)?.label ?? BUCKET_LABEL[key];

  function setFilter(changes: Record<string, string | null>) {
    setParams(changes);
    setPage(1);
  }

  function sortBy(key: BillSort) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'due' ? 'desc' : 'asc' },
    );
    setPage(1);
  }

  function doRefresh() {
    refresh.mutate(filters, {
      onSuccess: () => toast.success(`${title} read from SAP`),
    });
  }

  async function download() {
    if (!data) return;
    setExporting(true);
    const id = toast.loading('Collecting the bills…');
    try {
      const { rows, count: all } = await fetchAllOpenBills(scope, EXCEL_LIMIT, (done, of) =>
        toast.loading(`Collecting the bills… ${count(done)} of ${count(of)}`, { id }),
      );
      const foreign = rows.some((bill) => bill.currency && bill.currency !== 'INR');
      const withTransport = hasTransport(rows);
      downloadSheet(
        rows.map((bill: OpenBill) => ({
          'Bill no.': bill.doc_num,
          Date: sheetDay(bill.doc_date),
          'Due date': sheetDay(bill.due_date),
          'Days past due': bill.overdue_days,
          'How late': bucketLabel(bill.bucket),
          [refLabel]: bill.party_ref,
          Code: bill.card_code,
          [vendors ? 'Vendor' : 'Customer']: bill.card_name,
          Group: bill.group,
          ...(vendors ? {} : { 'Sales employee': bill.sales_employee }),
          'Total (₹)': bill.total,
          'Paid (₹)': bill.paid,
          'Due (₹)': bill.due,
          ...(foreign
            ? {
                Currency: bill.currency,
                'Total (currency)': bill.currency !== 'INR' ? bill.total_fc : null,
                'Paid (currency)': bill.currency !== 'INR' ? bill.paid_fc : null,
              }
            : {}),
          Remarks: bill.remarks,
          ...transportColumns(bill, withTransport),
        })),
        title,
        [slug(companyName), vendors ? 'open-ap' : 'open-ar'].filter(Boolean).join('-'),
      );
      toast.success(
        all > rows.length
          ? `The first ${count(rows.length)} of ${count(all)} bills are downloading. Narrow the filters for the rest.`
          : `${plural(rows.length, 'bill')} downloading`,
        { id },
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'The bills could not be collected.'), { id });
    } finally {
      setExporting(false);
    }
  }

  const dash = '—';

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        icon={vendors ? HandCoins : ReceiptText}
        accent="indigo"
        meta={<CompanyPill />}
      >
        <RefreshButton onClick={doRefresh} pending={refresh.isPending} />
        <ExcelButton
          onClick={() => void download()}
          busy={exporting}
          disabled={!ready || !totals?.count}
        />
      </PageHeader>

      {(refresh.isError || (query.isError && data)) && (
        <StaleNotice error={refresh.error ?? query.error} />
      )}

      {query.isError && !data ? (
        <SapReadError
          what={`The open ${vendors ? 'A/P' : 'A/R'} bills`}
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <>
          <StatTileRow>
            <StatTile
              label={filtered ? 'Matching bills' : 'Open bills'}
              value={totals ? count(totals.count) : dash}
              sub={totals ? plural(totals.parties, partyWord) : undefined}
              icon={Hash}
              accent="indigo"
            />
            <StatTile
              label="Billed"
              value={totals ? rupeesShort(totals.total) : dash}
              sub={totals ? rupees(totals.total) : undefined}
              icon={ReceiptText}
              accent="slate"
            />
            <StatTile
              label="Paid"
              value={totals ? rupeesShort(totals.paid) : dash}
              sub={
                totals
                  ? `${percent(totals.paid, totals.total) || '0%'} of what was billed`
                  : undefined
              }
              icon={Wallet}
              accent="emerald"
            />
            <StatTile
              label={vendors ? 'Due to vendors' : 'Due from customers'}
              value={totals ? rupeesShort(totals.due) : dash}
              sub={totals ? rupees(totals.due) : undefined}
              icon={IndianRupee}
              accent="amber"
            />
            <StatTile
              label="Overdue"
              value={totals ? rupeesShort(totals.overdue) : dash}
              sub={
                totals ? `${percent(totals.overdue, totals.due) || '0%'} of what is due` : undefined
              }
              icon={AlertTriangle}
              accent={totals && totals.overdue > 0 ? 'rose' : 'slate'}
            />
          </StatTileRow>

          {buckets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="How late">
              <BucketChip
                label="All"
                bills={bucketsTotal.count}
                due={bucketsTotal.due}
                active={!bucket}
                onClick={() => setFilter({ bucket: null })}
              />
              {buckets.map((b) => (
                <BucketChip
                  key={b.key}
                  label={b.label}
                  bills={b.count}
                  due={b.due}
                  dot={BUCKET_DOT[b.key]}
                  active={bucket === b.key}
                  onClick={() => setFilter({ bucket: bucket === b.key ? null : b.key })}
                />
              ))}
            </div>
          )}

          {!cardCode && data && (
            <TopParties
              parties={data.top_parties}
              vendors={vendors}
              onPick={(party) => setFilter({ party: party.card_code })}
            />
          )}

          <FilterBar
            isFetching={query.isFetching && ready}
            activeCount={[debouncedSearch, cardCode, group, bucket, oilOnly].filter(Boolean).length}
            onReset={
              filtered || search
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
                  placeholder={`Bill no., ${partyWord}, ${vendors ? 'their bill no.' : 'reference'}, vehicle…`}
                  className="h-9 w-full pl-8"
                />
              </div>
            </FilterField>
            {cardCode && (
              <FilterField label={vendors ? 'Vendor' : 'Customer'} className="sm:w-72">
                <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/40 pl-3 pr-1 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {partyName ? `${partyName} · ` : ''}
                    <span className="font-mono text-xs">{cardCode}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setFilter({ party: null })}
                    aria-label={`Show every ${partyWord}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </FilterField>
            )}
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
                  {plural(data.count, 'bill')}
                  {bucket ? ` · ${bucketLabel(bucket)}` : ''}
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
                  <Th>Bill</Th>
                  <SortTh column="doc_date" sort={sort} onSort={sortBy}>
                    Date
                  </SortTh>
                  <SortTh column="due_date" sort={sort} onSort={sortBy}>
                    Due date
                  </SortTh>
                  <Th>{refLabel}</Th>
                  <SortTh column="party" sort={sort} onSort={sortBy}>
                    {vendors ? 'Vendor' : 'Customer'}
                  </SortTh>
                  <Th align="right">Total</Th>
                  <Th align="right">Paid</Th>
                  <SortTh column="due" align="right" sort={sort} onSort={sortBy}>
                    Due
                  </SortTh>
                  {transport && <Th>Transport</Th>}
                </tr>
              </thead>
              <tbody>
                {!ready ? (
                  <TableLoading colSpan={columns} message="Reading the open bills from SAP…" />
                ) : bills.length === 0 ? (
                  <TableEmpty
                    colSpan={columns}
                    icon={ReceiptText}
                    message={filtered ? 'No open bill matches' : `No ${partyWord} bill is open`}
                    hint={filtered ? 'Try another search, bucket or group, or Reset.' : undefined}
                  />
                ) : (
                  bills.map((bill) => {
                    const foreign = !!bill.currency && bill.currency !== 'INR';
                    return (
                      <tr key={bill.doc_entry} className={cn(ROW_CLASSES, 'align-top')}>
                        <Td className="whitespace-nowrap font-medium tabular-nums">
                          {bill.doc_num}
                        </Td>
                        <Td className="whitespace-nowrap">{formatDay(bill.doc_date)}</Td>
                        <Td className="whitespace-nowrap">
                          <span className="block">{formatDay(bill.due_date)}</span>
                          <StatusPill tone={overdueTone(bill.bucket)} className="mt-1">
                            {overdueLabel(bill.overdue_days)}
                          </StatusPill>
                        </Td>
                        <Td className="min-w-36">
                          <span className="block whitespace-nowrap">{bill.party_ref || '—'}</span>
                          {bill.remarks && (
                            <span
                              className="block max-w-56 truncate text-xs text-muted-foreground"
                              title={bill.remarks}
                            >
                              {bill.remarks}
                            </span>
                          )}
                        </Td>
                        <Td className="min-w-56">
                          <PartyCell
                            name={bill.card_name}
                            code={bill.card_code}
                            to={ledgerPath(side, bill.card_code)}
                          />
                        </Td>
                        <Td numeric className="whitespace-nowrap">
                          {formatNumber(bill.total, 2)}
                          {foreign && (
                            <span className="block text-xs text-muted-foreground">
                              {bill.currency} {formatNumber(bill.total_fc, 2)}
                            </span>
                          )}
                        </Td>
                        <Td numeric className="whitespace-nowrap">
                          {bill.paid ? (
                            formatNumber(bill.paid, 2)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Td>
                        <Td numeric className="whitespace-nowrap font-semibold">
                          {formatNumber(bill.due, 2)}
                        </Td>
                        {transport && (
                          <Td>
                            <TransportCell row={bill} />
                          </Td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {ready && data.count > pageSize && (
              <PaginationControls
                page={data.page}
                pageSize={pageSize}
                total={data.count}
                totalPages={data.pages}
                isLoading={query.isFetching}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            )}
          </TableCard>

          <p className="text-xs text-muted-foreground">
            Days late count from the due date; a bill not yet due shows the days left. Due is the
            bill&apos;s total less what has been paid against it in SAP.
            {vendors &&
              ' Oil suppliers are the vendors with a purchase order for a raw-material oil.'}
          </p>
        </>
      )}
    </div>
  );
}
