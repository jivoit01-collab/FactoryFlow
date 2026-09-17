import {
  BadgeIndianRupee,
  ClipboardCheck,
  Flame,
  HardHat,
  type LucideIcon,
  ShieldCheck,
} from 'lucide-react';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { AccentKey } from '@/shared/components/dashboard/accents';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { ModuleTile, ModuleTileGrid } from '@/shared/components/navigation';
import { Card, CardContent } from '@/shared/components/ui';

interface SubModule {
  title: string;
  to: string;
  icon: LucideIcon;
  accent: AccentKey;
  permissions?: readonly string[];
}

const SUB_MODULES: SubModule[] = [
  {
    title: 'Store / Fire',
    accent: 'rose',
    to: '/fire/store',
    icon: Flame,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE],
  },
  {
    title: 'Fire Reports',
    accent: 'blue',
    to: '/fire/reports',
    icon: ClipboardCheck,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE_REPORT],
  },
  {
    title: 'Fire Equipment Issue / Return',
    accent: 'amber',
    to: '/fire/equipment',
    icon: HardHat,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_FIRE_ISSUE],
  },
  {
    title: 'Work Permits',
    accent: 'emerald',
    to: '/fire/work-permits',
    icon: ShieldCheck,
    permissions: [MAINTENANCE_PERMISSIONS.VIEW_WORK_PERMIT],
  },
  {
    title: 'Safety Fines',
    accent: 'violet',
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
        <ModuleTileGrid>
          {visible.map((item) => {
            const Icon = item.icon;

            return (
              <ModuleTile
                key={item.to}
                title={item.title}
                icon={<Icon className="h-5 w-5" />}
                accent={item.accent}
                to={item.to}
              />
            );
          })}
        </ModuleTileGrid>
      )}
    </div>
  );
}
