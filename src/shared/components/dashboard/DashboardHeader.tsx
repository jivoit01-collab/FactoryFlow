import { type ReactNode } from 'react'

import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils'

/**
 * Props for the DashboardHeader component.
 */
export interface DashboardHeaderProps {
  /** Main title of the dashboard */
  title: string
  /** Description text below the title */
  description?: string
  /** Primary action button configuration */
  primaryAction?: {
    label: string
    icon?: ReactNode
    onClick: () => void
  }
  /** Additional actions to show in the header */
  children?: ReactNode
  /** Optional CSS class for the header container */
  className?: string
}

/**
 * A consistent header component for dashboard pages.
 *
 * @example
 * ```tsx
 * <DashboardHeader
 *   title="Quality Control"
 *   description="Manage raw material inspections and quality approvals"
 *   primaryAction={{
 *     label: 'Start Inspection',
 *     icon: <Plus className="h-4 w-4 mr-2" />,
 *     onClick: () => navigate('/qc/pending'),
 *   }}
 * />
 * ```
 */
export function DashboardHeader({
  title,
  description,
  primaryAction,
  children,
  className,
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {primaryAction && (
          <Button onClick={primaryAction.onClick} className="w-full sm:w-auto">
            {primaryAction.icon}
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}
