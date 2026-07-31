import { ArrowLeft, ArrowRight, CalendarClock, Loader2, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { DriverSelect, StepHeader, VehicleSelect } from '@/modules/gate/components';
import { Button, Card, CardContent, Input, Label } from '@/shared/components/ui';

import { type GoodsReturnDetail, useGoodsReturn, useSetGoodsReturnVehicle } from '../api';
import { toDateInputValue } from '../utils';

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

  async function handleContinue() {
    setError(null);
    if (!vehicleId) {
      setError('Select the return vehicle.');
      return;
    }
    if (!driverId) {
      setError('Select the driver.');
      return;
    }
    if (!expectedArrival) {
      setError('Set the expected gate arrival.');
      return;
    }
    try {
      await setVehicle.mutateAsync({
        vehicle_id: vehicleId,
        driver_id: driverId,
        expected_arrival_at: expectedArrival,
      });
      navigate(`/goods-return/edit/${id}/review`);
    } catch (err) {
      const detailMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      setError(detailMsg || 'Could not save the vehicle details.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <StepHeader currentStep={3} totalSteps={3} title="Goods Return" error={error} />

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Truck className="h-4 w-4" /> Return Vehicle &amp; Expected Arrival
          </div>

          <div className="space-y-2">
            <Label>Return Vehicle *</Label>
            <VehicleSelect
              value={vehicleNo}
              defaultDisplayText={vehicleNo}
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
              onChange={(driver) => {
                setDriverId(driver.driverId);
                setDriverName(driver.driverName);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Expected Gate Arrival *
            </Label>
            <Input
              type="date"
              value={expectedArrival}
              onChange={(event) => setExpectedArrival(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This vehicle will appear in the gate&apos;s “Goods Return In” queue for mark-in.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(`/goods-return/edit/${id}/items`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleContinue} disabled={setVehicle.isPending}>
          {setVehicle.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          Save &amp; Continue
        </Button>
      </div>
    </div>
  );
}
