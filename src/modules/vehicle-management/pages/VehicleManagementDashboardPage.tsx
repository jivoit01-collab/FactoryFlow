import { ClipboardList, IdCard, Truck, UsersRound } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { VEHICLE_MANAGEMENT_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

interface VehicleManagementCard {
  title: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  color: string;
  permissions: readonly string[];
}

const vehicleManagementCards: VehicleManagementCard[] = [
  {
    title: 'Vehicles',
    description: 'Maintain vehicle numbers, types, capacity, and transporter ownership.',
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
    description: 'Maintain transporter contacts, mobile numbers, and GST details.',
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
    description: 'Maintain driver contact, license, ID proof, and photo records.',
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
    description: 'Review gate vehicle-entry records across movement types and statuses.',
    route: '/vehicle-management/entries',
    icon: <ClipboardList className="h-5 w-5" />,
    color: 'text-amber-700 dark:text-amber-400',
    permissions: [VEHICLE_MANAGEMENT_PERMISSIONS.VIEW],
  },
];

export default function VehicleManagementDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();

  const visibleCards = useMemo(
    () => vehicleManagementCards.filter((card) => hasAnyPermission(card.permissions)),
    [hasAnyPermission],
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Vehicle Management</h2>
        <p className="text-muted-foreground">
          Vehicle masters, transporters, drivers, and dispatch linking
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map((card) => (
          <Card
            key={card.route}
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => navigate(card.route)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={card.color}>{card.icon}</div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-5 text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
