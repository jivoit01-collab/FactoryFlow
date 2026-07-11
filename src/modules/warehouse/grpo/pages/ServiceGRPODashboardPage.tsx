import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  History,
  List,
  RefreshCw,
  ShieldX,
  Truck,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { Button, Card, CardContent } from '@/shared/components/ui';

import { usePendingServiceGRPOEntries, useServiceGRPOHistory } from '../api';
import { GRPO_STATUS } from '../constants';

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

export default function ServiceGRPODashboardPage() {
  const navigate = useNavigate();
  const { data: pendingEntries = [], isLoading, error, refetch } = usePendingServiceGRPOEntries();
  const { data: historyEntries = [] } = useServiceGRPOHistory();

  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  const totalPendingFreight = pendingEntries.reduce((sum, entry) => {
    return sum + parseFloat(entry.total_freight || entry.freight || '0');
  }, 0);

  const historyCounts = {
    pending: historyEntries.filter((h) => h.status === GRPO_STATUS.PENDING).length,
    posted: historyEntries.filter((h) => h.status === GRPO_STATUS.POSTED).length,
    failed: historyEntries.filter(
      (h) => h.status === GRPO_STATUS.FAILED || h.status === GRPO_STATUS.PARTIALLY_POSTED,
    ).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Service GRPO</h2>
          <p className="text-muted-foreground">
            Post transport service receipts for booked dispatch vehicles
          </p>
        </div>
        <Button onClick={() => navigate('/dispatch/bilty-grpo/pending')} className="w-full sm:w-auto">
          <List className="h-4 w-4 mr-2" />
          View Pending
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
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

          {error && !isPermissionError && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {apiError?.message || 'An error occurred while loading service GRPO.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Card
            className="bg-primary/5 border-primary/20 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/dispatch/bilty-grpo/pending')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Pending Service GRPO</span>
                </div>
                <span className="text-3xl font-bold text-primary">{pendingEntries.length}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Pending freight:{' '}
                  <span className="font-semibold text-primary">
                    {totalPendingFreight.toLocaleString('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    })}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Booked Dispatch Plans</h3>
              <button
                onClick={() => navigate('/dispatch/bilty-grpo/pending')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Show more
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {pendingEntries.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-sm text-muted-foreground border rounded-lg">
                No booked dispatch plans pending service GRPO
              </div>
            ) : (
              <div className="space-y-2">
                {pendingEntries.slice(0, 5).map((entry) => (
                  <div
                    key={entry.dispatch_plan_id}
                    className="flex items-center justify-between px-3 py-2 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/dispatch/bilty-grpo/preview/${entry.dispatch_plan_id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-medium text-sm">
                        {entry.sap_invoice_doc_num || entry.sap_invoice_doc_entry}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {entry.vehicle_no || '-'} - {entry.transporter_name || '-'}
                        {entry.linked_vehicle_entry_no ? ` - Entry ${entry.linked_vehicle_entry_no}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end text-xs text-muted-foreground">
                        <span>{formatCurrency(entry.total_freight || entry.freight)}</span>
                        <span>{formatDate(entry.dispatch_date)}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Posting History</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card
                className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('/dispatch/bilty-grpo/history?status=pending')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                      {historyCounts.pending}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                    Pending
                  </p>
                </CardContent>
              </Card>
              <Card
                className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('/dispatch/bilty-grpo/history?status=posted')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {historyCounts.posted}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                    Posted
                  </p>
                </CardContent>
              </Card>
              <Card
                className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('/dispatch/bilty-grpo/history?status=failed')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-xl font-bold text-red-600 dark:text-red-400">
                      {historyCounts.failed}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">Failed</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate('/dispatch/bilty-grpo/pending')}
              >
                <List className="h-5 w-5" />
                <span className="text-xs">Pending Bookings</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate('/dispatch/bilty-grpo/history')}
              >
                <History className="h-5 w-5" />
                <span className="text-xs">Posting History</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
