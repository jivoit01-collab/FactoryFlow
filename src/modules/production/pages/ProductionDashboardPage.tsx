import {
  AlertCircle,
  ArrowRight,
  BarChart2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Factory,
  Package,
  RefreshCw,
  Users,
  Wrench,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/config/routes.config';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

interface StatCard {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  valueColor?: string;
}

interface ProductionModuleCard {
  title: string;
  description: string;
  stat: string;
  icon: React.ReactNode;
  iconBg: string;
  route: string;
}

interface RecentActivity {
  icon: React.ReactNode;
  title: string;
  time: string;
}

interface QuickAction {
  icon: React.ReactNode;
  title: string;
  route: string;
}

const statCards: StatCard[] = [
  {
    title: 'Active Production Plans',
    value: '8',
    subtitle: '↗ 2 approved today',
    icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
  },
  {
    title: 'Lines Running',
    value: '4/5',
    subtitle: '80% utilization',
    icon: <BarChart2 className="h-5 w-5 text-muted-foreground" />,
  },
  {
    title: 'QC Holds',
    value: '2',
    subtitle: 'Awaiting inspection',
    icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
    valueColor: 'text-orange-500',
  },
  {
    title: 'Active Workers',
    value: '53',
    subtitle: 'Morning shift',
    icon: <Users className="h-5 w-5 text-muted-foreground" />,
  },
];

const productionModules: ProductionModuleCard[] = [
  {
    title: 'Planning',
    description: 'Sales projection, weekly/monthly plans, MO creation',
    stat: '8 active plans',
    icon: <Calendar className="h-5 w-5 text-blue-600" />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    route: ROUTES.PRODUCTION.children?.PLANNING.path || '/production/planning',
  },
  {
    title: 'Material Acquisition',
    description: 'BOM-based material issue, stock management',
    stat: '12 pending requisitions',
    icon: <Package className="h-5 w-5 text-green-600" />,
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    route: ROUTES.PRODUCTION.children?.MATERIAL.path || '/production/material',
  },
  {
    title: 'Production',
    description: 'Line clearance, purging, manufacturing execution',
    stat: '4 lines running',
    icon: <Factory className="h-5 w-5 text-purple-600" />,
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    route: ROUTES.PRODUCTION.children?.MANUFACTURING.path || '/production/manufacturing',
  },
  {
    title: 'QC (In-Process)',
    description: 'Quality checks, hold/reject workflow, RCA/CAPA',
    stat: '2 active holds',
    icon: <ClipboardCheck className="h-5 w-5 text-orange-600" />,
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    route: ROUTES.PRODUCTION.children?.QC.path || '/production/qc',
  },
  {
    title: 'Return & Wastage',
    description: 'Material return, wastage verification, yield reports',
    stat: 'Track material flow',
    icon: <RefreshCw className="h-5 w-5 text-red-600" />,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    route: ROUTES.PRODUCTION.children?.RETURN_WASTAGE.path || '/production/return-wastage',
  },
  {
    title: 'Maintenance',
    description: 'Preventive, predictive, breakdown maintenance',
    stat: '3 pending tasks',
    icon: <Wrench className="h-5 w-5 text-yellow-600" />,
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    route: ROUTES.PRODUCTION.children?.MAINTENANCE.path || '/production/maintenance',
  },
  {
    title: 'Labour',
    description: 'SKU-wise labor allocation, contractor management',
    stat: '53 workers',
    icon: <Users className="h-5 w-5 text-teal-600" />,
    iconBg: 'bg-teal-100 dark:bg-teal-900/30',
    route: ROUTES.PRODUCTION.children?.LABOUR.path || '/production/labour',
  },
  {
    title: 'Reports',
    description: 'ME, PE, DPR, Yield, and all operational reports',
    stat: 'View all reports',
    icon: <BarChart2 className="h-5 w-5 text-indigo-600" />,
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    route: ROUTES.PRODUCTION.children?.REPORTS.path || '/production/reports',
  },
];

const recentActivities: RecentActivity[] = [
  {
    icon: <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />,
    title: 'Line 1 - Mustard Oil 5L production completed',
    time: '10 mins ago',
  },
  {
    icon: <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />,
    title: 'QC Hold initiated on Line 3 - Color variation detected',
    time: '25 mins ago',
  },
  {
    icon: <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />,
    title: 'Material requisition MR-2024-0456 approved',
    time: '1 hour ago',
  },
  {
    icon: <Clock className="h-5 w-5 text-blue-500 shrink-0" />,
    title: 'Preventive maintenance scheduled for Sunday',
    time: '2 hours ago',
  },
];

const quickActions: QuickAction[] = [
  {
    icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
    title: 'Create Production Plan',
    route: ROUTES.PRODUCTION.children?.PLANNING.path || '/production/planning',
  },
  {
    icon: <Package className="h-5 w-5 text-muted-foreground" />,
    title: 'Material Requisition',
    route: ROUTES.PRODUCTION.children?.MATERIAL.path || '/production/material',
  },
  {
    icon: <ClipboardCheck className="h-5 w-5 text-muted-foreground" />,
    title: 'Line Clearance',
    route: ROUTES.PRODUCTION.children?.MANUFACTURING.path || '/production/manufacturing',
  },
  {
    icon: <Package className="h-5 w-5 text-muted-foreground" />,
    title: 'Material Tracking',
    route: ROUTES.PRODUCTION.children?.MATERIAL.path || '/production/material',
  },
  {
    icon: <Factory className="h-5 w-5 text-muted-foreground" />,
    title: 'Production Entry',
    route: ROUTES.PRODUCTION.children?.MANUFACTURING.path || '/production/manufacturing',
  },
  {
    icon: <BarChart2 className="h-5 w-5 text-muted-foreground" />,
    title: 'View Reports',
    route: ROUTES.PRODUCTION.children?.REPORTS.path || '/production/reports',
  },
];

export default function ProductionDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Production Management</h2>
          <p className="text-muted-foreground">
            Jivo Wellness Factory - End-to-end production lifecycle management
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1.5 text-green-600 border-green-600">
          <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
          System Active
        </Badge>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.valueColor ?? ''}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Production Modules */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold">Production Modules</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {productionModules.map((mod) => (
              <Card
                key={mod.route}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                onClick={() => navigate(mod.route)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${mod.iconBg}`}>
                      {mod.icon}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h4 className="font-semibold mb-1">{mod.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{mod.description}</p>
                  <p className="text-sm font-medium">{mod.stat}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Recent Activities + Quick Actions */}
        <div className="space-y-4">
          {/* Recent Activities */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {recentActivities.map((activity, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                  {activity.icon}
                  <div>
                    <p className="text-sm font-medium leading-tight">{activity.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 px-2 py-2.5 rounded-md text-sm text-left hover:bg-accent transition-colors border-b last:border-0"
                  onClick={() => navigate(action.route)}
                >
                  {action.icon}
                  <span>{action.title}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
