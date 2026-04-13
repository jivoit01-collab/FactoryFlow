import {
  BarChart3,
  ClipboardCheck,
  Cog,
  Play,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { EXECUTION_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

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
    title: 'Execution',
    description: 'Active runs, production tracking & timeline',
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
    icon: <ClipboardCheck className="h-5 w-5" />,
    route: '/production/execution/machine-checklists',
    color: 'text-purple-600',
    permissions: [EXECUTION_PERMISSIONS.VIEW_CHECKLIST],
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

const quickActions: ProductionModuleCard[] = [
  {
    title: 'Machines',
    description: 'Add, edit & manage production machines',
    icon: <Cog className="h-5 w-5" />,
    route: '/production/execution/master-data',
    color: 'text-gray-600',
    permissions: [EXECUTION_PERMISSIONS.MANAGE_LINES],
  },
];

export default function ProductionDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();

  const visibleModules = useMemo(
    () => productionModules.filter((mod) => hasAnyPermission(mod.permissions)),
    [hasAnyPermission],
  );

  const visibleQuickActions = useMemo(
    () => quickActions.filter((mod) => hasAnyPermission(mod.permissions)),
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

      {visibleQuickActions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {visibleQuickActions.map((action, i) => (
              <Button
                key={`${action.route}-${i}`}
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => navigate(action.route)}
              >
                <div className={action.color}>{action.icon}</div>
                <span className="text-xs">{action.title}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
