/**
 * Customer Aging — what each customer owes, split by how long it has been
 * owed: by days past the due date, or by days since the bill (EXIM's way).
 *
 * EXIM aged every invoice since 2024 whether it had been paid or not, a line
 * per invoice, for Beverages whatever company was chosen. This takes only what
 * is still open in the chosen company, nets open credit notes against their
 * customer, and gives a row per customer; a customer opens its open documents
 * beside the table.
 *
 * Basis and filters live in the address.
 */
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CalendarRange,
  Hourglass,
  IndianRupee,
  Search,
  Timer,
  Users,
} from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import {
  EmptyPanel,
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
import {
  Button,
  Input,
  NativeSelect,
  SelectOption,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn, formatDay, formatNumber, getErrorMessage } from '@/shared/utils';

import {
  type AgingBasis,
  type AgingCustomer,
  type BucketKey,
  useCustomerAging,
  useRefreshCustomerAging,
} from '../../api';
import {
  CompanyPill,
  ExcelButton,
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
  BUCKET_KEYS,
  BUCKET_LABEL,
  count,
  downloadSheet,
  overdueTone,
  percent,
  plural,
  readAtLabel,
  rupees,
  rupeesShort,
  slug,
} from '../../utils/outstanding';

type SortKey = 'card_name' | 'total' | BucketKey;

const FILTER_KEYS = ['q', 'group', 'sales'] as const;

/** Later buckets read warmer, so the old money stands out down the table. */
const BUCKET_TEXT: Partial<Record<BucketKey, string>> = {
  d61_90: 'text-amber-700 dark:text-amber-400',
  d91_180: 'text-rose-600 dark:text-rose-400',
  d180: 'text-rose-700 dark:text-rose-300',
};

/** An aging amount: blank for none; a credit note's netting can make it negative. */
function AgingAmount({ value, bucket }: { value: number; bucket?: BucketKey }) {
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(rounded > 0 && bucket && BUCKET_TEXT[bucket])}
      title={rounded < 0 ? 'More credited than billed: open credit notes' : undefined}
    >
      {formatNumber(rounded, 2)}
    </span>
  );
}

/** One customer's open invoices and credit notes, beside the table. */
function CustomerDocumentsSheet({
  customer,
  basis,
  bucketLabels,
  onClose,
}: {
  customer: AgingCustomer | null;
  basis: AgingBasis;
  bucketLabels: Record<BucketKey, string>;
  onClose: () => void;
}) {
  const ledgerPath = useLedgerPath();
  const code = customer?.card_code ?? '';
  // Narrowed by the code as well, so the reply carries this customer's row
  // and not every customer's.
  const query = useCustomerAging({ basis, q: code, card_code: code }, !!customer);
  const documents = query.isPlaceholderData ? undefined : query.data?.documents;
  const ledger = customer ? ledgerPath('customer', customer.card_code) : null;

  return (
    <Sheet open={!!customer} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-5 overflow-y-auto sm:max-w-2xl"
      >
        {customer && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6">{customer.card_name || customer.card_code}</SheetTitle>
              <SheetDescription>
                <span className="font-mono">{customer.card_code}</span>
                {customer.group ? ` · ${customer.group}` : ''}
                {customer.sales_employee ? ` · ${customer.sales_employee}` : ''}
              </SheetDescription>
            </SheetHeader>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {BUCKET_KEYS.filter((key) => basis === 'due' || key !== 'not_due').map((key) => (
                <div key={key} className="rounded-lg border px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {bucketLabels[key]}
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    <AgingAmount value={customer[key]} bucket={key} />
                  </dd>
                </div>
              ))}
              <div className="rounded-lg border bg-muted/40 px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Total
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{rupees(customer.total)}</dd>
              </div>
            </dl>

            {ledger && (
              <div>
                <Button asChild variant="outline" size="sm">
                  <Link to={ledger}>
                    <BookOpen className="mr-1.5 h-4 w-4" />
                    Open the ledger
                  </Link>
                </Button>
              </div>
            )}

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                Open documents
                {documents ? (
                  <span className="ml-2 font-normal text-muted-foreground">
                    {plural(documents.length, 'document')}
                  </span>
                ) : null}
              </h3>
              {query.isError && !documents ? (
                <EmptyPanel
                  icon={AlertTriangle}
                  message="The documents could not be read from SAP"
                  hint={getErrorMessage(query.error, 'Try again in a moment.')}
                  action={
                    <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                      Try again
                    </Button>
                  }
                />
              ) : !documents ? (
                <EmptyPanel loading message="Reading the open documents from SAP…" />
              ) : documents.length === 0 ? (
                <EmptyPanel message="Nothing open for this customer now" />
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className={TABLE_CLASSES}>
                    <thead className={THEAD_CLASSES}>
                      <tr>
                        <Th>Document</Th>
                        <Th>Date</Th>
                        <Th>Due date</Th>
                        <Th align="right">{basis === 'due' ? 'Days late' : 'Days since bill'}</Th>
                        <Th align="right">Open</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={`${doc.kind}-${doc.doc_num}`} className={ROW_CLASSES}>
                          <Td className="whitespace-nowrap">
                            <span className="block font-medium tabular-nums">{doc.doc_num}</span>
                            <span className="block text-xs text-muted-foreground">
                              {doc.kind === 'CREDIT_NOTE' ? 'Credit note' : 'Invoice'}
                            </span>
                          </Td>
                          <Td className="whitespace-nowrap">{formatDay(doc.doc_date)}</Td>
                          <Td className="whitespace-nowrap">{formatDay(doc.due_date)}</Td>
                          <Td numeric>
                            {doc.days === null ? (
                              '—'
                            ) : (
                              <StatusPill tone={overdueTone(doc.bucket)}>
                                {basis === 'due' && doc.days <= 0
                                  ? doc.days === 0
                                    ? 'Due today'
                                    : `Due in ${count(-doc.days)} d`
                                  : `${count(doc.days)} d`}
                              </StatusPill>
                            )}
                          </Td>
                          <Td numeric className="whitespace-nowrap font-semibold">
                            <AgingAmount value={doc.due} />
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function CustomerAgingPage() {
  const ids = useId();
  const companyName = useCompanyName();

  const [params, setParams] = useUrlFilters();
  const basis: AgingBasis = params.get('basis') === 'bill' ? 'bill' : 'due';
  const search = params.get('q') ?? '';
  const debouncedSearch = useDebounce(search.trim(), 400);
  const group = params.get('group') ?? '';
  const salesEmployee = params.get('sales') ?? '';

  const query = useCustomerAging({
    basis,
    q: debouncedSearch,
    group,
    sales_employee: salesEmployee,
  });
  const refresh = useRefreshCustomerAging();
  // Figures read on the other basis are not shown under this one's name.
  const data = query.data?.basis === basis ? query.data : undefined;

  const [sort, setSort] = useState<SortState<SortKey>>({ key: null, dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [open, setOpen] = useState<AgingCustomer | null>(null);

  const bucketLabels = useMemo(() => {
    const labels = { ...BUCKET_LABEL };
    for (const b of data?.buckets ?? []) labels[b.key] = b.label;
    return labels;
  }, [data]);
  // By bill date nothing is "not yet due": a bill of today is in the first bucket.
  const bucketKeys = BUCKET_KEYS.filter(
    (key) => basis === 'due' || key !== 'not_due' || (data?.totals.not_due ?? 0) !== 0,
  );

  const all = useMemo(() => data?.rows ?? [], [data]);
  const rows = useMemo(() => {
    const { key, dir } = sort;
    if (!key) return all; // largest total first, as the server sends them
    return [...all].sort((a, b) => compareValues(a[key] || null, b[key] || null, dir));
  }, [all, sort]);

  const filtered = !!(debouncedSearch || group || salesEmployee);
  const totals = data?.totals;
  const over90 = totals ? totals.d91_180 + totals.d180 : 0;
  const columns = bucketKeys.length + 3;
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
        : { key, dir: key === 'card_name' ? 'asc' : 'desc' },
    );
    setPage(1);
  }

  function doRefresh() {
    refresh.mutate(
      { basis, q: debouncedSearch, group, sales_employee: salesEmployee },
      { onSuccess: () => toast.success('Customer aging read from SAP') },
    );
  }

  function download() {
    if (!totals) return;
    const bucketColumns = (amounts: Record<BucketKey, number>) =>
      Object.fromEntries(bucketKeys.map((key) => [`${bucketLabels[key]} (₹)`, amounts[key]]));
    downloadSheet(
      [
        ...rows.map((row) => ({
          Code: row.card_code,
          Customer: row.card_name,
          Group: row.group,
          'Sales employee': row.sales_employee,
          'Open documents': row.documents,
          ...bucketColumns(row),
          'Total (₹)': row.total,
        })),
        {
          Code: '',
          Customer: `Total, ${plural(rows.length, 'customer')}`,
          Group: '',
          'Sales employee': '',
          'Open documents': rows.reduce((sum, row) => sum + row.documents, 0),
          ...bucketColumns(totals),
          'Total (₹)': totals.total,
        },
      ],
      basis === 'due' ? 'Aging by due date' : 'Aging by bill date',
      [slug(companyName), 'customer-aging', basis === 'due' ? 'by-due-date' : 'by-bill-date']
        .filter(Boolean)
        .join('-'),
    );
    toast.success(`${plural(rows.length, 'customer')} downloading`);
  }

  const dash = '—';

  return (
    <div className="space-y-6">
      <PageHeader title="Customer Aging" icon={Timer} accent="indigo" meta={<CompanyPill />}>
        <RefreshButton onClick={doRefresh} pending={refresh.isPending} />
        <ExcelButton onClick={download} disabled={!ready || rows.length === 0} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented<AgingBasis>
          label="Age by"
          value={basis}
          onChange={(next) => {
            setFilter({ basis: next === 'due' ? null : next });
            setSort({ key: null, dir: 'desc' });
            refresh.reset();
          }}
          options={[
            { value: 'due', label: 'By due date', icon: CalendarClock },
            { value: 'bill', label: 'By bill date', icon: CalendarRange },
          ]}
        />
        <p className="text-sm text-muted-foreground">
          {basis === 'due'
            ? 'Days past each bill’s due date.'
            : 'Days since each bill was raised, due or not.'}
          {data ? ` ${readAtLabel(data.read_at)}.` : ''}
        </p>
      </div>

      {(refresh.isError || (query.isError && data)) && (
        <StaleNotice error={refresh.error ?? query.error} />
      )}

      {query.isError && !data ? (
        <SapReadError
          what="Customer aging"
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <>
          <StatTileRow>
            <StatTile
              label={filtered ? 'Matching customers' : 'Customers'}
              value={totals ? count(totals.customers) : dash}
              sub="with an open bill or credit note"
              icon={Users}
              accent="indigo"
            />
            <StatTile
              label="Outstanding"
              value={totals ? rupeesShort(totals.total) : dash}
              sub={totals ? rupees(totals.total) : undefined}
              icon={IndianRupee}
              accent="amber"
            />
            {basis === 'due' ? (
              <StatTile
                label="Not yet due"
                value={totals ? rupeesShort(totals.not_due) : dash}
                sub={totals ? `${percent(totals.not_due, totals.total) || '0%'} of it` : undefined}
                icon={Hourglass}
                accent="emerald"
              />
            ) : (
              <StatTile
                label="Under 30 days"
                value={totals ? rupeesShort(totals.d0_30) : dash}
                sub={totals ? `${percent(totals.d0_30, totals.total) || '0%'} of it` : undefined}
                icon={Hourglass}
                accent="emerald"
              />
            )}
            <StatTile
              label="Over 90 days"
              value={totals ? rupeesShort(over90) : dash}
              sub={totals ? `${percent(over90, totals.total) || '0%'} of it` : undefined}
              icon={AlertTriangle}
              accent={over90 > 0 ? 'rose' : 'slate'}
            />
            <StatTile
              label="Over 180 days"
              value={totals ? rupeesShort(totals.d180) : dash}
              sub={totals ? `${percent(totals.d180, totals.total) || '0%'} of it` : undefined}
              icon={CalendarClock}
              accent={totals && totals.d180 > 0 ? 'rose' : 'slate'}
            />
          </StatTileRow>

          <FilterBar
            isFetching={query.isFetching && ready}
            activeCount={[debouncedSearch, group, salesEmployee].filter(Boolean).length}
            onReset={
              filtered || search
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
                  placeholder="Customer name or code…"
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
            <FilterField label="Sales employee" htmlFor={`${ids}-sales`} className="sm:w-56">
              <NativeSelect
                id={`${ids}-sales`}
                value={salesEmployee}
                onChange={(event) => setFilter({ sales: event.target.value })}
              >
                <SelectOption value="">Everyone</SelectOption>
                {(data?.sales_employees ?? []).map((name) => (
                  <SelectOption key={name} value={name}>
                    {name}
                  </SelectOption>
                ))}
                {salesEmployee && data && !data.sales_employees.includes(salesEmployee) && (
                  <SelectOption value={salesEmployee}>{salesEmployee}</SelectOption>
                )}
              </NativeSelect>
            </FilterField>
          </FilterBar>

          <TableCard
            summary={
              ready ? (
                <span>
                  {plural(rows.length, 'customer')}
                  {query.isFetching ? ' · loading…' : ' · pick one to see its open documents'}
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
                    Customer
                  </SortTh>
                  <Th>Group · sales</Th>
                  {bucketKeys.map((key) => (
                    <SortTh key={key} column={key} align="right" sort={sort} onSort={sortBy}>
                      {bucketLabels[key]}
                    </SortTh>
                  ))}
                  <SortTh column="total" align="right" sort={sort} onSort={sortBy}>
                    Total
                  </SortTh>
                </tr>
              </thead>
              <tbody>
                {!ready ? (
                  <TableLoading colSpan={columns} message="Reading open receivables from SAP…" />
                ) : shown.length === 0 ? (
                  <TableEmpty
                    colSpan={columns}
                    icon={Users}
                    message={filtered ? 'No customer matches' : 'No customer owes anything'}
                    hint={
                      filtered ? 'Try another search, group or salesperson, or Reset.' : undefined
                    }
                  />
                ) : (
                  shown.map((row) => (
                    <tr
                      key={row.card_code}
                      className={cn(ROW_CLASSES, 'cursor-pointer align-top')}
                      onClick={() => setOpen(row)}
                    >
                      <Td className="min-w-56">
                        <button
                          type="button"
                          className="block text-left font-medium text-primary hover:underline"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpen(row);
                          }}
                        >
                          {row.card_name || row.card_code}
                        </button>
                        <span className="block font-mono text-xs text-muted-foreground">
                          {row.card_code} · {plural(row.documents, 'document')}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span className="block">{row.group || '—'}</span>
                        <span className="block text-xs text-muted-foreground">
                          {row.sales_employee || 'No sales employee'}
                        </span>
                      </Td>
                      {bucketKeys.map((key) => (
                        <Td key={key} numeric className="whitespace-nowrap">
                          <AgingAmount value={row[key]} bucket={key} />
                        </Td>
                      ))}
                      <Td numeric className="whitespace-nowrap font-semibold">
                        <AgingAmount value={row.total} />
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
              {ready && totals && rows.length > 0 && (
                <tfoot className="border-t bg-muted/40 font-semibold">
                  <tr>
                    <Td colSpan={2}>Total, {plural(totals.customers, 'customer')}</Td>
                    {bucketKeys.map((key) => (
                      <Td key={key} numeric className="whitespace-nowrap">
                        <AgingAmount value={totals[key]} bucket={key} />
                      </Td>
                    ))}
                    <Td numeric className="whitespace-nowrap">
                      {formatNumber(totals.total, 2)}
                    </Td>
                  </tr>
                </tfoot>
              )}
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
            Only what is still open: each bill&apos;s total less what has been paid against it, less
            open credit notes, which count against their customer in the bucket of their own date.
            The totals row covers every customer the filters leave, not only this page.
          </p>
        </>
      )}

      <CustomerDocumentsSheet
        customer={open}
        basis={basis}
        bucketLabels={bucketLabels}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}
