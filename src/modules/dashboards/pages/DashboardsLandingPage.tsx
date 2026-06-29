import {
  ArrowLeftRight,
  BarChart3,
  CalendarClock,
  Package,
  PackageX,
  Target,
  Truck,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

interface DashboardsModuleCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
  permissions: readonly string[];
}

const dashboardsModules: DashboardsModuleCard[] = [
  {
    title: 'SAP Material Plan',
    description: 'Production order shortfall, BOM detail & procurement requirements from SAP',
    icon: <BarChart3 className="h-5 w-5" />,
    route: '/dashboards/sap-plan',
    color: 'text-indigo-600',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_PLAN_DASHBOARD],
  },
  {
    title: 'Stock Benchmark',
    description: 'Monitor on-hand inventory against benchmark levels across warehouses',
    icon: <Package className="h-5 w-5" />,
    route: '/dashboards/stock-levels',
    color: 'text-emerald-600',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD],
  },
  {
    title: 'Inventory',
    description: 'Stock age, valuation, and group breakdown across all warehouses',
    icon: <CalendarClock className="h-5 w-5" />,
    route: '/dashboards/inventory-age',
    color: 'text-amber-600',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_INVENTORY_AGE],
  },
  {
    title: 'Non-Moving',
    description: 'Identify dead stock and slow-moving inventory by age and item group',
    icon: <PackageX className="h-5 w-5" />,
    route: '/dashboards/non-moving',
    color: 'text-amber-600',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM],
  },
  {
    title: 'Sales Plan vs Req.',
    description: 'Compare monthly forecast demand against stock, minimum stock, and open POs',
    icon: <Target className="h-5 w-5" />,
    route: '/dashboards/sales-planning-requirement',
    color: 'text-rose-600',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_SALES_PLANNING_REQUIREMENT],
  },
  {
    title: 'Production Movement',
    description: 'Track inventory entries moving in and out of production warehouses',
    icon: <ArrowLeftRight className="h-5 w-5" />,
    route: '/dashboards/production-movement',
    color: 'text-sky-600',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
  },
  {
    title: 'Dispatch Pipeline',
    description: 'Track which vehicle is at which stage from vehicle linking to sales dispatch out',
    icon: <Truck className="h-5 w-5" />,
    route: '/dashboards/dispatch-pipeline',
    color: 'text-teal-600',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE],
  },
];

export default function DashboardsLandingPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();

  const visibleModules = useMemo(
    () => dashboardsModules.filter((mod) => hasAnyPermission(mod.permissions)),
    [hasAnyPermission],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboards</h2>
        <p className="text-muted-foreground">Analytics and planning views across systems</p>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Available Dashboards</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {visibleModules.map((module) => (
            <Card
              key={module.route}
              className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
              onClick={() => navigate(module.route)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{module.title}</CardTitle>
                <div className={module.color}>{module.icon}</div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{module.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
