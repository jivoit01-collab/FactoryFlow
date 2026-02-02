import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

// Short display names for breadcrumb segments
const SHORT_NAMES: Record<string, string> = {
  'raw-materials': 'RM',
  'daily-needs': 'Daily',
  'maintenance': 'Maint.',
  'construction': 'Const.',
  'returnable-items': 'Return',
  'contractor-labor': 'Labor',
  'quality-check': 'QC',
  'step1': 'Step 1',
  'step2': 'Step 2',
  'step3': 'Step 3',
  'step4': 'Step 4',
  'step5': 'Step 5',
  'review': 'Review',
  'edit': 'Edit',
  'new': 'New',
  'all': 'All',
  'visitor': 'Visitor',
  'employee': 'Employee',
}

// Valid navigable paths - paths that have actual routes
const NAVIGABLE_PATHS: Set<string> = new Set([
  '/',
  '/gate',
  // Raw Materials
  '/gate/raw-materials',
  '/gate/raw-materials/all',
  '/gate/raw-materials/new',
  // Daily Needs
  '/gate/daily-needs',
  '/gate/daily-needs/all',
  '/gate/daily-needs/new',
  // Maintenance
  '/gate/maintenance',
  '/gate/maintenance/all',
  '/gate/maintenance/new',
  // Construction
  '/gate/construction',
  '/gate/construction/all',
  '/gate/construction/new',
  // Other Gate Types
  '/gate/returnable-items',
  '/gate/visitor',
  '/gate/employee',
  '/gate/contractor-labor',
  // Quality Check
  '/quality-check',
  '/quality-check/new',
  // Profile
  '/profile',
])

// Check if a path pattern matches (handles dynamic segments like :id)
function isNavigablePath(path: string): boolean {
  // Direct match
  if (NAVIGABLE_PATHS.has(path)) return true

  // Check for patterns with dynamic segments
  // e.g., /gate/raw-materials/edit/38 -> navigable to /gate/raw-materials
  // e.g., /quality-check/123 -> navigable to /quality-check

  return false
}

// Get the redirect path for non-navigable intermediate paths
function getRedirectPath(path: string, segments: string[]): string | null {
  // For edit paths like /gate/raw-materials/edit/38/step2
  // "edit" alone is not navigable, redirect to parent list
  if (path.includes('/edit')) {
    const editIndex = segments.indexOf('edit')
    if (editIndex > 0) {
      return '/' + segments.slice(0, editIndex).join('/')
    }
  }

  // For new paths, redirect to parent
  if (path.endsWith('/new')) {
    return path.replace('/new', '')
  }

  return null
}

export function Breadcrumbs() {
  const location = useLocation()
  const pathSegments = location.pathname.split('/').filter(Boolean)

  // Get short display name for a segment
  const getDisplayName = (segment: string): string => {
    // Check for short name mapping
    if (SHORT_NAMES[segment.toLowerCase()]) {
      return SHORT_NAMES[segment.toLowerCase()]
    }

    // Check if it's a numeric ID
    if (/^\d+$/.test(segment)) {
      return `#${segment}`
    }

    // Format the segment: capitalize first letter, replace dashes with spaces
    return segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  if (pathSegments.length === 0) {
    return null
  }

  // Build breadcrumb items with proper navigation
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const fullPath = '/' + pathSegments.slice(0, index + 1).join('/')
    const isLast = index === pathSegments.length - 1
    const displayName = getDisplayName(segment)

    // Determine if this path is navigable
    let navigateTo: string | null = null
    if (!isLast) {
      if (isNavigablePath(fullPath)) {
        navigateTo = fullPath
      } else {
        navigateTo = getRedirectPath(fullPath, pathSegments.slice(0, index + 1))
      }
    }

    return {
      segment,
      fullPath,
      displayName,
      isLast,
      navigateTo,
    }
  })

  return (
    <nav
      className="flex items-center text-xs sm:text-sm text-muted-foreground mb-4 overflow-x-auto pb-1 scrollbar-hide"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <style>
        {`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      {/* Home icon */}
      <Link
        to="/"
        className="hover:text-foreground flex-shrink-0 p-1 rounded hover:bg-muted/50 transition-colors"
        title="Dashboard"
      >
        <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Link>

      {breadcrumbItems.map(({ fullPath, displayName, isLast, navigateTo }) => (
        <div key={fullPath} className="flex items-center flex-shrink-0">
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/40 mx-0.5 sm:mx-1" />
          {isLast ? (
            <span className="text-foreground font-medium px-1.5 py-0.5 rounded bg-muted/30 max-w-[80px] sm:max-w-[120px] truncate">
              {displayName}
            </span>
          ) : navigateTo ? (
            <Link
              to={navigateTo}
              className="hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted/50 transition-colors max-w-[60px] sm:max-w-[100px] truncate"
              title={displayName}
            >
              {displayName}
            </Link>
          ) : (
            <span className="px-1.5 py-0.5 text-muted-foreground/70 max-w-[60px] sm:max-w-[100px] truncate">
              {displayName}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
