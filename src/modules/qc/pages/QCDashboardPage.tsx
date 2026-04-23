import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Factory,
  FileText,
  FlaskConical,
  Package,
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
  useInspectionCounts,
} from '../api/inspection/inspection.queries';
import { useProductionQCCounts } from '../api/productionQC';
import { useLineClearances } from '@/modules/production/execution/api';
import { WORKFLOW_STATUS_CONFIG } from '../constants';
import type { InspectionListWorkflowStatus } from '../types';

// Status badge styling for arrival slips
const STATUS_BADGE_CLASSES: Record<InspectionListWorkflowStatus, string> = {
  NOT_STARTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  QA_CHEMIST_APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  QAM_APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

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

  const {
    data: countsData,
    isLoading: countsLoading,
    error: countsError,
    refetch: refetchCounts,
  } = useInspectionCounts(dateParams);

  const {
    data: prodQCCounts,
    isLoading: prodQCLoading,
  } = useProductionQCCounts();

  const { data: submittedClearances = [] } = useLineClearances(undefined, 'SUBMITTED');

  const isLoading = countsLoading || prodQCLoading;
  const error = countsError;
  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  // Arrival slip counts
  const arrivalPending = (countsData?.not_started ?? 0) + (countsData?.draft ?? 0);
  const arrivalAwaiting = (countsData?.awaiting_chemist ?? 0) + (countsData?.awaiting_qam ?? 0);

  // Production QC counts
  const prodDraft = prodQCCounts?.draft ?? 0;
  const prodSubmitted = prodQCCounts?.submitted ?? 0;
  const prodApproved = prodQCCounts?.approved ?? 0;
  const prodRejected = prodQCCounts?.rejected ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quality Control</h2>
          <p className="text-muted-foreground">
            Manage inspections, production quality checks, and master data
          </p>
        </div>
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
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Error states */}
          {isPermissionError && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
              <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-destructive">Permission Denied</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {apiError?.message || 'You do not have permission to view this data.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchCounts()}>
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
                  {apiError?.message || 'An error occurred while loading the dashboard.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchCounts()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Submodule Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Arrival Slips Card */}
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
              onClick={() => navigate('/qc/arrival-slips')}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Arrival Slips</h3>
                      <p className="text-xs text-muted-foreground">Raw material inspections</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/10">
                    <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {arrivalPending}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-blue-50 dark:bg-blue-900/10">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {arrivalAwaiting}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Awaiting</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-green-50 dark:bg-green-900/10">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {countsData?.completed ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Production QC Card */}
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-emerald-500"
              onClick={() => navigate('/qc/production')}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <Factory className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Production QC</h3>
                      <p className="text-xs text-muted-foreground">In-process & final QC checks</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 rounded-md bg-gray-50 dark:bg-gray-900/10">
                    <p className="text-lg font-bold text-gray-600 dark:text-gray-400">
                      {prodDraft}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Draft</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-blue-50 dark:bg-blue-900/10">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {prodSubmitted}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Submitted</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-green-50 dark:bg-green-900/10">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {prodApproved}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Approved</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-red-50 dark:bg-red-900/10">
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {prodRejected}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Line Clearance QA Card */}
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-amber-500"
              onClick={() => navigate('/qc/line-clearance')}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                      <ClipboardCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Line Clearance QA</h3>
                      <p className="text-xs text-muted-foreground">Pre-production clearance approvals</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="text-center p-2 rounded-md bg-amber-50 dark:bg-amber-900/10">
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {submittedClearances.length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Pending Approval</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Master Data Quick Links */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Master Data</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate('/qc/master/material-types')}
              >
                <ClipboardCheck className="h-5 w-5" />
                <span className="text-xs">Material Types</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate('/qc/master/parameters')}
              >
                <FlaskConical className="h-5 w-5" />
                <span className="text-xs">QC Parameters</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
