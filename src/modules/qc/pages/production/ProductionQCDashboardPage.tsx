import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Factory,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { QC_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api/types';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/components/ui';

import { useProductionQCList, useProductionQCRunningRuns } from '../../api/productionQC';
import type { ProductionQCRunningRun, ProductionQCSessionListItem } from '../../types';

type DisplayStatus = 'PENDING' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
type StatusFilter = 'all' | DisplayStatus;

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'SUBMITTED', label: 'Pending Approval' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const STATUS_BADGE: Record<DisplayStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  DRAFT: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
  SUBMITTED: {
    label: 'Pending Approval',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

const TYPE_BADGE: Record<string, string> = {
  FINAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  IN_PROCESS: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
};

const RESULT_BADGE: Record<string, string> = {
  PASS: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  FAIL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const LIVE_STATUS_BADGE: Record<string, string> = {
  RUNNING: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  BREAKDOWN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  STOPPED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

function runningRunQCHint(run: ProductionQCRunningRun): string {
  if (run.inprocess_qc_count === 0) return 'No QC round yet';
  const last = run.latest_inprocess_status
    ? ` · last ${run.latest_inprocess_status.toLowerCase()}`
    : '';
  return `${run.inprocess_qc_count} in-process round${run.inprocess_qc_count > 1 ? 's' : ''}${last}`;
}

function getDisplayStatus(session: ProductionQCSessionListItem): DisplayStatus {
  if (session.workflow_status === 'DRAFT' && !session.material_type) {
    return 'PENDING';
  }
  return session.workflow_status;
}

function getNavigateTo(session: ProductionQCSessionListItem, canCreateProductionQC: boolean): string {
  return getDisplayStatus(session) === 'PENDING' && canCreateProductionQC
    ? `/qc/production/runs/${session.production_run}`
    : `/qc/production/sessions/${session.id}`;
}

function getActionLabel(status: DisplayStatus, canCreateProductionQC: boolean) {
  if (status === 'PENDING') return canCreateProductionQC ? 'Select Parameters' : 'Open';
  if (status === 'DRAFT') return canCreateProductionQC ? 'Continue' : 'Open';
  if (status === 'SUBMITTED') return 'Review';
  return 'Open';
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export default function ProductionQCDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canCreateProductionQC = hasAnyPermission([QC_PERMISSIONS.PRODUCTION_QC.CREATE]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [pickLineOpen, setPickLineOpen] = useState(false);
  const { data: sessions = [], isLoading, error, refetch } = useProductionQCList();
  // Only fetch running runs while the picker is open.
  const {
    data: runningRuns = [],
    isLoading: runningRunsLoading,
    refetch: refetchRunningRuns,
  } = useProductionQCRunningRuns(undefined, pickLineOpen);

  const counts = useMemo(
    () =>
      sessions.reduce<Record<DisplayStatus, number>>(
        (acc, session) => {
          acc[getDisplayStatus(session)] += 1;
          return acc;
        },
        { PENDING: 0, DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 },
      ),
    [sessions],
  );

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sessions
      .filter((session) => {
        const displayStatus = getDisplayStatus(session);
        if (statusFilter !== 'all' && displayStatus !== statusFilter) return false;
        if (!query) return true;

        const statusLabel = STATUS_BADGE[displayStatus].label.toLowerCase();
        return (
          String(session.run_number).includes(query) ||
          session.product?.toLowerCase().includes(query) ||
          session.line_name?.toLowerCase().includes(query) ||
          session.material_type_name?.toLowerCase().includes(query) ||
          statusLabel.includes(query)
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sessions, search, statusFilter]);

  const apiError = error as ApiError | null;

  return (
    <div className="space-y-5">
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
            <h2 className="text-2xl font-bold tracking-tight">Production QC</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            FG approval requests and saved production inspections
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateProductionQC && (
            <Button size="sm" onClick={() => setPickLineOpen(true)}>
              <Factory className="h-4 w-4 mr-2" />
              Start QC on a running line
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by run #, product, line, or status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ key, label }) => (
            <Button
              key={key}
              variant={statusFilter === key ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => setStatusFilter(key)}
            >
              {label}
              {key !== 'all' && (
                <span className="ml-2 rounded-full bg-background/70 px-1.5 text-[10px] text-current">
                  {counts[key]}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 p-4 dark:bg-yellow-900/10">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
          <div className="flex-1">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
            <p className="text-sm text-muted-foreground">
              {apiError?.message || 'An error occurred while loading production QC.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && !error && filteredSessions.length === 0 && (
        <div className="flex h-24 items-center justify-center rounded-lg border text-sm text-muted-foreground">
          {sessions.length === 0 ? 'No production QC requests or inspections found' : 'No items match your filters'}
        </div>
      )}

      {!isLoading && !error && filteredSessions.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {statusFilter === 'all' ? 'All' : STATUS_BADGE[statusFilter].label} ({filteredSessions.length})
            </h3>
          </div>

          <div className="overflow-hidden rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Run</th>
                    <th className="p-3 text-left text-sm font-medium">Product</th>
                    <th className="p-3 text-left text-sm font-medium">Type</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                    <th className="p-3 text-left text-sm font-medium">Parameters</th>
                    <th className="p-3 text-left text-sm font-medium">Date/Time</th>
                    <th className="p-3 text-right text-sm font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session) => {
                    const displayStatus = getDisplayStatus(session);
                    const statusBadge = STATUS_BADGE[displayStatus];
                    const route = getNavigateTo(session, canCreateProductionQC);

                    return (
                      <tr
                        key={session.id}
                        className="cursor-pointer border-t transition-colors hover:bg-muted/50"
                        onClick={() => navigate(route)}
                      >
                        <td className="p-3 text-sm">
                          <div className="font-medium">Run #{session.run_number}</div>
                          <div className="text-xs text-muted-foreground">
                            {session.line_name} · {session.run_date}
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <div className="max-w-[280px] truncate">{session.product || '-'}</div>
                          <div className="text-xs text-muted-foreground">
                            {session.material_type_name || 'Parameters not selected'}
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[session.session_type]}`}>
                            {session.session_type === 'FINAL' ? 'Final' : 'In-Process'}
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}>
                              {statusBadge.label}
                            </span>
                            {session.overall_result && (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${RESULT_BADGE[session.overall_result]}`}>
                                {session.overall_result === 'PASS' ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                {session.overall_result}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {session.total_params > 0
                            ? `${session.pass_count}/${session.total_params} pass`
                            : '-'}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatDateTime(session.checked_at || session.created_at)}
                        </td>
                        <td className="p-3 text-right text-sm">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(route);
                            }}
                          >
                            {getActionLabel(displayStatus, canCreateProductionQC)}
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
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

      {/* Select a running line to start / continue its production QC. */}
      <Dialog open={pickLineOpen} onOpenChange={setPickLineOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select a running line</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Lines with a production run in progress. Pick one to record its QC.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => refetchRunningRuns()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {runningRunsLoading && (
              <div className="flex h-24 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}

            {!runningRunsLoading && runningRuns.length === 0 && (
              <div className="flex h-24 items-center justify-center rounded-md border text-sm text-muted-foreground">
                No production run is currently in progress.
              </div>
            )}

            {!runningRunsLoading && runningRuns.length > 0 && (
              <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                {runningRuns.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => {
                      setPickLineOpen(false);
                      navigate(`/qc/production/runs/${run.id}`);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{run.line_name}</span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            LIVE_STATUS_BADGE[run.live_status] ?? LIVE_STATUS_BADGE.STOPPED
                          }`}
                        >
                          {run.live_status}
                        </span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        Run #{run.run_number} · {run.product || 'No product'} · {run.date}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {runningRunQCHint(run)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
