import {
  AlertCircle,
  ChevronRight,
  ClipboardCheck,
  Factory,
  FileText,
  FlaskConical,
  Package,
  RefreshCw,
  ShieldX,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { QC_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api/types';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { useLineClearances } from '@/modules/production/execution/api';
import { Button, Card, CardContent } from '@/shared/components/ui';

import { useInspectionCounts } from '../api/inspection/inspection.queries';
import { useProductionQCCounts } from '../api/productionQC';

export default function QCDashboardPage() {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();
  const { hasAnyPermission } = usePermission();

  const canViewArrivalSlips = hasAnyPermission([QC_PERMISSIONS.INSPECTION.VIEW]);
  const canViewProductionQC = hasAnyPermission([QC_PERMISSIONS.PRODUCTION_QC.VIEW]);
  const canViewLineClearance = hasAnyPermission([
    QC_PERMISSIONS.LINE_CLEARANCE_QC.VIEW,
    QC_PERMISSIONS.LINE_CLEARANCE_QC.APPROVE,
  ]);
  const canManageMaterialTypes = hasAnyPermission([
    QC_PERMISSIONS.MASTER_DATA.MANAGE_MATERIAL_TYPES,
  ]);
  const canManageQCParameters = hasAnyPermission([
    QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS,
  ]);
  const canViewMasterData = canManageMaterialTypes || canManageQCParameters;

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
  } = useInspectionCounts(dateParams, canViewArrivalSlips);

  const { data: prodQCCounts, isLoading: prodQCLoading } =
    useProductionQCCounts(canViewProductionQC);

  const { data: submittedClearances = [] } = useLineClearances(
    undefined,
    'SUBMITTED',
    canViewLineClearance,
  );

  const isLoading = countsLoading || prodQCLoading;
  const error = countsError;
  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  const arrivalPending = (countsData?.not_started ?? 0) + (countsData?.draft ?? 0);
  const arrivalAwaiting = (countsData?.awaiting_chemist ?? 0) + (countsData?.awaiting_qam ?? 0);

  const prodDraft = prodQCCounts?.draft ?? 0;
  const prodSubmitted = prodQCCounts?.submitted ?? 0;
  const prodApproved = prodQCCounts?.approved ?? 0;
  const prodRejected = prodQCCounts?.rejected ?? 0;

  return (
    <div className="space-y-6">
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
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {isPermissionError && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <ShieldX className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-destructive">Permission Denied</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {apiError?.message || 'You do not have permission to view this data.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchCounts()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {error && !isPermissionError && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-500/10">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {apiError?.message || 'An error occurred while loading the dashboard.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchCounts()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {canViewArrivalSlips && (
              <Card
                className="cursor-pointer border-l-4 border-l-blue-500 transition-shadow hover:shadow-md"
                onClick={() => navigate('/qc/arrival-slips')}
              >
                <CardContent className="p-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-500/10">
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
                    <div className="rounded-md bg-yellow-50 p-2 text-center dark:bg-yellow-500/10">
                      <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                        {arrivalPending}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Pending</p>
                    </div>
                    <div className="rounded-md bg-blue-50 p-2 text-center dark:bg-blue-500/10">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {arrivalAwaiting}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Awaiting</p>
                    </div>
                    <div className="rounded-md bg-green-50 p-2 text-center dark:bg-green-500/10">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {countsData?.completed ?? 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {canViewProductionQC && (
              <Card
                className="cursor-pointer border-l-4 border-l-emerald-500 transition-shadow hover:shadow-md"
                onClick={() => navigate('/qc/production')}
              >
                <CardContent className="p-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-500/10">
                        <Factory className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Production QC</h3>
                        <p className="text-xs text-muted-foreground">
                          In-process & final QC checks
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-md bg-gray-50 p-2 text-center dark:bg-muted/40">
                      <p className="text-lg font-bold text-gray-600 dark:text-muted-foreground">
                        {prodDraft}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Draft</p>
                    </div>
                    <div className="rounded-md bg-blue-50 p-2 text-center dark:bg-blue-500/10">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {prodSubmitted}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Submitted</p>
                    </div>
                    <div className="rounded-md bg-green-50 p-2 text-center dark:bg-green-500/10">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {prodApproved}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Approved</p>
                    </div>
                    <div className="rounded-md bg-red-50 p-2 text-center dark:bg-red-500/10">
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {prodRejected}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Rejected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Line Clearance QA Card */}
            {canViewLineClearance && (
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-amber-500"
                onClick={() => navigate('/qc/line-clearance')}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
                        <ClipboardCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Line Clearance QA</h3>
                        <p className="text-xs text-muted-foreground">
                          Pre-production clearance approvals
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="text-center p-2 rounded-md bg-amber-50 dark:bg-amber-500/10">
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                        {submittedClearances.length}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Pending Approval</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {canViewMasterData && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Master Data</h3>
              <div className="grid grid-cols-2 gap-3">
                {canManageMaterialTypes && (
                  <Button
                    variant="outline"
                    className="flex h-auto flex-col items-center gap-1 py-3"
                    onClick={() => navigate('/qc/master/material-types')}
                  >
                    <ClipboardCheck className="h-5 w-5" />
                    <span className="text-xs">Material Types</span>
                  </Button>
                )}
                {canManageQCParameters && (
                  <Button
                    variant="outline"
                    className="flex h-auto flex-col items-center gap-1 py-3"
                    onClick={() => navigate('/qc/master/parameters')}
                  >
                    <FlaskConical className="h-5 w-5" />
                    <span className="text-xs">QC Parameters</span>
                  </Button>
                )}
                {canManageQCParameters && (
                  <Button
                    variant="outline"
                    className="flex h-auto flex-col items-center gap-1 py-3"
                    onClick={() => navigate('/qc/master/print-documents')}
                  >
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">Print Documents</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
