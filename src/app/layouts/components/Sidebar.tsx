import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LayoutDashboard } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { getAllNavigation } from '@/app/registry';
import { SIDEBAR_CONFIG } from '@/config/constants';
import { useAuth, usePermission } from '@/core/auth';
import type { ModuleNavItem } from '@/core/types';
import { Button, Collapsible, CollapsibleContent } from '@/shared/components/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { activeChildPath } from './activeChild';
import { SettingsDialog } from './SettingsDialog';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { hasModulePermission, hasAnyPermission, permissionsLoaded } = usePermission();
  const { currentCompany } = useAuth();
  const location = useLocation();
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());

  // Get navigation items from module registry
  const allNavItems = useMemo(() => getAllNavigation(), []);

  // Filter navigation items based on permissions
  const navItems = useMemo(() => {
    return allNavItems
      .filter((item) => {
        if (!item.showInSidebar) return false;

        // Wait for permissions to load before filtering
        if (!permissionsLoaded) return false;

        // Company-restricted modules only show under their configured company unit.
        if (item.companies && !item.companies.includes(currentCompany?.company_code ?? '')) {
          return false;
        }

        // If route has a modulePrefix, check if user has any permission for that module
        if (item.modulePrefix) {
          return hasModulePermission(item.modulePrefix);
        }

        // Fallback: if route has explicit permissions, check those
        if (item.permissions && item.permissions.length > 0) {
          return hasAnyPermission(item.permissions);
        }

        // Routes without modulePrefix or permissions are shown (like Gate)
        return true;
      })
      .map((item) => ({
        ...item,
        // Filter children based on company unit and permissions
        children: item.children?.filter((child) => {
          // A child can be restricted to its own company units even when the
          // module it hangs under is not — one page for one unit inside a
          // module every unit uses.
          if (child.companies && !child.companies.includes(currentCompany?.company_code ?? '')) {
            return false;
          }
          // Children without permissions are shown
          if (!child.permissions || child.permissions.length === 0) return true;
          // Check if user has any of the required permissions
          return hasAnyPermission(child.permissions);
        }),
      }));
  }, [allNavItems, permissionsLoaded, hasModulePermission, hasAnyPermission, currentCompany]);

  const toggleSubmenu = (routePath: string) => {
    setOpenSubmenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(routePath)) {
        newSet.delete(routePath);
      } else {
        newSet.add(routePath);
      }
      return newSet;
    });
  };

  const isSubmenuOpen = (routePath: string) => openSubmenus.has(routePath);

  const isRouteActive = useCallback(
    (item: ModuleNavItem) => {
      if (location.pathname === item.path) return true;
      // Check if any child route is active
      if (item.children) {
        return item.children.some((child) => location.pathname === child.path);
      }
      return false;
    },
    [location.pathname],
  );

  // Auto-open submenu if current route is a child
  useEffect(() => {
    setOpenSubmenus((prev) => {
      let changed = false;
      const next = new Set(prev);
      navItems.forEach((item) => {
        if (
          item.showInSidebar &&
          item.hasSubmenu &&
          item.children &&
          isRouteActive(item) &&
          !next.has(item.path)
        ) {
          next.add(item.path);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [location.pathname, navItems, isRouteActive]);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col border-r transition-all duration-300',
        // The nav is dark even while the page is light, so the native scrollbar
        // on the item list has to be told which surface it is drawn on —
        // otherwise it paints a light-mode track as a white stripe up the rail.
        'border-sidebar-border bg-sidebar text-sidebar-foreground [color-scheme:dark]',
        'transition-all duration-300',
      )}
      style={{
        width: isCollapsed ? SIDEBAR_CONFIG.collapsedWidth : SIDEBAR_CONFIG.expandedWidth,
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        className={cn(
          'flex h-16 items-center border-b border-sidebar-border px-4 transition-all',
          isCollapsed ? 'justify-center' : 'justify-center gap-3',
        )}
      >
        <img
          src="/JivoWellnessLogo.png"
          alt="Jivo Wellness Logo"
          className={cn(
            'brightness-0 invert transition-all object-contain',
            isCollapsed ? 'h-8 w-8' : 'h-10 w-auto',
          )}
        />
      </Link>

      {/* Navigation */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto flex flex-col gap-1 py-2',
          isCollapsed ? 'items-center' : 'px-2',
        )}
      >
        {navItems.map((item) => {
          // Icon comes directly from module config, fallback to LayoutDashboard
          const Icon = item.icon || LayoutDashboard;
          const Badge = item.badge;
          const hasSubmenu = item.hasSubmenu && item.children && item.children.length > 0;
          const isOpen = hasSubmenu ? isSubmenuOpen(item.path) : false;
          const isActive = isRouteActive(item);

          if (isCollapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'relative flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      )
                    }
                  >
                    <Icon className="h-5 w-5" />
                    {Badge ? (
                      <Badge className="absolute -right-1 -top-1 h-4 min-w-[1rem] px-1 text-[10px]" />
                    ) : null}
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            );
          }

          // Expanded sidebar with submenu
          if (hasSubmenu) {
            return (
              <Collapsible
                key={item.path}
                open={isOpen}
                onOpenChange={() => toggleSubmenu(item.path)}
                className="space-y-1"
              >
                <div className="flex items-center">
                  <NavLink
                    to={item.path}
                    className={cn(
                      'flex-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground'
                        : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.title}</span>
                    {Badge ? <Badge className="ml-auto" /> : null}
                  </NavLink>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 border-l border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSubmenu(item.path);
                    }}
                  >
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <CollapsibleContent className="ml-4 space-y-1 border-l border-sidebar-border pl-3">
                  {item.children!.map((child) => {
                    const childIsActive =
                      child.path === activeChildPath(item.children!, location.pathname);
                    const ChildBadge = child.badge;
                    return (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={cn(
                          'flex items-center rounded-md px-3 py-2 text-sm transition-colors',
                          childIsActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        )}
                      >
                        <span>{child.title}</span>
                        {ChildBadge ? <ChildBadge className="ml-auto" /> : null}
                      </NavLink>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          // Expanded sidebar without submenu
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
              {Badge ? <Badge className="ml-auto" /> : null}
            </NavLink>
          );
        })}
      </nav>

      {/* Settings Button */}
      <div
        className={cn(
          'border-t border-sidebar-border py-2',
          isCollapsed ? 'flex justify-center' : 'px-2',
        )}
      >
        <SettingsDialog isCollapsed={isCollapsed} />
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
    </aside>
  );
}
