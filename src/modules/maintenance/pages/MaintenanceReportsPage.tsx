import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  RefreshCw,
  Rows3,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SummaryCard } from '@/shared/components/dashboard/SummaryCard';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';

import { maintenanceApi, useMaintenanceAssets, useMaintenanceOptions, useMaintenanceReport } from '../api';
import type {
  MaintenanceReportCell,
  MaintenanceReportExportFormat,
  MaintenanceReportFilters,
  MaintenanceReportType,
} from '../types';

const REPORT_OPTIONS: Array<{ value: MaintenanceReportType; label: string }> = [
  { value: 'daily', label: 'Daily Maintenance' },
  { value: 'monthly', label: 'Monthly Maintenance' },
  { value: 'pm_compliance', label: 'PM Compliance' },
  { value: 'breakdown', label: 'Breakdown' },
  { value: 'downtime_pareto', label: 'Downtime Pareto' },
  { value: 'mttr', label: 'MTTR' },
  { value: 'mtbf', label: 'MTBF' },
  { value: 'asset_history', label: 'Asset History' },
  { value: 'spare_consumption', label: 'Spare Consumption' },
  { value: 'critical_spare', label: 'Critical Spare' },
  { value: 'vendor_visit', label: 'Vendor Visit' },
  { value: 'utility_downtime', label: 'Utility Downtime' },
];

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function titleCaseKey(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCell(value: MaintenanceReportCell | undefined) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  return String(value);
}

function fileExtension(format: MaintenanceReportExportFormat) {
  if (format === 'pdf') return 'pdf';
  if (format === 'excel') return 'xls';
  return 'csv';
}

export default function MaintenanceReportsPage() {
  const [filters, setFilters] = useState<MaintenanceReportFilters>({
    report_type: 'daily',
    date_from: isoDate(),
    date_to: isoDate(),
    department: 'ALL',
    asset: 'ALL',
    line: '',
    priority: 'ALL',
  });
  const [exporting, setExporting] = useState<MaintenanceReportExportFormat | null>(null);

  const reportQuery = useMaintenanceReport(filters);
  const optionsQuery = useMaintenanceOptions();
  const assetsQuery = useMaintenanceAssets({ is_active: true });

  const lineOptions = useMemo(() => {
    const lines = new Set<string>();
    optionsQuery.data?.locations.forEach((location) => {
      if (location.line) lines.add(location.line);
    });
    assetsQuery.data?.forEach((asset) => {
      if (asset.line) lines.add(asset.line);
    });
    return [...lines].sort();
  }, [assetsQuery.data, optionsQuery.data]);

  const summaryEntries = Object.entries(reportQuery.data?.summary ?? {});
  const visibleSummary = summaryEntries.slice(0, 8);
  const rows = reportQuery.data?.rows ?? [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const isBusy = reportQuery.isLoading || reportQuery.isFetching;

  const updateFilter = <TKey extends keyof MaintenanceReportFilters>(
    key: TKey,
    value: MaintenanceReportFilters[TKey],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleExport = async (format: MaintenanceReportExportFormat) => {
    setExporting(format);
    try {
      const blob = await maintenanceApi.exportReport(filters, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const reportType = filters.report_type ?? 'daily';
      link.href = url;
      link.download = `maintenance_${reportType}_${filters.date_from || isoDate()}.${fileExtension(format)}`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Report export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <DashboardHeader
        title="Maintenance Reports"
        subtitle={reportQuery.data?.title ?? 'Reports'}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => reportQuery.refetch()} disabled={isBusy}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={Boolean(exporting)}
            >
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('excel')}
              disabled={Boolean(exporting)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={Boolean(exporting)}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </div>
        }
      />

      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="maintenance-report-type">Report</Label>
              <NativeSelect
                id="maintenance-report-type"
                value={filters.report_type}
                onChange={(event) =>
                  updateFilter('report_type', event.target.value as MaintenanceReportType)
                }
              >
                {REPORT_OPTIONS.map((option) => (
                  <SelectOption key={option.value} value={option.value}>
                    {option.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-report-from">From</Label>
              <Input
                id="maintenance-report-from"
                type="date"
                value={filters.date_from ?? ''}
                onChange={(event) => updateFilter('date_from', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-report-to">To</Label>
              <Input
                id="maintenance-report-to"
                type="date"
                value={filters.date_to ?? ''}
                onChange={(event) => updateFilter('date_to', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-report-priority">Priority</Label>
              <NativeSelect
                id="maintenance-report-priority"
                value={filters.priority}
                onChange={(event) =>
                  updateFilter(
                    'priority',
                    event.target.value as MaintenanceReportFilters['priority'],
                  )
                }
              >
                <SelectOption value="ALL">All priorities</SelectOption>
                {optionsQuery.data?.priorities.map((priority) => (
                  <SelectOption key={priority.value} value={priority.value}>
                    {priority.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-report-department">Department</Label>
              <NativeSelect
                id="maintenance-report-department"
                value={filters.department}
                onChange={(event) =>
                  updateFilter(
                    'department',
                    event.target.value === 'ALL' ? 'ALL' : Number(event.target.value),
                  )
                }
              >
                <SelectOption value="ALL">All departments</SelectOption>
                {optionsQuery.data?.departments.map((department) => (
                  <SelectOption key={department.id} value={department.id}>
                    {department.name}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-report-asset">Asset</Label>
              <NativeSelect
                id="maintenance-report-asset"
                value={filters.asset}
                onChange={(event) =>
                  updateFilter('asset', event.target.value === 'ALL' ? 'ALL' : Number(event.target.value))
                }
              >
                <SelectOption value="ALL">All assets</SelectOption>
                {assetsQuery.data?.map((asset) => (
                  <SelectOption key={asset.id} value={asset.id}>
                    {asset.asset_code} - {asset.name}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-report-line">Line</Label>
              <NativeSelect
                id="maintenance-report-line"
                value={filters.line}
                onChange={(event) => updateFilter('line', event.target.value)}
              >
                <SelectOption value="">All lines</SelectOption>
                {lineOptions.map((line) => (
                  <SelectOption key={line} value={line}>
                    {line}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  setFilters({
                    report_type: 'daily',
                    date_from: isoDate(),
                    date_to: isoDate(),
                    department: 'ALL',
                    asset: 'ALL',
                    line: '',
                    priority: 'ALL',
                  })
                }
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                Today
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleSummary.map(([key, value]) => (
          <SummaryCard
            key={key}
            title={titleCaseKey(key)}
            value={formatCell(value)}
            icon={Rows3}
          />
        ))}
      </div>

      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-lg">
            <span>{reportQuery.data?.title ?? 'Report Rows'}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {rows.length.toLocaleString('en-IN')} rows
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-card shadow-sm dark:border-border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/80 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-slate-500 dark:[&_th]:text-muted-foreground dark:border-border dark:bg-muted/30">
                <tr>
                  {columns.length === 0 ? (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Result</th>
                  ) : (
                    columns.map((column) => (
                      <th key={column} className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {titleCaseKey(column)}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {isBusy ? (
                  <tr>
                    <td colSpan={Math.max(columns.length, 1)} className="h-24 px-4 text-center">
                      Loading report...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={Math.max(columns.length, 1)}
                      className="h-24 px-4 text-center text-muted-foreground"
                    >
                      No rows found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={`${row.work_order_no ?? row.asset_code ?? row.part_number ?? index}`} className="border-b last:border-b-0">
                      {columns.map((column) => (
                        <td key={column} className="max-w-[280px] px-4 py-3 align-top">
                          <span className="line-clamp-2">{formatCell(row[column])}</span>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
