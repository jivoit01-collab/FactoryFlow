import { ArrowLeft, FileText, LogOut, RotateCcw, Send, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { VehicleArrival } from '@/modules/gate/api/arrivals/arrivals.api';
import {
  useArrivalExpected,
  useArrivals,
  useCreateArrival,
  useDepartArrival,
  useDispatchArrival,
  useEmptyOutArrival,
} from '@/modules/gate/api/arrivals/arrivals.queries';
import { DriverSelect, VehicleSelect } from '@/modules/gate/components';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function isFullyDispatched(arrival: VehicleArrival): boolean {
  return arrival.gate_ins.length > 0 && arrival.gate_ins.every((g) => g.retired_at !== null);
}

export function CrossCompanyArrivalPage() {
  const navigate = useNavigate();

  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [tareWeight, setTareWeight] = useState('');
  const [gateInDate, setGateInDate] = useState(toDateInputValue());
  const [inTime, setInTime] = useState(toTimeInputValue());
  const [securityName, setSecurityName] = useState('');

  const expected = useArrivalExpected(vehicleId);
  const openArrivals = useArrivals(true);
  const createArrival = useCreateArrival();
  const departArrival = useDepartArrival();
  const dispatchArrival = useDispatchArrival();
  const emptyOutArrival = useEmptyOutArrival();

  const companies = expected.data?.companies ?? [];
  const totalBills = companies.reduce((sum, c) => sum + c.bills.length, 0);

  const handleCreate = async () => {
    if (!vehicleId || !driverId) {
      toast.error('Select a vehicle and driver.');
      return;
    }
    if (totalBills === 0) {
      toast.error('This vehicle has no booked bills to gate in.');
      return;
    }
    try {
      const arrival = await createArrival.mutateAsync({
        vehicle_id: vehicleId,
        driver_id: driverId,
        gate_in_date: gateInDate,
        in_time: inTime,
        tare_weight: tareWeight ? Number(tareWeight) : null,
        security_name: securityName,
      });
      toast.success(`Arrival ${arrival.arrival_no} created (${arrival.gate_ins.length} companies).`);
      setVehicleId(null);
      setDriverId(null);
      setTareWeight('');
      setSecurityName('');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDepart = async (arrival: VehicleArrival) => {
    try {
      await departArrival.mutateAsync({ id: arrival.id, securityName });
      toast.success(`${arrival.arrival_no} departed.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleEmptyOut = async (arrival: VehicleArrival) => {
    try {
      await emptyOutArrival.mutateAsync({ id: arrival.id });
      toast.success(`${arrival.arrival_no} reset (empty-out).`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDispatch = async (arrival: VehicleArrival) => {
    try {
      await dispatchArrival.mutateAsync(arrival.id);
      toast.success(`${arrival.arrival_no}: all companies dispatched.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Cross-Company Arrival</h1>
          <p className="text-sm text-muted-foreground">
            Gate one physical truck in once across all companies it carries bills for.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4" /> New Arrival
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <VehicleSelect
              label="Vehicle"
              required
              value={vehicleId?.toString()}
              onChange={(v) => setVehicleId(v.vehicleId)}
            />
            <DriverSelect
              label="Driver"
              required
              value={driverId?.toString()}
              onChange={(d) => setDriverId(d.driverId)}
            />
            <div className="space-y-1">
              <Label>Gate-in date</Label>
              <Input type="date" value={gateInDate} onChange={(e) => setGateInDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>In time</Label>
              <Input type="time" value={inTime} onChange={(e) => setInTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Tare weight (kg)</Label>
              <Input
                type="number"
                step="0.001"
                placeholder="Single physical weighing"
                value={tareWeight}
                onChange={(e) => setTareWeight(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Security</Label>
              <Input value={securityName} onChange={(e) => setSecurityName(e.target.value)} />
            </div>
          </div>

          {vehicleId ? (
            <div className="rounded-md border">
              <div className="border-b bg-muted/40 px-3 py-2 text-sm font-medium">
                Bills booked to this vehicle ({totalBills})
              </div>
              {expected.isLoading ? (
                <p className="p-3 text-sm text-muted-foreground">Loading…</p>
              ) : companies.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  No booked bills for this vehicle in your companies.
                </p>
              ) : (
                <div className="divide-y">
                  {companies.map((company) => (
                    <div key={company.company_id} className="p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="secondary">{company.company_name}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {company.bills.length} bill(s)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {company.bills.map((bill) => (
                          <Badge key={bill.dispatch_plan_id} variant="outline">
                            {bill.sap_invoice_doc_num || bill.sap_invoice_doc_entry}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={createArrival.isPending || !vehicleId || totalBills === 0}
            >
              {createArrival.isPending ? 'Creating…' : 'Mark Inside'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open Arrivals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {openArrivals.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (openArrivals.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No trucks currently inside.</p>
          ) : (
            openArrivals.data?.map((arrival) => (
              <div key={arrival.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{arrival.arrival_no}</span>
                    <Badge variant="outline">{arrival.vehicle_no}</Badge>
                    <Badge>{arrival.status}</Badge>
                    {arrival.gatepass_no ? (
                      <Badge variant="secondary">{arrival.gatepass_no}</Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/gate/arrivals/${arrival.id}/gatepass`)}
                    >
                      <FileText className="mr-1 h-3 w-3" /> Gatepass
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDispatch(arrival)}
                      disabled={
                        dispatchArrival.isPending ||
                        !arrival.gate_outs.some((d) => d.status === 'PRINT_COMMITTED')
                      }
                      title="Dispatch every committed company on this truck"
                    >
                      <Send className="mr-1 h-3 w-3" /> Dispatch
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEmptyOut(arrival)}
                      disabled={emptyOutArrival.isPending}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" /> Empty-out
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDepart(arrival)}
                      disabled={departArrival.isPending || !isFullyDispatched(arrival)}
                      title={
                        isFullyDispatched(arrival)
                          ? 'Record the physical exit'
                          : 'All companies must be dispatched first'
                      }
                    >
                      <LogOut className="mr-1 h-3 w-3" /> Depart
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {arrival.gate_ins.map((gate) => (
                    <Badge
                      key={gate.id}
                      variant={gate.retired_at ? 'secondary' : 'outline'}
                    >
                      {gate.company_code}: {gate.retired_at ? 'dispatched' : `${gate.cover_count} bill(s)`}
                    </Badge>
                  ))}
                </div>
                {arrival.gate_outs.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {arrival.gate_outs.map((docking) => (
                      <Badge key={docking.id} variant="outline">
                        {docking.company_code} · {docking.status}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CrossCompanyArrivalPage;
