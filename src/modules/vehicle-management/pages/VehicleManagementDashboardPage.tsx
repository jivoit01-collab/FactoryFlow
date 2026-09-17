import { ClipboardList, IdCard, Truck, UsersRound } from 'lucide-react';
import { useMemo } from 'react';

import { VEHICLE_MANAGEMENT_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { ModuleTile, ModuleTileGrid, tileAccent } from '@/shared/components/navigation';

interface VehicleManagementCard {
  title: string;
  route: string;
  icon: React.ReactNode;
  color: string;
  permissions: readonly string[];
}

const vehicleManagementCards: VehicleManagementCard[] = [
  {
    title: 'Vehicles',
    route: '/vehicle-management/vehicles',
    icon: <Truck className="h-5 w-5" />,
    color: 'text-emerald-600',
    permissions: [
      VEHICLE_MANAGEMENT_PERMISSIONS.VIEW,
      VEHICLE_MANAGEMENT_PERMISSIONS.MANAGE_VEHICLES,
    ],
  },
  {
    title: 'Transporters',
    route: '/vehicle-management/transporters',
    icon: <UsersRound className="h-5 w-5" />,
    color: 'text-cyan-700 dark:text-cyan-400',
    permissions: [
      VEHICLE_MANAGEMENT_PERMISSIONS.VIEW,
      VEHICLE_MANAGEMENT_PERMISSIONS.MANAGE_TRANSPORTERS,
    ],
  },
  {
    title: 'Drivers',
    route: '/vehicle-management/drivers',
    icon: <IdCard className="h-5 w-5" />,
    color: 'text-violet-600',
    permissions: [
      VEHICLE_MANAGEMENT_PERMISSIONS.VIEW,
      VEHICLE_MANAGEMENT_PERMISSIONS.MANAGE_DRIVERS,
    ],
  },
  {
    title: 'Vehicle Entries',
    route: '/vehicle-management/entries',
    icon: <ClipboardList className="h-5 w-5" />,
    color: 'text-amber-700 dark:text-amber-400',
    permissions: [VEHICLE_MANAGEMENT_PERMISSIONS.VIEW],
  },
];

export default function VehicleManagementDashboardPage() {
  const { hasAnyPermission } = usePermission();

  const visibleCards = useMemo(
    () => vehicleManagementCards.filter((card) => hasAnyPermission(card.permissions)),
    [hasAnyPermission],
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Vehicle Management</h2>
        <p className="mt-1.5 text-muted-foreground">
          Vehicle masters, transporters, drivers, and dispatch linking
        </p>
      </div>

      <ModuleTileGrid>
        {visibleCards.map((card) => (
          <ModuleTile
            key={card.route}
            title={card.title}
            icon={card.icon}
            accent={tileAccent(card.color)}
            to={card.route}
          />
        ))}
      </ModuleTileGrid>
    </div>
  );
}
