import {
  ClipboardCheck,
  ClipboardList,
  Coins,
  PackageCheck,
  ShieldCheck,
  Truck,
  Undo2,
} from 'lucide-react';
import { useMemo } from 'react';

import {
  ADMIN_PERMISSIONS,
  COST_MASTER_PERMISSIONS,
  GOODS_RETURN_PERMISSIONS,
  MAINTENANCE_PERMISSIONS,
  RETURNABLE_PERMISSIONS,
  WAREHOUSE_PERMISSIONS,
} from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { ModuleTile, ModuleTileGrid, tileAccent } from '@/shared/components/navigation';
import { Card, CardContent } from '@/shared/components/ui';

interface AdminModuleCard {
  title: string;
  route: string;
  icon: React.ReactNode;
  color: string;
  permissions: readonly string[];
}

const adminModuleCards: AdminModuleCard[] = [
  {
    title: 'Docking — Scan Skip Requests',
    route: '/admin/docking/scan-approvals',
    icon: <ClipboardCheck className="h-5 w-5" />,
    color: 'text-emerald-700 dark:text-emerald-400',
    permissions: [
      ADMIN_PERMISSIONS.DOCKING.VIEW_SCAN_SKIP,
      ADMIN_PERMISSIONS.DOCKING.APPROVE_SCAN_SKIP,
    ],
  },
  {
    title: 'Docking — Partial Dispatch Approvals',
    route: '/admin/docking/partial-dispatch-approvals',
    icon: <Truck className="h-5 w-5" />,
    color: 'text-amber-700 dark:text-amber-400',
    permissions: [
      ADMIN_PERMISSIONS.DOCKING.VIEW_PARTIAL_SCAN,
      ADMIN_PERMISSIONS.DOCKING.APPROVE_PARTIAL_SCAN,
    ],
  },
  {
    title: 'Material Indent — Purchase Approvals',
    route: '/admin/material-indent-approvals',
    icon: <ClipboardList className="h-5 w-5" />,
    color: 'text-sky-700 dark:text-sky-400',
    permissions: [
      MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT,
      MAINTENANCE_PERMISSIONS.APPROVE_MATERIAL_INDENT,
    ],
  },
  {
    title: 'Returnable / Non-returnable Approvals',
    route: '/admin/returnable-approvals',
    icon: <PackageCheck className="h-5 w-5" />,
    color: 'text-violet-700 dark:text-violet-400',
    permissions: [RETURNABLE_PERMISSIONS.APPROVE_GATEPASS],
  },
  {
    title: 'BST Partial-Transfer Approvals',
    route: '/admin/bst-approvals',
    icon: <ShieldCheck className="h-5 w-5" />,
    color: 'text-teal-700 dark:text-teal-400',
    permissions: [WAREHOUSE_PERMISSIONS.APPROVE_BST_PARTIAL],
  },
  {
    title: 'Goods Return Approvals',
    route: '/admin/goods-return-approvals',
    icon: <Undo2 className="h-5 w-5" />,
    color: 'text-rose-700 dark:text-rose-400',
    permissions: [GOODS_RETURN_PERMISSIONS.APPROVE],
  },
  {
    title: 'Cost Master',
    route: '/admin/cost-master',
    icon: <Coins className="h-5 w-5" />,
    color: 'text-indigo-700 dark:text-indigo-400',
    permissions: [COST_MASTER_PERMISSIONS.MANAGE],
  },
];

export default function AdminDashboardPage() {
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
      )}
    </div>
  );
}
