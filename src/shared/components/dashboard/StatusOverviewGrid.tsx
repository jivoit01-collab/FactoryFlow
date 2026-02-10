import { useNavigate } from 'react-router-dom'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui'
import { cn } from '@/shared/utils'

/**
 * Configuration for a single status item in the overview grid.
 */
export interface StatusItemConfig {
  /** Display label for the status */
  label: string
  /** Text color class (e.g., 'text-yellow-600 dark:text-yellow-400') */
  color: string
  /** Background color class with border */
  bgColor: string
  /** Icon component to display */
  icon: LucideIcon
  /** Navigation link when clicked */
  link: string
}

/**
 * Props for the StatusOverviewGrid component.
 */
export interface StatusOverviewGridProps {
  /** Configuration for each status, keyed by status ID */
  statusConfig: Record<string, StatusItemConfig>
  /** Order of statuses to display */
  statusOrder: readonly string[]
  /** Count for each status, keyed by status ID */
  counts: Record<string, number>
  /** Optional CSS class for the grid container */
  className?: string
}

/**
 * A grid of status cards showing counts for each status.
 * Each card is clickable and navigates to the configured link.
 *
 * @example
 * ```tsx
 * <StatusOverviewGrid
 *   statusConfig={{
 *     pending: { label: 'Pending', color: '...', bgColor: '...', icon: Clock, link: '/pending' },
 *     completed: { label: 'Completed', color: '...', bgColor: '...', icon: Check, link: '/completed' },
 *   }}
 *   statusOrder={['pending', 'completed']}
 *   counts={{ pending: 5, completed: 10 }}
 * />
 * ```
 */
export function StatusOverviewGrid({
  statusConfig,
  statusOrder,
  counts,
  className,
}: StatusOverviewGridProps) {
  const navigate = useNavigate()

  return (
    <div className={cn('grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5', className)}>
      {statusOrder.map((status) => {
        const config = statusConfig[status]
        if (!config) return null

        const Icon = config.icon
        const count = counts[status] ?? 0

        return (
          <Card
            key={status}
            className={cn(
              'border cursor-pointer hover:shadow-md transition-shadow',
              config.bgColor
            )}
            onClick={() => navigate(config.link)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
                </div>
                <ChevronRight className={cn('h-4 w-4', config.color)} />
              </div>
              <div className={cn('text-2xl font-bold mt-1', config.color)}>{count}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
