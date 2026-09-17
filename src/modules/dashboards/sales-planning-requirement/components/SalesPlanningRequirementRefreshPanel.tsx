import { AlertCircle, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';

import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { cn, formatDateTimeShort } from '@/shared/utils';

import type { SalesPlanningRefreshEnvelope } from '../types';

interface SalesPlanningRequirementRefreshPanelProps {
  refresh?: SalesPlanningRefreshEnvelope;
  isRefreshing: boolean;
  canRefresh: boolean;
  onRefresh: () => void;
}

function statusClasses(status?: string): string {
  switch (status) {
    case 'success':
      return 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
    case 'running':
    case 'pending':
      return 'border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400';
    case 'failed':
      return 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400';
    default:
      return 'border-muted bg-muted/40 text-muted-foreground';
  }
}

export function SalesPlanningRequirementRefreshPanel({
  refresh,
  isRefreshing,
  canRefresh,
  onRefresh,
}: SalesPlanningRequirementRefreshPanelProps) {
  const latest = refresh?.latest;
  const lastSuccess = refresh?.last_success;
  const isRunning = latest?.status === 'running' || isRefreshing;
  const lastRefreshDate = lastSuccess?.completed_at ?? lastSuccess?.started_at ?? null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-3 lg:flex lg:items-center">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-xs text-muted-foreground">Last refresh</p>
              <p className="text-sm font-medium">{formatDateTimeShort(lastRefreshDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-sky-600" />
            <div>
              <p className="text-xs text-muted-foreground">Forecast</p>
              <p className="max-w-72 truncate text-sm font-medium">
                {lastSuccess?.forecast_name || '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge
                variant="outline"
                className={cn('mt-0.5 capitalize', statusClasses(latest?.status))}
              >
                {isRunning ? 'running' : latest?.status ?? 'not refreshed'}
              </Badge>
            </div>
          </div>
        </div>

        <Button
          onClick={onRefresh}
          disabled={isRunning || !canRefresh}
          className="w-full sm:w-auto"
          title={!canRefresh ? 'Refresh permission required' : undefined}
        >
          <RefreshCw className={cn('h-4 w-4', isRunning && 'animate-spin')} />
          {isRunning ? 'Refreshing' : canRefresh ? 'Refresh' : 'No Refresh Access'}
        </Button>

        {latest?.status === 'failed' && latest.error_message && (
          <p className="text-sm text-red-600 lg:max-w-md">{latest.error_message}</p>
        )}
      </CardContent>
    </Card>
  );
}
