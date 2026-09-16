import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { useGlobalDateRange } from '@/core/store/hooks';
import {
  type SalesDispatchDocumentType,
  type SalesDispatchGateOut,
  type SalesDispatchReport,
  useSalesDispatchReports,
} from '@/modules/gate/api';
import { DateRangePicker, GateStatusBadge } from '@/modules/gate/components';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import { DOCKING_ROUTES } from './salesDispatchRoutes';

type DocumentFilter = 'ALL' | SalesDispatchDocumentType;
type ReportTableMode = 'standard' | 'photoInvoices' | 'photoStatus';
type ExportCellValue = string | number;
type ExportRow = Record<string, ExportCellValue>;

interface ReportSectionConfig {
  key: string;
  title: string;
  count: number;
  entries: SalesDispatchGateOut[];
  icon: React.ReactNode;
  mode?: ReportTableMode;
}

export default function SalesDispatchReportsPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const [searchTerm, setSearchTerm] = useState('');
  const [documentType, setDocumentType] = useState<DocumentFilter>('ALL');

  const reportParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
      search: searchTerm.trim() || undefined,
      document_type: documentType === 'ALL' ? undefined : documentType,
      limit: 1000,
    }),
    [dateRange.from, dateRange.to, documentType, searchTerm],
  );
  const { data: report, error, isFetching, refetch } = useSalesDispatchReports(reportParams);
  const sections = useMemo(() => buildReportSections(report), [report]);

  const handleExport = () => {
    if (!report) {
      toast.error('No report data to export');
      return;
    }

    try {
      exportSalesDispatchReport(report, sections, {
        dateRange,
        documentType,
        searchTerm,
      });
      toast.success('Docking reports exported');
    } catch (exportError) {
      toast.error(getErrorMessage(exportError, 'Failed to export reports'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 mb-2"
            onClick={() => navigate(DOCKING_ROUTES.dashboard)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Docking
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Docking Reports</h2>
          <p className="text-muted-foreground">Date-filtered Docking operations and exports</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            onDateChange={(date) => {
              if (date && 'from' in date) {
                setDateRange(date);
              } else {
                setDateRange(undefined);
              }
            }}
          />
          <NativeSelect
            aria-label="Document type"
            className="w-full sm:w-[180px]"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value as DocumentFilter)}
          >
            <SelectOption value="ALL">All Documents</SelectOption>
            <SelectOption value="INVOICE">A/R Invoice</SelectOption>
            <SelectOption value="STOCK_TRANSFER">Stock Transfer</SelectOption>
          </NativeSelect>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isFetching ? 'Refreshing' : 'Refresh'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            disabled={!report || isFetching}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="relative w-full lg:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search entry, document, customer, vehicle"
          className="pl-9"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'Failed to load Docking reports')}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <ReportCountCard
            key={section.key}
            icon={section.icon}
            label={section.title}
            value={section.count}
          />
        ))}
      </div>

      <div className="grid gap-4">
        {sections.map((section) => (
          <ReportSection
            key={section.key}
            title={section.title}
            entries={section.entries}
            mode={section.mode || 'standard'}
            isLoading={isFetching && !report}
          />
        ))}
      </div>
    </div>
  );
}

function buildReportSections(report?: SalesDispatchReport): ReportSectionConfig[] {
  const counts = report?.counts;

  return [
    {
      key: 'waiting_inside',
      title: 'Waiting Inside',
      count: counts?.waiting_inside ?? 0,
      entries: report?.waiting_inside ?? [],
      icon: <Truck className="h-5 w-5 text-blue-600" />,
    },
    {
      key: 'missing_photo',
      title: 'Missing Photo / GPS',
      count: counts?.missing_photo ?? 0,
      entries: report?.missing_photo ?? [],
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    },
    {
      key: 'gatepass_pending',
      title: 'Gatepass Pending',
      count: counts?.gatepass_pending ?? 0,
      entries: report?.gatepass_pending ?? [],
      icon: <FileText className="h-5 w-5 text-violet-600" />,
    },
    {
      key: 'printed_not_committed',
      title: 'Printed Not Committed',
      count: counts?.printed_not_committed ?? 0,
      entries: report?.printed_not_committed ?? [],
      icon: <Clock className="h-5 w-5 text-amber-600" />,
    },
    {
      key: 'ready_for_dispatch',
      title: 'Ready For Dispatch',
      count: counts?.ready_for_dispatch ?? 0,
      entries: report?.ready_for_dispatch ?? [],
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    },
    {
      key: 'dispatched',
      title: 'Dispatched',
      count: counts?.dispatched ?? 0,
      entries: report?.dispatched ?? [],
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    },
    {
      key: 'rejected_cancelled',
      title: 'Rejected / Cancelled',
      count: counts?.rejected_cancelled ?? 0,
      entries: report?.rejected_cancelled ?? [],
      icon: <XCircle className="h-5 w-5 text-red-600" />,
    },
    {
      key: 'truck_vs_invoices_with_photo',
      title: 'Truck vs Invoices With Photo',
      count: counts?.truck_with_photo ?? 0,
      entries: report?.truck_vs_invoices_with_photo ?? [],
      icon: <Camera className="h-5 w-5 text-sky-600" />,
      mode: 'photoInvoices',
    },
    {
      key: 'truck_status_with_photo',
      title: 'Truck Status With Photo',
      count: counts?.truck_with_photo ?? 0,
      entries: report?.truck_status_with_photo ?? [],
      icon: <Camera className="h-5 w-5 text-teal-600" />,
      mode: 'photoStatus',
    },
  ];
}

function ReportCountCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span>{icon}</span>
          <span className="text-2xl font-bold">{value}</span>
        </div>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ReportSection({
  title,
  entries,
  mode,
  isLoading,
}: {
  title: string;
  entries: SalesDispatchGateOut[];
  mode: ReportTableMode;
  isLoading: boolean;
}) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 p-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <span className="text-sm text-muted-foreground">{entries.length} rows</span>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex h-24 items-center justify-center border-t text-sm text-muted-foreground">
            Loading
          </div>
        ) : entries.length === 0 ? (
          <div className="flex h-24 items-center justify-center border-t text-sm text-muted-foreground">
            No rows
          </div>
        ) : (
          <div className="overflow-auto border-t">
            <table className="w-full min-w-[1180px] table-fixed">
              <ReportTableColumns mode={mode} />
              <thead className="bg-muted/50">
                <ReportTableHeader mode={mode} />
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <ReportTableRow
                    key={entry.id}
                    entry={entry}
                    mode={mode}
                    onClick={() => navigate(DOCKING_ROUTES.detail(entry.id))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReportTableColumns({ mode }: { mode: ReportTableMode }) {
  if (mode === 'photoInvoices') {
    return (
      <colgroup>
        <col className="w-[150px]" />
        <col className="w-[260px]" />
        <col className="w-[240px]" />
        <col className="w-[150px]" />
        <col className="w-[210px]" />
        <col className="w-[170px]" />
      </colgroup>
    );
  }

  if (mode === 'photoStatus') {
    return (
      <colgroup>
        <col className="w-[150px]" />
        <col className="w-[165px]" />
        <col className="w-[180px]" />
        <col className="w-[210px]" />
        <col className="w-[180px]" />
        <col className="w-[180px]" />
        <col className="w-[150px]" />
      </colgroup>
    );
  }

  return (
    <colgroup>
      <col className="w-[180px]" />
      <col className="w-[260px]" />
      <col className="w-[240px]" />
      <col className="w-[150px]" />
      <col className="w-[165px]" />
      <col className="w-[230px]" />
      <col className="w-[160px]" />
    </colgroup>
  );
}

function ReportTableHeader({ mode }: { mode: ReportTableMode }) {
  const headers =
    mode === 'photoInvoices'
      ? ['Vehicle', 'SAP Documents', 'Customer', 'Photo At', 'GPS', 'Status']
      : mode === 'photoStatus'
        ? ['Vehicle', 'Status', 'Truck Photo', 'GPS', 'Printed At', 'Dispatched At', 'Entry No.']
        : [
            'Entry No.',
            'SAP Documents',
            'Customer',
            'Vehicle',
            'Actual Gate Out',
            'Gatepass',
            'Status',
          ];

  return (
    <tr>
      {headers.map((header) => (
        <th key={header} className="whitespace-nowrap p-3 text-left text-sm font-medium">
          {header}
        </th>
      ))}
    </tr>
  );
}

function ReportTableRow({
  entry,
  mode,
  onClick,
}: {
  entry: SalesDispatchGateOut;
  mode: ReportTableMode;
  onClick: () => void;
}) {
  const baseClass =
    'cursor-pointer border-t align-top transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  if (mode === 'photoInvoices') {
    return (
      <tr
        className={baseClass}
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleRowKeyDown(onClick)}
      >
        <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.vehicle_no}</td>
        <td className="p-3 text-sm" title={formatDocumentNumbers(entry)}>
          <div className="truncate whitespace-nowrap">{formatDocumentNumbers(entry)}</div>
          <div className="text-xs text-muted-foreground">
            {formatDocumentType(entry.document_type)}
          </div>
        </td>
        <td className="p-3 text-sm">
          <div className="truncate whitespace-nowrap font-medium">{entry.customer_name || '-'}</div>
          <div className="truncate whitespace-nowrap text-xs text-muted-foreground">
            {entry.customer_code || entry.place_of_supply || '-'}
          </div>
        </td>
        <td className="whitespace-nowrap p-3 text-sm">
          {formatTimestamp(entry.photo_uploaded_at)}
        </td>
        <td className="whitespace-nowrap p-3 text-sm">{formatGps(entry)}</td>
        <td className="whitespace-nowrap p-3 text-sm">
          <GateStatusBadge status={entry.status} label={formatStatus(entry.status)} />
        </td>
      </tr>
    );
  }

  if (mode === 'photoStatus') {
    return (
      <tr
        className={baseClass}
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleRowKeyDown(onClick)}
      >
        <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.vehicle_no}</td>
        <td className="whitespace-nowrap p-3 text-sm">
          <GateStatusBadge status={entry.status} label={formatStatus(entry.status)} />
        </td>
        <td className="p-3 text-sm">
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
              entry.truck_photo
                ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
            )}
          >
            {entry.truck_photo ? 'Captured' : 'Missing'}
          </span>
        </td>
        <td className="whitespace-nowrap p-3 text-sm">{formatGps(entry)}</td>
        <td className="whitespace-nowrap p-3 text-sm">{formatTimestamp(entry.printed_at)}</td>
        <td className="whitespace-nowrap p-3 text-sm">{formatTimestamp(entry.dispatched_at)}</td>
        <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.entry_no}</td>
      </tr>
    );
  }

  return (
    <tr className={baseClass} tabIndex={0} onClick={onClick} onKeyDown={handleRowKeyDown(onClick)}>
      <td className="whitespace-nowrap p-3 text-sm font-medium">{entry.entry_no}</td>
      <td className="p-3 text-sm" title={formatDocumentNumbers(entry)}>
        <div className="truncate whitespace-nowrap">{formatDocumentNumbers(entry)}</div>
        <div className="text-xs text-muted-foreground">
          {formatDocumentType(entry.document_type)}
        </div>
      </td>
      <td className="p-3 text-sm">
        <div className="truncate whitespace-nowrap font-medium">{entry.customer_name || '-'}</div>
        <div className="truncate whitespace-nowrap text-xs text-muted-foreground">
          {entry.customer_code || entry.place_of_supply || '-'}
        </div>
      </td>
      <td className="whitespace-nowrap p-3 text-sm">{entry.vehicle_no}</td>
      <td className="whitespace-nowrap p-3 text-sm">
        {formatActualGateOut(entry)}
      </td>
      <td className="whitespace-nowrap p-3 text-sm">
        <GateStatusBadge
          status={entry.gatepass_no ? 'PRINTED' : 'PENDING'}
          label={entry.gatepass_no || 'Pending'}
        />
      </td>
      <td className="whitespace-nowrap p-3 text-sm">
        <GateStatusBadge status={entry.status} label={formatStatus(entry.status)} />
      </td>
    </tr>
  );
}

function handleRowKeyDown(onClick: () => void) {
  return (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };
}

function exportSalesDispatchReport(
  report: SalesDispatchReport,
  sections: ReportSectionConfig[],
  context: {
    dateRange: { from?: string; to?: string };
    documentType: DocumentFilter;
    searchTerm: string;
  },
) {
  const workbook = XLSX.utils.book_new();
  appendExportSheet(workbook, buildSummaryRows(report, context), 'Summary');

  sections.forEach((section) => {
    appendExportSheet(
      workbook,
      section.entries.map((entry) => buildReportEntryExportRow(section.title, entry)),
      buildExcelSheetName(section.title),
    );
  });

  XLSX.writeFile(workbook, buildExportFileName(context));
}

function buildSummaryRows(
  report: SalesDispatchReport,
  context: {
    dateRange: { from?: string; to?: string };
    documentType: DocumentFilter;
    searchTerm: string;
  },
): ExportRow[] {
  return [
    { Field: 'Date From', Value: exportValue(context.dateRange.from) },
    { Field: 'Date To', Value: exportValue(context.dateRange.to) },
    { Field: 'Document Type', Value: context.documentType },
    { Field: 'Search', Value: exportValue(context.searchTerm.trim()) },
    { Field: 'Total', Value: report.counts.total },
    { Field: 'Waiting Inside', Value: report.counts.waiting_inside },
    { Field: 'Missing Photo / GPS', Value: report.counts.missing_photo },
    { Field: 'Gatepass Pending', Value: report.counts.gatepass_pending },
    { Field: 'Printed Not Committed', Value: report.counts.printed_not_committed },
    { Field: 'Ready For Dispatch', Value: report.counts.ready_for_dispatch },
    { Field: 'Dispatched', Value: report.counts.dispatched },
    { Field: 'Rejected / Cancelled', Value: report.counts.rejected_cancelled },
    { Field: 'Truck With Photo', Value: report.counts.truck_with_photo ?? 0 },
    { Field: 'Exported At', Value: formatTimestamp(new Date().toISOString()) },
  ];
}

function buildReportEntryExportRow(reportName: string, entry: SalesDispatchGateOut): ExportRow {
  return {
    Report: reportName,
    'Entry No.': exportValue(entry.entry_no),
    'SAP Documents': formatDocumentNumbers(entry),
    'Document Type': formatDocumentType(entry.document_type),
    Customer: exportValue(entry.customer_name),
    'Customer Code': exportValue(entry.customer_code),
    Vehicle: exportValue(entry.vehicle_no),
    Driver: exportValue(entry.driver_name),
    Transporter: exportValue(entry.transporter_name),
    'Actual Gate Out': formatActualGateOut(entry),
    Gatepass: exportValue(entry.gatepass_no || 'Pending'),
    Status: formatStatus(entry.status),
    'Truck Photo': entry.truck_photo ? 'Captured' : 'Missing',
    GPS: formatGps(entry),
    'Photo Uploaded At': formatTimestamp(entry.photo_uploaded_at),
    'Printed At': formatTimestamp(entry.printed_at),
    'Print Committed At': formatTimestamp(entry.print_committed_at),
    'Dispatched At': formatTimestamp(entry.dispatched_at),
    'Reject Reason': exportValue(entry.reject_reason),
    'Cancel Reason': exportValue(entry.cancel_reason),
  };
}

function appendExportSheet(workbook: XLSX.WorkBook, rows: ExportRow[], sheetName: string) {
  const safeRows = rows.length ? rows : [{ Status: 'No rows' }];
  const worksheet = XLSX.utils.json_to_sheet(safeRows);
  const columns = Object.keys(safeRows[0] || {});
  worksheet['!cols'] = columns.map((column) => {
    const width = Math.max(
      column.length,
      ...safeRows.map((row) => String(row[column] ?? '').length),
    );
    return { wch: Math.min(Math.max(width + 2, 12), 60) };
  });
  XLSX.utils.book_append_sheet(workbook, worksheet, buildExcelSheetName(sheetName));
}

function buildExcelSheetName(value: string) {
  const sheetName = value
    .replace(/[\\/?*[\]:]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return (sheetName || 'Sheet').slice(0, 31);
}

function buildExportFileName(context: {
  dateRange: { from?: string; to?: string };
  documentType: DocumentFilter;
}) {
  const fromDate = context.dateRange.from || 'all';
  const toDate = context.dateRange.to || 'all';
  return `Docking_Reports_${fromDate}_to_${toDate}_${context.documentType}.xlsx`;
}

function formatDocumentNumbers(entry: SalesDispatchGateOut) {
  if (entry.document_numbers?.length) return entry.document_numbers.join(', ');
  if (entry.sap_doc_num) return entry.sap_doc_num;
  if (entry.sap_doc_entry) return String(entry.sap_doc_entry);
  return '-';
}

function formatDocumentType(value?: string | null) {
  return value === 'STOCK_TRANSFER' ? 'Stock Transfer' : 'A/R Invoice';
}

function formatStatus(value?: string | null) {
  if (!value) return '-';
  return value.replace(/_/g, ' ');
}

function formatDateTime(date?: string | null, time?: string | null) {
  if (!date && !time) return '-';
  return [date, time].filter(Boolean).join(' ');
}

function formatActualGateOut(entry: SalesDispatchGateOut) {
  if (entry.status !== 'DISPATCHED') return '-';
  return entry.gate_out_date || entry.out_time
    ? formatDateTime(entry.gate_out_date, entry.out_time)
    : formatTimestamp(entry.dispatched_at);
}

function formatTimestamp(value?: string | null) {
  if (!value) return '-';
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return timestamp.toLocaleString();
}

function formatGps(entry: SalesDispatchGateOut) {
  if (!entry.photo_latitude || !entry.photo_longitude) return '-';
  return `${entry.photo_latitude}, ${entry.photo_longitude}`;
}

function exportValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';
  return value;
}
