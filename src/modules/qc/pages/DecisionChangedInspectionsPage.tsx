import { AlertCircle, ArrowLeft, Download, History, RefreshCw, Search, ShieldX } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

import type { ApiError } from '@/core/api/types';
import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { Button, Input } from '@/shared/components/ui';

import { useDecisionChangedInspections } from '../api/inspection/inspection.queries';
import { DECISION_STATUS_CONFIG } from '../constants';
import type { InspectionDecisionInfo, InspectionListItem } from '../types';

function getNavigateTo(item: InspectionListItem): string {
  return item.inspection_id
    ? `/qc/inspections/${item.arrival_slip_id}`
    : `/qc/inspections/${item.arrival_slip_id}/new`;
}

function getDecisionBadge(decision?: InspectionDecisionInfo | null) {
  const decisionKey = decision?.decision ?? 'PENDING';
  const config = DECISION_STATUS_CONFIG[decisionKey];

  return {
    label: decision?.label || config.label,
    className: `${config.bgColor} ${config.color}`,
  };
}

// Number of times the manager changed their decision (first decision isn't a change).
function getTimesChanged(item: InspectionListItem): number {
  return Math.max((item.manager_decision_count ?? 1) - 1, 0);
}

export default function DecisionChangedInspectionsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();

  const dateParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
    }),
    [dateRange],
  );

  const { data: items = [], isLoading, error, refetch } = useDecisionChangedInspections(dateParams);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const searchLower = search.toLowerCase();
    return items.filter(
      (item) =>
        item.entry_no?.toLowerCase().includes(searchLower) ||
        item.party_name?.toLowerCase().includes(searchLower) ||
        item.po_item_code?.toLowerCase().includes(searchLower) ||
        item.item_name?.toLowerCase().includes(searchLower) ||
        item.report_no?.toLowerCase().includes(searchLower) ||
        item.internal_lot_no?.toLowerCase().includes(searchLower) ||
        item.material_type_name?.toLowerCase().includes(searchLower) ||
        item.manager_decision?.label?.toLowerCase().includes(searchLower),
    );
  }, [items, search]);

  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  const handleExportExcel = useCallback(() => {
    if (filteredItems.length === 0) return;

    const rows = filteredItems.map((item) => ({
      'Gate Entry No.': item.entry_no || '-',
      Vendor: item.party_name || '-',
      'SAP Material Code': item.po_item_code || '-',
      'SAP Material': item.item_name || '-',
      'Report No.': item.report_no || '-',
      'Internal Lot No.': item.internal_lot_no || '-',
      'Material Type': item.material_type_name || '-',
      'Times Changed': getTimesChanged(item),
      'Current Manager Decision': item.manager_decision?.label || 'Pending',
      'Date/Time':
        item.submitted_at || item.created_at
          ? new Date(item.submitted_at || item.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0]).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...rows.map((r) => String(r[key as keyof typeof r] ?? '').length),
      );
      return { wch: maxLen + 2 };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Decision Changes');

    const fileName = `Decision_Changes_${dateRange.from || 'all'}_to_${dateRange.to || 'all'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [filteredItems, dateRange]);

  const formatDateTime = (dateTime?: string | null) => {
    if (!dateTime) return '-';
    try {
      const date = new Date(dateTime);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateTime;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate('/qc')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">Decision Changes</h2>
          </div>
          <p className="text-muted-foreground">
            Inspections where the QA Manager changed their decision at least once
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={filteredItems.length === 0 || isLoading}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search Field */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search entry, vendor, SAP material, report, lot, or decision..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Permission Error */}
      {isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Permission Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'You do not have permission to view inspections.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* General Error */}
      {error && !isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'An error occurred while loading inspections.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredItems.length === 0 && (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border rounded-lg">
          {items.length === 0
            ? 'No inspections with changed manager decisions'
            : 'No inspections match your search'}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && filteredItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Decision Changes ({filteredItems.length})
            </h3>
          </div>

          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto max-w-full">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Gate Entry No.</th>
                    <th className="p-3 text-left text-sm font-medium">Vendor</th>
                    <th className="p-3 text-left text-sm font-medium">SAP Material</th>
                    <th className="p-3 text-left text-sm font-medium">Report No.</th>
                    <th className="p-3 text-left text-sm font-medium">Internal Lot No.</th>
                    <th className="p-3 text-left text-sm font-medium">Material Type</th>
                    <th className="p-3 text-left text-sm font-medium">Times Changed</th>
                    <th className="p-3 text-left text-sm font-medium">Current Decision</th>
                    <th className="p-3 text-left text-sm font-medium">Date/Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const managerBadge = getDecisionBadge(item.manager_decision);
                    const timesChanged = getTimesChanged(item);

                    return (
                      <tr
                        key={item.arrival_slip_id}
                        className="border-t hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(getNavigateTo(item))}
                      >
                        <td className="p-3 text-sm font-medium">{item.entry_no || '-'}</td>
                        <td className="p-3 text-sm">
                          <div className="max-w-[220px] truncate" title={item.party_name || '-'}>
                            {item.party_name || '-'}
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <div className="max-w-[260px]">
                            <div
                              className="truncate font-mono text-xs font-medium text-muted-foreground"
                              title={item.po_item_code || '-'}
                            >
                              {item.po_item_code || '-'}
                            </div>
                            <div className="truncate" title={item.item_name || '-'}>
                              {item.item_name || '-'}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{item.report_no || '-'}</td>
                        <td className="p-3 text-sm">{item.internal_lot_no || '-'}</td>
                        <td className="p-3 text-sm">{item.material_type_name || '-'}</td>
                        <td className="p-3 text-sm">
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                            <History className="h-3 w-3" />
                            {timesChanged}×
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${managerBadge.className}`}
                          >
                            {managerBadge.label}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatDateTime(item.submitted_at || item.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
