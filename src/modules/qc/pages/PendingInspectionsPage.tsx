import { AlertCircle, ArrowLeft, ChevronRight, RefreshCw, ShieldX } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { Button } from '@/shared/components/ui';

import {
  useCompletedInspections,
  useInspections,
  usePendingInspections,
  useRejectedInspections,
} from '../api/inspection/inspection.queries';
import { WORKFLOW_STATUS, WORKFLOW_STATUS_CONFIG } from '../constants';
import type { Inspection, InspectionWorkflowStatus, PendingInspection } from '../types';

// Tab metadata (no filter functions - backend handles filtering)
const TAB_CONFIG = {
  all: {
    label: 'All',
    title: 'All Inspections',
    description: 'All inspections',
  },
  actionable: {
    label: 'Actionable',
    title: 'Pending Actions',
    description: 'Items requiring attention',
  },
  pending: {
    label: 'Pending',
    title: 'Pending Inspections',
    description: 'Arrival slips awaiting QC inspection',
  },
  draft: {
    label: 'Draft',
    title: 'Draft Inspections',
    description: 'Inspections started but not submitted',
  },
  approved: {
    label: 'Approved',
    title: 'Approved Inspections',
    description: 'Completed and approved inspections',
  },
  rejected: {
    label: 'Rejected',
    title: 'Rejected Inspections',
    description: 'Rejected inspections',
  },
} as const;

type StatusFilterKey = keyof typeof TAB_CONFIG;
const TAB_KEYS = Object.keys(TAB_CONFIG) as StatusFilterKey[];

// Normalized item for rendering rows (works for both PendingInspection and Inspection)
interface NormalizedItem {
  id: number;
  entryNo: string;
  reportNo?: string;
  itemName: string;
  partyName: string;
  statusLabel: string;
  statusBadgeClass: string;
  submittedAt: string | null;
  navigateTo: string;
  billingQty?: string;
  billingUom?: string;
}

// Status badge styling
const getStatusBadgeClass = (status: string | null, hasInspection: boolean) => {
  if (!hasInspection) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
  switch (status) {
    case WORKFLOW_STATUS.DRAFT:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    case WORKFLOW_STATUS.SUBMITTED:
    case WORKFLOW_STATUS.QA_CHEMIST_APPROVED:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case WORKFLOW_STATUS.QAM_APPROVED:
    case WORKFLOW_STATUS.COMPLETED:
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

function normalizePendingItem(item: PendingInspection): NormalizedItem {
  const status = item.has_inspection ? item.inspection_status : null;
  const statusConfig = status ? WORKFLOW_STATUS_CONFIG[status as InspectionWorkflowStatus] : null;

  return {
    id: item.arrival_slip.id,
    entryNo: item.arrival_slip.entry_no,
    itemName: item.arrival_slip.item_name,
    partyName: item.arrival_slip.party_name,
    statusLabel: statusConfig ? statusConfig.label : 'Pending',
    statusBadgeClass: getStatusBadgeClass(status, item.has_inspection),
    submittedAt: item.arrival_slip.submitted_at,
    navigateTo: item.has_inspection
      ? `/qc/inspections/${item.arrival_slip.id}`
      : `/qc/inspections/${item.arrival_slip.id}/new`,
    billingQty: item.arrival_slip.billing_qty,
    billingUom: item.arrival_slip.billing_uom,
  };
}

function normalizeInspectionItem(item: Inspection): NormalizedItem {
  const statusConfig = WORKFLOW_STATUS_CONFIG[item.workflow_status];

  return {
    id: item.id,
    entryNo: item.entry_no,
    reportNo: item.report_no,
    itemName: item.item_name,
    partyName: item.supplier_name,
    statusLabel: statusConfig?.label || item.workflow_status,
    statusBadgeClass: getStatusBadgeClass(item.workflow_status, true),
    submittedAt: item.created_at,
    navigateTo: `/qc/inspections/${item.arrival_slip}`,
  };
}

export default function PendingInspectionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();

  const dateParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
    }),
    [dateRange],
  );

  // Get status filter from URL
  const statusFilter = (searchParams.get('status') as StatusFilterKey) || 'all';
  const currentTab = TAB_CONFIG[statusFilter] || TAB_CONFIG.all;

  // Fetch data from appropriate backend endpoints
  const {
    data: allInspections = [],
    isLoading: allLoading,
    error: allError,
    refetch: refetchAll,
  } = useInspections(dateParams);

  const {
    data: pendingItems = [],
    isLoading: pendingLoading,
    error: pendingError,
    refetch: refetchPending,
  } = usePendingInspections(dateParams);

  const {
    data: completedItems = [],
    isLoading: completedLoading,
    error: completedError,
    refetch: refetchCompleted,
  } = useCompletedInspections(dateParams);

  const {
    data: rejectedItems = [],
    isLoading: rejectedLoading,
    error: rejectedError,
    refetch: refetchRejected,
  } = useRejectedInspections(dateParams);

  // Select data based on active tab
  const { items, isLoading, error } = useMemo(() => {
    switch (statusFilter) {
      case 'all': {
        // Merge inspections with pending arrival slips that don't have inspections yet
        const inspectionItems = allInspections.map(normalizeInspectionItem);
        const slipIdsWithInspections = new Set(allInspections.map((i) => i.arrival_slip));
        const pendingWithoutInspection = pendingItems
          .filter((p) => !p.has_inspection && !slipIdsWithInspections.has(p.arrival_slip.id))
          .map(normalizePendingItem);
        return {
          items: [...inspectionItems, ...pendingWithoutInspection],
          isLoading: allLoading || pendingLoading,
          error: allError || pendingError,
        };
      }
      case 'pending':
        return {
          items: pendingItems.filter((p) => !p.has_inspection).map(normalizePendingItem),
          isLoading: pendingLoading,
          error: pendingError,
        };
      case 'draft':
        return {
          items: pendingItems
            .filter((p) => p.has_inspection && p.inspection_status === WORKFLOW_STATUS.DRAFT)
            .map(normalizePendingItem),
          isLoading: pendingLoading,
          error: pendingError,
        };
      case 'actionable':
        return {
          items: pendingItems
            .filter(
              (p) =>
                !p.has_inspection ||
                p.inspection_status === WORKFLOW_STATUS.DRAFT ||
                p.inspection_status === WORKFLOW_STATUS.SUBMITTED ||
                p.inspection_status === WORKFLOW_STATUS.QA_CHEMIST_APPROVED,
            )
            .map(normalizePendingItem),
          isLoading: pendingLoading,
          error: pendingError,
        };
      case 'approved':
        return {
          items: completedItems.map(normalizeInspectionItem),
          isLoading: completedLoading,
          error: completedError,
        };
      case 'rejected':
        return {
          items: rejectedItems.map(normalizeInspectionItem),
          isLoading: rejectedLoading,
          error: rejectedError,
        };
      default: {
        const defaultInspectionItems = allInspections.map(normalizeInspectionItem);
        const defaultSlipIds = new Set(allInspections.map((i) => i.arrival_slip));
        const defaultPending = pendingItems
          .filter((p) => !p.has_inspection && !defaultSlipIds.has(p.arrival_slip.id))
          .map(normalizePendingItem);
        return {
          items: [...defaultInspectionItems, ...defaultPending],
          isLoading: allLoading || pendingLoading,
          error: allError || pendingError,
        };
      }
    }
  }, [
    statusFilter,
    allInspections,
    pendingItems,
    completedItems,
    rejectedItems,
    allLoading,
    pendingLoading,
    completedLoading,
    rejectedLoading,
    allError,
    pendingError,
    completedError,
    rejectedError,
  ]);

  // Check if error is a permission error (403)
  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  // Handle filter change
  const handleFilterChange = (filter: StatusFilterKey) => {
    if (filter === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ status: filter });
    }
  };

  const refetch = () => {
    refetchAll();
    refetchPending();
    refetchCompleted();
    refetchRejected();
  };

  // Format date/time - consistent with Gate module
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
            <h2 className="text-3xl font-bold tracking-tight">{currentTab.title}</h2>
          </div>
          <p className="text-muted-foreground">{currentTab.description}</p>
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
            onClick={() => refetch()}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {TAB_KEYS.map((key) => (
          <Button
            key={key}
            variant={statusFilter === key ? 'default' : 'outline'}
            size="sm"
            className="h-8"
            onClick={() => handleFilterChange(key)}
          >
            {TAB_CONFIG[key].label}
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
              {apiError?.message || 'You do not have permission to view pending inspections.'}
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
      {!isLoading && !error && items.length === 0 && (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border rounded-lg">
          No {currentTab.label.toLowerCase()} inspections
        </div>
      )}

      {/* Inspections List */}
      {!isLoading && !error && items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {currentTab.label} ({items.length})
            </h3>
          </div>

          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-3 py-2 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(item.navigateTo)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="font-medium text-sm">{item.reportNo || item.entryNo}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0 ${item.statusBadgeClass}`}
                  >
                    {item.statusLabel}
                  </span>
                  <span className="text-xs text-muted-foreground hidden md:inline truncate">
                    {item.itemName} • {item.partyName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {item.billingQty && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {item.billingQty} {item.billingUom}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(item.submittedAt)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
