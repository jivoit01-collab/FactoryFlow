import { AlertCircle, ArrowLeft, ChevronRight, RefreshCw, ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { getEntryStatusClasses } from '@/config/constants';
import type { ApiError } from '@/core/api/types';
import { Button } from '@/shared/components/ui';

import { usePendingGRPOEntries } from '../api';

// Format date/time for display
const formatDateTime = (dateTime?: string) => {
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

// Format date-only (PO posting date, no time component)
const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function PendingEntriesPage() {
  const navigate = useNavigate();
  const { data: pendingEntries = [], isLoading, refetch, error } = usePendingGRPOEntries();

  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

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
              onClick={() => navigate('/grpo')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">Pending Entries</h2>
          </div>
          <p className="text-muted-foreground">Gate entries with POs pending GRPO posting to SAP</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Permission Error */}
      {isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Permission Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'You do not have permission to view pending entries.'}
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
              {apiError?.message || 'An error occurred while loading pending entries.'}
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
      {!isLoading && !error && pendingEntries.length === 0 && (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border rounded-lg">
          No pending entries. All gate entries have been posted.
        </div>
      )}

      {/* Entries Table */}
      {!isLoading && !error && pendingEntries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Pending ({pendingEntries.length})
            </h3>
          </div>

          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto max-w-full">
              <table className="w-full min-w-[800px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Entry No.</th>
                    <th className="p-3 text-left text-sm font-medium">Supplier(s)</th>
                    <th className="p-3 text-left text-sm font-medium">PO Numbers</th>
                    <th className="p-3 text-left text-sm font-medium">POs</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                    <th className="p-3 text-left text-sm font-medium">PO Date</th>
                    <th className="p-3 text-left text-sm font-medium">Entry Time</th>
                    <th className="p-3 w-8" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {pendingEntries.map((entry) => {
                    const suppliers = entry.suppliers ?? [];
                    const poNumbers = suppliers.flatMap((s) =>
                      s.po_receipts.map((r) => r.po_number),
                    );
                    return (
                      <tr
                        key={entry.vehicle_entry_id}
                        className="border-t hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/grpo/preview/${entry.vehicle_entry_id}`)}
                      >
                        <td className="p-3 text-sm font-medium whitespace-nowrap">
                          {entry.entry_no}
                        </td>
                        <td className="p-3 text-sm">
                          {suppliers.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {suppliers.map((s) => (
                                <span key={s.supplier_code} className="truncate">
                                  <span className="font-medium">{s.supplier_name}</span>
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({s.supplier_code})
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {poNumbers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {poNumbers.map((po) => (
                                <span
                                  key={po}
                                  className="inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-mono bg-muted/40"
                                >
                                  {po}
                                </span>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            {entry.pending_po_count}/{entry.total_po_count} POs
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getEntryStatusClasses(
                              entry.status || '',
                            )}`}
                          >
                            {entry.status || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(entry.po_date)}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(entry.entry_time)}
                        </td>
                        <td className="p-3 text-right">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
