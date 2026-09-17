import { useMemo } from 'react';

import { usePermission } from '@/core/auth';
import { ModuleTile, ModuleTileGrid } from '@/shared/components/navigation';

import { DISPATCH_SECTIONS } from './dispatchDashboard.constants';

/**
 * The dispatch module's sub-areas, built from the same `ModuleTile` as every
 * other hub page in the app — so arriving at /dispatch from the Dashboards grid
 * lands on a page that looks like the one just left, rather than a second,
 * near-identical card of its own invention.
 */
export function DispatchSectionCards() {
  const { hasAnyPermission } = usePermission();

  const sections = useMemo(
    () => DISPATCH_SECTIONS.filter((s) => hasAnyPermission([...s.permissions])),
    [hasAnyPermission],
  );

  if (sections.length === 0) return null;

  return (
    <ModuleTileGrid>
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <ModuleTile
            key={section.route}
            title={section.title}
            icon={<Icon className="h-5 w-5" />}
            accent={section.accent}
            to={section.route}
          />
        );
      })}
    </ModuleTileGrid>
  );
}
