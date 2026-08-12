import { AlertCircle, ArrowLeft, ChevronRight, RefreshCw, Search, ShieldX, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Button, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';

import { useGRPOHistory } from '../api';
import { GRPOMonthFilter } from '../components';
import { GRPO_STATUS, GRPO_STATUS_CONFIG } from '../constants';
import type { GRPOStatus } from '../types';

// Status filter buttons map to the server `status` query param (a single
// GRPOStatus value, or undefined for "all").
const STATUS_FILTERS = {
  all: { label: 'All', status: undefined as GRPOStatus | undefined },
  drafts: { label: 'Drafts', status: GRPO_STATUS.DRAFT as GRPOStatus },
  posted: { label: 'Posted', status: GRPO_STATUS.POSTED as GRPOStatus },
  failed: { label: 'Failed', status: GRPO_STATUS.FAILED as GRPOStatus },
} as const;

type StatusFilterKey = keyof typeof STATUS_FILTERS;

// Status badge styling
const getStatusBadgeClass = (status: GRPOStatus) => {
  switch (status) {
    case GRPO_STATUS.POSTED:
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case GRPO_STATUS.FAILED:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case GRPO_STATUS.PARTIALLY_POSTED:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case GRPO_STATUS.DRAFT:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300';
    case GRPO_STATUS.PENDING:
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
};

// Format date/time for display
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

export default function GRPOHistoryPage({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const debouncedSearch = useDebounce(search);

  // Embedded (inside the unified GRPO page) the status filter is local state, so
  // it doesn't fight the parent's ?tab= URL param. Standalone it lives in the URL.
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

  const { data, isLoading, refetch, error } = useGRPOHistory({
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

  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  return (
    <div className="space-y-6">
      {/* Header */}
      {!embedded && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navigate('/warehouse/grpo/material')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-3xl font-bold tracking-tight">Posting History</h2>
            </div>
            <p className="text-muted-foreground">View all GRPO postings to SAP</p>
          </div>
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
      )}

      {/* Search + month filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search entry, PO, SAP #, status…"
            className="pl-9 pr-9"
            aria-label="Search posting history"
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

      {/* Filter Tabs */}
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

      {/* Permission Error */}
      {isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Permission Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'You do not have permission to view posting history.'}
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
              No {currentFilter.label.toLowerCase()} postings match the current filters
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="space-y-2 p-2">
                {historyEntries.map((entry) => {
                  const statusConfig = GRPO_STATUS_CONFIG[entry.status];

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between px-3 py-2 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/warehouse/grpo/material/history/${entry.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="font-medium text-sm">{entry.entry_no}</span>
                        <span className="text-xs text-muted-foreground">{entry.po_number}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0 ${getStatusBadgeClass(entry.status)}`}
                        >
                          {statusConfig?.label || entry.status}
                        </span>
                        {entry.sap_doc_num && (
                          <span className="text-xs text-muted-foreground hidden md:inline">
                            SAP #{entry.sap_doc_num}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {(entry.status === GRPO_STATUS.FAILED ||
                          entry.status === GRPO_STATUS.PARTIALLY_POSTED ||
                          entry.status === GRPO_STATUS.DRAFT) &&
                          !entry.is_superseded && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Hydrate the preview form from this saved posting
                                // (payload + attachments) so it can be edited & re-posted.
                                navigate(
                                  `/warehouse/grpo/material/preview/${entry.vehicle_entry}?draft=${entry.id}`,
                                );
                              }}
                            >
                              <RefreshCw className="h-3 w-3" />
                              {entry.status === GRPO_STATUS.DRAFT ? 'Resume' : 'Retry'}
                            </Button>
                          )}
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(entry.posted_at || entry.created_at)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
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
