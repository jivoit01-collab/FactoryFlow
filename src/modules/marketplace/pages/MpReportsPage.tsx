/** Reports — download marketplace data as CSV, filtered by channel + a date range. */
import { useMutation } from '@tanstack/react-query';
import { Download, FileBarChart2 } from 'lucide-react';
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

import { marketplaceApi } from '../api/marketplace.api';
import { useDispatchSheets, useTrackingReport } from '../api/marketplace.queries';
import { MpChannelSelect } from '../components/MpChannelSelect';
import { EMPTY_RANGE, MpDateRange, type MpRange } from '../components/MpDateRange';
import { useMpChannel } from '../hooks/useMpChannel';

type ReportDef = {
  slug: string;
  title: string;
  desc: string;
  dateLabel: string; // which date the range filters on
  hasDateField?: boolean; // orders: order date vs upload date
  hasStatus?: boolean; // orders: filter by status
  hasSheet?: boolean; // tracking: one sheet at a time, no date range
};

const REPORTS: ReportDef[] = [
  {
    slug: 'orders',
    title: 'Orders / Dispatch',
    desc: 'One row per order item — tracking, scan state, invoice/DN and amounts.',
    dateLabel: 'Order date',
    hasDateField: true,
    hasStatus: true,
  },
  {
    slug: 'invoices',
    title: 'Invoices (internal JI)',
    desc: 'Internal billing docs — invoice no, date, order, buyer, DN no, amount, status.',
    dateLabel: 'Invoice date',
  },
  {
    slug: 'delivery-notes',
    title: 'Delivery Notes (SAP)',
    desc: 'Posted SAP delivery notes — one row per DN (number, date, orders, amount).',
    dateLabel: 'DN post date',
  },
  {
    slug: 'returns',
    title: 'Returns',
    desc: 'Returns — order, status, credit doc, submitted at / by.',
    dateLabel: 'Return date',
  },
  {
    slug: 'tracking',
    title: 'Tracking IDs by sheet',
    desc: 'Every Tracking ID on one sheet — scanned or not, whatever state its order is in.',
    dateLabel: 'Sheet',
    hasSheet: true,
  },
  {
    slug: 'reconciliation',
    title: 'Reconciliation',
    desc: 'Per-order-item deviation — portal vs outward vs inward quantities.',
    dateLabel: 'Order date',
  },
];

const ORDER_STATUSES = ['ALL', 'PENDING', 'PARTIAL', 'SCANNED', 'CONFIRMED', 'CANCELLED'];

type ScanFilter = 'all' | 'scanned' | 'not-scanned';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MpReportsPage() {
  const [channel, setChannel] = useMpChannel();
  const [slug, setSlug] = useState('orders');
  const [range, setRange] = useState<MpRange>(EMPTY_RANGE);
  const [dateField, setDateField] = useState<'order' | 'upload'>('order');
  const [status, setStatus] = useState('ALL');
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [scanFilter, setScanFilter] = useState<ScanFilter>('scanned');

  const report = useMemo(() => REPORTS.find((r) => r.slug === slug)!, [slug]);
  const sheets = useDispatchSheets(channel);
  const scannedParam = scanFilter === 'all' ? undefined : scanFilter;
  const tracking = useTrackingReport(channel, report.hasSheet ? sheetId : null, scannedParam);
  const totals = tracking.data?.totals;

  const download = useMutation({
    mutationFn: () =>
      marketplaceApi.exportReport(report.slug, {
        channel,
        from: range.from || undefined,
        to: range.to || undefined,
        date_field: report.hasDateField ? dateField : undefined,
        status: report.hasStatus && status !== 'ALL' ? status : undefined,
        batch_id: report.hasSheet && sheetId ? sheetId : undefined,
        scanned: report.hasSheet ? scannedParam : undefined,
      }),
    onSuccess: ({ blob, filename }) => {
      triggerBlobDownload(blob, filename);
      toast.success('Report downloaded.');
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, 'Could not download the report.')),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3">
          <FileBarChart2 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground">
              Download marketplace data as CSV, filtered by channel and a date range.
            </p>
          </div>
        </div>
        <MpChannelSelect value={channel} onChange={setChannel} />
      </header>

      {/* Report picker */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <button
            key={r.slug}
            type="button"
            onClick={() => setSlug(r.slug)}
            className={`rounded-lg border p-4 text-left transition ${
              r.slug === slug ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'
            }`}
          >
            <div className="font-medium">{r.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{r.desc}</div>
            <div className="mt-2 text-[11px] font-medium text-primary">Filters by {r.dateLabel}</div>
          </button>
        ))}
      </div>

      {/* Filters + download */}
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
            ) : (
              <MpDateRange value={range} onChange={setRange} label={report.dateLabel} />
            )}

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
          </div>

          {report.hasSheet && totals ? (
            <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
              {[
                { label: 'Scanned', value: totals.scanned, tone: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Not scanned', value: totals.not_scanned, tone: 'text-amber-600 dark:text-amber-400' },
                { label: 'Tracking IDs on sheet', value: totals.total, tone: '' },
              ].map((t) => (
                <div key={t.label} className="bg-background p-3">
                  <div className={`text-2xl font-semibold tabular-nums ${t.tone}`}>{t.value}</div>
                  <div className="text-xs text-muted-foreground">{t.label}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <Button
              onClick={() => download.mutate()}
              disabled={download.isPending || (report.hasSheet && !sheetId)}
            >
              <Download className="mr-2 h-4 w-4" />
              {download.isPending
                ? 'Preparing…'
                : report.hasSheet && totals
                  ? `Download CSV (${totals.rows})`
                  : 'Download CSV'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {report.hasSheet
                ? !sheetId
                  ? 'Pick a sheet to report on.'
                  : tracking.isPending
                    ? 'Counting…'
                    : `${scanFilter === 'all' ? 'Every' : scanFilter === 'scanned' ? 'Scanned' : 'Not-scanned'} Tracking ID on this sheet, whatever state its order is in.`
                : range.from || range.to
                  ? `Range: ${range.from || 'start'} → ${range.to || 'end'}`
                  : 'No date range — exports everything for this report.'}
            </span>
          </div>

          {report.hasSheet && tracking.data?.rows?.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    {tracking.data.columns.slice(0, 8).map((c) => (
                      <th key={c} className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted-foreground">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tracking.data.rows.slice(0, 25).map((r, i) => (
                    <tr key={i} className="border-t">
                      {r.slice(0, 8).map((cell, j) => (
                        <td key={j} className={`px-3 py-1.5 ${j === 0 ? 'font-mono' : ''}`}>
                          {String(cell ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {tracking.data.rows.length > 25 ? (
                <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Showing 25 of {tracking.data.rows.length} — the CSV has them all.
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
