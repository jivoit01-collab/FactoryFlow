import {
  ArrowLeftRight,
  DoorOpen,
  Factory,
  IndianRupee,
  MonitorPlay,
  Navigation,
  Package,
  PackageX,
  Target,
  Truck,
  Wind,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  BLOWING_PERMISSIONS,
  DASHBOARDS_PERMISSIONS,
  DISPATCH_PERMISSIONS,
  GATE_PERMISSIONS,
} from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import { GATE_DASHBOARD_VIEW_PERMISSIONS } from '../gate/constants/gate-dashboard.constants';

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
    title: 'Stock Benchmark',
    description: 'Monitor on-hand inventory against benchmark levels across warehouses',
    icon: <Package className="h-5 w-5" />,
    route: '/dashboards/stock-levels',
    color: 'text-emerald-600',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_STOCK_DASHBOARD],
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
    title: 'Factory Expense',
    description:
      "Today's factory cost on one wall screen - labour at the gate, salary, electricity and maintenance",
    icon: <IndianRupee className="h-5 w-5" />,
    route: '/dashboards/factory-expense',
    color: 'text-teal-600',
    permissions: [
      DASHBOARDS_PERMISSIONS.VIEW_FACTORY_EXPENSE,
      DASHBOARDS_PERMISSIONS.CONFIGURE_FACTORY_EXPENSE,
    ],
  },
  {
    title: 'Dispatch',
    description:
      "Today's dispatch on one wall screen - trucks out, value shipped, vendors, company split & vehicles in/out",
    icon: <MonitorPlay className="h-5 w-5" />,
    route: '/dashboards/dispatch',
    color: 'text-emerald-600',
    permissions: [
      DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PLANS,
      DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE,
      GATE_PERMISSIONS.SALES_DISPATCH.VIEW,
    ],
  },
  {
    title: 'Dispatch Pipeline',
    description: 'Track which vehicle is at which stage from vehicle linking to sales dispatch out',
    icon: <Truck className="h-5 w-5" />,
    route: '/dashboards/dispatch-pipeline',
    color: 'text-teal-600',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_DISPATCH_PIPELINE],
  },
  {
    title: 'Dispatch Tracking',
    description: 'Post-dispatch truck status — in transit, delivered, late/overdue & on-time KPIs',
    icon: <Navigation className="h-5 w-5" />,
    route: '/dashboards/dispatch-tracking',
    color: 'text-indigo-600',
    permissions: [DISPATCH_PERMISSIONS.DISPATCH_TRACKING_VIEW],
  },
  {
    title: 'Gate',
    description: 'All gate activity — vehicles in/out, visitors, receipts, dispatch & returns',
    icon: <DoorOpen className="h-5 w-5" />,
    route: '/dashboards/gate',
    color: 'text-blue-600',
    permissions: GATE_DASHBOARD_VIEW_PERMISSIONS,
  },
  {
    title: 'Production',
    description:
      "Today's production on one wall screen - what came off the lines, App-vs-SAP, material, wastage & cost",
    icon: <Factory className="h-5 w-5" />,
    route: '/dashboards/production',
    color: 'text-emerald-600',
    permissions: [DASHBOARDS_PERMISSIONS.VIEW_PRODUCTION_MOVEMENT],
  },
  {
    title: 'Blowing',
    description: 'Preform to bottle — output, rejection, cost per bottle, make-vs-buy & standards',
    icon: <Wind className="h-5 w-5" />,
    route: '/dashboards/blowing',
    color: 'text-cyan-600',
    permissions: [BLOWING_PERMISSIONS.VIEW_REPORTS],
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
