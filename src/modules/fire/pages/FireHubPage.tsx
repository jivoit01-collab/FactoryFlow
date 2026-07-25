import {
  BadgeIndianRupee,
  ClipboardCheck,
  Flame,
  HardHat,
  type LucideIcon,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui';

interface SubModule {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  permissions?: readonly string[];
}

const SUB_MODULES: SubModule[] = [
  {
    title: 'Store / Fire',
    description: 'Fire department store stock and issue control.',
    to: '/fire/store',
    icon: Flame,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE],
  },
  {
    title: 'Fire Reports',
    description: 'Daily shift fire-equipment inspection logs with photos.',
    to: '/fire/reports',
    icon: ClipboardCheck,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE_REPORT],
  },
  {
    title: 'Fire Equipment Issue / Return',
    description: 'Issue fire gear to a person and track returns.',
    to: '/fire/equipment',
    icon: HardHat,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE_ISSUE],
  },
  {
    title: 'Work Permits',
    description: 'Permit-to-work clearance for hazardous jobs, with approvals and sign-off.',
    to: '/fire/work-permits',
    icon: ShieldCheck,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_PERMIT],
  },
  {
    title: 'Safety Fines',
    description: 'Record PPE violations on the floor and issue fines.',
    to: '/fire/safety-fines',
    icon: BadgeIndianRupee,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_SAFETY_FINE],
  },
];

export default function FireHubPage() {
  const { hasAnyPermission } = usePermission();

  const visible = SUB_MODULES.filter(
    (item) =>
      !item.permissions || item.permissions.length === 0 || hasAnyPermission(item.permissions),
  );

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title="Fire" description="Choose a section to open" />

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You don’t have access to any Fire sections.
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
