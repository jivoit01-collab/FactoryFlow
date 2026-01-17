import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Truck, ClipboardCheck, type LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui'
import { ROUTES } from '@/config/routes.config'
import { usePermission } from '@/core/auth'

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Truck,
  ClipboardCheck,
}

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { hasModulePermission, hasAnyPermission, isStaff, permissionsLoaded } = usePermission()

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

      // Routes without modulePrefix or permissions are shown (like Profile)
      return true
    }
  )

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <img src="/JivoWellnessLogo.png" alt="Jivo Wellness Logo" className="h-8 dark:invert" />
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 p-2">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
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
      </SheetContent>
    </Sheet>
  )
}

export { MobileSidebar }
