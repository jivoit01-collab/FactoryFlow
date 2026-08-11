/** Where the order book stands: what is ready, what is blocked, and on what. */
import { RefreshCw } from 'lucide-react';

import { ORDER_PROCESSING_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useOpDashboard, useOpSync } from '../api/order-processing.queries';
import { StatTile } from '../components';

export default function OrderProcessingDashboardPage() {
  const { hasPermission } = usePermission();
  const canSync = hasPermission(ORDER_PROCESSING_PERMISSIONS.SYNC);
  const query = useOpDashboard();
  const sync = useOpSync();

  if (query.isLoading) {
    return <div className="p-6"><DashboardHeader title="Order Processing" description="Loading…" /></div>;
  }
  if (query.isError || !query.data) {
    return (
      <div className="p-6">
        <DashboardHeader title="Order Processing" />
        <p className="mt-4 text-sm text-destructive">
          {getErrorMessage(query.error, 'Could not load the dashboard.')}
        </p>
      </div>
    );
  }

  const d = query.data;
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <DashboardHeader
        title="Order Processing"
        description="OMS orders, checked against SAP stock, through to production and procurement."
      >
        {canSync && (
          <Button size="sm" variant="outline" onClick={() => sync.mutate(false)}
                  disabled={sync.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${sync.isPending ? 'animate-spin' : ''}`} />
            {sync.isPending ? 'Syncing…' : 'Sync OMS'}
          </Button>
        )}
      </DashboardHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Orders mirrored" value={d.orders.total} />
        <StatTile label="Ready to fulfil" value={d.orders.ready} />
        <StatTile label="Need production" value={d.orders.waiting_for_stock}
                  alert={d.orders.waiting_for_stock > 0} />
        <StatTile label="Unresolved" value={d.orders.unresolved}
                  hint="Stock could not be determined" alert={d.orders.unresolved > 0} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Production requirements" value={d.production.open}
                  alert={d.production.open > 0} />
        <StatTile label="Materials short" value={d.materials.short}
                  alert={d.materials.short > 0} />
        <StatTile label="Procurement required" value={d.procurement.open}
                  alert={d.procurement.open > 0} />
        <StatTile label="Orders with data issues" value={d.data_quality.lines_with_issues}
                  hint="Lines the engine cannot fully trust"
                  alert={d.data_quality.lines_with_issues > 0} />
      </div>

      {d.last_sync && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Last sync {new Date(d.last_sync.started_at).toLocaleString()} —{' '}
            {d.last_sync.orders_seen} order(s), {d.last_sync.lines_written} line(s),{' '}
            {d.last_sync.issues_found} issue(s). Status {d.last_sync.status}.
            {d.last_sync.error && (
              <span className="block text-destructive">{d.last_sync.error}</span>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
