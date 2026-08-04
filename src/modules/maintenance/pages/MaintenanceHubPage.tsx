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
import { Link } from 'react-router-dom';

import {
  GATE_PERMISSIONS,
  MAINTENANCE_PERMISSIONS,
  RETURNABLE_PERMISSIONS,
} from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui';

interface SubModule {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  // Shown when the user has ANY of these permissions (matches route/sidebar gating).
  // Omit to always show.
  permissions?: readonly string[];
}

const SUB_MODULES: SubModule[] = [
  {
    title: 'Dashboard',
    description: 'Overview of open jobs, machines down and alerts.',
    to: '/maintenance/dashboard',
    icon: LayoutDashboard,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_DASHBOARD],
  },
  {
    title: 'Assets',
    description: 'Machines and equipment register with history, photos and papers.',
    to: '/maintenance/assets',
    icon: Factory,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_ASSET],
  },
  {
    title: 'Work Orders',
    description: 'Raise, assign and track repair and service jobs.',
    to: '/maintenance/work-orders',
    icon: ClipboardList,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_ORDER],
  },
  {
    title: 'Store / Spares',
    description: 'Spare parts stock, requests and issue control.',
    to: '/maintenance/spares',
    icon: Boxes,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_SPARE],
  },
  {
    title: 'Returnable / Non-returnable',
    description: 'Send material out for repair or exchange and track it until it comes back.',
    to: '/maintenance/returnable',
    icon: PackageOpen,
    permissions: [RETURNABLE_PERMISSIONS.VIEW_GATEPASS],
  },
  {
    title: 'Material Indent',
    description: 'Raise material requests; store issues stock and forwards the shortfall for purchase.',
    to: '/maintenance/material-indents',
    icon: PackagePlus,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT],
  },
  {
    title: 'PM / Checklist',
    description: 'Planned servicing schedules with checklists.',
    to: '/maintenance/pm',
    icon: CalendarCheck,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_PM],
  },
  {
    title: 'Daily Electricity',
    description: 'Daily meter readings — units consumed and cost per meter.',
    to: '/maintenance/daily-electricity',
    icon: Zap,
    permissions: [
      MAINTENANCE_PERMISSIONS.VIEW_DAILY_ELECTRICITY,
      MAINTENANCE_PERMISSIONS.MANAGE_DAILY_ELECTRICITY,
    ],
  },
  {
    title: 'Daily Wastage',
    description: 'Daily wastage register — what was wasted, how much and why.',
    to: '/maintenance/daily-wastage',
    icon: Trash2,
    permissions: [
      MAINTENANCE_PERMISSIONS.VIEW_DAILY_WASTAGE,
      MAINTENANCE_PERMISSIONS.MANAGE_DAILY_WASTAGE,
    ],
  },
  {
    title: 'Reports',
    description: 'Maintenance numbers and summaries.',
    to: '/maintenance/reports',
    icon: BarChart3,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_REPORTS],
  },
  {
    title: 'Automation',
    description: 'Alerts such as low stock and overdue servicing.',
    to: '/maintenance/automation',
    icon: Bell,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_DASHBOARD],
  },
  {
    title: 'Masters',
    description: 'Setup lists: categories, locations, departments and settings.',
    to: '/maintenance/masters',
    icon: Settings,
    permissions: [
      MAINTENANCE_PERMISSIONS.VIEW_ASSET_CATEGORY,
      MAINTENANCE_PERMISSIONS.VIEW_ASSET_LOCATION,
      MAINTENANCE_PERMISSIONS.VIEW_ASSET_DEPARTMENT,
      MAINTENANCE_PERMISSIONS.MANAGE_SETTINGS,
    ],
  },
  {
    title: 'Gate Material In',
    description: 'Parts coming in through the Gate module.',
    to: '/gate/maintenance',
    icon: Package,
    permissions: [GATE_PERMISSIONS.MAINTENANCE.VIEW, GATE_PERMISSIONS.MAINTENANCE.VIEW_FULL],
  },
  {
    title: 'Repair Movement',
    description: 'Parts going out for repair through the Gate module.',
    to: '/gate/repair-parts-out',
    icon: FileText,
    permissions: [GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW, GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE],
  },
];

export default function MaintenanceHubPage() {
  const { hasAnyPermission } = usePermission();

  const visible = SUB_MODULES.filter(
    (item) => !item.permissions || item.permissions.length === 0 || hasAnyPermission(item.permissions),
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className="group focus:outline-none">
                <Card className="h-full transition group-hover:border-primary/50 group-hover:shadow-sm group-focus-visible:ring-2 group-focus-visible:ring-primary">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{item.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
