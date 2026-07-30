import { ArrowRight, LayoutGrid } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { getAllNavigation } from '@/app/registry';
import { useAuth, usePermission } from '@/core/auth';
import type { ModuleNavItem } from '@/core/types';
import { cn } from '@/shared/utils';

import { accentForPath, MODULE_DIRECTORY_EXCLUDE, moduleDescription } from '../constants';

/**
 * Grid of clickable cards — one per top-level module the user can access.
 * Data comes from the app navigation registry, so every card links to a real
 * registered route and stays in sync as modules are added. Each card has a soft
 * accent wash, a lifting hover, and a staggered entrance.
 */
export function ModuleDirectoryGrid() {
  const navigate = useNavigate();
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {modules.map((item, i) => {
        const Icon = item.icon ?? LayoutGrid;
        const accent = accentForPath(item.path);

        return (
          <div
            key={item.path}
            role="button"
            tabIndex={0}
            aria-label={`Open ${item.title}`}
            style={{ animationDelay: `${i * 45}ms` }}
            onClick={() => navigate(item.path)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(item.path);
              }
            }}
            className={cn(
              'group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm',
              'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500',
              'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              accent.glow,
            )}
          >
            {/* soft colour wash */}
            <div
              className={cn(
                'pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-70',
                accent.wash,
              )}
            />
            {/* glowing halo */}
            <div
              className={cn(
                'pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-70',
                accent.iconBg,
              )}
            />

            <div className="relative z-10 flex items-start justify-between">
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3',
                  accent.iconBg,
                )}
              >
                <Icon className={cn('h-5 w-5', accent.icon)} />
              </div>
              <ArrowRight
                className={cn(
                  'h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100',
                  accent.icon,
                )}
              />
            </div>

            <h4 className="relative z-10 mt-4 truncate font-semibold">{item.title}</h4>
            <p className="relative z-10 mt-1 line-clamp-2 text-xs text-muted-foreground">
              {moduleDescription(item.path, item.title)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
