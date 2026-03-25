import {
  AlertCircle,
  Calendar,
  ChevronRight,
  List,
  RefreshCw,
  ShieldX,
  Truck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { Button, Card, CardContent } from '@/shared/components/ui';

import { useOutboundDashboard } from '../api';
import { STATUS_CONFIG, STATUS_OPTIONS } from '../constants/dispatch.constants';
import type { ShipmentStatus } from '../types/dispatch.types';

export default function DispatchDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useOutboundDashboard();

  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Outbound Dispatch</h2>
          <p className="text-muted-foreground">
            Manage shipment picking, packing, loading, and dispatch
          </p>
        </div>
        <Button onClick={() => navigate('/dispatch/shipments')} className="w-full sm:w-auto">
          <List className="h-4 w-4 mr-2" />
          View Shipments
        </Button>
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

          {data && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          Today&apos;s Dispatches
                        </span>
                      </div>
                      <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {data.today_dispatched}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          Scheduled Today
                        </span>
                      </div>
                      <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {data.today_scheduled}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                          Active Bays
                        </span>
                      </div>
                      <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {data.zone_c_active_bays}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {data.zone_c_bay_utilisation_pct.toFixed(0)}% utilisation
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Breakdown */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Status Breakdown
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {STATUS_OPTIONS.filter((s) => s.value !== 'CANCELLED').map((statusOpt) => {
                    const config = STATUS_CONFIG[statusOpt.value];
                    const count = data.by_status[statusOpt.value as ShipmentStatus] ?? 0;
                    const Icon = config.icon;
                    return (
                      <Card
                        key={statusOpt.value}
                        className={`${config.bgColor} border cursor-pointer hover:shadow-md transition-shadow`}
                        onClick={() =>
                          navigate(`/dispatch/shipments?status=${statusOpt.value}`)
                        }
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <Icon className={`h-4 w-4 ${config.color}`} />
                            <span className={`text-xl font-bold ${config.color}`}>{count}</span>
                          </div>
                          <p className={`mt-1 text-xs font-medium ${config.color}`}>
                            {config.label}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => navigate('/dispatch/shipments')}
                  >
                    <List className="h-5 w-5" />
                    <span className="text-xs">All Shipments</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => navigate('/dispatch/shipments?status=RELEASED')}
                  >
                    <ChevronRight className="h-5 w-5" />
                    <span className="text-xs">Released Orders</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
