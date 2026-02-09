import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui'
import { usePermission } from '@/core/auth'
import { getAllNavigation } from '@/app/modules'

const descriptions: Record<string, string> = {
  '/gate': 'Manage gate entries for raw materials, daily needs, maintenance, construction, and visitors',
  '/qc': 'Inspections, approvals, and master data management',
  '/grpo': 'Goods receipt and purchase order posting',
}

export function DashboardStats() {
  const navigate = useNavigate()
  const { hasModulePermission, hasAnyPermission, permissionsLoaded } = usePermission()

  const visibleModules = useMemo(() => {
    if (!permissionsLoaded) return []

    return getAllNavigation().filter((item) => {
      if (!item.showInSidebar) return false

      if (item.modulePrefix) {
        return hasModulePermission(item.modulePrefix)
      }

      if (item.permissions && item.permissions.length > 0) {
        return hasAnyPermission([...item.permissions])
      }

      return true
    })
  }, [permissionsLoaded, hasModulePermission, hasAnyPermission])

  if (!permissionsLoaded || visibleModules.length === 0) return null

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {visibleModules.map((mod) => {
        const Icon = mod.icon || LayoutDashboard
        return (
          <Card
            key={mod.path}
            className="cursor-pointer transition-colors hover:bg-accent"
            onClick={() => navigate(mod.path)}
          >
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{mod.title}</CardTitle>
                <CardDescription>{descriptions[mod.path] || mod.title}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}
