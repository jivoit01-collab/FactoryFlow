/**
 * Change the truck on a return the gate is already waiting for.
 *
 * The vehicle is captured on step 1 — saving that page is what puts the return in
 * the gate's arrival queue — so this page only ever corrects it, and cannot blank
 * it. Once the gate has marked the vehicle in, the truck is settled and this is
 * read-only.
 */
import { ArrowLeft, CalendarClock, Loader2, Save, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DriverSelect, VehicleSelect } from '@/modules/gate/components';
import { Button, Card, CardContent, Input, Label } from '@/shared/components/ui';

import { type GoodsReturnDetail, useGoodsReturn, useSetGoodsReturnVehicle } from '../api';
import { formatDateTime, toDateInputValue } from '../utils';

export default function GoodsReturnVehiclePage() {
  const { entryId } = useParams<{ entryId: string }>();
  const id = Number(entryId);
  const { data: detail, isLoading } = useGoodsReturn(id);

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return <VehicleForm key={detail.id} id={id} detail={detail} />;
}

function VehicleForm({ id, detail }: { id: number; detail: GoodsReturnDetail }) {
  const navigate = useNavigate();
  const setVehicle = useSetGoodsReturnVehicle(id);

  const [vehicleId, setVehicleId] = useState<number | null>(detail.vehicle);
  const [vehicleNo, setVehicleNo] = useState(detail.vehicle_no);
  const [driverId, setDriverId] = useState<number | null>(detail.driver);
  const [driverName, setDriverName] = useState(detail.driver_name);
  const [expectedArrival, setExpectedArrival] = useState(
    toDateInputValue(detail.expected_arrival_at),
  );
  const [error, setError] = useState<string | null>(null);

  const isGatedIn = Boolean(detail.gated_in_at);

  async function handleSave() {
    setError(null);
    if (!vehicleId || !driverId) {
      setError('Pick the vehicle and driver bringing the goods back.');
      return;
    }
    try {
      await setVehicle.mutateAsync({
        vehicle_id: vehicleId,
        driver_id: driverId,
        expected_arrival_at: expectedArrival || null,
      });
      toast.success('Vehicle updated');
      navigate(`/returns/customer/${id}`);
    } catch (err) {
      const detailMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      setError(detailMsg || 'Could not save the vehicle details.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Change Vehicle</h2>
        <p className="text-muted-foreground">
          {detail.entry_no} · {detail.customer_name || detail.customer_code || 'No customer'}
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="h-4 w-4" /> Vehicle &amp; Driver
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isGatedIn
                ? `Marked in at the gate on ${formatDateTime(detail.gated_in_at)} — the truck can no longer be changed.`
                : 'The gate is waiting for this truck, so it can be swapped but not removed.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Return Vehicle *</Label>
            <VehicleSelect
              value={vehicleNo}
              defaultDisplayText={vehicleNo}
              disabled={isGatedIn}
              onChange={(vehicle) => {
                setVehicleId(vehicle.vehicleId);
                setVehicleNo(vehicle.vehicleNumber);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Driver *</Label>
            <DriverSelect
              value={driverName}
              defaultDisplayText={driverName}
              disabled={isGatedIn}
              onChange={(driver) => {
                setDriverId(driver.driverId);
                setDriverName(driver.driverName);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Expected Gate Arrival
            </Label>
            <Input
              type="date"
              value={expectedArrival}
              disabled={isGatedIn}
              onChange={(event) => setExpectedArrival(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(`/returns/customer/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleSave} disabled={isGatedIn || setVehicle.isPending}>
          {setVehicle.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Vehicle
        </Button>
      </div>
    </div>
  );
}
