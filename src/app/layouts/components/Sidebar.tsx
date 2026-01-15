import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Truck,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/shared/utils'
import { Button } from '@/shared/components/ui'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui'
import { ROUTES } from '@/config/routes.config'
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
  const { hasAnyPermission, isStaff } = usePermission()

  const navItems = Object.values(ROUTES).filter(
    (
      route
    ): route is typeof route & {
      icon: string
      showInSidebar: true
      permissions?: readonly string[]
    } =>
      route.showInSidebar === true &&
      (isStaff || !route.permissions || hasAnyPermission([...route.permissions]))
  )

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
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard

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
