import { LayoutGrid } from 'lucide-react';
import { useMemo } from 'react';

import { getAllNavigation } from '@/app/registry';
import { useAuth, usePermission } from '@/core/auth';
import type { ModuleNavItem } from '@/core/types';
import { ModuleTile, ModuleTileGrid } from '@/shared/components/navigation';

import { accentKeyForPath, MODULE_DIRECTORY_EXCLUDE } from '../constants';

/**
 * Grid of module tiles — one per top-level module the user can access. Data
 * comes from the app navigation registry, so every tile links to a real
 * registered route and stays in sync as modules are added.
 */
export function ModuleDirectoryGrid() {
  const { hasAnyPermission, hasModulePermission } = usePermission();
  const { currentCompany } = useAuth();

  const modules = useMemo(() => {
    const isVisible = (item: ModuleNavItem): boolean => {
      if (item.showInSidebar === false) return false;
      if (MODULE_DIRECTORY_EXCLUDE.includes(item.path)) return false;
      // Company-restricted modules only appear under their configured company unit
      // (same rule as the sidebar).
      if (item.companies && !item.companies.includes(currentCompany?.company_code ?? '')) {
        return false;
      }
      if (item.permissions && item.permissions.length > 0) {
        return hasAnyPermission(item.permissions);
      }
      if (item.modulePrefix) return hasModulePermission(item.modulePrefix);
      return true;
    };

    return getAllNavigation().filter(isVisible);
  }, [hasAnyPermission, hasModulePermission, currentCompany]);

  if (modules.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
        No modules are available for your account.
      </div>
    );
  }

  return (
    <ModuleTileGrid>
      {modules.map((item) => {
        const Icon = item.icon ?? LayoutGrid;

        return (
          <ModuleTile
            key={item.path}
            title={item.title}
            icon={<Icon className="h-5 w-5" />}
            accent={accentKeyForPath(item.path)}
            to={item.path}
          />
        );
      })}
    </ModuleTileGrid>
  );
}
