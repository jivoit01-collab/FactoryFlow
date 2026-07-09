import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Loader2,
  Package,
  Search,
  Truck,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useDispatchBoxReport,
  useDispatchDetailReport,
  useDispatchPalletReport,
  useDispatchRejectedScanReport,
  useDispatchReport,
} from '../api';
import type {
  DispatchBoxReportRow,
  DispatchPalletReportRow,
  DispatchRejectedScanReportRow,
  DispatchReportFilters,
  DispatchSummaryReportRow,
} from '../types';

type ReportTab = 'dispatch' | 'pallets' | 'boxes' | 'rejected';
type CsvRow = Record<string, string | number | boolean | null | undefined>;
type ReportTone = 'slate' | 'emerald' | 'amber' | 'rose' | 'cyan';

const SURFACE_CLASS = 'rounded-md border bg-card text-card-foreground shadow-sm';

const BADGE_TONE_CLASS: Record<ReportTone, string> = {
  slate:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200',
  emerald:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200',
  amber:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200',
  rose:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-200',
  cyan:
    'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800/70 dark:bg-cyan-950/40 dark:text-cyan-200',
};

const SUMMARY_TONE_CLASS: Record<ReportTone, string> = {
  slate: 'border-border bg-card',
  emerald:
    'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/70 dark:bg-emerald-950/30',
  amber:
    'border-amber-200 bg-amber-50/70 dark:border-amber-800/70 dark:bg-amber-950/30',
  rose: 'border-rose-200 bg-rose-50/70 dark:border-rose-800/70 dark:bg-rose-950/30',
  cyan: 'border-cyan-200 bg-cyan-50/70 dark:border-cyan-800/70 dark:bg-cyan-950/30',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN');
}

function formatNumber(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return String(value ?? '-');
  return numeric.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function formatQtyWithBoxes(
  qty: string | number | null | undefined,
  boxes?: string | number | null,
  uom = 'PCS',
) {
  const qtyText = `${formatNumber(qty)} ${uom}`.trim();
  const boxValue = Number(boxes ?? 0);
  if (!Number.isFinite(boxValue) || boxValue <= 0) return qtyText;
  return `${qtyText} / ${formatNumber(boxValue)} Boxes`;
}

function downloadCsv(filename: string, rows: CsvRow[]) {
  if (!rows.length) {
    toast.info('No rows to export');
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (value: CsvRow[string]) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SummaryTile({
  label,
  value,
  icon,
  tone = 'slate',
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'cyan';
}) {
  const toneClass = SUMMARY_TONE_CLASS[tone];

  return (
    <div className={cn('rounded-md border p-4 text-card-foreground', toneClass)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold leading-none">{value}</p>
    </div>
  );
}

function FilterPanel({
  filters,
  setFilters,
}: {
  filters: DispatchReportFilters;
  setFilters: (filters: DispatchReportFilters) => void;
}) {
  const update = (key: keyof DispatchReportFilters, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <section className={cn(SURFACE_CLASS, 'p-4')}>
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Filters</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <div className="space-y-2">
          <Label htmlFor="dispatch-report-from">From</Label>
          <Input
            id="dispatch-report-from"
            type="date"
            value={filters.from_date || ''}
            onChange={(event) => update('from_date', event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dispatch-report-to">To</Label>
          <Input
            id="dispatch-report-to"
            type="date"
            value={filters.to_date || ''}
            onChange={(event) => update('to_date', event.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="dispatch-report-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="dispatch-report-search"
              value={filters.bill_number || ''}
              onChange={(event) => update('bill_number', event.target.value)}
              className="pl-9"
              placeholder="Bill number"
            />
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="dispatch-report-customer">Customer</Label>
          <Input
            id="dispatch-report-customer"
            value={filters.customer || ''}
            onChange={(event) => update('customer', event.target.value)}
            placeholder="Customer"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dispatch-report-status">Status</Label>
          <NativeSelect
            id="dispatch-report-status"
            value={filters.status || ''}
            onChange={(event) => update('status', event.target.value)}
          >
            <SelectOption value="">All</SelectOption>
            <SelectOption value="ACTIVE">Active</SelectOption>
            <SelectOption value="PARTIAL">In progress</SelectOption>
            <SelectOption value="COMPLETED">Completed</SelectOption>
            <SelectOption value="CLOSED">Closed</SelectOption>
            <SelectOption value="CANCELLED">Cancelled</SelectOption>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dispatch-report-material">Material</Label>
          <Input
            id="dispatch-report-material"
            value={filters.material_code || ''}
            onChange={(event) => update('material_code', event.target.value)}
            placeholder="Code"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="dispatch-report-pallet">Pallet</Label>
          <Input
            id="dispatch-report-pallet"
            value={filters.pallet_barcode || ''}
            onChange={(event) => update('pallet_barcode', event.target.value)}
            placeholder="Pallet barcode"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="dispatch-report-box">Box</Label>
          <Input
            id="dispatch-report-box"
            value={filters.box_barcode || ''}
            onChange={(event) => update('box_barcode', event.target.value)}
            placeholder="Box barcode"
          />
        </div>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading report
    </div>
  );
}

function EmptyState() {
  return <div className="p-8 text-center text-sm text-muted-foreground">No rows found.</div>;
}

function ReportShell({
  title,
  count,
  onExport,
  children,
}: {
  title: string;
  count: number;
  onExport: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-md">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">{title}</h2>
          <Badge className={BADGE_TONE_CLASS.slate}>{count.toLocaleString('en-IN')}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function DispatchSummaryList({
  rows,
  loading,
  selectedSessionId,
  onSelect,
}: {
  rows: DispatchSummaryReportRow[];
  loading: boolean;
  selectedSessionId: number | null;
  onSelect: (sessionId: number) => void;
}) {
  if (loading) return <LoadingState />;
  if (!rows.length) return <EmptyState />;

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <button
          key={row.session_id}
          type="button"
          onClick={() => onSelect(row.session_id)}
          className={cn(
            'grid w-full gap-4 p-4 text-left transition hover:bg-muted/50 xl:grid-cols-[minmax(0,1.2fr)_420px]',
            selectedSessionId === row.session_id &&
              'bg-cyan-50/60 ring-1 ring-inset ring-cyan-200 dark:bg-cyan-950/30 dark:ring-cyan-800/60',
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm font-semibold">{row.bill_number}</p>
              <Badge>{row.status}</Badge>
              <Badge className={BADGE_TONE_CLASS.cyan}>
                <Eye className="mr-1 h-3 w-3" />
                Full report
              </Badge>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {row.customer_name || row.customer_code || '-'} · {row.delivery_number || 'No delivery ref'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Started {formatDateTime(row.started_at)} · Completed {formatDateTime(row.completed_at)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <SummaryTile label="Expected" value={formatQtyWithBoxes(row.total_expected_qty, row.total_expected_boxes)} icon={<Package className="h-4 w-4" />} tone="cyan" />
            <SummaryTile label="Dispatched" value={formatQtyWithBoxes(row.total_dispatched_qty, row.total_dispatched_boxes)} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
            <SummaryTile label="Pending" value={formatQtyWithBoxes(row.pending_qty, row.pending_boxes)} icon={<AlertTriangle className="h-4 w-4" />} tone="amber" />
          </div>
        </button>
      ))}
    </div>
  );
}

function PalletReportList({ rows, loading }: { rows: DispatchPalletReportRow[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (!rows.length) return <EmptyState />;

  return (
    <div className="grid gap-3 p-4 lg:grid-cols-2">
      {rows.map((row) => (
        <div key={row.pallet_id} className="rounded-md border bg-muted/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold">{row.pallet_barcode}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.bill_number || 'No bill linked'}</p>
            </div>
            <Badge>{row.pallet_status}</Badge>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <SummaryTile label="Total" value={row.total_boxes.toLocaleString('en-IN')} icon={<Boxes className="h-4 w-4" />} />
            <SummaryTile label="Done" value={row.dispatched_boxes.toLocaleString('en-IN')} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
            <SummaryTile label="Left" value={row.remaining_boxes.toLocaleString('en-IN')} icon={<Package className="h-4 w-4" />} tone="amber" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(row.dispatched_time)}</p>
        </div>
      ))}
    </div>
  );
}

function BoxReportList({ rows, loading }: { rows: DispatchBoxReportRow[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (!rows.length) return <EmptyState />;

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.box_id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-mono text-sm font-semibold">{row.box_barcode}</p>
              <Badge>{row.box_status}</Badge>
              {row.removed_from_pallet && (
                <Badge className={BADGE_TONE_CLASS.amber}>Removed from pallet</Badge>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {row.material_code} · {row.pallet_barcode || 'Loose box'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(row.dispatched_time)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SummaryTile label="Qty" value={`${formatNumber(row.quantity)} ${row.uom}`} icon={<Package className="h-4 w-4" />} tone="cyan" />
            <SummaryTile label="Bill" value={row.bill_number || '-'} icon={<Truck className="h-4 w-4" />} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RejectedReportList({ rows, loading }: { rows: DispatchRejectedScanReportRow[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  if (!rows.length) return <EmptyState />;

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.scan_id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-700 dark:text-rose-300" />
              <p className="truncate font-mono text-sm font-semibold">{row.barcode}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {row.rejection_reason || row.rejection_code || 'Rejected scan'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge className={BADGE_TONE_CLASS.rose}>{row.scan_type}</Badge>
            <span className="text-xs text-muted-foreground">{row.bill_number}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(row.scan_time)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DispatchDetailPanel({
  detail,
  loading,
  onClose,
}: {
  detail: ReturnType<typeof useDispatchDetailReport>['data'];
  loading: boolean;
  onClose: () => void;
}) {
  if (loading) {
    return (
      <Card className="rounded-md">
        <LoadingState />
      </Card>
    );
  }
  if (!detail) return null;

  const boxUnits = detail.scanned_units.filter((unit) => unit.barcode_type === 'BOX');
  const palletUnits = detail.scanned_units.filter((unit) => unit.pallet_barcode);

  return (
    <Card className="rounded-md border-cyan-200 dark:border-cyan-800/70">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Full dispatch report</h2>
            <Badge>{detail.session.status}</Badge>
            <Badge className={BADGE_TONE_CLASS.slate}>{detail.session.bill_number}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail.session.customer_name || detail.session.customer_code || '-'} · Completed by{' '}
            {detail.session.completed_by || '-'} · {formatDateTime(detail.session.completed_at)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
          Close
        </Button>
      </div>

      <CardContent className="space-y-5 p-4">
        <section className="grid gap-3 md:grid-cols-5">
          <SummaryTile label="Expected" value={formatQtyWithBoxes(detail.session.total_expected_qty, detail.session.total_expected_boxes)} icon={<Package className="h-4 w-4" />} tone="cyan" />
          <SummaryTile label="Dispatched" value={formatQtyWithBoxes(detail.session.total_dispatched_qty, detail.session.total_dispatched_boxes)} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
          <SummaryTile label="Pending" value={`${formatNumber(detail.session.pending_qty)} PCS`} icon={<AlertTriangle className="h-4 w-4" />} tone="amber" />
          <SummaryTile label="Pallets" value={formatNumber(detail.session.total_pallets || 0)} icon={<Boxes className="h-4 w-4" />} />
          <SummaryTile label="Boxes" value={formatNumber(detail.session.total_dispatched_boxes || 0)} icon={<Package className="h-4 w-4" />} />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Bill items</h3>
          <div className="overflow-x-auto rounded-md border">
            <div className="grid min-w-[760px] grid-cols-[120px_minmax(220px,1fr)_110px_110px_110px_80px] bg-muted/60 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
              <span>Item Code</span>
              <span>Item Name</span>
              <span>Expected</span>
              <span>Dispatched</span>
              <span>Pending</span>
              <span>Status</span>
            </div>
            {detail.lines.map((line) => (
              <div key={line.line_id} className="grid min-w-[760px] grid-cols-[120px_minmax(220px,1fr)_110px_110px_110px_80px] border-t px-3 py-2 text-sm">
                <span className="font-mono">{line.material_code}</span>
                <span className="truncate">{line.material_description}</span>
                <span>{formatNumber(line.expected_qty)} {line.uom}</span>
                <span>{formatNumber(line.dispatched_qty)} {line.uom}</span>
                <span>{formatNumber(line.pending_qty)} {line.uom}</span>
                <Badge className="w-fit">{line.status}</Badge>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
            Scanned pallets and boxes
          </h3>
          <div className="grid gap-3">
            {detail.scanned_units.map((unit) => (
              <div key={unit.id} className="rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={
                          unit.status_after_scan === 'Partial Dispatch'
                            ? BADGE_TONE_CLASS.amber
                            : BADGE_TONE_CLASS.emerald
                        }
                      >
                        {unit.status_after_scan}
                      </Badge>
                      <span className="font-mono text-sm font-semibold">
                        {unit.box_barcode || unit.pallet_barcode || unit.barcode}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {unit.item_code} · {unit.item_name || '-'} · Batch {unit.batch_number || '-'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pallet: {unit.pallet_barcode || '-'} · Warehouse: {unit.warehouse || '-'} · Scanned by {unit.scanned_by || '-'} at {formatDateTime(unit.scanned_at)}
                    </p>
                  </div>
                  <div className="grid w-full gap-2 sm:min-w-[360px] sm:grid-cols-3">
                    <SummaryTile label="Original" value={`${formatNumber(unit.original_qty)} ${unit.uom}`} icon={<Package className="h-4 w-4" />} />
                    <SummaryTile label="Dispatch" value={`${formatNumber(unit.dispatch_qty)} ${unit.uom}`} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
                    <SummaryTile label="Remaining" value={`${formatNumber(unit.remaining_qty)} ${unit.uom}`} icon={<AlertTriangle className="h-4 w-4" />} tone="amber" />
                  </div>
                </div>
              </div>
            ))}
            {!detail.scanned_units.length && <EmptyState />}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {palletUnits.length.toLocaleString('en-IN')} pallet-linked rows and {boxUnits.length.toLocaleString('en-IN')} box rows.
          </p>
        </section>
      </CardContent>
    </Card>
  );
}

export default function BarcodeDispatchReportsPage() {
  const [searchParams] = useSearchParams();
  const initialSessionId = Number(searchParams.get('session') || 0) || null;
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(initialSessionId);
  const [tab, setTab] = useState<ReportTab>('dispatch');
  const [filters, setFilters] = useState<DispatchReportFilters>({});

  const cleanFilters = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(([, value]) => String(value || '').trim()),
      ) as DispatchReportFilters,
    [filters],
  );

  const dispatchReport = useDispatchReport(cleanFilters);
  const palletReport = useDispatchPalletReport(cleanFilters);
  const boxReport = useDispatchBoxReport(cleanFilters);
  const rejectedReport = useDispatchRejectedScanReport(cleanFilters);
  const detailReport = useDispatchDetailReport(selectedSessionId);

  const dispatchRows = dispatchReport.data ?? [];
  const palletRows = palletReport.data ?? [];
  const boxRows = boxReport.data ?? [];
  const rejectedRows = rejectedReport.data ?? [];

  const totalDispatched = dispatchRows.reduce((sum, row) => sum + Number(row.total_dispatched_qty || 0), 0);
  const totalPending = dispatchRows.reduce((sum, row) => sum + Number(row.pending_qty || 0), 0);
  const totalDispatchedBoxes = dispatchRows.reduce((sum, row) => sum + Number(row.total_dispatched_boxes || 0), 0);
  const totalPendingBoxes = dispatchRows.reduce((sum, row) => sum + Number(row.pending_boxes || 0), 0);

  return (
    <div className="space-y-5">
      <DashboardHeader
        title="Dispatch Reports"
        description="Operational dispatch history for bills, pallets, boxes, and rejected scans"
      />

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryTile label="Dispatches" value={dispatchRows.length.toLocaleString('en-IN')} icon={<Truck className="h-4 w-4" />} tone="cyan" />
        <SummaryTile label="Dispatched Qty" value={formatQtyWithBoxes(totalDispatched, totalDispatchedBoxes)} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
        <SummaryTile label="Pending Qty" value={formatQtyWithBoxes(totalPending, totalPendingBoxes)} icon={<Package className="h-4 w-4" />} tone="amber" />
        <SummaryTile label="Rejected Scans" value={rejectedRows.length.toLocaleString('en-IN')} icon={<AlertTriangle className="h-4 w-4" />} tone={rejectedRows.length ? 'rose' : 'slate'} />
      </section>

      <FilterPanel filters={filters} setFilters={setFilters} />

      <DispatchDetailPanel
        detail={detailReport.data}
        loading={detailReport.isLoading}
        onClose={() => setSelectedSessionId(null)}
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as ReportTab)}>
        <TabsList className="grid h-auto w-full grid-cols-4 rounded-md">
          <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
          <TabsTrigger value="pallets">Pallets</TabsTrigger>
          <TabsTrigger value="boxes">Boxes</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="dispatch">
          <ReportShell
            title="Dispatch summary"
            count={dispatchRows.length}
            onExport={() => downloadCsv('dispatch-summary-report', dispatchRows)}
          >
            <DispatchSummaryList
              rows={dispatchRows}
              loading={dispatchReport.isLoading}
              selectedSessionId={selectedSessionId}
              onSelect={setSelectedSessionId}
            />
          </ReportShell>
        </TabsContent>

        <TabsContent value="pallets">
          <ReportShell
            title="Pallet dispatch"
            count={palletRows.length}
            onExport={() => downloadCsv('dispatch-pallet-report', palletRows)}
          >
            <PalletReportList rows={palletRows} loading={palletReport.isLoading} />
          </ReportShell>
        </TabsContent>

        <TabsContent value="boxes">
          <ReportShell
            title="Box dispatch"
            count={boxRows.length}
            onExport={() => downloadCsv('dispatch-box-report', boxRows)}
          >
            <BoxReportList rows={boxRows} loading={boxReport.isLoading} />
          </ReportShell>
        </TabsContent>

        <TabsContent value="rejected">
          <ReportShell
            title="Rejected scans"
            count={rejectedRows.length}
            onExport={() => downloadCsv('dispatch-rejected-scan-report', rejectedRows)}
          >
            <RejectedReportList rows={rejectedRows} loading={rejectedReport.isLoading} />
          </ReportShell>
        </TabsContent>
      </Tabs>
    </div>
  );
}
