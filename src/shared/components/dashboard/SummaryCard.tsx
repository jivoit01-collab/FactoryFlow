import { type ReactNode } from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui'
import { cn } from '@/shared/utils'

/**
 * Props for the SummaryCard component.
 */
export interface SummaryCardProps {
  /** Title of the summary card */
  title: string
  /** Main count/value to display prominently */
  value: number | string
  /** Icon to display next to the title */
  icon?: LucideIcon
  /** Whether the card is clickable */
  onClick?: () => void
  /** Additional details to show below the main value */
  details?: Array<{ label: string; value: number | string }>
  /** Optional CSS class */
  className?: string
  /** Children to render at the bottom of the card */
  children?: ReactNode
}

/**
 * A summary card component for showing key metrics.
 *
 * @example
 * ```tsx
 * <SummaryCard
 *   title="Pending GRPO"
 *   value={25}
 *   icon={PackageCheck}
 *   onClick={() => navigate('/grpo/pending')}
 *   details={[
 *     { label: 'Total POs', value: 45 },
 *     { label: 'Entries', value: 12 },
 *   ]}
 * />
 * ```
 */
export function SummaryCard({
  title,
  value,
  icon: Icon,
  onClick,
  details,
  className,
  children,
}: SummaryCardProps) {
  return (
    <Card
      className={cn(
        'bg-primary/5 border-primary/20',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      } : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-primary" />}
            <span className="text-sm font-medium text-primary">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-primary">{value}</span>
            {onClick && <ChevronRight className="h-5 w-5 text-primary" />}
          </div>
        </div>

        {details && details.length > 0 && (
          <div className="mt-3 pt-3 border-t border-primary/20 flex items-center gap-4 text-sm text-muted-foreground">
            {details.map((detail) => (
              <span key={detail.label}>
                {detail.label}: <span className="font-medium">{detail.value}</span>
              </span>
            ))}
          </div>
        )}

        {children}
      </CardContent>
    </Card>
  )
}
