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
import { MpChannelSelect } from '../components/MpChannelSelect';
import { EMPTY_RANGE, MpDateRange, type MpRange } from '../components/MpDateRange';
import { useMpChannel } from '../hooks/useMpChannel';
import type { MarketplaceChannel } from '../types/marketplace.types';

type ReportDef = {
  slug: string;
  title: string;
  desc: string;
  dateLabel: string; // which date the range filters on
  hasDateField?: boolean; // orders: order date vs upload date
  hasStatus?: boolean; // orders: filter by status
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
    slug: 'reconciliation',
    title: 'Reconciliation',
    desc: 'Per-order-item deviation — portal vs outward vs inward quantities.',
    dateLabel: 'Order date',
  },
];

const ORDER_STATUSES = ['ALL', 'PENDING', 'PARTIAL', 'SCANNED', 'CONFIRMED', 'CANCELLED'];

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

  const report = useMemo(() => REPORTS.find((r) => r.slug === slug)!, [slug]);

  const download = useMutation({
    mutationFn: () =>
      marketplaceApi.exportReport(report.slug, {
        channel,
        from: range.from || undefined,
        to: range.to || undefined,
        date_field: report.hasDateField ? dateField : undefined,
        status: report.hasStatus && status !== 'ALL' ? status : undefined,
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
            <MpDateRange value={range} onChange={setRange} label={report.dateLabel} />

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

          <div className="flex items-center gap-3">
            <Button onClick={() => download.mutate()} disabled={download.isPending}>
              <Download className="mr-2 h-4 w-4" />
              {download.isPending ? 'Preparing…' : 'Download CSV'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {range.from || range.to
                ? `Range: ${range.from || 'start'} → ${range.to || 'end'}`
                : 'No date range — exports everything for this report.'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
