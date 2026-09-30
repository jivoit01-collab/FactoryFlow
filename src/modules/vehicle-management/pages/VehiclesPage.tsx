import { Plus, RefreshCw, Search, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { VEHICLE_MANAGEMENT_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { useVehicles } from '@/modules/gate/api/vehicle/vehicle.queries';
import { CreateVehicleDialog } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Input } from '@/shared/components/ui';

function compactText(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

export default function VehiclesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { hasPermission } = usePermission();
  const canManage = hasPermission(VEHICLE_MANAGEMENT_PERMISSIONS.MANAGE_VEHICLES);
  const { data: vehicles = [], isFetching, refetch } = useVehicles();

  const filteredVehicles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return vehicles;

    return vehicles.filter((vehicle) =>
      [
        vehicle.vehicle_number,
        vehicle.vehicle_type?.name,
        vehicle.transporter?.name,
        vehicle.transporter?.mobile_no,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [searchTerm, vehicles]);

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title="Vehicles">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} disabled={!canManage}>
          <Plus className="mr-2 h-4 w-4" />
          New Vehicle
        </Button>
      </DashboardHeader>

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search vehicle, transporter"
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vehicle</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Transporter</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Capacity</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan={4} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  <Truck className="mx-auto mb-2 h-5 w-5" />
                  No vehicles found.
                </td>
              </tr>
            ) : (
              filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b">
                  <td className="px-4 py-3 font-medium">{vehicle.vehicle_number}</td>
                  <td className="px-4 py-3">{compactText(vehicle.vehicle_type?.name)}</td>
                  <td className="px-4 py-3">
                    <div>{compactText(vehicle.transporter?.name)}</div>
                    <div className="text-xs text-muted-foreground">
                      {compactText(vehicle.transporter?.mobile_no)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {compactText(vehicle.capacity_ton)} ton
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateVehicleDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
