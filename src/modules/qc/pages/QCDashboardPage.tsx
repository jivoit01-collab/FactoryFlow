import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  FlaskConical,
  Plus,
  RefreshCw,
  ShieldX,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { Button, Card, CardContent } from '@/shared/components/ui';

import {
  useActionableInspections,
  useInspectionCounts,
} from '../api/inspection/inspection.queries';
import { WORKFLOW_STATUS_CONFIG } from '../constants';
import type { InspectionListItem, InspectionListWorkflowStatus } from '../types';

// Status configuration - compact like Gate module
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    icon: Clock,
    link: '/qc/pending?status=pending',
  },
  draft: {
    label: 'Draft',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
    icon: FileText,
    link: '/qc/pending?status=draft',
  },
  awaiting_approval: {
    label: 'Awaiting',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: UserCheck,
    link: '/qc/approvals',
  },
  approved: {
    label: 'Approved',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: CheckCircle2,
    link: '/qc/pending?status=approved',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: XCircle,
    link: '/qc/pending?status=rejected',
  },
};

const STATUS_ORDER = ['pending', 'draft', 'awaiting_approval', 'approved', 'rejected'] as const;

// Status badge styling
const STATUS_BADGE_CLASSES: Record<InspectionListWorkflowStatus, string> = {
  NOT_STARTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  QA_CHEMIST_APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  QAM_APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function getNavigateTo(item: InspectionListItem): string {
  return item.inspection_id
    ? `/qc/inspections/${item.arrival_slip_id}`
    : `/qc/inspections/${item.arrival_slip_id}/new`;
}

export default function QCDashboardPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();

  const dateParams = useMemo(
    () => ({
      from_date: dateRange.from,
      to_date: dateRange.to,
    }),
    [dateRange],
  );

  // Single lightweight query for all counts
  const {
    data: countsData,
    isLoading: countsLoading,
    error: countsError,
    refetch: refetchCounts,
  } = useInspectionCounts(dateParams);

  // Actionable items for "Recent Arrival Slips" section
  const {
    data: recentItems = [],
    isLoading: recentLoading,
    error: recentError,
  } = useActionableInspections(dateParams);

  const isLoading = countsLoading || recentLoading;
  const error = countsError || recentError;

  // Check if error is a permission error (403)
  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  // Map counts to dashboard status keys
  const counts = {
    pending: countsData?.not_started ?? 0,
    draft: countsData?.draft ?? 0,
    awaiting_approval: (countsData?.awaiting_chemist ?? 0) + (countsData?.awaiting_qam ?? 0),
    approved: countsData?.completed ?? 0,
    rejected: countsData?.rejected ?? 0,
  };

  const totalPending = counts.pending + counts.draft + counts.awaiting_approval;

  const refetch = () => {
    refetchCounts();
  };

  // Format date/time for display - consistent with Gate module
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
          <h2 className="text-3xl font-bold tracking-tight">Quality Control</h2>
          <p className="text-muted-foreground">
            Manage raw material inspections and quality approvals
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
          <Button onClick={() => navigate('/qc/pending')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Start Inspection
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Permission Error */}
          {isPermissionError && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
              <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-destructive">Permission Denied</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {apiError?.message || 'You do not have permission to view this data.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* General API Error */}
          {error && !isPermissionError && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {apiError?.message || 'An error occurred while loading the dashboard.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Summary Card - Compact like PersonGateInDashboard */}
          <Card
            className="bg-primary/5 border-primary/20 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/qc/pending?status=actionable')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Pending Actions</span>
                </div>
                <span className="text-3xl font-bold text-primary">{totalPending}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                      {counts.pending}
                    </span>{' '}
                    Pending
                  </span>
                  <span>
                    <span className="font-semibold text-gray-600 dark:text-gray-400">
                      {counts.draft}
                    </span>{' '}
                    Draft
                  </span>
                  <span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {counts.awaiting_approval}
                    </span>{' '}
                    Awaiting
                  </span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Entries - Compact like RawMaterialsDashboard */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Arrival Slips</h3>
              <button
                onClick={() => navigate('/qc/pending')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Show more
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {recentItems.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-sm text-muted-foreground border rounded-lg">
                No arrival slips yet
              </div>
            ) : (
              <div className="space-y-2">
                {recentItems.slice(0, 3).map((item) => {
                  const statusConfig = WORKFLOW_STATUS_CONFIG[item.workflow_status];
                  const badgeClass =
                    STATUS_BADGE_CLASSES[item.workflow_status] ||
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';

                  return (
                    <div
                      key={item.arrival_slip_id}
                      className="flex items-center justify-between px-3 py-2 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(getNavigateTo(item))}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-medium text-sm">{item.entry_no}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badgeClass}`}
                        >
                          {statusConfig?.label || item.workflow_status}
                        </span>
                        <span className="text-xs text-muted-foreground hidden sm:inline truncate">
                          {item.item_name} • {item.party_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(item.submitted_at)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status Overview - Compact grid like RawMaterialsDashboard */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Status Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {STATUS_ORDER.map((statusKey) => {
                const config = STATUS_CONFIG[statusKey];
                const Icon = config.icon;
                const count = counts[statusKey] || 0;

                return (
                  <Card
                    key={statusKey}
                    className={`${config.bgColor} border cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => navigate(config.link)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span className={`text-xl font-bold ${config.color}`}>{count}</span>
                      </div>
                      <p className={`mt-1 text-xs font-medium ${config.color}`}>{config.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Quick Actions - Compact button grid like PersonGateInDashboard */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate('/qc/master/material-types')}
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs">Material Types</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate('/qc/master/parameters')}
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs">QC Parameters</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
