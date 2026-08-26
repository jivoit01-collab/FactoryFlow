/** Reports — the marketplace's exception watchlist, and its raw data exports.
 *
 *  Two kinds of report live here and they answer different questions. The EXPORTS
 *  are flat dumps: give me every order, every invoice, every note, filtered by a
 *  date range. The WATCHLIST reports the opposite — what is missing, late or stuck:
 *  a delivery note never cut, an order past its dispatch-by, a sheet that imported
 *  and went nowhere. Those preview on screen with their totals, because their value
 *  is in being read, not filed.
 */
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Download, FileBarChart2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { marketplaceApi, type ReportParams } from '../api/marketplace.api';
import { useDispatchSheets, useReportPreview, useTrackingReport } from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { EMPTY_RANGE, MpDateRange, type MpRange } from '../components/MpDateRange';
import { useMpChannel } from '../hooks/useMpChannel';

type TotalDef = { key: string; label: string; tone?: string; money?: boolean };

type ReportDef = {
  slug: string;
  title: string;
  desc: string;
  group: 'watch' | 'export';
  /** which date the range filters on; omitted = no date range */
  dateLabel?: string;
  hasDateField?: boolean; // orders: order date vs upload date
  hasStatus?: boolean; // orders: filter by status
  hasSheet?: boolean; // tracking: one sheet at a time
  /** insight report — previews on screen with its totals */
  preview?: boolean;
  minAge?: boolean;
  bucket?: boolean;
  mapped?: boolean;
  mismatch?: boolean;
  totals?: TotalDef[];
};

const BAD = 'text-rose-600 dark:text-rose-400';
const WARN = 'text-amber-600 dark:text-amber-400';
const GOOD = 'text-emerald-600 dark:text-emerald-400';

const REPORTS: ReportDef[] = [
  // ── watchlist ──────────────────────────────────────────────────────────────
  {
    slug: 'sap-posting-gap',
    title: 'Not in SAP',
    desc: 'Orders confirmed as shipped that carry no delivery note — stock overstated, sale unbooked.',
    group: 'watch',
    dateLabel: 'Confirmed date',
    preview: true,
    minAge: true,
    totals: [
      { key: 'dispatches', label: 'Dispatches', tone: BAD },
      { key: 'orders', label: 'Orders' },
      { key: 'value', label: 'Value at risk', tone: BAD, money: true },
      { key: 'over_7_days', label: 'Over 7 days', tone: WARN },
      { key: 'over_20_days', label: 'Over 20 days', tone: BAD },
      { key: 'failed', label: 'Post failed' },
    ],
  },
  {
    slug: 'ageing',
    title: 'Past dispatch-by',
    desc: 'Open orders against the date the marketplace set — what must ship, and what already breached.',
    group: 'watch',
    preview: true,
    bucket: true,
    totals: [
      { key: 'overdue', label: 'Overdue', tone: BAD },
      { key: 'under_2_days', label: 'Under 2 days', tone: WARN },
      { key: '2_7_days', label: '2–7 days', tone: WARN },
      { key: '7_30_days', label: '7–30 days', tone: BAD },
      { key: 'over_30_days', label: 'Over 30 days', tone: BAD },
      { key: 'not_due', label: 'Not due yet', tone: GOOD },
    ],
  },
  {
    slug: 'sheet-audit',
    title: 'Sheet health',
    desc: 'Per sheet: file rows → orders → parcels → scanned → posted, and any row that vanished.',
    group: 'watch',
    dateLabel: 'Upload date',
    preview: true,
    totals: [
      { key: 'sheets', label: 'Sheets' },
      { key: 'file_rows', label: 'File rows' },
      { key: 'parcels', label: 'Parcels' },
      { key: 'scanned', label: 'Scanned', tone: GOOD },
      { key: 'unaccounted_rows', label: 'Rows unaccounted', tone: BAD },
      { key: 'sheets_with_no_dispatch', label: 'Nothing shipped', tone: WARN },
    ],
  },
  {
    slug: 'sku-coverage',
    title: 'SKU coverage',
    desc: 'Every marketplace SKU seen in an order and whether it resolves to an item — worst first.',
    group: 'watch',
    preview: true,
    mapped: true,
    totals: [
      { key: 'skus', label: 'SKUs seen' },
      { key: 'mapped', label: 'Mapped', tone: GOOD },
      { key: 'unmapped', label: 'Unmapped', tone: BAD },
      { key: 'unmapped_lines', label: 'Lines affected', tone: BAD },
      { key: 'unmapped_open_lines', label: 'Still open', tone: WARN },
      { key: 'unmapped_value', label: 'Value blocked', tone: BAD, money: true },
    ],
  },
  {
    slug: 'gst-branch',
    title: 'GST place of supply',
    desc: 'Posted delivery notes by destination state — the routing rule against what actually posted.',
    group: 'watch',
    dateLabel: 'Confirmed date',
    preview: true,
    mismatch: true,
    totals: [
      { key: 'delivery_notes', label: 'Delivery notes' },
      { key: 'states', label: 'States' },
      { key: 'taxable', label: 'Taxable', money: true },
      { key: 'tax', label: 'Tax', money: true },
      { key: 'mismatched', label: 'Ship-to mismatch', tone: BAD },
      { key: 'not_stamped', label: 'Not stamped' },
    ],
  },
  {
    slug: 'scan-throughput',
    title: 'Scan throughput',
    desc: 'Parcels scanned per operator per day, with the working span behind each figure.',
    group: 'watch',
    dateLabel: 'Scan date',
    preview: true,
    totals: [
      { key: 'parcels', label: 'Parcels scanned', tone: GOOD },
      { key: 'item_scans', label: 'Item scans' },
      { key: 'days_worked', label: 'Days worked' },
      { key: 'operators', label: 'Operators' },
      { key: 'parcels_per_day', label: 'Parcels / day' },
      { key: 'best_day', label: 'Best day' },
    ],
  },
  // ── exports ────────────────────────────────────────────────────────────────
  {
    slug: 'orders',
    title: 'Orders / Dispatch',
    desc: 'One row per order item — tracking, scan state, invoice/DN and amounts.',
    group: 'export',
    dateLabel: 'Order date',
    hasDateField: true,
    hasStatus: true,
  },
  {
    slug: 'tracking',
    title: 'Tracking IDs by sheet',
    desc: 'Every Tracking ID on one sheet — scanned or not, whatever state its order is in.',
    group: 'export',
    dateLabel: 'Sheet',
    hasSheet: true,
  },
  {
    slug: 'invoices',
    title: 'Invoices (internal JI)',
    desc: 'Internal billing docs — invoice no, date, order, buyer, DN no, amount, status.',
    group: 'export',
    dateLabel: 'Invoice date',
  },
  {
    slug: 'delivery-notes',
    title: 'Delivery Notes (SAP)',
    desc: 'Posted SAP delivery notes — one row per DN (number, date, orders, amount).',
    group: 'export',
    dateLabel: 'DN post date',
  },
  {
    slug: 'returns',
    title: 'Returns',
    desc: 'Returns — order, status, credit doc, submitted at / by.',
    group: 'export',
    dateLabel: 'Return date',
  },
  {
    slug: 'reconciliation',
    title: 'Reconciliation',
    desc: 'Per-order-item deviation — portal vs outward vs inward quantities.',
    group: 'export',
    dateLabel: 'Order date',
  },
];

const ORDER_STATUSES = ['ALL', 'PENDING', 'PARTIAL', 'SCANNED', 'CONFIRMED', 'CANCELLED'];
const AGE_BUCKETS = ['ALL', 'Under 2 days', '2-7 days', '7-30 days', 'Over 30 days', 'Not due', 'No due date'];

type ScanFilter = 'all' | 'scanned' | 'not-scanned';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Money totals arrive as decimal strings; group them so six figures stay readable. */
function formatTotal(value: string | number | undefined, money?: boolean) {
  if (value === undefined || value === null || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return money
    ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : n.toLocaleString('en-IN');
}

function isNumericCell(value: string | number) {
  return typeof value === 'number' || /^-?\d[\d,]*(\.\d+)?$/.test(String(value));
}

export default function MpReportsPage() {
  const [channel, setChannel] = useMpChannel();
  const [slug, setSlug] = useState('sap-posting-gap');
  const [range, setRange] = useState<MpRange>(EMPTY_RANGE);
  const [dateField, setDateField] = useState<'order' | 'upload'>('order');
  const [status, setStatus] = useState('ALL');
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [scanFilter, setScanFilter] = useState<ScanFilter>('scanned');
  const [minAge, setMinAge] = useState('0');
  const [bucket, setBucket] = useState('ALL');
  const [mapped, setMapped] = useState('no');
  const [mismatchOnly, setMismatchOnly] = useState(false);

  const report = useMemo(() => REPORTS.find((r) => r.slug === slug)!, [slug]);
  const sheets = useDispatchSheets(channel);
  const scannedParam = scanFilter === 'all' ? undefined : scanFilter;

  // One params object drives the preview AND the download, so the CSV can never be
  // built from a different filter than the numbers on screen.
  const params: ReportParams = useMemo(
    () => ({
      channel,
      from: range.from || undefined,
      to: range.to || undefined,
      date_field: report.hasDateField ? dateField : undefined,
      status: report.hasStatus && status !== 'ALL' ? status : undefined,
      batch_id: report.hasSheet && sheetId ? sheetId : undefined,
      scanned: report.hasSheet ? scannedParam : undefined,
      min_age_days: report.minAge && Number(minAge) > 0 ? Number(minAge) : undefined,
      bucket: report.bucket && bucket !== 'ALL' ? bucket : undefined,
      mapped: report.mapped && mapped !== 'all' ? mapped : undefined,
      mismatch_only: report.mismatch && mismatchOnly ? true : undefined,
    }),
    [channel, range, dateField, status, sheetId, scannedParam, minAge, bucket, mapped, mismatchOnly, report],
  );

  const preview = useReportPreview(slug, params, !!report.preview);
  const tracking = useTrackingReport(channel, report.hasSheet ? sheetId : null, scannedParam);
  const trackingTotals = tracking.data?.totals;

  const columns = report.preview ? preview.data?.columns : tracking.data?.columns;
  const rows = report.preview ? preview.data?.rows : tracking.data?.rows;

  const download = useMutation({
    mutationFn: () => marketplaceApi.exportReport(report.slug, params),
    onSuccess: ({ blob, filename }) => {
      triggerBlobDownload(blob, filename);
      toast.success('Report downloaded.');
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, 'Could not download the report.')),
  });

  const groups = [
    { key: 'watch' as const, title: 'Watchlist', hint: 'What is missing, late or stuck.' },
    { key: 'export' as const, title: 'Data exports', hint: 'Flat dumps, filtered by a date range.' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3">
          <FileBarChart2 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground">
              Exceptions worth chasing, and the raw data behind them.
            </p>
          </div>
        </div>
        <MpChannelSelect value={channel} onChange={setChannel} />
      </header>

      {groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold">{g.title}</h2>
            <span className="text-xs text-muted-foreground">{g.hint}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REPORTS.filter((r) => r.group === g.key).map((r) => (
              <button
                key={r.slug}
                type="button"
                onClick={() => setSlug(r.slug)}
                className={`rounded-lg border p-4 text-left transition ${
                  r.slug === slug
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  {r.group === 'watch' ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : null}
                  {r.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{r.desc}</div>
              </button>
            ))}
          </div>
        </section>
      ))}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{report.title}</CardTitle>
          <CardDescription>{report.desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            {report.hasSheet ? (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-muted-foreground">Sheet</span>
                  <NativeSelect
                    value={sheetId ?? ''}
                    onChange={(e) => setSheetId(e.target.value ? Number(e.target.value) : null)}
                    className="w-72"
                  >
                    <SelectOption value="">Choose a sheet…</SelectOption>
                    {(sheets.data?.sheets ?? []).map((sh) => (
                      <SelectOption key={sh.id} value={sh.id}>
                        {sh.filename}
                      </SelectOption>
                    ))}
                  </NativeSelect>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-muted-foreground">Tracking IDs</span>
                  <NativeSelect
                    value={scanFilter}
                    onChange={(e) => setScanFilter(e.target.value as ScanFilter)}
                    className="w-44"
                  >
                    <SelectOption value="scanned">Scanned only</SelectOption>
                    <SelectOption value="not-scanned">Not scanned only</SelectOption>
                    <SelectOption value="all">All on the sheet</SelectOption>
                  </NativeSelect>
                </label>
              </>
            ) : report.dateLabel ? (
              <MpDateRange value={range} onChange={setRange} label={report.dateLabel} />
            ) : null}

            {report.hasDateField && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-muted-foreground">Filter on</span>
                <NativeSelect
                  value={dateField}
                  onChange={(e) => setDateField(e.target.value as 'order' | 'upload')}
                  className="w-40"
                >
                  <SelectOption value="order">Order date</SelectOption>
                  <SelectOption value="upload">Sheet upload date</SelectOption>
                </NativeSelect>
              </label>
            )}

            {report.hasStatus && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-muted-foreground">Status</span>
                <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
                  {ORDER_STATUSES.map((s) => (
                    <SelectOption key={s} value={s}>
                      {s === 'ALL' ? 'All statuses' : s}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </label>
            )}

            {report.minAge && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-muted-foreground">Waiting at least</span>
                <NativeSelect value={minAge} onChange={(e) => setMinAge(e.target.value)} className="w-44">
                  <SelectOption value="0">Any age</SelectOption>
                  <SelectOption value="3">3 days</SelectOption>
                  <SelectOption value="7">7 days</SelectOption>
                  <SelectOption value="20">20 days</SelectOption>
                </NativeSelect>
              </label>
            )}

            {report.bucket && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-muted-foreground">How late</span>
                <NativeSelect value={bucket} onChange={(e) => setBucket(e.target.value)} className="w-44">
                  {AGE_BUCKETS.map((b) => (
                    <SelectOption key={b} value={b}>
                      {b === 'ALL' ? 'Every open order' : b}
                    </SelectOption>
                  ))}
                </NativeSelect>
              </label>
            )}

            {report.mapped && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-muted-foreground">Show</span>
                <NativeSelect value={mapped} onChange={(e) => setMapped(e.target.value)} className="w-44">
                  <SelectOption value="no">Unmapped only</SelectOption>
                  <SelectOption value="yes">Mapped only</SelectOption>
                  <SelectOption value="all">Every SKU</SelectOption>
                </NativeSelect>
              </label>
            )}

            {report.mismatch && (
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={mismatchOnly}
                  onChange={(e) => setMismatchOnly(e.target.checked)}
                />
                Only ship-to mismatches
              </label>
            )}
          </div>

          {/* Totals — always the whole picture, before any narrowing filter. */}
          {report.preview && report.totals && preview.data ? (
            <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:grid-cols-6">
              {report.totals.map((t) => (
                <div key={t.key} className="bg-background p-3">
                  <div className={`truncate text-xl font-semibold tabular-nums ${t.tone ?? ''}`}>
                    {t.key === 'best_day'
                      ? (preview.data.totals[t.key] ?? '—')
                      : formatTotal(preview.data.totals[t.key], t.money)}
                  </div>
                  <div className="text-xs text-muted-foreground">{t.label}</div>
                </div>
              ))}
            </div>
          ) : null}

          {report.hasSheet && trackingTotals ? (
            <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
              {[
                { label: 'Scanned', value: trackingTotals.scanned, tone: GOOD },
                { label: 'Not scanned', value: trackingTotals.not_scanned, tone: WARN },
                { label: 'Tracking IDs on sheet', value: trackingTotals.total, tone: '' },
              ].map((t) => (
                <div key={t.label} className="bg-background p-3">
                  <div className={`text-2xl font-semibold tabular-nums ${t.tone}`}>{t.value}</div>
                  <div className="text-xs text-muted-foreground">{t.label}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => download.mutate()}
              disabled={download.isPending || (report.hasSheet && !sheetId)}
            >
              <Download className="mr-2 h-4 w-4" />
              {download.isPending
                ? 'Preparing…'
                : rows
                  ? `Download CSV (${rows.length})`
                  : 'Download CSV'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {report.hasSheet
                ? !sheetId
                  ? 'Pick a sheet to report on.'
                  : tracking.isPending
                    ? 'Counting…'
                    : 'Every Tracking ID matching the filter, whatever state its order is in.'
                : report.preview
                  ? preview.isPending
                    ? 'Counting…'
                    : preview.isError
                      ? getErrorMessage(preview.error, 'Could not build the report.')
                      : rows?.length === 0
                        ? 'Nothing matches — nothing to chase.'
                        : 'Totals cover the whole report; the rows follow the filter.'
                  : range.from || range.to
                    ? `Range: ${range.from || 'start'} → ${range.to || 'end'}`
                    : 'No date range — exports everything for this report.'}
            </span>
          </div>

          {columns?.length && rows?.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    {columns.map((c) => (
                      <th
                        key={c}
                        className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted-foreground"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 25).map((r, i) => (
                    <tr key={i} className="border-t">
                      {r.map((cell, j) => (
                        <td
                          key={j}
                          className={`whitespace-nowrap px-3 py-1.5 ${
                            isNumericCell(cell) ? 'text-right tabular-nums' : ''
                          }`}
                        >
                          {String(cell ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 25 ? (
                <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Showing 25 of {rows.length} — the CSV has them all.
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
