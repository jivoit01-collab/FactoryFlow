import { ClipboardCheck, ClipboardList, Truck } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { ADMIN_PERMISSIONS, MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

interface AdminModuleCard {
  title: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  color: string;
  permissions: readonly string[];
}

const adminModuleCards: AdminModuleCard[] = [
  {
    title: 'Docking — Scan Skip Requests',
    description: 'Review and approve operator requests to skip box scanning for docking entries.',
    route: '/admin/docking/scan-approvals',
    icon: <ClipboardCheck className="h-5 w-5" />,
    color: 'text-emerald-700',
    permissions: [
      ADMIN_PERMISSIONS.DOCKING.VIEW_SCAN_SKIP,
      ADMIN_PERMISSIONS.DOCKING.APPROVE_SCAN_SKIP,
    ],
  },
  {
    title: 'Docking — Partial Dispatch Approvals',
    description: 'Review and approve requests to dispatch a docking entry with partial box scanning.',
    route: '/admin/docking/partial-dispatch-approvals',
    icon: <Truck className="h-5 w-5" />,
    color: 'text-amber-700',
    permissions: [
      ADMIN_PERMISSIONS.DOCKING.VIEW_PARTIAL_SCAN,
      ADMIN_PERMISSIONS.DOCKING.APPROVE_PARTIAL_SCAN,
    ],
  },
  {
    title: 'Material Indent — Purchase Approvals',
    description: 'Review material requests raised across departments and approve them for purchase.',
    route: '/admin/material-indent-approvals',
    icon: <ClipboardList className="h-5 w-5" />,
    color: 'text-sky-700',
    permissions: [
      MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT,
      MAINTENANCE_PERMISSIONS.APPROVE_MATERIAL_INDENT,
    ],
  },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();

  const visibleCards = useMemo(
    () => adminModuleCards.filter((card) => hasAnyPermission([...card.permissions])),
    [hasAnyPermission],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Truck className="h-7 w-7" />
          Admin
        </h2>
        <p className="text-muted-foreground">Administrative review and approval queues.</p>
      </div>

      {visibleCards.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            You do not have access to any admin queues.
          </CardContent>
        </Card>
      ) : (
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
      )}
    </div>
  );
}
