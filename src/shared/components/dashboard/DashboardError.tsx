import { ShieldX, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils'

/**
 * Props for the DashboardError component.
 */
export interface DashboardErrorProps {
  /** Error message to display */
  message?: string
  /** Whether this is a permission (403) error */
  isPermissionError?: boolean
  /** Callback when retry button is clicked */
  onRetry?: () => void
  /** Optional CSS class */
  className?: string
}

/**
 * An error display component for dashboard pages.
 * Handles both permission errors and general API errors.
 *
 * @example
 * ```tsx
 * {error && (
 *   <DashboardError
 *     message={error.message}
 *     isPermissionError={error.status === 403}
 *     onRetry={() => refetch()}
 *   />
 * )}
 * ```
 */
export function DashboardError({
  message,
  isPermissionError = false,
  onRetry,
  className,
}: DashboardErrorProps) {
  if (isPermissionError) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5',
          className
        )}
      >
        <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-destructive">Permission Denied</p>
          <p className="text-sm text-muted-foreground mt-1">
            {message || 'You do not have permission to view this data.'}
          </p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10',
        className
      )}
    >
      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
        <p className="text-sm text-muted-foreground mt-1">
          {message || 'An error occurred while loading the dashboard.'}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
