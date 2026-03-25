import { ArrowLeft, Calendar, MapPin, Truck, User } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, CardContent } from '@/shared/components/ui';

import { usePickTasks, useShipmentDetail } from '../api';
import ActionButtons from '../components/ActionButtons';
import PickTaskList from '../components/PickTaskList';
import ShipmentItemsTable from '../components/ShipmentItemsTable';
import ShipmentStatusBadge from '../components/ShipmentStatusBadge';

const formatDate = (date?: string | null) => {
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

const formatDateTime = (dateTime?: string | null) => {
  if (!dateTime) return '-';
  try {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTime;
  }
};

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const shipmentId = id ? Number(id) : null;

  const { data: shipment, isLoading, error } = useShipmentDetail(shipmentId);
  const { data: pickTasks = [] } = usePickTasks(
    shipment?.status === 'PICKING' ? shipmentId : null,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dispatch/shipments')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center justify-center h-32 text-sm text-destructive border rounded-lg">
          {error ? 'Failed to load shipment' : 'Shipment not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dispatch/shipments')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Shipments
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                SO #{shipment.sap_doc_num}
              </h2>
              <ShipmentStatusBadge status={shipment.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {shipment.customer_name} ({shipment.customer_code})
            </p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Scheduled</span>
            </div>
            <p className="text-sm font-medium">{formatDate(shipment.scheduled_date)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-xs">Dock Bay</span>
            </div>
            <p className="text-sm font-medium">
              {shipment.dock_bay ? `Bay ${shipment.dock_bay}` : 'Not assigned'}
            </p>
            {shipment.dock_slot_start && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDateTime(shipment.dock_slot_start)} - {formatDateTime(shipment.dock_slot_end)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Truck className="h-4 w-4" />
              <span className="text-xs">Carrier</span>
            </div>
            <p className="text-sm font-medium">{shipment.carrier_name || '-'}</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-3">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <User className="h-4 w-4" />
              <span className="text-xs">Ship To</span>
            </div>
            <p className="text-sm font-medium">{shipment.ship_to_address || '-'}</p>
          </CardContent>
        </Card>
      </div>

      {/* BOL & Seal info (when dispatched) */}
      {(shipment.bill_of_lading_no || shipment.seal_number) && (
        <div className="flex flex-wrap gap-4 text-sm">
          {shipment.bill_of_lading_no && (
            <div>
              <span className="text-muted-foreground">BOL: </span>
              <span className="font-mono font-medium">{shipment.bill_of_lading_no}</span>
            </div>
          )}
          {shipment.seal_number && (
            <div>
              <span className="text-muted-foreground">Seal: </span>
              <span className="font-mono font-medium">{shipment.seal_number}</span>
            </div>
          )}
          {shipment.total_weight && (
            <div>
              <span className="text-muted-foreground">Weight: </span>
              <span className="font-mono font-medium">{shipment.total_weight} kg</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {shipment.status !== 'DISPATCHED' && shipment.status !== 'CANCELLED' && (
        <ActionButtons shipment={shipment} />
      )}

      {/* Pick Tasks (when PICKING) */}
      {shipment.status === 'PICKING' && pickTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Pick Tasks</h3>
          <PickTaskList shipmentId={shipment.id} tasks={pickTasks} />
        </div>
      )}

      {/* Items Table */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Items ({shipment.items.length})
        </h3>
        <ShipmentItemsTable items={shipment.items} pickTasks={pickTasks} />
      </div>

      {/* Notes */}
      {shipment.notes && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
          <p className="text-sm bg-muted/50 p-3 rounded-lg">{shipment.notes}</p>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
        <span>Created: {formatDateTime(shipment.created_at)}</span>
        <span>Updated: {formatDateTime(shipment.updated_at)}</span>
      </div>
    </div>
  );
}
