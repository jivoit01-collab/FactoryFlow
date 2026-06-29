import { ArrowLeft, LogOut, Send } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  useArrivals,
  useDepartArrival,
  useDispatchArrival,
} from '@/modules/gate/api/arrivals/arrivals.queries';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { ArrivalCombinedGatepassPanel } from '../customerSalesFlow/ArrivalCombinedGatepassPanel';

const CLOSED_DOCKING_STATUSES = ['REJECTED', 'CANCELLED'];

/**
 * Standalone whole-truck view for a multi-company arrival: the one ARV/...
 * combined gatepass (via the shared panel) plus Dispatch All / Depart. The same
 * combined-gatepass panel is rendered inline on the per-docking gatepass screen,
 * so this page is optional, never forced.
 */
export function ArrivalGatepassPage() {
  const navigate = useNavigate();
  const { arrivalId: arrivalIdParam } = useParams<{ arrivalId: string }>();
  const arrivalId = Number(arrivalIdParam);
  const validId = Number.isFinite(arrivalId) && arrivalId > 0;

  const arrivalsQuery = useArrivals(false, { enabled: validId });
  const arrival = arrivalsQuery.data?.find((a) => a.id === arrivalId);
  const dispatchArrival = useDispatchArrival();
  const departArrival = useDepartArrival();

  const activeDockings = (arrival?.gate_outs ?? []).filter(
    (docking) => !CLOSED_DOCKING_STATUSES.includes(docking.status),
  );
  const anyToDispatch = activeDockings.some((docking) => docking.status === 'PRINT_COMMITTED');
  const fullyDispatched =
    !!arrival &&
    arrival.gate_ins.length > 0 &&
    arrival.gate_ins.every((gate) => gate.retired_at !== null);

  const handleDispatch = async () => {
    try {
      await dispatchArrival.mutateAsync(arrivalId);
      toast.success('All companies dispatched.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDepart = async () => {
    try {
      await departArrival.mutateAsync({ id: arrivalId });
      toast.success('Truck departed.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (!validId) {
    return <div className="p-4 text-sm text-muted-foreground">Invalid arrival.</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Combined Gatepass</h1>
          <p className="text-sm text-muted-foreground">
            {arrival
              ? `${arrival.arrival_no} · ${arrival.vehicle_no} · ${arrival.driver_name}`
              : 'Loading arrival…'}
          </p>
        </div>
      </div>

      <ArrivalCombinedGatepassPanel arrivalId={arrivalId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Walk the truck out</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleDispatch}
              disabled={!anyToDispatch || dispatchArrival.isPending}
            >
              <Send className="mr-1 h-4 w-4" /> Dispatch All
            </Button>
            <Button
              variant="outline"
              onClick={handleDepart}
              disabled={!fullyDispatched || departArrival.isPending}
              title={fullyDispatched ? 'Record the physical exit' : 'Dispatch every company first'}
            >
              <LogOut className="mr-1 h-4 w-4" /> Depart
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ArrivalGatepassPage;
