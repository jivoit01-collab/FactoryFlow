import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LayoutDashboard } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { getAllNavigation } from '@/app/registry';
import { SIDEBAR_CONFIG } from '@/config/constants';
import { usePermission } from '@/core/auth';
import type { ModuleNavItem } from '@/core/types';
import { Button, Collapsible, CollapsibleContent } from '@/shared/components/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { hasModulePermission, hasAnyPermission, permissionsLoaded } = usePermission();
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
        // Filter children based on permissions
        children: item.children?.filter((child) => {
          // Children without permissions are shown
          if (!child.permissions || child.permissions.length === 0) return true;
          // Check if user has any of the required permissions
          return hasAnyPermission(child.permissions);
        }),
      }));
  }, [allNavItems, permissionsLoaded, hasModulePermission, hasAnyPermission]);

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

  const isRouteActive = (item: ModuleNavItem) => {
    if (location.pathname === item.path) return true;
    // Check if any child route is active
    if (item.children) {
      return item.children.some((child) => location.pathname === child.path);
    }
    return false;
  };

  // Auto-open submenu if current route is a child
  useEffect(() => {
    navItems.forEach((item) => {
      if (
        item.showInSidebar &&
        item.hasSubmenu &&
        item.children &&
        isRouteActive(item) &&
        !isSubmenuOpen(item.path)
      ) {
        setOpenSubmenus((prev) => new Set([...prev, item.path]));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navItems]);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col border-r bg-background transition-all duration-300',
        'transition-all duration-300',
      )}
      style={{
        width: isCollapsed ? SIDEBAR_CONFIG.collapsedWidth : SIDEBAR_CONFIG.expandedWidth,
      }}
    >
      {/* Logo */}
      <Link to="/" className="flex h-16 items-center justify-center border-b px-4">
        <img
          src="/JivoWellnessLogo.png"
          alt="Jivo Wellness Logo"
          className={cn(
            'dark:invert transition-all object-contain',
            isCollapsed ? 'h-8 w-8' : 'h-10 w-auto',
          )}
        />
      </Link>

      {/* Navigation */}
      <nav
        className={cn(
          'h-[calc(100vh-4rem)] overflow-y-auto flex flex-col gap-1 py-2',
          isCollapsed ? 'items-center' : 'px-2',
        )}
      >
        {navItems.map((item) => {
          // Icon comes directly from module config, fallback to LayoutDashboard
          const Icon = item.icon || LayoutDashboard;
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
                        'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground',
                      )
                    }
                  >
                    <Icon className="h-5 w-5" />
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
                        ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </NavLink>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 border-l border-border"
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
                <CollapsibleContent className="ml-4 space-y-1 border-l pl-3">
                  {item.children!.map((child) => {
                    const childIsActive = location.pathname === child.path;
                    return (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center rounded-md px-3 py-2 text-sm transition-colors',
                            isActive || childIsActive
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                          )
                        }
                      >
                        <span>{child.title}</span>
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
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
    </aside>
  );
}
