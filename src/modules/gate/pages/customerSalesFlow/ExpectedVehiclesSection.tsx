import { Truck } from 'lucide-react';
import { useMemo } from 'react';

import { useDispatchPipelineBoard } from '@/modules/dashboards/dispatch-pipeline/api';
import { PipelineStatusBadge } from '@/modules/dashboards/dispatch-pipeline/components';
import type { PipelineStage } from '@/modules/dashboards/dispatch-pipeline/types';
import { buildExpectedVehicles } from '@/modules/dashboards/dispatch-pipeline/utils/expectedVehicles';

// Upstream of each module: what is "coming" but not yet actionable here. The
// actionable stage (READY_TO_DOCK for docking / PRINT_COMMITTED for dispatch-out)
// already shows in the dashboard's own list, so it's omitted to avoid duplication.
const DOCK_UPSTREAM: PipelineStage[] = ['BOOKED', 'EMPTY_IN'];
const OUT_UPSTREAM: PipelineStage[] = [
  'DOCKED',
  'PHOTO_ATTACHED',
  'READY_FOR_GATEPASS',
  'GATEPASS_PRINTED',
];

export function ExpectedVehiclesSection({
  isGateOutMode,
  dateFrom,
  dateTo,
}: {
  isGateOutMode: boolean;
  dateFrom: string;
  dateTo: string;
}) {
  const stages = isGateOutMode ? OUT_UPSTREAM : DOCK_UPSTREAM;
  // This section sits on the cross-company docking / dispatch-out board, so it
  // aggregates expected vehicles across every company the user belongs to.
  const { data } = useDispatchPipelineBoard({
    date_from: dateFrom,
    date_to: dateTo,
    stages,
    all_companies: true,
  });
  const vehicles = useMemo(() => buildExpectedVehicles(data?.cards ?? [], []), [data?.cards]);

  if (!vehicles.length) return null;

  const title = isGateOutMode ? 'Expected for Dispatch Out' : 'Expected for Docking';

  return (
    <section className="rounded-md border bg-muted/20">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">
          {title} ({vehicles.length})
        </h3>
        <span className="text-xs text-muted-foreground">
          — upstream vehicles, startable once they reach this module
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-3 text-left font-medium text-muted-foreground">Vehicle</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Customer</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Bills</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Dispatch Date</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.vehicleId ?? vehicle.vehicleNo} className="border-t">
                <td className="whitespace-nowrap p-3 font-medium">{vehicle.vehicleNo}</td>
                <td className="whitespace-nowrap p-3">
                  <PipelineStatusBadge
                    status={{
                      stage: vehicle.stage,
                      stage_label: vehicle.moduleLabel,
                      stage_at: vehicle.stageAt,
                      module: '',
                      module_status: '',
                      module_label: vehicle.moduleLabel,
                    }}
                  />
                </td>
                <td className="p-3">
                  <div className="max-w-[240px] truncate">{vehicle.customers.join(', ') || '-'}</div>
                </td>
                <td className="p-3">
                  <div className="max-w-[220px] truncate">{vehicle.docNums.join(', ') || '-'}</div>
                </td>
                <td className="whitespace-nowrap p-3">{vehicle.dispatchDate || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
