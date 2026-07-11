import { ArrowLeftRight, Boxes, ClipboardList, PackageCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { GRPO_PERMISSIONS, WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui';

/**
 * Warehouse landing sections — one card per child of the "Warehouse" sidebar group.
 * Each card is shown only when the user holds its permission; the dashboard itself is
 * reachable by everyone (see the `/warehouse` route in module.config).
 */
const WAREHOUSE_SECTIONS = [
  {
    title: 'BOM Requests',
    description: 'Review and approve material requests from production',
    icon: ClipboardList,
    path: '/warehouse/bom-requests',
    permission: WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST,
  },
  {
    title: 'FG Receipts',
    description: 'Receive finished goods and post them to SAP',
    icon: PackageCheck,
    path: '/warehouse/fg-receipts',
    permission: WAREHOUSE_PERMISSIONS.VIEW_FG_RECEIPT,
  },
  {
    title: 'Branch Transfer',
    description: 'Create and receive branch stock transfers',
    icon: ArrowLeftRight,
    path: '/warehouse/bst',
    permission: WAREHOUSE_PERMISSIONS.VIEW_BST,
  },
  {
    title: 'Material GRPO',
    description: 'Post goods receipts against purchase orders',
    icon: Boxes,
    path: '/warehouse/grpo/material',
    permission: GRPO_PERMISSIONS.VIEW_PENDING,
  },
] as const;

export default function WarehouseDashboardPage() {
  const navigate = useNavigate();
  const { hasPermission, permissionsLoaded } = usePermission();

  if (!permissionsLoaded) return null;

  const sections = WAREHOUSE_SECTIONS.filter((section) => hasPermission(section.permission));

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Warehouse"
        description="Material requests, finished goods, branch transfers, and goods receipts"
      />

      {sections.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">No warehouse sections available</CardTitle>
            <CardDescription>
              You have no warehouse sections available. Contact an administrator if you need access.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.path}
                className="cursor-pointer transition-colors hover:bg-accent"
                onClick={() => navigate(section.path)}
              >
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
