import { AlertCircle, ArrowLeft, Printer, RefreshCw, Search, ShieldX, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Button, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';

import { useServiceGRPOHistory } from '../api';
import { GRPO_STATUS, GRPO_STATUS_CONFIG } from '../constants';
import { GRPOMonthFilter } from '../components';
import type { GRPOStatus } from '../types';

// Status filter buttons map to the server `status` query param (a single
// GRPOStatus value, or undefined for "all").
const STATUS_FILTERS = {
  all: { label: 'All', status: undefined as GRPOStatus | undefined },
  pending: { label: 'Pending', status: GRPO_STATUS.PENDING as GRPOStatus },
  posted: { label: 'Posted', status: GRPO_STATUS.POSTED as GRPOStatus },
  failed: { label: 'Failed', status: GRPO_STATUS.FAILED as GRPOStatus },
} as const;

type StatusFilterKey = keyof typeof STATUS_FILTERS;

const getStatusBadgeClass = (status: GRPOStatus) => {
  switch (status) {
    case GRPO_STATUS.POSTED:
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case GRPO_STATUS.FAILED:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case GRPO_STATUS.PARTIALLY_POSTED:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case GRPO_STATUS.PENDING:
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
};

const formatDateTime = (dateTime?: string | null) => {
  if (!dateTime) return '-';
  try {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTime;
  }
};

const formatDate = (date?: string | null) => {
  if (!date) return '-';
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return date;
  }
};

const formatCurrency = (value?: string | null) => {
  const amount = parseFloat(value || '0');
  if (!amount) return '-';
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
};

export default function ServiceGRPOHistoryPage({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const debouncedSearch = useDebounce(search);

  // Embedded (inside the tabbed Service GRPO page) the status filter is local
  // state, so it doesn't fight the parent's ?tab= URL param. Standalone it lives
  // in the URL.
  const [localStatus, setLocalStatus] = useState<StatusFilterKey>('all');
  const urlStatus = searchParams.get('status');
  const statusFilter: StatusFilterKey = embedded
    ? localStatus
    : urlStatus && urlStatus in STATUS_FILTERS
      ? (urlStatus as StatusFilterKey)
      : 'all';
  const currentFilter = STATUS_FILTERS[statusFilter] || STATUS_FILTERS.all;

  useEffect(() => {
    setPage(1);
  }, [year, month, debouncedSearch, statusFilter, pageSize]);

  const { data, isLoading, refetch, error } = useServiceGRPOHistory({
    page,
    page_size: pageSize,
    year,
    month,
    search: debouncedSearch || undefined,
    status: currentFilter.status,
  });

  const historyEntries = data?.results ?? [];
  const total = data?.count ?? 0;

  const handleFilterChange = (filter: StatusFilterKey) => {
    if (embedded) {
      setLocalStatus(filter);
      return;
    }
    if (filter === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ status: filter });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  return (
    <div className="service-grpo-history-page space-y-6">
      {!embedded && (
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
              <h2 className="text-3xl font-bold tracking-tight">Service GRPO History</h2>
            </div>
            <p className="text-muted-foreground">View transport service GRPO postings to SAP</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 sm:flex-none">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Search + month filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search bilty, bill, vehicle, transporter, SAP #…"
            className="pl-9 pr-9"
            aria-label="Search service GRPO history"
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
        <GRPOMonthFilter
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_FILTERS) as StatusFilterKey[]).map((key) => (
          <Button
            key={key}
            variant={statusFilter === key ? 'default' : 'outline'}
            size="sm"
            className="h-8"
            onClick={() => handleFilterChange(key)}
          >
            {STATUS_FILTERS[key].label}
          </Button>
        ))}
      </div>

      {isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Permission Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'You do not have permission to view service GRPO history.'}
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
              {apiError?.message || 'An error occurred while loading posting history.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!isPermissionError && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {currentFilter.label} ({total})
            </h3>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : historyEntries.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border rounded-lg">
              No {currentFilter.label.toLowerCase()} service postings match the current filters
            </div>
          ) : (
            <div className="rounded-md border bg-card overflow-hidden">
              <div className="service-grpo-history-print-table overflow-x-auto">
                <table className="w-full min-w-[1040px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium">Bilty</th>
                      <th className="p-3 text-left text-sm font-medium">Dispatch Bill</th>
                      <th className="p-3 text-left text-sm font-medium">Vehicle</th>
                      <th className="p-3 text-left text-sm font-medium">Transporter</th>
                      <th className="p-3 text-left text-sm font-medium">Status</th>
                      <th className="p-3 text-left text-sm font-medium">SAP GRPO</th>
                      <th className="p-3 text-right text-sm font-medium">Total</th>
                      <th className="p-3 text-right text-sm font-medium">Posted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyEntries.map((entry) => {
                      const statusConfig = GRPO_STATUS_CONFIG[entry.status];
                      const detailPath = `/dispatch/bilty-grpo/history/${entry.id}`;

                      return (
                        <tr
                          key={entry.id}
                          role="button"
                          tabIndex={0}
                          className="border-t transition-colors hover:bg-muted/40 cursor-pointer"
                          onClick={() => navigate(detailPath)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              navigate(detailPath);
                            }
                          }}
                        >
                          <td className="p-3 text-sm">
                            <div className="font-medium">{entry.bilty_no || '-'}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(entry.bilty_date)}
                            </div>
                          </td>
                          <td className="p-3 text-sm">{entry.dispatch_bill_no || '-'}</td>
                          <td className="p-3 text-sm">{entry.vehicle_no || '-'}</td>
                          <td className="p-3 text-sm">
                            {entry.transporter_name || entry.vendor_name}
                          </td>
                          <td className="p-3 text-sm">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(entry.status)}`}
                            >
                              {statusConfig?.label || entry.status}
                            </span>
                          </td>
                          <td className="p-3 text-sm">
                            <div className="font-medium">
                              {entry.bilty_no ? `Bilty #${entry.bilty_no}` : '-'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              SAP {entry.sap_doc_num || '-'}
                            </div>
                          </td>
                          <td className="p-3 text-right text-sm font-medium">
                            {formatCurrency(entry.total_amount || entry.sap_doc_total)}
                          </td>
                          <td className="p-3 text-right text-sm text-muted-foreground">
                            {formatDateTime(entry.posted_at || entry.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                page={data?.page ?? page}
                pageSize={data?.page_size ?? pageSize}
                total={total}
                totalPages={data?.total_pages ?? 1}
                isLoading={isLoading}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
