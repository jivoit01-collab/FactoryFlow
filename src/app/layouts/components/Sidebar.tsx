import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Truck,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/shared/utils'
import { Button, Collapsible, CollapsibleContent } from '@/shared/components/ui'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui'
import { ROUTES, type RouteConfig } from '@/config/routes.config'
import { usePermission } from '@/core/auth'
import { SIDEBAR_CONFIG } from '@/config/constants'

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Truck,
  ClipboardCheck,
}

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { hasModulePermission, hasAnyPermission, isStaff, permissionsLoaded } = usePermission()
  const location = useLocation()
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set())

  type SidebarRoute = (typeof ROUTES)[keyof typeof ROUTES] & {
    icon: string
    showInSidebar: true
  }

  const navItems = (Object.values(ROUTES) as Array<(typeof ROUTES)[keyof typeof ROUTES]>).filter(
    (route): route is SidebarRoute => {
      if (route.showInSidebar !== true || !('icon' in route) || !route.icon) return false

      // Wait for permissions to load before filtering
      if (!permissionsLoaded) return false

      // Staff users see everything
      if (isStaff) return true

      // If route has a modulePrefix, check if user has any permission for that module
      const routeWithModulePrefix = route as typeof route & { modulePrefix?: string }
      if (routeWithModulePrefix.modulePrefix) {
        return hasModulePermission(routeWithModulePrefix.modulePrefix)
      }

      // Fallback: if route has explicit permissions, check those
      const routeWithPerms = route as typeof route & { permissions?: readonly string[] }
      if (routeWithPerms.permissions && routeWithPerms.permissions.length > 0) {
        return hasAnyPermission([...routeWithPerms.permissions])
      }

      // Routes without modulePrefix or permissions are shown (like Profile or Gate)
      return true
    }
  )

  const toggleSubmenu = (routePath: string) => {
    setOpenSubmenus((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(routePath)) {
        newSet.delete(routePath)
      } else {
        newSet.add(routePath)
      }
      return newSet
    })
  }

  const isSubmenuOpen = (routePath: string) => openSubmenus.has(routePath)

  const isRouteActive = (routePath: string) => {
    if (location.pathname === routePath) return true
    // Check if any child route is active
    const route = Object.values(ROUTES).find((r) => r.path === routePath)
    if (route && 'children' in route && route.children) {
      return Object.values(route.children).some(
        (child: RouteConfig) => location.pathname === child.path
      )
    }
    return false
  }

  // Auto-open submenu if current route is a child
  useEffect(() => {
    Object.values(ROUTES).forEach((route) => {
      if (
        route.showInSidebar &&
        'hasSubmenu' in route &&
        route.hasSubmenu &&
        'children' in route &&
        route.children &&
        isRouteActive(route.path) &&
        !isSubmenuOpen(route.path)
      ) {
        setOpenSubmenus((prev) => new Set([...prev, route.path]))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300',
        isCollapsed
          ? `w-[${SIDEBAR_CONFIG.collapsedWidth}px]`
          : `w-[${SIDEBAR_CONFIG.expandedWidth}px]`
      )}
      style={{
        width: isCollapsed ? SIDEBAR_CONFIG.collapsedWidth : SIDEBAR_CONFIG.expandedWidth,
      }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b px-4">
        <img
          src="/JivoWellnessLogo.png"
          alt="Jivo Wellness Logo"
          className={cn(
            'dark:invert transition-all object-contain', // added object-contain
            isCollapsed ? 'h-8 w-8' : 'h-10 w-auto' // ensure width is auto when expanded
          )}
        />
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          'flex flex-col gap-1 py-2', // Remove horizontal padding (px)
          isCollapsed ? 'items-center' : 'px-2' // Only add horizontal padding when expanded
        )}
      >
        {navItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard
          const hasSubmenu = 'hasSubmenu' in item && item.hasSubmenu && item.children
          const isOpen = hasSubmenu ? isSubmenuOpen(item.path) : false
          const isActive = isRouteActive(item.path)

          if (isCollapsed) {
            if (hasSubmenu) {
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
                            : 'hover:bg-accent hover:text-accent-foreground'
                        )
                      }
                    >
                      <Icon className="h-5 w-5" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              )
            }

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
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            )
          }

          // Expanded sidebar
          if (hasSubmenu) {
            const itemWithChildren = item as typeof item & {
              children?: Record<string, RouteConfig>
            }
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
                        : 'hover:bg-accent hover:text-accent-foreground'
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
                      e.preventDefault()
                      e.stopPropagation()
                      toggleSubmenu(item.path)
                    }}
                  >
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {itemWithChildren.children && (
                  <CollapsibleContent className="ml-4 space-y-1 border-l pl-3">
                    {Object.values(itemWithChildren.children).map((child: RouteConfig) => {
                      const childIsActive = location.pathname === child.path
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center rounded-md px-3 py-2 text-sm transition-colors',
                              isActive || childIsActive
                                ? 'bg-accent text-accent-foreground font-medium'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )
                          }
                        >
                          <span>{child.title}</span>
                        </NavLink>
                      )
                    })}
                  </CollapsibleContent>
                )}
              </Collapsible>
            )
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </NavLink>
          )
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
  )
}
