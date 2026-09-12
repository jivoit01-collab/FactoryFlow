import {
  ArrowLeftRight,
  Boxes,
  CheckCheck,
  ClipboardList,
  FileCheck,
  FileText,
  PackageCheck,
  PackageOpen,
  PackagePlus,
  Receipt,
  Repeat,
  Scale,
  ScanLine,
  Truck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  AR_INVOICE_PERMISSIONS,
  DISPATCH_PERMISSIONS,
  GATE_PERMISSIONS,
  GRPO_PERMISSIONS,
  INVOICE_APPROVAL_PERMISSIONS,
  WAREHOUSE_PERMISSIONS,
} from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui';

/**
 * Warehouse landing sections — one card per child of the "Warehouse" sidebar group,
 * in the same order the sidebar lists them. Each card is shown only when the user
 * holds one of its permissions; the dashboard itself is reachable by everyone (see
 * the `/warehouse` route in module.config). Keep this list in step with the
 * `children` array there — a submodule added to the sidebar belongs here too.
 */
const WAREHOUSE_SECTIONS = [
  {
    title: 'Bill Summaries',
    description: 'Pick against the warehouse sheet for a dispatch plan',
    icon: FileText,
    path: '/warehouse/bill-summaries',
    // The picking sheet is warehouse work, but its permissions name the Django
    // app it lives in (`dispatch_plans`) — same list the sidebar child uses.
    permissions: [
      DISPATCH_PERMISSIONS.VIEW_BILL_SUMMARY,
      DISPATCH_PERMISSIONS.CREATE_BILL_SUMMARY,
      DISPATCH_PERMISSIONS.PICK_BILL_SUMMARY,
    ],
  },
  {
    title: 'Dispatch Loading',
    description: 'Scan pallets onto a docked truck against its bills',
    icon: Truck,
    path: '/warehouse/dispatch-loading',
    permissions: [GATE_PERMISSIONS.SALES_DISPATCH.VIEW],
  },
  {
    title: 'Receive Barcodes',
    description: 'Turn printed labels into stock at the godown gate',
    icon: ScanLine,
    path: '/warehouse/receive',
    permissions: [WAREHOUSE_PERMISSIONS.RECEIVE_BARCODES],
  },
  {
    title: 'Raw Material Stock',
    description: 'Set the quantity of each raw material your store is holding',
    icon: Scale,
    path: '/warehouse/rm-stock',
    permissions: [WAREHOUSE_PERMISSIONS.VIEW_RM_STOCK],
  },
  {
    title: 'Godown Movements',
    description: 'Record what leaves your floor, and where it is going',
    icon: PackageOpen,
    path: '/warehouse/godown-movements',
    permissions: [WAREHOUSE_PERMISSIONS.VIEW_PF_MOVEMENT],
  },
  {
    title: 'BOM Requests',
    description: 'Review and approve material requests from production',
    icon: ClipboardList,
    path: '/warehouse/bom-requests',
    permissions: [WAREHOUSE_PERMISSIONS.VIEW_BOM_REQUEST],
  },
  {
    title: 'FG Receipts',
    description: 'Receive finished goods and post them to SAP',
    icon: PackageCheck,
    path: '/warehouse/fg-receipts',
    permissions: [WAREHOUSE_PERMISSIONS.VIEW_FG_RECEIPT],
  },
  {
    title: 'Transfer Requests',
    description: 'Raise and approve stock transfers between warehouses',
    icon: Repeat,
    path: '/warehouse/transfer-requests',
    permissions: [WAREHOUSE_PERMISSIONS.VIEW_TRANSFER_REQUEST],
  },
  {
    title: 'Branch Transfer',
    description: 'Create and receive branch stock transfers',
    icon: ArrowLeftRight,
    path: '/warehouse/bst',
    permissions: [WAREHOUSE_PERMISSIONS.VIEW_BST],
  },
  {
    title: 'BST Approvals',
    description: 'Approve short-scanned branch transfers so they can seal',
    icon: CheckCheck,
    path: '/warehouse/bst/partial-approvals',
    permissions: [WAREHOUSE_PERMISSIONS.APPROVE_BST_PARTIAL],
  },
  {
    title: 'Material GRPO',
    description: 'Post goods receipts against purchase orders',
    icon: Boxes,
    path: '/warehouse/grpo/material',
    permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
  },
  {
    title: 'Finished Goods GRPO',
    description: 'Post goods receipts for traded and purchased finished goods',
    icon: PackagePlus,
    path: '/warehouse/grpo/fg',
    permissions: [GRPO_PERMISSIONS.VIEW_PENDING],
  },
  {
    title: 'Invoice Approval',
    description: 'Approve the purchase invoices waiting on the warehouse',
    icon: FileCheck,
    path: '/warehouse/invoice-approval',
    permissions: [INVOICE_APPROVAL_PERMISSIONS.VIEW_INVOICE],
  },
  {
    title: 'AR Invoices',
    description: 'Raise sales invoices from open sales-order lines',
    icon: Receipt,
    path: '/warehouse/ar-invoices',
    permissions: [AR_INVOICE_PERMISSIONS.VIEW],
  },
] as const;

export default function WarehouseDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission, permissionsLoaded } = usePermission();

  if (!permissionsLoaded) return null;

  const sections = WAREHOUSE_SECTIONS.filter((section) => hasAnyPermission(section.permissions));

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
