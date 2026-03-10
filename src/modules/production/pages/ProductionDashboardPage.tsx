import {
  AlertTriangle,
  BarChart3,
  CheckSquare,
  ClipboardList,
  Factory,
  Play,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { EXECUTION_PERMISSIONS, PRODUCTION_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

interface ProductionModuleCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
  permissions: readonly string[];
}

const productionModules: ProductionModuleCard[] = [
  {
    title: 'Planning',
    description: 'Production plans, weekly targets & daily entries',
    icon: <ClipboardList className="h-5 w-5" />,
    route: '/production/planning',
    color: 'text-blue-600',
    permissions: [PRODUCTION_PERMISSIONS.VIEW_PLAN],
  },
  {
    title: 'Execution',
    description: 'Active runs, hourly logging & production tracking',
    icon: <Play className="h-5 w-5" />,
    route: '/production/execution',
    color: 'text-green-600',
    permissions: [EXECUTION_PERMISSIONS.VIEW_RUN],
  },
  {
    title: 'Line Clearance',
    description: 'Pre-production checklists & QA approval',
    icon: <ShieldCheck className="h-5 w-5" />,
    route: '/production/execution/line-clearance',
    color: 'text-teal-600',
    permissions: [EXECUTION_PERMISSIONS.VIEW_CLEARANCE],
  },
  {
    title: 'Machine Checklists',
    description: 'Daily, weekly & monthly maintenance checklists',
    icon: <CheckSquare className="h-5 w-5" />,
    route: '/production/execution/machine-checklists',
    color: 'text-purple-600',
    permissions: [EXECUTION_PERMISSIONS.VIEW_CHECKLIST],
  },
  {
    title: 'Breakdowns',
    description: 'Machine breakdown logs & downtime tracking',
    icon: <AlertTriangle className="h-5 w-5" />,
    route: '/production/execution/breakdowns',
    color: 'text-red-600',
    permissions: [EXECUTION_PERMISSIONS.VIEW_BREAKDOWN],
  },
  {
    title: 'Waste Management',
    description: 'Waste logs & multi-level approval workflow',
    icon: <Trash2 className="h-5 w-5" />,
    route: '/production/execution/waste',
    color: 'text-amber-600',
    permissions: [EXECUTION_PERMISSIONS.VIEW_WASTE],
  },
  {
    title: 'Reports & Analytics',
    description: 'OEE, efficiency, yield & daily production reports',
    icon: <BarChart3 className="h-5 w-5" />,
    route: '/production/execution/reports',
    color: 'text-indigo-600',
    permissions: [EXECUTION_PERMISSIONS.VIEW_REPORTS],
  },
];

export default function ProductionDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();

  const visibleModules = useMemo(
    () => productionModules.filter((mod) => hasAnyPermission(mod.permissions)),
    [hasAnyPermission],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Production</h2>
        <p className="text-muted-foreground">
          Plan, execute & monitor your production operations
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Modules</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {visibleModules.map((module) => (
            <Card
              key={module.route}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
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
