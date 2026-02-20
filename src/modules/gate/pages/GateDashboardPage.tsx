import { Building2, HardHat, Package, UtensilsCrossed, Wrench } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { GATE_PERMISSIONS } from '@/config/permissions';
import { ROUTES } from '@/config/routes.config';
import { usePermission } from '@/core/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

interface GateModuleCard {
  title: string;
  icon: React.ReactNode;
  route: string;
  color: string;
  permissions: readonly string[];
}

const gateModules: GateModuleCard[] = [
  {
    title: 'Raw Materials (RM/PM/Assets)',
    icon: <Package className="h-5 w-5" />,
    route: ROUTES.GATE.children?.RAW_MATERIALS.path || '/gate/raw-materials',
    color: 'text-blue-600',
    permissions: [GATE_PERMISSIONS.RAW_MATERIAL.VIEW, GATE_PERMISSIONS.RAW_MATERIAL.VIEW_FULL],
  },
  {
    title: 'Daily Needs (Food/Consumables)',
    icon: <UtensilsCrossed className="h-5 w-5" />,
    route: ROUTES.GATE.children?.DAILY_NEEDS.path || '/gate/daily-needs',
    color: 'text-yellow-600',
    permissions: [GATE_PERMISSIONS.DAILY_NEEDS.VIEW, GATE_PERMISSIONS.DAILY_NEEDS.VIEW_FULL],
  },
  {
    title: 'Maintenance (Spare parts/Tools)',
    icon: <Wrench className="h-5 w-5" />,
    route: ROUTES.GATE.children?.MAINTENANCE.path || '/gate/maintenance',
    color: 'text-purple-600',
    permissions: [GATE_PERMISSIONS.MAINTENANCE.VIEW, GATE_PERMISSIONS.MAINTENANCE.VIEW_FULL],
  },
  {
    title: 'Construction (Civil/Building Work)',
    icon: <Building2 className="h-5 w-5" />,
    route: ROUTES.GATE.children?.CONSTRUCTION.path || '/gate/construction',
    color: 'text-orange-600',
    permissions: [GATE_PERMISSIONS.CONSTRUCTION.VIEW, GATE_PERMISSIONS.CONSTRUCTION.VIEW_FULL],
  },
  {
    title: 'Visitor/Labour',
    icon: <HardHat className="h-5 w-5" />,
    route: ROUTES.GATE.children?.CONTRACTOR_LABOR.path || '/gate/visitor-labour',
    color: 'text-red-600',
    permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.VIEW],
  },
];

export default function GateDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();

  const visibleModules = useMemo(
    () => gateModules.filter((mod) => hasAnyPermission(mod.permissions)),
    [hasAnyPermission],
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gate Management</h2>
        <p className="text-muted-foreground">Complete gate control for all movements</p>
      </div>

      {/* Top Modules - Gate Categories */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Top Modules</h3>
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
                <p className="text-xs text-muted-foreground">Click to view details</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
