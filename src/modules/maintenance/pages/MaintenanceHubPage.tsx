import {
  BarChart3,
  Bell,
  Boxes,
  CalendarCheck,
  ClipboardList,
  Factory,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Package,
  PackageOpen,
  PackagePlus,
  Settings,
  Trash2,
  Zap,
} from 'lucide-react';

import {
  DAILY_ELECTRICITY_ACCESS_PERMISSIONS,
  GATE_PERMISSIONS,
  MAINTENANCE_PERMISSIONS,
  RETURNABLE_PERMISSIONS,
} from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { AccentKey } from '@/shared/components/dashboard/accents';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { ModuleTile, ModuleTileGrid } from '@/shared/components/navigation';
import { Card, CardContent } from '@/shared/components/ui';

interface SubModule {
  title: string;
  to: string;
  icon: LucideIcon;
  accent: AccentKey;
  // Shown when the user has ANY of these permissions (matches route/sidebar gating).
  // Omit to always show.
  permissions?: readonly string[];
}

const SUB_MODULES: SubModule[] = [
  {
    title: 'Dashboard',
    to: '/maintenance/dashboard',
    icon: LayoutDashboard,
    accent: 'indigo',
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_DASHBOARD],
  },
  {
    title: 'Assets',
    to: '/maintenance/assets',
    icon: Factory,
    accent: 'emerald',
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_ASSET],
  },
  {
    title: 'Work Orders',
    to: '/maintenance/work-orders',
    icon: ClipboardList,
    accent: 'blue',
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_ORDER],
  },
  {
    title: 'Store / Spares',
    to: '/maintenance/spares',
    icon: Boxes,
    accent: 'cyan',
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_SPARE],
  },
  {
    title: 'Returnable / Non-returnable',
    to: '/maintenance/returnable',
    icon: PackageOpen,
    accent: 'violet',
    permissions: [RETURNABLE_PERMISSIONS.VIEW_GATEPASS],
  },
  {
    title: 'Material Indent',
    to: '/maintenance/material-indents',
    icon: PackagePlus,
    accent: 'sky',
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT],
  },
  {
    title: 'PM / Checklist',
    to: '/maintenance/pm',
    icon: CalendarCheck,
    accent: 'teal',
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_PM],
  },
  {
    title: 'Daily Electricity',
    to: '/maintenance/daily-electricity',
    icon: Zap,
    accent: 'amber',
    permissions: [...DAILY_ELECTRICITY_ACCESS_PERMISSIONS],
  },
  {
    title: 'Daily Wastage',
    to: '/maintenance/daily-wastage',
    icon: Trash2,
    accent: 'rose',
    permissions: [
      MAINTENANCE_PERMISSIONS.VIEW_DAILY_WASTAGE,
      MAINTENANCE_PERMISSIONS.MANAGE_DAILY_WASTAGE,
    ],
  },
  {
    title: 'Reports',
    to: '/maintenance/reports',
    icon: BarChart3,
    accent: 'blue',
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_REPORTS],
  },
  {
    title: 'Automation',
    to: '/maintenance/automation',
    icon: Bell,
    accent: 'amber',
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_DASHBOARD],
  },
  {
    title: 'Masters',
    to: '/maintenance/masters',
    icon: Settings,
    accent: 'indigo',
    permissions: [
      MAINTENANCE_PERMISSIONS.VIEW_ASSET_CATEGORY,
      MAINTENANCE_PERMISSIONS.VIEW_ASSET_LOCATION,
      MAINTENANCE_PERMISSIONS.VIEW_ASSET_DEPARTMENT,
      MAINTENANCE_PERMISSIONS.MANAGE_SETTINGS,
    ],
  },
  {
    title: 'Gate Material In',
    to: '/gate/maintenance',
    icon: Package,
    accent: 'emerald',
    permissions: [GATE_PERMISSIONS.MAINTENANCE.VIEW, GATE_PERMISSIONS.MAINTENANCE.VIEW_FULL],
  },
  {
    title: 'Repair Movement',
    to: '/gate/repair-parts-out',
    icon: FileText,
    accent: 'teal',
    permissions: [GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW, GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE],
  },
];

export default function MaintenanceHubPage() {
  const { hasAnyPermission } = usePermission();

  const visible = SUB_MODULES.filter(
    (item) =>
      !item.permissions || item.permissions.length === 0 || hasAnyPermission(item.permissions),
  );

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title="Maintenance" description="Choose a section to open" />

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You don’t have access to any Maintenance sections.
          </CardContent>
        </Card>
      ) : (
        <ModuleTileGrid>
          {visible.map((item) => {
            const Icon = item.icon;

            return (
              <ModuleTile
                key={item.to}
                title={item.title}
                icon={<Icon className="h-5 w-5" />}
                accent={item.accent}
                to={item.to}
              />
            );
          })}
        </ModuleTileGrid>
      )}
    </div>
  );
}
