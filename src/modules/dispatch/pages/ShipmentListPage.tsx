import { ChevronRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DISPATCH_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { Button } from '@/shared/components/ui';

import { useShipments, useSyncShipments } from '../api';
import ShipmentFilters from '../components/ShipmentFilters';
import ShipmentStatusBadge from '../components/ShipmentStatusBadge';
import type { ShipmentFilters as Filters } from '../types/dispatch.types';

const formatDate = (date?: string) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return date;
  }
};

export default function ShipmentListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermission } = usePermission();

  const [filters, setFilters] = useState<Filters>({
    status: (searchParams.get('status') as Filters['status']) || undefined,
  });

  const { data: shipments = [], isLoading, error } = useShipments(filters);
  const syncShipments = useSyncShipments();

  const handleSync = () => {
    syncShipments.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(
          `Synced: ${result.created_count} created, ${result.updated_count} updated`,
        );
      },
      onError: (err) => toast.error(err.message || 'Failed to sync from SAP'),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shipments</h2>
          <p className="text-sm text-muted-foreground">
            {shipments.length} shipment{shipments.length !== 1 ? 's' : ''}
          </p>
        </div>
        {hasPermission(DISPATCH_PERMISSIONS.SYNC) && (
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncShipments.isPending}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${syncShipments.isPending ? 'animate-spin' : ''}`}
            />
            {syncShipments.isPending ? 'Syncing...' : 'Sync from SAP'}
          </Button>
        )}
      </div>

      {/* Filters */}
      <ShipmentFilters filters={filters} onChange={setFilters} />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32 text-sm text-destructive border rounded-lg">
          Failed to load shipments
        </div>
      ) : shipments.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border rounded-lg">
          No shipments found
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2.5 text-left font-medium">SO #</th>
                <th className="px-3 py-2.5 text-left font-medium">Customer</th>
                <th className="px-3 py-2.5 text-center font-medium">Status</th>
                <th className="px-3 py-2.5 text-left font-medium">Scheduled</th>
                <th className="px-3 py-2.5 text-center font-medium">Bay</th>
                <th className="px-3 py-2.5 text-center font-medium">Items</th>
                <th className="px-3 py-2.5 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr
                  key={shipment.id}
                  className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/dispatch/shipments/${shipment.id}`)}
                >
                  <td className="px-3 py-2.5 font-mono text-xs font-medium">
                    {shipment.sap_doc_num}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{shipment.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{shipment.customer_code}</div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <ShipmentStatusBadge status={shipment.status} />
                  </td>
                  <td className="px-3 py-2.5 text-sm">{formatDate(shipment.scheduled_date)}</td>
                  <td className="px-3 py-2.5 text-center font-mono">
                    {shipment.dock_bay || '-'}
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums">
                    {shipment.item_count}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
