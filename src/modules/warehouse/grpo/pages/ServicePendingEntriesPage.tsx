import { AlertCircle, ArrowLeft, ChevronRight, RefreshCw, Search, ShieldX, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { Button, Input } from '@/shared/components/ui';

import { usePendingServiceGRPOEntries } from '../api';

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatCurrency = (value?: string | null) => {
  const amount = parseFloat(value || '0');
  if (!amount) return '-';
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
};

export default function ServicePendingEntriesPage() {
  const navigate = useNavigate();
  const { data: pendingEntries = [], isLoading, refetch, error } = usePendingServiceGRPOEntries();

  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  const [search, setSearch] = useState('');

  const filteredEntries = useMemo(() => {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return pendingEntries;
    return pendingEntries.filter((entry) => {
      const haystack = [
        entry.sap_invoice_doc_num,
        entry.sap_invoice_doc_entry,
        entry.vehicle_no,
        entry.linked_vehicle_entry_no,
        entry.transporter_name,
        entry.transporter_gstin,
        entry.driver_name,
        entry.source_state,
        entry.bilty_no,
        entry.invoice_number,
      ]
        .filter((value) => value !== null && value !== undefined && value !== '')
        .join(' ')
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [pendingEntries, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate('/dispatch/bilty-grpo')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">Service GRPO Pending</h2>
          </div>
          <p className="text-muted-foreground">
            Booked dispatch vehicle bookings pending transport service GRPO
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Permission Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'You do not have permission to view pending service GRPO.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

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

      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && !error && pendingEntries.length === 0 && (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border rounded-lg">
          No booked dispatch plans pending service GRPO.
        </div>
      )}

      {!isLoading && !error && pendingEntries.length > 0 && (
        <div>
          <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bill, vehicle, transporter, driver, state, bilty, GSTIN…"
                className="pl-9 pr-9"
                aria-label="Search pending service GRPO"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <h3 className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Pending ({filteredEntries.length}
              {filteredEntries.length !== pendingEntries.length ? ` of ${pendingEntries.length}` : ''})
            </h3>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border rounded-lg">
              No entries match your search.
            </div>
          ) : (
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto max-w-full">
              <table className="w-full min-w-[1040px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Dispatch Bill</th>
                    <th className="p-3 text-left text-sm font-medium">Invoices</th>
                    <th className="p-3 text-left text-sm font-medium">State</th>
                    <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                    <th className="p-3 text-left text-sm font-medium">Transporter</th>
                    <th className="p-3 text-left text-sm font-medium">Driver</th>
                    <th className="p-3 text-left text-sm font-medium">Bilty</th>
                    <th className="p-3 text-left text-sm font-medium">Dispatch Date</th>
                    <th className="p-3 text-left text-sm font-medium">Freight</th>
                    <th className="p-3 w-8" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.dispatch_plan_id}
                      className="border-t hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dispatch/bilty-grpo/preview/${entry.dispatch_plan_id}`)}
                    >
                      <td className="p-3 text-sm font-medium whitespace-nowrap">
                        {entry.sap_invoice_doc_num || entry.sap_invoice_doc_entry}
                      </td>
                      <td className="p-3 text-sm whitespace-nowrap">
                        {entry.invoice_count || 1}
                      </td>
                      <td className="p-3 text-sm whitespace-nowrap">{entry.source_state || '-'}</td>
                      <td className="p-3 text-sm whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{entry.vehicle_no || '-'}</span>
                          {entry.linked_vehicle_entry_no && (
                            <span className="text-xs text-muted-foreground">
                              Entry {entry.linked_vehicle_entry_no}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex flex-col">
                          <span>{entry.transporter_name || '-'}</span>
                          {entry.transporter_gstin && (
                            <span className="text-xs text-muted-foreground">
                              GSTIN {entry.transporter_gstin}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm whitespace-nowrap">{entry.driver_name || '-'}</td>
                      <td className="p-3 text-sm whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{entry.bilty_no || '-'}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(entry.bilty_date)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(entry.dispatch_date)}
                      </td>
                      <td className="p-3 text-sm whitespace-nowrap">
                        {formatCurrency(entry.total_freight || entry.freight)}
                      </td>
                      <td className="p-3 text-right">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
