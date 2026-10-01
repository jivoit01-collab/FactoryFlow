import {
  ArrowLeftRight,
  Boxes,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  FileCheck,
  FileMinus,
  FileText,
  LayoutGrid,
  type LucideIcon,
  PackageCheck,
  PackageMinus,
  PackageOpen,
  PackagePlus,
  PackageSearch,
  Receipt,
  Repeat,
  Scale,
  Truck,
} from 'lucide-react';

import { useAuth, usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { ModuleTile, ModuleTileGrid, tileAccentByIndex } from '@/shared/components/navigation';
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui';

import { warehouseModuleConfig } from '../module.config';

/**
 * The tiles are the "Warehouse" sidebar group's children, read from module.config —
 * same list, same order, same permission and company checks as the sidebar — so a
 * page added to the sidebar shows up here without anyone remembering to. This page
 * only picks the icon; a path missing from the map gets the generic one.
 */
const TILE_ICONS: Record<string, LucideIcon> = {
  '/warehouse/bill-summaries': FileText,
  '/warehouse/bill-summaries/approvals': ClipboardCheck,
  '/warehouse/short-dispatch': PackageMinus,
  '/warehouse/dispatch-loading': Truck,
  '/warehouse/rm-stock': Scale,
  '/warehouse/godown-movements': PackageOpen,
  '/warehouse/bom-requests': ClipboardList,
  '/warehouse/fg-receipts': PackageCheck,
  '/warehouse/inventory-transfer': Repeat,
  '/warehouse/inventory-transfer/request': PackageSearch,
  '/warehouse/bst': ArrowLeftRight,
  '/warehouse/bst/partial-approvals': CheckCheck,
  '/warehouse/grpo/material': Boxes,
  '/warehouse/grpo/fg': PackagePlus,
  '/warehouse/invoice-approval': FileCheck,
  '/warehouse/credit-note-approval': FileMinus,
  '/warehouse/ar-invoices': Receipt,
};

const WAREHOUSE_CHILDREN =
  warehouseModuleConfig.navigation?.find((item) => item.path === '/warehouse')?.children ?? [];

export default function WarehouseDashboardPage() {
  const { hasAnyPermission, permissionsLoaded } = usePermission();
  const { currentCompany } = useAuth();

  if (!permissionsLoaded) return null;

  // The sidebar's child filter (app/layouts/components/Sidebar.tsx), kept identical.
  const sections = WAREHOUSE_CHILDREN.filter((child) => {
    if (child.companies && !child.companies.includes(currentCompany?.company_code ?? '')) {
      return false;
    }
    if (!child.permissions || child.permissions.length === 0) return true;
    return hasAnyPermission(child.permissions);
  });

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Warehouse"
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
        <ModuleTileGrid>
          {sections.map((section, index) => {
            const Icon = TILE_ICONS[section.path] ?? LayoutGrid;

            return (
              <ModuleTile
                key={section.path}
                title={section.title}
                icon={<Icon className="h-5 w-5" />}
                accent={tileAccentByIndex(index)}
                to={section.path}
              />
            );
          })}
        </ModuleTileGrid>
      )}
    </div>
  );
}
