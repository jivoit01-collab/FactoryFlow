import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { ROUTES, type RouteConfig } from '@/config/routes.config'

export function Breadcrumbs() {
  const location = useLocation()
  const pathSegments = location.pathname.split('/').filter(Boolean)

  // Find matching route for title
  const getRouteTitle = (pathStr: string): string => {
    const fullPath = '/' + pathStr
    for (const route of Object.values(ROUTES)) {
      if (route.path === fullPath) {
        return route.title
      }
      // Check children - safely check if property exists
      const routeWithChildren = route as RouteConfig
      if (routeWithChildren.children) {
        for (const child of Object.values(routeWithChildren.children)) {
          if (child.path === fullPath || child.path.startsWith(fullPath)) {
            return child.title
          }
        }
      }
    }
    // Capitalize the segment as fallback
    return pathStr.charAt(0).toUpperCase() + pathStr.slice(1).replace(/-/g, ' ')
  }

  if (pathSegments.length === 0) {
    return null
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <Link to="/" className="hover:text-foreground">
        <Home className="h-4 w-4" />
      </Link>

      {pathSegments.map((_, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/')
        const isLast = index === pathSegments.length - 1
        const title = getRouteTitle(pathSegments.slice(0, index + 1).join('/'))

        return (
          <div key={path} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="text-foreground font-medium">{title}</span>
            ) : (
              <Link to={path} className="hover:text-foreground">
                {title}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
