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
