import { CheckCircle2, Loader2, LogIn, RefreshCw, Truck, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DriverSelect, VehicleSelect } from '@/modules/gate/components';
import {
  type GoodsReturnListItem,
  useExpectedGoodsReturns,
  useMarkGoodsReturnIn,
} from '@/modules/returns/customer/api';
import { formatDate } from '@/modules/returns/customer/utils';
import { Badge, Button, Card, CardContent, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

export default function GoodsReturnInListPage() {
  const { data: expected = [], isLoading, isFetching, refetch } = useExpectedGoodsReturns();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Undo2 className="h-7 w-7 text-rose-600" />
            Goods Return In
          </h2>
          <p className="text-muted-foreground">
            Customer return vehicles expected at the gate. Mark a vehicle in when it arrives.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <EmptyState text="Loading…" />
      ) : expected.length === 0 ? (
        <EmptyState text="No goods-return vehicles are expected right now" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {expected.map((entry) => (
            <ExpectedReturnCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExpectedReturnCard({ entry }: { entry: GoodsReturnListItem }) {
  const navigate = useNavigate();
  const markIn = useMarkGoodsReturnIn();

  // Returns booked before the vehicle moved to the first page can still reach the
  // gate without one; there, the gate is the first to know the truck.
  const needsVehicle = !entry.vehicle_no || !entry.driver_name;
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverId, setDriverId] = useState<number | null>(null);
  const [driverName, setDriverName] = useState('');

  const vehicleReady = Boolean(entry.vehicle_no) || Boolean(vehicleId);
  const driverReady = Boolean(entry.driver_name) || Boolean(driverId);

  async function handleMarkIn() {
    try {
      await markIn.mutateAsync({ id: entry.id, vehicle_id: vehicleId, driver_id: driverId });
      toast.success(`${entry.vehicle_no || vehicleNo || entry.entry_no} marked in`);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Could not mark the vehicle in.');
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold">
              <Truck className="h-4 w-4 text-muted-foreground" />
              {entry.vehicle_no || vehicleNo || '—'}
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => navigate(`/returns/customer/${entry.id}`)}
            >
              {entry.entry_no}
            </button>
          </div>
          <Badge variant="outline">{entry.company_code}</Badge>
        </div>

        <dl className="space-y-1 text-sm">
          <Row label="Customer" value={entry.customer_name || entry.customer_code || '-'} />
          <Row label="Driver" value={entry.driver_name || driverName || '-'} />
          <Row
            label="Items"
            // The clerk hands the truck over on their first page and keys the
            // items in afterwards, so a not-yet-submitted return can legitimately
            // show none. It does not hold up the mark-in.
            value={
              entry.submitted_at
                ? String(entry.line_count)
                : `${entry.line_count} · still being entered`
            }
          />
          <Row
            label="Expected"
            value={entry.expected_arrival_at ? formatDate(entry.expected_arrival_at) : 'Not given'}
          />
        </dl>

        {needsVehicle && (
          <div className="space-y-3 rounded-md border border-dashed p-3">
            <p className="text-xs text-muted-foreground">
              Booked without a vehicle — record the truck that arrived.
            </p>
            {!entry.vehicle_no && (
              <div className="space-y-1">
                <Label className="text-xs">Vehicle</Label>
                <VehicleSelect
                  value={vehicleNo}
                  defaultDisplayText={vehicleNo}
                  onChange={(vehicle) => {
                    setVehicleId(vehicle.vehicleId);
                    setVehicleNo(vehicle.vehicleNumber);
                  }}
                />
              </div>
            )}
            {!entry.driver_name && (
              <div className="space-y-1">
                <Label className="text-xs">Driver</Label>
                <DriverSelect
                  value={driverName}
                  defaultDisplayText={driverName}
                  onChange={(driver) => {
                    setDriverId(driver.driverId);
                    setDriverName(driver.driverName);
                  }}
                />
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleMarkIn}
          disabled={markIn.isPending || !vehicleReady || !driverReady}
        >
          {markIn.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="mr-2 h-4 w-4" />
          )}
          Mark Vehicle In
        </Button>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8" />
        <p>{text}</p>
      </CardContent>
    </Card>
  );
}
