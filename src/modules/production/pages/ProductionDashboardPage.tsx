import { BarChart3, ClipboardCheck, Cog, Play, ShieldCheck, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { EXECUTION_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  ModuleTile,
  ModuleTileGrid,
  ModuleTileGroupLabel,
  tileAccent,
} from '@/shared/components/navigation';
import { Button } from '@/shared/components/ui';

interface ProductionModuleCard {
  title: string;
  icon: React.ReactNode;
  route: string;
  color: string;
  permissions: readonly string[];
}

const productionModules: ProductionModuleCard[] = [
  {
    title: 'Execution',
    icon: <Play className="h-5 w-5" />,
    route: '/production/execution',
    color: 'text-green-600',
    permissions: [EXECUTION_PERMISSIONS.VIEW_RUN],
  },
  {
    title: 'Line Clearance',
    icon: <ShieldCheck className="h-5 w-5" />,
    route: '/production/execution/line-clearance',
    color: 'text-teal-600',
    permissions: [EXECUTION_PERMISSIONS.VIEW_CLEARANCE],
  },
  {
    title: 'Machine Checklists',
    icon: <ClipboardCheck className="h-5 w-5" />,
    route: '/production/execution/machine-checklists',
    color: 'text-purple-600',
    permissions: [EXECUTION_PERMISSIONS.VIEW_CHECKLIST],
  },
  {
    title: 'Waste Management',
    icon: <Trash2 className="h-5 w-5" />,
    route: '/production/execution/waste',
    color: 'text-amber-600',
    permissions: [EXECUTION_PERMISSIONS.VIEW_WASTE],
  },
  {
    title: 'Reports & Analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    route: '/production/execution/reports',
    color: 'text-indigo-600',
    permissions: [EXECUTION_PERMISSIONS.VIEW_REPORTS],
  },
];

const quickActions: ProductionModuleCard[] = [
  {
    title: 'Machines',
    icon: <Cog className="h-5 w-5" />,
    route: '/production/execution/master-data',
    color: 'text-gray-600 dark:text-muted-foreground',
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
        <h2 className="text-3xl font-semibold tracking-tight">Production</h2>
        <p className="mt-1.5 text-muted-foreground">
          Plan, execute & monitor your production operations
        </p>
      </div>

      <div className="space-y-3.5">
        <ModuleTileGroupLabel label="Modules" count={visibleModules.length} />
        <ModuleTileGrid>
          {visibleModules.map((module) => (
            <ModuleTile
              key={module.route}
              title={module.title}
              icon={module.icon}
              accent={tileAccent(module.color)}
              to={module.route}
            />
          ))}
        </ModuleTileGrid>
      </div>

      {visibleQuickActions.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Quick Actions</h3>
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
