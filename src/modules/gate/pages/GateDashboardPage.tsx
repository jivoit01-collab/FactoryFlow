import {
  Building2,
  Factory,
  HardHat,
  LogOut,
  Package,
  PackageX,
  RotateCcw,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
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
  section: 'in' | 'out';
}

const gateModules: GateModuleCard[] = [
  {
    title: 'Raw Materials (RM/PM/Assets)',
    icon: <Package className="h-5 w-5" />,
    route: ROUTES.GATE.children?.RAW_MATERIALS.path || '/gate/raw-materials',
    color: 'text-blue-600',
    permissions: [GATE_PERMISSIONS.RAW_MATERIAL.VIEW, GATE_PERMISSIONS.RAW_MATERIAL.VIEW_FULL],
    section: 'in',
  },
  {
    title: 'Daily Needs (Food/Consumables)',
    icon: <UtensilsCrossed className="h-5 w-5" />,
    route: ROUTES.GATE.children?.DAILY_NEEDS.path || '/gate/daily-needs',
    color: 'text-yellow-600',
    permissions: [GATE_PERMISSIONS.DAILY_NEEDS.VIEW, GATE_PERMISSIONS.DAILY_NEEDS.VIEW_FULL],
    section: 'in',
  },
  {
    title: 'Maintenance (Spare parts/Tools)',
    icon: <Wrench className="h-5 w-5" />,
    route: ROUTES.GATE.children?.MAINTENANCE.path || '/gate/maintenance',
    color: 'text-purple-600',
    permissions: [GATE_PERMISSIONS.MAINTENANCE.VIEW, GATE_PERMISSIONS.MAINTENANCE.VIEW_FULL],
    section: 'in',
  },
  {
    title: 'Construction (Civil/Building Work)',
    icon: <Building2 className="h-5 w-5" />,
    route: ROUTES.GATE.children?.CONSTRUCTION.path || '/gate/construction',
    color: 'text-orange-600',
    permissions: [GATE_PERMISSIONS.CONSTRUCTION.VIEW, GATE_PERMISSIONS.CONSTRUCTION.VIEW_FULL],
    section: 'in',
  },
  {
    title: 'Visitor/Labour',
    icon: <HardHat className="h-5 w-5" />,
    route: ROUTES.GATE.children?.CONTRACTOR_LABOR.path || '/gate/visitor-labour',
    color: 'text-red-600',
    permissions: [GATE_PERMISSIONS.PERSON_GATE_IN.VIEW],
    section: 'in',
  },
  {
    title: 'Rejected QC Return',
    icon: <PackageX className="h-5 w-5" />,
    route: ROUTES.GATE.children?.REJECTED_QC_RETURN.path || '/gate/rejected-qc-return',
    color: 'text-rose-600',
    permissions: [
      GATE_PERMISSIONS.REJECTED_QC_RETURN.VIEW,
      GATE_PERMISSIONS.REJECTED_QC_RETURN.CREATE,
    ],
    section: 'out',
  },
  {
    title: 'Empty Vehicle Out',
    icon: <LogOut className="h-5 w-5" />,
    route: ROUTES.GATE.children?.EMPTY_VEHICLE_OUT.path || '/gate/empty-vehicle-out',
    color: 'text-blue-700',
    permissions: [
      GATE_PERMISSIONS.EMPTY_VEHICLE_OUT.VIEW,
      GATE_PERMISSIONS.EMPTY_VEHICLE_OUT.CREATE,
    ],
    section: 'out',
  },
  {
    title: 'BST / Returns',
    icon: <RotateCcw className="h-5 w-5" />,
    route: ROUTES.GATE.children?.RETURNS.path || '/gate/returns',
    color: 'text-teal-600',
    permissions: [GATE_PERMISSIONS.RETURNS.VIEW, GATE_PERMISSIONS.RETURNS.CREATE],
    section: 'in',
  },
  {
    title: 'Repair Movement',
    icon: <Wrench className="h-5 w-5" />,
    route: ROUTES.GATE.children?.REPAIR_MOVEMENT.path || '/gate/repair-movement',
    color: 'text-slate-600',
    permissions: [
      GATE_PERMISSIONS.REPAIR_MOVEMENT.VIEW,
      GATE_PERMISSIONS.REPAIR_MOVEMENT.CREATE,
    ],
    section: 'out',
  },
  {
    title: 'Job Work / Oil Refining',
    icon: <Factory className="h-5 w-5" />,
    route: ROUTES.GATE.children?.JOB_WORK.path || '/gate/job-work',
    color: 'text-cyan-600',
    permissions: [
      GATE_PERMISSIONS.DASHBOARD.VIEW,
      GATE_PERMISSIONS.JOB_WORK.VIEW,
      GATE_PERMISSIONS.JOB_WORK.CREATE,
    ],
    section: 'in',
  },
];

export default function GateDashboardPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();

  const visibleModules = useMemo(
    () => gateModules.filter((mod) => hasAnyPermission(mod.permissions)),
    [hasAnyPermission],
  );
  const gateInModules = visibleModules.filter((module) => module.section === 'in');
  const gateOutModules = visibleModules.filter((module) => module.section === 'out');

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gate Management</h2>
        <p className="text-muted-foreground">Complete gate control for all movements</p>
      </div>

      <GateModuleSection title="Gate In" modules={gateInModules} onOpen={navigate} />
      <GateModuleSection title="Gate Out" modules={gateOutModules} onOpen={navigate} />
    </div>
  );
}

function GateModuleSection({
  title,
  modules,
  onOpen,
}: {
  title: string;
  modules: GateModuleCard[];
  onOpen: (route: string) => void;
}) {
  if (modules.length === 0) return null;

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {modules.map((module) => (
          <Card
            key={module.route}
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => onOpen(module.route)}
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
  );
}
